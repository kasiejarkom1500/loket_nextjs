import { DateTime } from "luxon";

const APP_TIMEZONE = "Asia/Jakarta";

export const getNowInAppTimezone = () => DateTime.now().setZone(APP_TIMEZONE);

export const getCurrentShift = () =>
  getNowInAppTimezone().hour < 12 ? "PAGI" : "SIANG";

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
