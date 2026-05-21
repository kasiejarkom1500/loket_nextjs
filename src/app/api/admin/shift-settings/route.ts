import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDefaultShiftSettings, getShiftSettings } from "@/lib/time";

const SHIFT_VALUES = ["PAGI", "SIANG"] as const;
type ShiftValue = (typeof SHIFT_VALUES)[number];
type ShiftSettingInput = {
  shift?: unknown;
  startTime?: unknown;
  endTime?: unknown;
  earlyCheckInBufferMinutes?: unknown;
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
      earlyCheckInBufferMinutes:
        input?.earlyCheckInBufferMinutes === undefined
          ? fallback.earlyCheckInBufferMinutes
          : Number(input.earlyCheckInBufferMinutes),
    };
  });

  for (const setting of normalized) {
    if (
      !isShift(setting.shift) ||
      !isTime(setting.startTime) ||
      !isTime(setting.endTime) ||
      !Number.isInteger(setting.earlyCheckInBufferMinutes) ||
      setting.earlyCheckInBufferMinutes < 0 ||
      setting.earlyCheckInBufferMinutes > 240
    ) {
      return NextResponse.json(
        { error: "Shift, jam, dan buffer harus valid. Buffer 0-240 menit." },
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
          earlyCheckInBufferMinutes: setting.earlyCheckInBufferMinutes,
        },
      }),
    ),
  );

  return NextResponse.json({
    settings: saved.map((setting) => ({
      shift: setting.shift,
      startTime: setting.startTime,
      endTime: setting.endTime,
      earlyCheckInBufferMinutes: setting.earlyCheckInBufferMinutes,
    })),
  });
}
