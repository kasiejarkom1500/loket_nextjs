import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { getWhatsAppManager } from "@/lib/whatsapp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const manager = getWhatsAppManager();
  await manager.ensureStarted();
  const status = manager.getStatus();
  const qrDataUrl = status.qr
    ? await QRCode.toDataURL(status.qr, { margin: 1, width: 280 })
    : null;

  return NextResponse.json({
    ...status,
    qrDataUrl,
  });
}
