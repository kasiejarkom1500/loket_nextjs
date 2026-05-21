import { DateTime } from "luxon";
import { prisma } from "@/lib/prisma";

const APP_TIMEZONE = "Asia/Jakarta";
const DEFAULT_SHIFT_SETTINGS = [
  { shift: "PAGI" as const, startTime: "00:00", endTime: "11:59" },
  { shift: "SIANG" as const, startTime: "12:00", endTime: "23:59" },
];
type ShiftValue = (typeof DEFAULT_SHIFT_SETTINGS)[number]["shift"];

export const getNowInAppTimezone = () => DateTime.now().setZone(APP_TIMEZONE);

const toMinutes = (time: string) => {
  const [hour, minute] = time.split(":").map(Number);
  if (
    !Number.isInteger(hour) ||
    !Number.isInteger(minute) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return null;
  }
  return hour * 60 + minute;
};

const isTimeInRange = (current: number, start: number, end: number) => {
  if (start <= end) {
    return current >= start && current <= end;
  }
  return current >= start || current <= end;
};

const minutesSinceShiftStart = (current: number, start: number) =>
  current >= start ? current - start : current + 24 * 60 - start;

export const getDefaultShiftSettings = () => DEFAULT_SHIFT_SETTINGS;

export const getShiftSettings = async () => {
  try {
    const settings = await prisma.shiftSetting.findMany({
      orderBy: { shift: "asc" },
    });

    if (settings.length) {
      return DEFAULT_SHIFT_SETTINGS.map((fallback) => {
        const setting = settings.find((item) => item.shift === fallback.shift);
        return setting
          ? {
              shift: setting.shift,
              startTime: setting.startTime,
              endTime: setting.endTime,
            }
          : fallback;
      });
    }
  } catch {
    // Keep auth and attendance usable before the new table is pushed to DB.
  }

  return DEFAULT_SHIFT_SETTINGS;
};

export const getCurrentShift = async () => {
  const [currentShift] = await getActiveShifts();
  if (currentShift) {
    return currentShift;
  }

  return getNowInAppTimezone().hour < 12 ? "PAGI" : "SIANG";
};

export const getActiveShifts = async (): Promise<ShiftValue[]> => {
  const now = getNowInAppTimezone();
  const currentMinutes = now.hour * 60 + now.minute;
  const settings = await getShiftSettings();
  const activeSettings: Array<{
    shift: ShiftValue;
    minutesSinceStart: number;
  }> = [];

  for (const setting of settings) {
    const start = toMinutes(setting.startTime);
    const end = toMinutes(setting.endTime);
    if (start === null || end === null) {
      continue;
    }
    if (isTimeInRange(currentMinutes, start, end)) {
      activeSettings.push({
        shift: setting.shift,
        minutesSinceStart: minutesSinceShiftStart(currentMinutes, start),
      });
    }
  }

  return activeSettings
    .sort((a, b) => a.minutesSinceStart - b.minutesSinceStart)
    .map((setting) => setting.shift);
};

export const getTodayRange = () => {
  const now = getNowInAppTimezone();
  return {
    start: now.startOf("day").toJSDate(),
    end: now.endOf("day").toJSDate(),
  };
};

export const getDateRange = (dateString: string) => {
  const date = DateTime.fromISO(dateString, { zone: APP_TIMEZONE });
  return {
    start: date.startOf("day").toJSDate(),
    end: date.endOf("day").toJSDate(),
  };
};

export const getTodayDate = () => getNowInAppTimezone().startOf("day").toJSDate();

export const parseLocalDate = (dateString: string) =>
  DateTime.fromISO(dateString, { zone: APP_TIMEZONE }).startOf("day").toJSDate();

export const formatLocalDate = (date: Date) =>
  DateTime.fromJSDate(date, { zone: APP_TIMEZONE }).toFormat("yyyy-MM-dd");
