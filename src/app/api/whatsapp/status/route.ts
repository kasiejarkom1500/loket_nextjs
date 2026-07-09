import { NextResponse } from "next/server";
import { getWhatsAppManager } from "@/lib/whatsapp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const manager = getWhatsAppManager();
  await manager.ensureStarted();
  const status = manager.getStatus();

  return NextResponse.json({
    status: status.status,
    phone: status.phone,
    lastError: status.lastError,
    updatedAt: status.updatedAt,
    messages: status.messages,
  });
}
