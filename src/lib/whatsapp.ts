import makeWASocket, {
  DisconnectReason,
  downloadMediaMessage,
  fetchLatestBaileysVersion,
  useMultiFileAuthState as createMultiFileAuthState,
  type WAMessage,
  type WASocket,
} from "@whiskeysockets/baileys";
import fs from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
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
  kind: "text" | "image";
  mediaUrl: string | null;
  mimeType: string | null;
  fileName: string | null;
};

export type WhatsAppImagePayload = {
  buffer: Buffer;
  mimeType?: string | null;
  fileName?: string | null;
  caption?: string | null;
};

export type WhatsAppStatus = {
  status: WhatsAppConnectionStatus;
  qr: string | null;
  phone: string | null;
  lastError: string | null;
  updatedAt: string;
  messages: WhatsAppMessage[];
};

const logger = pino({ level: process.env.WHATSAPP_LOG_LEVEL ?? "info" });

function getAuthDir() {
  return path.resolve(process.cwd(), process.env.WHATSAPP_AUTH_DIR ?? ".baileys_auth");
}

function getMediaDir() {
  return path.resolve(
    process.cwd(),
    process.env.WHATSAPP_MEDIA_DIR ?? "public/whatsapp-media",
  );
}

function getMediaPublicUrl(fileName: string) {
  return `/whatsapp-media/${fileName}`;
}

function sanitizeName(value: string | null | undefined) {
  const base = path.basename(value ?? "").trim();
  return base.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
}

function extensionFromMimeType(mimeType: string | null | undefined) {
  const normalized = (mimeType ?? "").split(";")[0].trim().toLowerCase();
  switch (normalized) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    case "image/bmp":
      return "bmp";
    case "image/svg+xml":
      return "svg";
    default:
      return "bin";
  }
}

function normalizeCaption(value: string | null | undefined) {
  const text = value?.trim() ?? "";
  return text || "[Gambar]";
}

async function persistMedia(
  buffer: Buffer,
  mimeType: string | null | undefined,
  sourceName: string | null | undefined,
  prefix: string,
) {
  const mediaDir = getMediaDir();
  await fs.mkdir(mediaDir, { recursive: true });
  const fileName = `${prefix}-${Date.now()}-${randomUUID()}${
    extensionFromMimeType(mimeType) ? `.${extensionFromMimeType(mimeType)}` : ""
  }`;
  const fullPath = path.join(mediaDir, fileName);
  await fs.writeFile(fullPath, buffer);
  return {
    fileName,
    url: getMediaPublicUrl(fileName),
    mimeType: mimeType ?? null,
    sourceName: sanitizeName(sourceName),
  };
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

function getConversationKey(jid: string) {
  return stripChatSuffix(jid);
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

    this.starting = this.start()
      .catch((error) => {
        const message = error instanceof Error ? error.message : String(error);
        logger.error({ error: message }, "WhatsApp socket startup failed");
        throw error;
      })
      .finally(() => {
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
    const conversationKey = getConversationKey(jid);
    this.jidAliases.set(conversationKey, jid);
    const outgoingMessage: WhatsAppMessage = {
      id: result?.key.id ?? `out-${jid}-${Date.now()}`,
      from: conversationKey,
      name: "Petugas",
      text,
      timestamp: new Date().toISOString(),
      direction: "out",
      kind: "text",
      mediaUrl: null,
      mimeType: null,
      fileName: null,
    };
    this.messages = [
      outgoingMessage,
      ...this.messages,
    ].slice(0, 50);
    this.touch();
  }

  async sendImage(target: string, payload: WhatsAppImagePayload) {
    await this.ensureStarted();
    if (!this.socket || this.status !== "connected") {
      throw new Error("WhatsApp belum terhubung.");
    }
    const jid = resolveChatJid(target, this.jidAliases);
    const caption = payload.caption?.trim() || undefined;
    const displayText = normalizeCaption(payload.caption);
    const result = await this.socket.sendMessage(jid, {
      image: payload.buffer,
      mimetype: payload.mimeType ?? undefined,
      caption,
    });
    const conversationKey = getConversationKey(jid);
    this.jidAliases.set(conversationKey, jid);
    const stored = await persistMedia(
      payload.buffer,
      payload.mimeType,
      payload.fileName,
      "outgoing",
    );
    const outgoingMessage: WhatsAppMessage = {
      id: result?.key.id ?? `out-${jid}-${Date.now()}`,
      from: conversationKey,
      name: "Petugas",
      text: displayText,
      timestamp: new Date().toISOString(),
      direction: "out",
      kind: "image",
      mediaUrl: stored.url,
      mimeType: stored.mimeType,
      fileName: stored.fileName,
    };
    this.messages = [
      outgoingMessage,
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
    logger.info({ authDir: getAuthDir() }, "Starting WhatsApp socket");

    const latestVersion = await fetchLatestBaileysVersion();
    logger.info(
      {
        version: latestVersion.version,
        isLatest: latestVersion.isLatest,
        error: latestVersion.error
          ? latestVersion.error instanceof Error
            ? latestVersion.error.message
            : String(latestVersion.error)
          : null,
      },
      "Resolved WhatsApp Web version",
    );

    const { state, saveCreds } = await createMultiFileAuthState(getAuthDir());
    const socket = makeWASocket({
      auth: state,
      logger,
      version: latestVersion.version,
      markOnlineOnConnect: process.env.WHATSAPP_MARK_ONLINE === "1",
      printQRInTerminal: false,
    });

    this.socket = socket;

    socket.ev.on("creds.update", saveCreds);

    socket.ev.on("connection.update", async (update) => {
      logger.info(
        {
          connection: update.connection ?? null,
          hasQr: Boolean(update.qr),
          hasLastDisconnect: Boolean(update.lastDisconnect),
        },
        "WhatsApp connection update",
      );

      if (update.qr) {
        this.qr = update.qr;
        this.status = "qr";
        this.touch();
        logger.info("WhatsApp QR received");
      }

      if (update.connection === "open") {
        this.status = "connected";
        this.qr = null;
        this.phone = socket.user?.id?.split(":")[0] ?? socket.user?.id ?? null;
        this.lastError = null;
        this.touch();
        logger.info({ phone: this.phone }, "WhatsApp connected");
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
        logger.warn(
          {
            statusCode,
            loggedOut,
            error: this.lastError,
          },
          "WhatsApp connection closed",
        );

        if (!loggedOut) {
          logger.info("Scheduling WhatsApp reconnect in 3 seconds");
          setTimeout(() => {
            void this.ensureStarted().catch((error) => {
              this.lastError = error instanceof Error ? error.message : String(error);
              this.touch();
              logger.error(
                { error: this.lastError },
                "WhatsApp reconnect failed",
              );
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
        void this.handleIncomingMessage(item).catch((error) => {
          logger.warn(
            {
              error: error instanceof Error ? error.message : String(error),
              messageId: item.key.id ?? null,
            },
            "Failed to process inbound WhatsApp message",
          );
        });
      }
    });
  }

  private async handleIncomingMessage(item: WAMessage) {
    const remoteJid = item.key.remoteJid;
    if (
      item.key.fromMe ||
      !remoteJid ||
      remoteJid === "status@broadcast" ||
      remoteJid.endsWith("@broadcast")
    ) {
      return;
    }

    const imageMessage = item.message?.imageMessage ?? null;
    const timestamp = item.messageTimestamp
      ? new Date(Number(item.messageTimestamp) * 1000).toISOString()
      : new Date().toISOString();
    const inboundId =
      item.key.id ??
      `${remoteJid}-${timestamp}-${imageMessage?.caption ?? item.message?.conversation ?? ""}`;
    if (this.seenInboundMessageIds.has(inboundId)) {
      return;
    }
    this.seenInboundMessageIds.add(inboundId);

    const conversationKey = getConversationKey(remoteJid);
    this.jidAliases.set(conversationKey, remoteJid);

    if (imageMessage) {
      try {
        const buffer = await downloadMediaMessage(
          item,
          "buffer",
          {},
          {
            logger,
            reuploadRequest: async (message) => message,
          },
        );
        const stored = await persistMedia(
          buffer,
          imageMessage.mimetype ?? null,
          null,
          "incoming",
        );
        const incomingImageMessage: WhatsAppMessage = {
          id: inboundId,
          from: conversationKey,
          name: item.pushName ?? "-",
          text: normalizeCaption(imageMessage.caption),
          timestamp,
          direction: "in",
          kind: "image",
          mediaUrl: stored.url,
          mimeType: stored.mimeType,
          fileName: stored.fileName,
        };
        this.messages = [
          incomingImageMessage,
          ...this.messages,
        ].slice(0, 50);
        this.touch();
        return;
      } catch (error) {
        logger.warn(
          {
            error: error instanceof Error ? error.message : String(error),
            jid: remoteJid,
            messageId: inboundId,
          },
          "Failed to download inbound image",
        );
      }
    }

    const text =
      item.message?.conversation ??
      item.message?.extendedTextMessage?.text ??
      item.message?.videoMessage?.caption ??
      "";
    if (!text.trim()) {
      return;
    }

    const incomingTextMessage: WhatsAppMessage = {
      id: inboundId,
      from: conversationKey,
      name: item.pushName ?? "-",
      text,
      timestamp,
      direction: "in",
      kind: "text",
      mediaUrl: null,
      mimeType: null,
      fileName: null,
    };
    this.messages = [
      incomingTextMessage,
      ...this.messages,
    ].slice(0, 50);
    this.touch();
  }

  private touch() {
    this.updatedAt = new Date().toISOString();
  }

  private normalizeMessageJids() {
    for (const message of this.messages) {
      const conversationKey = getConversationKey(message.from);
      if (message.from !== conversationKey) {
        this.jidAliases.set(conversationKey, message.from);
      }
    }

    this.messages = this.messages.map((message) => {
      const conversationKey = getConversationKey(message.from);
      return {
        ...message,
        from: conversationKey,
      };
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

export async function sendWhatsAppImage(
  phone: string,
  payload: WhatsAppImagePayload,
) {
  return getWhatsAppManager().sendImage(phone, payload);
}
