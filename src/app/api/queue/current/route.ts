import { NextResponse } from "next/server";
import { buildRealtimeState } from "@/lib/realtime";

export async function GET() {
  const state = await buildRealtimeState();
  return NextResponse.json(state);
}
