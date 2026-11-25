import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySession, isEvaluationAdmin } from "@/lib/auth";
import { getStaffEvaluation, parseEvaluationMonth, type EvaluationRole } from "@/lib/staff-evaluation";

async function hasEvaluationAccess() {
  const token = (await cookies()).get("loket_session")?.value;
  if (!token) return false;
  try { return isEvaluationAdmin((await verifySession(token)).adminLevel); } catch { return false; }
}

export async function GET(request: Request) {
  if (!(await hasEvaluationAccess())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(request.url);
  const month = parseEvaluationMonth(url.searchParams.get("month"));
  const roleValue = url.searchParams.get("role");
  const role: EvaluationRole = roleValue === "PERMINTAAN_DATA" ? "PERMINTAAN_DATA" : "LAYANAN_PUBLIK";
  if (!month) return NextResponse.json({ error: "month wajib diisi dengan format YYYY-MM yang valid." }, { status: 400 });
  if (roleValue && roleValue !== "LAYANAN_PUBLIK" && roleValue !== "PERMINTAAN_DATA") {
    return NextResponse.json({ error: "role tidak valid." }, { status: 400 });
  }
  return NextResponse.json(await getStaffEvaluation(month, role));
}
