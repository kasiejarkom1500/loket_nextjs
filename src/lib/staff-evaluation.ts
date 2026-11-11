import { DateTime } from "luxon";
import { prisma } from "@/lib/prisma";
import { getShiftSettings } from "@/lib/time";

export const EVALUATION_ROLES = ["LAYANAN_PUBLIK", "PERMINTAAN_DATA"] as const;
export type EvaluationRole = (typeof EVALUATION_ROLES)[number];
export function parseEvaluationMonth(value: string | null) {
  if (!value || !/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) return null;
  const start = DateTime.fromFormat(value, "yyyy-MM", { zone: "Asia/Jakarta" }).startOf("month");
  return start.isValid && start.toFormat("yyyy-MM") === value
    ? { value, start: start.toJSDate(), end: start.endOf("month").toJSDate() }
    : null;
}

type EvaluationItem = {
  userId: number; nama: string; nipLama: string; disiplinPersen: number | null; disiplinStatus: string;
  totalLayanan: number; totalCheckout: number; totalAntreanPengganti: number;
  rincian: Record<string, number | null>; rincianCheckoutAda: boolean; kinerjaSkor: number; antreanSelesai: number;
  ratingSkor: number; ratingRataRata: number; ratingJumlah: number;
};

type DisciplineCell = { checkInAt: Date | null; checkOutAt: Date | null; date: Date; shiftStartTime: string | null };
const calculateDiscipline = (assignedDates: string[], cells: Map<string, DisciplineCell>) => {
  const totalAssignedDays = assignedDates.length;
  const daysPresent = assignedDates.filter((day) => cells.get(day)?.checkInAt).length;
  const sumOnTimeScore = assignedDates.reduce((sum, dateKey) => {
    const item = cells.get(dateKey);
    if (!item || !item.checkInAt || !item.shiftStartTime) return sum;
    const [shiftHour, shiftMinute] = item.shiftStartTime.split(":").map(Number);
    const shiftStart = new Date(item.date);
    shiftStart.setHours(shiftHour, shiftMinute, 0, 0);
    const minutesLate = Math.round((item.checkInAt.getTime() - shiftStart.getTime()) / 60000);
    return sum + (minutesLate <= 30 ? 1 : 0.7);
  }, 0);
  const onTimeRate = totalAssignedDays ? sumOnTimeScore / totalAssignedDays : 0;
  const presentRate = totalAssignedDays ? daysPresent / totalAssignedDays : 0;
  const sumCheckout = assignedDates.reduce((sum, key) => sum + (cells.get(key)?.checkOutAt ? 1 : 0), 0);
  const checkoutRate = totalAssignedDays ? sumCheckout / totalAssignedDays : 0;
  const percentage = Math.round((presentRate * 0.5 + onTimeRate * 0.25 + checkoutRate * 0.25) * 100);
  const status = !totalAssignedDays ? "Tanpa Penugasan" : percentage >= 90 ? "Sangat Baik" : percentage >= 75 ? "Baik" : percentage >= 60 ? "Cukup" : "Kurang";
  return { percentage: totalAssignedDays ? percentage : null, status };
};

export async function getStaffEvaluation(month: { value: string; start: Date; end: Date }, role: EvaluationRole) {
  const officerField = role === "LAYANAN_PUBLIK" ? "publicOfficerId" : "dataOfficerId";
  const [settings, assignments, attendances, queues, ratings] = await Promise.all([
    getShiftSettings(),
    prisma.assignment.findMany({ where: { role, date: { gte: month.start, lte: month.end } }, include: { user: { select: { id: true, nama: true, nipLama: true } } } }),
    prisma.attendance.findMany({ where: { role, date: { gte: month.start, lte: month.end } }, include: { user: { select: { id: true, nama: true, nipLama: true } } }, orderBy: [{ date: "asc" }, { shift: "asc" }] }),
    prisma.queue.findMany({ where: { status: "COMPLETED", completedAt: { gte: month.start, lte: month.end }, [officerField]: { not: null } }, select: { completedAt: true, publicOfficerId: true, dataOfficerId: true } }),
    prisma.rating.findMany({ where: { createdAt: { gte: month.start, lte: month.end } }, include: { queue: { select: { publicOfficerId: true, dataOfficerId: true } } } }),
  ]);

  const users = new Map<number, { id: number; nama: string; nipLama: string }>();
  assignments.forEach((row) => users.set(row.userId, row.user));
  attendances.forEach((row) => users.set(row.userId, row.user));
  const queuesByUser = new Map<number, Map<string, number>>();
  const queueCountByUser = new Map<number, number>();
  for (const queue of queues) {
    const userId = role === "LAYANAN_PUBLIK" ? queue.publicOfficerId : queue.dataOfficerId;
    if (!userId || !queue.completedAt) continue;
    const day = DateTime.fromJSDate(queue.completedAt, { zone: "Asia/Jakarta" }).toISODate() ?? "";
    const days = queuesByUser.get(userId) ?? new Map<string, number>();
    days.set(day, (days.get(day) ?? 0) + 1);
    queuesByUser.set(userId, days);
    queueCountByUser.set(userId, (queueCountByUser.get(userId) ?? 0) + 1);
  }
  const queueUserIds = Array.from(queuesByUser.keys());
  const queueUsers = queueUserIds.length ? await prisma.user.findMany({ where: { id: { in: queueUserIds } }, select: { id: true, nama: true, nipLama: true } }) : [];
  queueUsers.forEach((user) => users.set(user.id, user));

  const shiftTimes = new Map(settings.map((setting) => [setting.shift, setting.startTime]));
  const cellsByUser = new Map<number, Map<string, DisciplineCell>>();
  for (const row of attendances) {
    const day = DateTime.fromJSDate(row.date, { zone: "Asia/Jakarta" }).toISODate() ?? "";
    const cells = cellsByUser.get(row.userId) ?? new Map<string, DisciplineCell>();
    cells.set(day, { checkInAt: row.checkInAt, checkOutAt: row.checkOutAt, date: row.date, shiftStartTime: shiftTimes.get(row.shift) ?? null });
    cellsByUser.set(row.userId, cells);
  }
  const assignedByUser = new Map<number, Set<string>>();
  for (const row of assignments) {
    const dates = assignedByUser.get(row.userId) ?? new Set<string>();
    dates.add(DateTime.fromJSDate(row.date, { zone: "Asia/Jakarta" }).toISODate() ?? "");
    assignedByUser.set(row.userId, dates);
  }
  const ratingBuckets = new Map<number, { total: number; count: number }>();
  for (const rating of ratings) {
    const userId = role === "LAYANAN_PUBLIK" ? rating.queue.publicOfficerId : rating.queue.dataOfficerId;
    const score = role === "LAYANAN_PUBLIK" ? rating.publicOfficerScore : rating.dataOfficerScore;
    if (!userId || score === null) continue;
    const bucket = ratingBuckets.get(userId) ?? { total: 0, count: 0 };
    bucket.total += score;
    bucket.count += 1;
    ratingBuckets.set(userId, bucket);
  }
  const items: EvaluationItem[] = Array.from(users.values()).map((user) => {
    const assignedDays = assignedByUser.get(user.id) ?? new Set<string>();
    const assignmentsForUser = Array.from(assignedDays);
    const scores = calculateDiscipline(assignmentsForUser, cellsByUser.get(user.id) ?? new Map());
    const rincian: Record<string, number | null> = role === "LAYANAN_PUBLIK"
      ? { publicNondataOffline: 0, publicComplaintsOffline: 0, publicNondataOnline: 0, publicSkdCount: 0 }
      : { dataRequestOffline: 0, dataConsultOffline: 0, dataRequestOnline: 0, dataConsultOnline: 0 };
    const checkoutDays = new Set<string>();
    let totalCheckout = 0;
    for (const row of attendances) {
      if (row.userId !== user.id || !row.checkOutAt) continue;
      checkoutDays.add(DateTime.fromJSDate(row.date, { zone: "Asia/Jakarta" }).toISODate() ?? "");
      const fields = role === "LAYANAN_PUBLIK"
        ? ["publicNondataOffline", "publicComplaintsOffline", "publicNondataOnline", "publicSkdCount"] as const
        : ["dataRequestOffline", "dataConsultOffline", "dataRequestOnline", "dataConsultOnline"] as const;
      for (const field of fields) {
        const count = row[field] ?? 0;
        rincian[field] = (rincian[field] ?? 0)! + count;
        totalCheckout += count;
      }
    }
    let totalAntreanPengganti = 0;
    const queueDays = queuesByUser.get(user.id) ?? new Map<string, number>();
    for (const [day, count] of queueDays) {
      if (!assignedDays.has(day) && !checkoutDays.has(day)) {
        totalAntreanPengganti += count;
      }
    }
    const rating = ratingBuckets.get(user.id) ?? { total: 0, count: 0 };
    const ratingRataRata = rating.count ? rating.total / rating.count : 0;
    return {
      userId: user.id, nama: user.nama, nipLama: user.nipLama,
      disiplinPersen: scores.percentage, disiplinStatus: scores.status,
      totalCheckout, totalAntreanPengganti, totalLayanan: totalCheckout + totalAntreanPengganti,
      rincian, rincianCheckoutAda: checkoutDays.size > 0, kinerjaSkor: 0, antreanSelesai: queueCountByUser.get(user.id) ?? 0,
      ratingSkor: rating.count ? Math.min(100, 85 + ratingRataRata * 3) : 85,
      ratingRataRata, ratingJumlah: rating.count,
    };
  }).sort((a, b) => a.nama.localeCompare(b.nama, "id-ID"));
  const maxTotal = items.reduce((max, item) => Math.max(max, item.totalLayanan), 0);
  for (const item of items) item.kinerjaSkor = maxTotal ? Number(((item.totalLayanan / maxTotal) * 100).toFixed(1)) : 0;
  return { month: month.value, role, maxTotal, items };
}

export type StaffEvaluationResult = Awaited<ReturnType<typeof getStaffEvaluation>>;
export type StaffEvaluationItem = StaffEvaluationResult["items"][number];
