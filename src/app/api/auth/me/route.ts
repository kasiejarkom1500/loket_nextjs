import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySession } from "@/lib/auth";

export async function GET() {
  const token = (await cookies()).get("loket_session")?.value;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const session = await verifySession(token);
    return NextResponse.json({
      user: {
        nama: session.nama,
        username: session.username,
        role: session.role,
        counterId: session.counterId,
      },
      counterId: session.counterId,
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
