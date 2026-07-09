import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState as createMultiFileAuthState,
  type WASocket,
} from "@whiskeysockets/baileys";
import fs from "fs/promises";
import path from "path";
import pino from "pino";

export type WhatsAppConnectionStatus =
  | "idle"
  | "connecting"
  | "qr"
  | "connected"
  | "disconnected";

export type WhatsAppMessage = {
  id: string;
  from: string;
  name: string;
  text: string;
  timestamp: string;
  direction: "in" | "out";
};

export type WhatsAppStatus = {
  status: WhatsAppConnectionStatus;
  qr: string | null;
  phone: string | null;
  lastError: string | null;
  updatedAt: string;
  messages: WhatsAppMessage[];
};

const logger = pino({ level: process.env.WHATSAPP_LOG_LEVEL ?? "silent" });

function getAuthDir() {
  return path.resolve(process.cwd(), process.env.WHATSAPP_AUTH_DIR ?? ".baileys_auth");
}

function normalizePhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (!digits) {
    throw new Error("Nomor WhatsApp wajib diisi.");
  }
  if (digits.startsWith("0")) {
    return `62${digits.slice(1)}`;
  }
  return digits;
}

function stripChatSuffix(jid: string) {
  return jid.replace("@s.whatsapp.net", "").replace("@lid", "");
}

function resolveChatJid(target: string, aliases: Map<string, string>) {
  const value = target.trim();
  if (value.includes("@")) {
    return value;
  }
  const aliasedJid = aliases.get(value);
  if (aliasedJid) {
    return aliasedJid;
  }
  return `${normalizePhone(value)}@s.whatsapp.net`;
}

class WhatsAppManager {
  private socket: WASocket | null = null;
  private starting: Promise<void> | null = null;
  private status: WhatsAppConnectionStatus = "idle";
  private qr: string | null = null;
  private phone: string | null = null;
  private lastError: string | null = null;
  private updatedAt = new Date().toISOString();
  private messages: WhatsAppMessage[] = [];
  private seenInboundMessageIds = new Set<string>();
  private jidAliases = new Map<string, string>();

  getStatus(): WhatsAppStatus {
    this.normalizeMessageJids();
    return {
      status: this.status,
      qr: this.qr,
      phone: this.phone,
      lastError: this.lastError,
      updatedAt: this.updatedAt,
      messages: this.messages,
    };
  }

  async ensureStarted() {
    if (this.socket || this.starting) {
      await this.starting;
      return;
    }

    this.starting = this.start().finally(() => {
      this.starting = null;
    });
    await this.starting;
  }

  async sendText(target: string, text: string) {
    await this.ensureStarted();
    if (!this.socket || this.status !== "connected") {
      throw new Error("WhatsApp belum terhubung.");
    }
    const jid = resolveChatJid(target, this.jidAliases);
    const result = await this.socket.sendMessage(jid, { text });
    this.messages = [
      {
        id: result?.key.id ?? `out-${jid}-${Date.now()}`,
        from: jid,
        name: "Petugas",
        text,
        timestamp: new Date().toISOString(),
        direction: "out" as const,
      },
      ...this.messages,
    ].slice(0, 50);
    this.touch();
  }

  async logout(clearSession = false) {
    try {
      await this.socket?.logout();
    } catch {
      // Socket may already be closed.
    }
    this.socket = null;
    this.status = "disconnected";
    this.qr = null;
    this.phone = null;
    this.touch();
    if (clearSession) {
      await fs.rm(getAuthDir(), { recursive: true, force: true });
      this.status = "idle";
      this.touch();
    }
  }

  private async start() {
    this.status = "connecting";
    this.lastError = null;
    this.touch();

    const { state, saveCreds } = await createMultiFileAuthState(getAuthDir());
    const socket = makeWASocket({
      auth: state,
      logger,
      markOnlineOnConnect: process.env.WHATSAPP_MARK_ONLINE === "1",
      printQRInTerminal: false,
    });

    this.socket = socket;

    socket.ev.on("creds.update", saveCreds);

    socket.ev.on("connection.update", async (update) => {
      if (update.qr) {
        this.qr = update.qr;
        this.status = "qr";
        this.touch();
      }

      if (update.connection === "open") {
        this.status = "connected";
        this.qr = null;
        this.phone = socket.user?.id?.split(":")[0] ?? socket.user?.id ?? null;
        this.lastError = null;
        this.touch();
      }

      if (update.connection === "close") {
        const statusCode = (
          update.lastDisconnect?.error as
            | { output?: { statusCode?: number } }
            | undefined
        )?.output?.statusCode;
        const loggedOut = statusCode === DisconnectReason.loggedOut;
        this.socket = null;
        this.status = loggedOut ? "idle" : "disconnected";
        this.qr = null;
        this.lastError = update.lastDisconnect?.error?.message ?? null;
        this.touch();

        if (!loggedOut) {
          setTimeout(() => {
            void this.ensureStarted().catch((error) => {
              this.lastError = error instanceof Error ? error.message : String(error);
              this.touch();
            });
          }, 3000);
        }
      }
    });

    socket.ev.on("messages.upsert", ({ messages, type }) => {
      if (type !== "notify") {
        return;
      }

      for (const item of messages) {
        const remoteJid = item.key.remoteJid;
        if (
          item.key.fromMe ||
          !remoteJid ||
          remoteJid === "status@broadcast" ||
          remoteJid.endsWith("@broadcast")
        ) {
          continue;
        }
        const text =
          item.message?.conversation ??
          item.message?.extendedTextMessage?.text ??
          item.message?.imageMessage?.caption ??
          item.message?.videoMessage?.caption ??
          "";
        if (!text.trim()) {
          continue;
        }
        const timestamp = item.messageTimestamp
          ? new Date(Number(item.messageTimestamp) * 1000).toISOString()
          : new Date().toISOString();
        const inboundId = item.key.id ?? `${remoteJid}-${timestamp}-${text}`;
        if (this.seenInboundMessageIds.has(inboundId)) {
          continue;
        }
        this.seenInboundMessageIds.add(inboundId);

        const strippedRemoteJid = stripChatSuffix(remoteJid);
        this.jidAliases.set(strippedRemoteJid, remoteJid);
        this.messages = this.messages.map((message) =>
          message.from === strippedRemoteJid
            ? { ...message, from: remoteJid }
            : message,
        );

        this.messages = [
          {
            id: inboundId,
            from: remoteJid,
            name: item.pushName ?? "-",
            text,
            timestamp,
            direction: "in" as const,
          },
          ...this.messages,
        ].slice(0, 50);
        this.touch();
      }
    });
  }

  private touch() {
    this.updatedAt = new Date().toISOString();
  }

  private normalizeMessageJids() {
    for (const message of this.messages) {
      if (message.from.includes("@")) {
        this.jidAliases.set(stripChatSuffix(message.from), message.from);
      }
    }

    this.messages = this.messages.map((message) => {
      if (message.from.includes("@")) {
        return message;
      }
      const aliasedJid = this.jidAliases.get(message.from);
      return aliasedJid ? { ...message, from: aliasedJid } : message;
    });
  }
}

const globalForWhatsApp = globalThis as typeof globalThis & {
  whatsappManager?: WhatsAppManager;
};

export function getWhatsAppManager() {
  if (!globalForWhatsApp.whatsappManager) {
    globalForWhatsApp.whatsappManager = new WhatsAppManager();
  }
  return globalForWhatsApp.whatsappManager;
}

export async function sendWhatsAppText(phone: string, text: string) {
  return getWhatsAppManager().sendText(phone, text);
}
