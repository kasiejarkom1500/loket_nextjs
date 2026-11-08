import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { verifySession } from "@/lib/auth";
import { getMyRecap, parseMyRecapMonth, type MyRecapSession } from "@/lib/my-recap";

const SESSION_COOKIE = "loket_session";

async function getAllowedSession() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const session = await verifySession(token);
    if (session.role === "ADMIN") {
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const session = await getAllowedSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const month = parseMyRecapMonth(new URL(request.url).searchParams.get("month"));
  if (!month) {
    return NextResponse.json(
      { error: "month wajib diisi (YYYY-MM)" },
      { status: 400 },
    );
  }
  try {
    return NextResponse.json(await getMyRecap(session as MyRecapSession, month));
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Failed to load personal recap", error);
    return NextResponse.json({ error: "Gagal memuat rekap." }, { status: 500 });
  }
}
