import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const body = await request.json();
  const queueId = Number(body?.queueId);
  const score = Number(body?.score);
  const publicOfficerScore = Number(body?.publicOfficerScore);
  const dataOfficerScoreRaw = body?.dataOfficerScore;
  const securityOfficerScore = Number(body?.securityOfficerScore);
  const comment = typeof body?.comment === "string" ? body.comment : null;

  if (
    !queueId ||
    Number.isNaN(score) ||
    Number.isNaN(publicOfficerScore) ||
    Number.isNaN(securityOfficerScore)
  ) {
    return NextResponse.json(
      { error: "queueId and all scores are required" },
      { status: 400 },
    );
  }

  const dataOfficerScore =
    dataOfficerScoreRaw === null || dataOfficerScoreRaw === undefined
      ? null
      : Number(dataOfficerScoreRaw);
  const scores = [score, publicOfficerScore, securityOfficerScore];
  if (dataOfficerScore !== null) {
    scores.push(dataOfficerScore);
  }
  if (scores.some((value) => value < 1 || value > 5)) {
    return NextResponse.json({ error: "score must be 1-5" }, { status: 400 });
  }

  const queue = await prisma.queue.findUnique({
    where: { id: queueId },
  });

  if (!queue) {
    return NextResponse.json({ error: "Queue not found" }, { status: 404 });
  }

  const rating = await prisma.rating.create({
    data: {
      queueId,
      score,
      publicOfficerScore,
      dataOfficerScore: dataOfficerScore ?? null,
      securityOfficerScore,
      comment,
    },
  });

  return NextResponse.json({ rating });
}
