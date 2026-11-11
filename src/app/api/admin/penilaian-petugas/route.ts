import { NextResponse } from "next/server";
import { getStaffEvaluation, parseEvaluationMonth, type EvaluationRole } from "@/lib/staff-evaluation";

export async function GET(request: Request) {
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
