import { NextResponse } from "next/server";
import { getWhatsAppManager } from "@/lib/whatsapp";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const clearSession = Boolean(body?.clearSession);

  await getWhatsAppManager().logout(clearSession);

  return NextResponse.json({ ok: true });
}
