import { NextResponse } from "next/server";
import { sendWhatsAppText } from "@/lib/whatsapp";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const phone = typeof body?.phone === "string" ? body.phone.trim() : "";
  const message = typeof body?.message === "string" ? body.message.trim() : "";

  if (!phone || !message) {
    return NextResponse.json(
      { error: "phone dan message wajib diisi" },
      { status: 400 },
    );
  }

  try {
    await sendWhatsAppText(phone, message);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal mengirim pesan" },
      { status: 400 },
    );
  }
}
