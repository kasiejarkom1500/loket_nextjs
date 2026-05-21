import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDefaultShiftSettings, getShiftSettings } from "@/lib/time";

const SHIFT_VALUES = ["PAGI", "SIANG"] as const;
type ShiftValue = (typeof SHIFT_VALUES)[number];
type ShiftSettingInput = {
  shift?: unknown;
  startTime?: unknown;
  endTime?: unknown;
};

const isShift = (value: unknown): value is ShiftValue =>
  typeof value === "string" && SHIFT_VALUES.includes(value as ShiftValue);

const isTime = (value: unknown): value is string =>
  typeof value === "string" &&
  /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);

export async function GET() {
  const settings = await getShiftSettings();
  return NextResponse.json({ settings });
}

export async function PUT(request: Request) {
  const body = await request.json().catch(() => ({}));
  const settings: ShiftSettingInput[] = Array.isArray(body?.settings)
    ? body.settings
    : [];

  const normalized = getDefaultShiftSettings().map((fallback) => {
    const input = settings.find((item) => item?.shift === fallback.shift);
    return {
      shift: fallback.shift,
      startTime:
        typeof input?.startTime === "string"
          ? input.startTime
          : fallback.startTime,
      endTime:
        typeof input?.endTime === "string" ? input.endTime : fallback.endTime,
    };
  });

  for (const setting of normalized) {
    if (
      !isShift(setting.shift) ||
      !isTime(setting.startTime) ||
      !isTime(setting.endTime)
    ) {
      return NextResponse.json(
        { error: "Shift dan jam harus valid. Format jam: HH:mm." },
        { status: 400 },
      );
    }
  }

  const saved = await prisma.$transaction(
    normalized.map((setting) =>
      prisma.shiftSetting.upsert({
        where: { shift: setting.shift },
        create: setting,
        update: {
          startTime: setting.startTime,
          endTime: setting.endTime,
        },
      }),
    ),
  );

  return NextResponse.json({
    settings: saved.map((setting) => ({
      shift: setting.shift,
      startTime: setting.startTime,
      endTime: setting.endTime,
    })),
  });
}
