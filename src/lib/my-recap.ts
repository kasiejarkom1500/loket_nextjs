import { DateTime } from "luxon";
import { prisma } from "@/lib/prisma";
import { type SessionPayload } from "@/lib/auth";
import { getShiftSettings } from "@/lib/time";

export const APP_TIMEZONE = "Asia/Jakarta";

export type MyRecapMonth = {
  value: string;
  start: Date;
  end: Date;
};

export type MyRecapSession = Omit<SessionPayload, "role"> & {
  role: "LAYANAN_PUBLIK" | "PERMINTAAN_DATA";
};

export function parseMyRecapMonth(value: string | null): MyRecapMonth | null {
  if (!value || !/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) {
    return null;
  }
  const start = DateTime.fromFormat(value, "yyyy-MM", {
    zone: APP_TIMEZONE,
  }).startOf("month");
  if (!start.isValid) {
    return null;
  }
  return {
    value,
    start: start.toJSDate(),
    end: start.endOf("month").toJSDate(),
  };
}

const formatDate = (value: Date) =>
  DateTime.fromJSDate(value, { zone: APP_TIMEZONE }).toISODate() ?? "";

const iso = (value: Date | null) => value?.toISOString() ?? null;

const emptyPublicDetails = () => ({
  publicNondataOffline: 0,
  publicNondataOnline: 0,
  publicComplaintsOffline: 0,
  publicSkdCount: 0,
});

const emptyDataDetails = () => ({
  dataRequestOffline: 0,
  dataConsultOffline: 0,
  dataRequestOnline: 0,
  dataConsultOnline: 0,
});

export async function getMyRecap(session: MyRecapSession, month: MyRecapMonth) {
  const [user, settings, attendances, assignments, queues] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, nama: true, nipLama: true, username: true },
    }),
    getShiftSettings(),
    prisma.attendance.findMany({
      where: {
        userId: session.userId,
        date: { gte: month.start, lte: month.end },
      },
      orderBy: [{ date: "asc" }, { shift: "asc" }],
    }),
    prisma.assignment.findMany({
      where: {
        userId: session.userId,
        date: { gte: month.start, lte: month.end },
      },
      orderBy: [{ date: "asc" }, { shift: "asc" }],
    }),
    prisma.queue.findMany({
      where: {
        status: "COMPLETED",
        completedAt: { gte: month.start, lte: month.end },
        OR: [
          { publicOfficerId: session.userId },
          { dataOfficerId: session.userId },
        ],
      },
      include: { service: true, counter: true, visitor: true },
      orderBy: { completedAt: "desc" },
    }),
  ]);

  if (!user) {
    throw new Error("Unauthorized");
  }

  const shiftMap = new Map(settings.map((setting) => [setting.shift, setting]));
  const attendanceRows = attendances.map((attendance) => ({
    id: attendance.id,
    date: formatDate(attendance.date),
    shift: attendance.shift,
    role: attendance.role,
    checkInAt: iso(attendance.checkInAt),
    checkOutAt: iso(attendance.checkOutAt),
    shiftStartTime: shiftMap.get(attendance.shift)?.startTime ?? null,
    publicNondataOffline: attendance.publicNondataOffline,
    publicNondataOnline: attendance.publicNondataOnline,
    publicComplaintsOffline: attendance.publicComplaintsOffline,
    publicSkdCount: attendance.publicSkdCount,
    publicNotes: attendance.publicNotes,
    dataRequestOffline: attendance.dataRequestOffline,
    dataConsultOffline: attendance.dataConsultOffline,
    dataRequestOnline: attendance.dataRequestOnline,
    dataConsultOnline: attendance.dataConsultOnline,
    dataNotes: attendance.dataNotes,
  }));

  const assignmentRows = assignments.map((assignment) => ({
    id: assignment.id,
    date: formatDate(assignment.date),
    shift: assignment.shift,
    role: assignment.role,
  }));

  const assignmentKeys = assignmentRows.map(
    (assignment) => `${assignment.date}-${assignment.shift}-${assignment.role}`,
  );
  const attendanceByAssignment = new Map(
    attendanceRows.map((attendance) => [
      `${attendance.date}-${attendance.shift}-${attendance.role}`,
      attendance,
    ]),
  );
  const daysPresent = assignmentKeys.filter((key) =>
    Boolean(attendanceByAssignment.get(key)?.checkInAt),
  ).length;
  const onTimeScore = assignmentRows.reduce((total, assignment) => {
    const attendance = attendanceByAssignment.get(
      `${assignment.date}-${assignment.shift}-${assignment.role}`,
    );
    if (!attendance?.checkInAt || !attendance.shiftStartTime) {
      return total;
    }
    const [hour, minute] = attendance.shiftStartTime.split(":").map(Number);
    const shiftStart = DateTime.fromISO(assignment.date, { zone: APP_TIMEZONE }).set({
      hour,
      minute,
      second: 0,
      millisecond: 0,
    });
    const checkIn = DateTime.fromISO(attendance.checkInAt).setZone(APP_TIMEZONE);
    return total + (checkIn.diff(shiftStart, "minutes").minutes <= 30 ? 1 : 0.7);
  }, 0);
  const checkoutDays = assignmentKeys.filter((key) =>
    Boolean(attendanceByAssignment.get(key)?.checkOutAt),
  ).length;
  const totalDays = assignmentKeys.length;
  const presentRate = totalDays ? daysPresent / totalDays : 0;
  const onTimeRate = totalDays ? onTimeScore / totalDays : 0;
  const checkoutRate = totalDays ? checkoutDays / totalDays : 0;
  const discipline = Math.round(
    (presentRate * 0.5 + onTimeRate * 0.25 + checkoutRate * 0.25) * 100,
  );
  const disciplineStatus =
    discipline >= 90
      ? "Sangat Baik"
      : discipline >= 75
        ? "Baik"
        : discipline >= 60
          ? "Cukup"
          : "Kurang";

  const publicDetails = emptyPublicDetails();
  const dataDetails = emptyDataDetails();
  for (const attendance of attendanceRows) {
    if (session.role === "LAYANAN_PUBLIK") {
      publicDetails.publicNondataOffline += attendance.publicNondataOffline ?? 0;
      publicDetails.publicNondataOnline += attendance.publicNondataOnline ?? 0;
      publicDetails.publicComplaintsOffline += attendance.publicComplaintsOffline ?? 0;
      publicDetails.publicSkdCount += attendance.publicSkdCount ?? 0;
    } else {
      dataDetails.dataRequestOffline += attendance.dataRequestOffline ?? 0;
      dataDetails.dataConsultOffline += attendance.dataConsultOffline ?? 0;
      dataDetails.dataRequestOnline += attendance.dataRequestOnline ?? 0;
      dataDetails.dataConsultOnline += attendance.dataConsultOnline ?? 0;
    }
  }

  const antreanPerLayanan = queues.reduce<Record<string, number>>((result, queue) => {
    result[queue.service.name] = (result[queue.service.name] ?? 0) + 1;
    return result;
  }, {});

  const queueRows = queues.map((queue) => ({
    id: queue.id,
    role:
      queue.publicOfficerId === session.userId
        ? "LAYANAN_PUBLIK"
        : "PERMINTAAN_DATA",
    date: queue.completedAt ? formatDate(queue.completedAt) : null,
    number: queue.number,
    service: queue.service.name,
    counter: queue.counter?.name ?? "-",
    visitor: queue.visitor?.name ?? "-",
    purpose: queue.visitor?.purpose ?? "",
    staffPurposeDetail: queue.staffPurposeDetail ?? "",
    calledAt: iso(queue.calledAt),
    completedAt: iso(queue.completedAt),
  }));
  const roles = Array.from(
    new Set([
      session.role,
      ...attendanceRows.map((attendance) => attendance.role),
      ...assignmentRows.map((assignment) => assignment.role),
      ...queueRows.map((queue) => queue.role),
    ]),
  );

  return {
    user: { ...user, role: session.role, roles },
    month: month.value,
    summary: {
      totalHariBertugas: totalDays,
      hariHadir: daysPresent,
      disiplinPersen: discipline,
      disiplinStatus: disciplineStatus,
      totalAntreanSelesai: queues.length,
      antreanPerLayanan,
      rincianPekerjaan: { ...publicDetails, ...dataDetails },
    },
    attendance: attendanceRows,
    assignments: assignmentRows,
    queues: queueRows,
  };
}
