"use client";

import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";

type AttendanceItem = {
  id: number;
  date: string;
  shift: "PAGI" | "SIANG";
  role: "LAYANAN_PUBLIK" | "PERMINTAAN_DATA";
  user: {
    id: number;
    nama: string;
    nipLama: string;
    username: string;
  };
  checkInAt: string | null;
  checkOutAt: string | null;
  shiftStartTime: string | null;
  shiftEarlyCheckInBufferMinutes: number;
  publicNondataOffline: number | null;
  publicNondataOnline: number | null;
  publicComplaintsOffline: number | null;
  publicSkdCount: number | null;
  publicNotes: string | null;
  dataRequestOffline: number | null;
  dataConsultOffline: number | null;
  dataRequestOnline: number | null;
  dataConsultOnline: number | null;
  dataNotes: string | null;
};

type AssignmentItem = {
  id: number;
  userId: number;
  role: "LAYANAN_PUBLIK" | "PERMINTAAN_DATA";
  date: string; // yyyy-mm-dd
  user: {
    id: number;
    nama: string;
    nipLama: string;
    username: string;
  } | null;
};

const getCurrentMonth = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
};

const formatTime = (value: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
};

const calculateDisciplineScore = (
  assignedDates: string[],
  roleCells: Record<string, AttendanceItem>,
) => {
  const totalAssignedDays = assignedDates.length;

  // days present = assignedDates which have an attendance entry with checkInAt
  const daysPresent = assignedDates.filter((d) => roleCells[d]?.checkInAt).length;

  // On-time scoring per assigned day
  const sumOnTimeScore = assignedDates.reduce((sum, dateKey) => {
    const item = roleCells[dateKey];
    if (!item || !item.checkInAt || !item.shiftStartTime) return sum;

    const [shiftHour, shiftMinute] = item.shiftStartTime.split(":").map(Number);
    const shiftStart = new Date(item.date);
    shiftStart.setHours(shiftHour, shiftMinute, 0, 0);

    const checkInDate = new Date(item.checkInAt);
    const minutesLate = Math.round((checkInDate.getTime() - shiftStart.getTime()) / 60000);

    if (minutesLate <= 30) return sum + 1;
    return sum + 0.7;
  }, 0);

  const onTimeRate = totalAssignedDays > 0 ? sumOnTimeScore / totalAssignedDays : 0;
  const presentRate = totalAssignedDays > 0 ? daysPresent / totalAssignedDays : 0;

  // Checkout rate: count assigned days where a checkout exists
  const sumCheckout = assignedDates.reduce((sum, dateKey) => {
    const item = roleCells[dateKey];
    if (!item || !item.checkOutAt) return sum;
    return sum + 1;
  }, 0);

  const checkoutRate = totalAssignedDays > 0 ? sumCheckout / totalAssignedDays : 0;

  // Final score: Attendance 50%, OnTime 25%, Checkout 25%
  const score = presentRate * 0.5 + onTimeRate * 0.25 + checkoutRate * 0.25;
  const percentage = Math.round(score * 100);

  let status: "Sangat Baik" | "Baik" | "Cukup" | "Kurang" = "Kurang";
  let color = "bg-red-50 border-red-200 text-red-700";
  if (percentage >= 90) {
    status = "Sangat Baik";
    color = "bg-emerald-50 border-emerald-200 text-emerald-700";
  } else if (percentage >= 75) {
    status = "Baik";
    color = "bg-blue-50 border-blue-200 text-blue-700";
  } else if (percentage >= 60) {
    status = "Cukup";
    color = "bg-amber-50 border-amber-200 text-amber-700";
  }

  return { percentage, status, color, daysPresent, totalAssignedDays, onTimeRate };
};

export default function AttendanceRecapPage() {
  const [month, setMonth] = useState(getCurrentMonth());
  const [items, setItems] = useState<AttendanceItem[]>([]);
  const [assignments, setAssignments] = useState<AssignmentItem[]>([]);
  const [status, setStatus] = useState<string | null>(null);

  const load = async () => {
    const response = await fetch(`/api/admin/attendance/recap?month=${month}`);
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setStatus(data.error ?? "Gagal memuat rekap presensi.");
      return;
    }
    const data = await response.json();
    setItems(data.items ?? []);
    setAssignments(data.assignments ?? []);
    setStatus(null);
  };

  useEffect(() => {
    load();
  }, [month]);

  const [year, monthNumber] = month.split("-").map(Number);
  const dayCount = new Date(year, monthNumber, 0).getDate();
  const dayHeaders = Array.from({ length: dayCount }, (_, index) => String(index + 1).padStart(2, "0"));

  const groupedByUser = useMemo(() => {
    const grouped = new Map<number, { id: number; nama: string; nipLama: string; username: string; cells: Record<string, AttendanceItem> }>();

    // include users from assignments so users with assignments but no attendance still appear
    assignments.forEach((a) => {
      if (!a.user) return;
      const existing = grouped.get(a.userId) ?? {
        id: a.user.id,
        nama: a.user.nama,
        nipLama: a.user.nipLama,
        username: a.user.username,
        cells: {},
      };
      grouped.set(a.userId, existing);
    });

    // then add attendance cells
    items.forEach((item) => {
      const existing = grouped.get(item.user.id) ?? {
        id: item.user.id,
        nama: item.user.nama,
        nipLama: item.user.nipLama,
        username: item.user.username,
        cells: {},
      };
      existing.cells[item.date] = item;
      grouped.set(item.user.id, existing);
    });

    return Array.from(grouped.values()).sort((a, b) => a.nama.localeCompare(b.nama, "id-ID"));
  }, [items, assignments]);

  const usersForRole = (role: AttendanceItem["role"]) =>
    groupedByUser.filter((user) => {
      const hasAttendance = Object.values(user.cells).some((c) => c.role === role);
      const hasAssignment = assignments.some((a) => a.userId === user.id && a.role === role);
      return hasAttendance || hasAssignment;
    });

  const buildRoleRows = (role: AttendanceItem["role"]) => {
    return usersForRole(role).map((user) => {
      const roleCells = Object.entries(user.cells)
        .filter(([, item]) => (item as AttendanceItem).role === role)
        .reduce((acc, [date, item]) => {
          acc[date] = item as AttendanceItem;
          return acc;
        }, {} as Record<string, AttendanceItem>);

      const assignedDates = assignments.filter((a) => a.userId === user.id && a.role === role).map((a) => a.date);
      const discipline = calculateDisciplineScore(assignedDates, roleCells);
      return { user, roleCells, assignedDates, discipline };
    });
  };

  const downloadBlob = (data: BlobPart, mime: string, filename: string) => {
    const blob = new Blob([data], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportRoleToCsv = (role: AttendanceItem["role"]) => {
    const rows = buildRoleRows(role);
    const header = ["Nama", "NIP Lama", ...dayHeaders.map((d) => String(d)), "Disiplin (%)"];
    const lines = [header.join(",")];

    rows.forEach(({ user, roleCells, discipline }) => {
      const cells = dayHeaders.map((day) => {
        const key = `${year}-${String(monthNumber).padStart(2, "0")}-${day}`;
        const item = roleCells[key];
        if (!item) return "-";
        const inTime = item.checkInAt ? formatTime(item.checkInAt) : "-";
        const outTime = item.checkOutAt ? formatTime(item.checkOutAt) : "-";
        return `"${inTime} / ${outTime}"`;
      });
      const line = [user.nama, user.nipLama || "-", ...cells, String(discipline.percentage)];
      lines.push(line.join(","));
    });

    const csv = lines.join("\n");
    downloadBlob(csv, "text/csv;charset=utf-8;", `rekap-${role}-${month}.csv`);
  };

  const exportRoleToXlsx = (role: AttendanceItem["role"]) => {
    const rows = buildRoleRows(role);
    const aoa: any[][] = [];
    const header = ["Nama", "NIP Lama", ...dayHeaders.map((d) => String(d)), "Disiplin (%)"];
    aoa.push(header);

    rows.forEach(({ user, roleCells, discipline }) => {
      const row: any[] = [user.nama, user.nipLama || "-"];
      dayHeaders.forEach((day) => {
        const key = `${year}-${String(monthNumber).padStart(2, "0")}-${day}`;
        const item = roleCells[key];
        if (!item) row.push("-");
        else row.push(`${item.checkInAt ? formatTime(item.checkInAt) : "-"} / ${item.checkOutAt ? formatTime(item.checkOutAt) : "-"}`);
      });
      row.push(discipline.percentage);
      aoa.push(row);
    });

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `${role}`);
    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    downloadBlob(wbout, "application/octet-stream", `rekap-${role}-${month}.xlsx`);
  };

  return (
    <>
      <header>
        <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">Admin Presensi</p>
        <h1 className="mt-3 text-3xl font-semibold text-zinc-900">Rekap Presensi</h1>
      </header>

      <section className="rounded-3xl border border-white/70 bg-white/80 p-8 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Filter</p>
            <p className="mt-2 text-sm text-zinc-600">Pilih bulan untuk melihat presensi semua petugas (kedua role).</p>
          </div>
          <input type="month" value={month} onChange={(event) => setMonth(event.target.value)} className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 outline-none focus:border-amber-500" />
        </div>
        {status ? <p className="mt-4 text-sm text-rose-600">{status}</p> : null}
      </section>

      <section className="rounded-3xl border border-white/70 bg-white/80 p-8 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900">Rekap Petugas ({groupedByUser.length})</h2>
            <p className="mt-1 text-sm text-zinc-500">Kolom tanggal menampilkan jam datang dan pulang per petugas per role untuk bulan yang dipilih.</p>
          </div>
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">{month}</p>
        </div>

        <div className="mt-4 space-y-8">
          {( ["LAYANAN_PUBLIK", "PERMINTAAN_DATA"] as const ).map((role) => {
            const rows = buildRoleRows(role);
            return (
              <div key={role}>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-zinc-800">{role === "LAYANAN_PUBLIK" ? "Layanan Publik" : "Permintaan Data"}</h3>
                  <div className="flex gap-2">
                    <button onClick={() => exportRoleToCsv(role)} className="rounded-md border px-3 py-1 text-xs text-zinc-700">Export CSV</button>
                    <button onClick={() => exportRoleToXlsx(role)} className="rounded-md border px-3 py-1 text-xs text-zinc-700">Export Excel</button>
                  </div>
                </div>

                <div className="overflow-auto">
                  <table className="min-w-full text-left text-sm text-zinc-700">
                    <thead className="border-b border-zinc-200 text-xs uppercase tracking-[0.2em] text-zinc-500">
                      <tr>
                        <th className="sticky left-0 bg-white py-3 pr-4">Nama</th>
                        <th className="py-3 pr-4">NIP Lama</th>
                        <th className="py-3 pr-4">Kedisiplinan</th>
                        {dayHeaders.map((day) => (
                          <th key={day} className="min-w-[120px] py-3 px-2 text-center">{day}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.length ? (
                        rows.map(({ user, roleCells, assignedDates, discipline }) => (
                          <tr key={`${user.id}-${role}`} className="border-b border-zinc-100 align-top">
                            <td className="sticky left-0 bg-white py-3 pr-4 font-semibold text-zinc-900">{user.nama}</td>
                            <td className="py-3 pr-4 text-zinc-600">{user.nipLama || "-"}</td>
                            <td className="py-3 pr-4">
                              {discipline.totalAssignedDays === 0 ? (
                                <div className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold bg-zinc-50 border-zinc-200 text-zinc-600">Tanpa Penugasan</div>
                              ) : (
                                <div className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold ${discipline.color}`}><span>{discipline.percentage}%</span><span className="text-[9px]">{discipline.status}</span></div>
                              )}
                            </td>
                            {dayHeaders.map((day) => {
                              const dateKey = `${year}-${String(monthNumber).padStart(2, "0")}-${day}`;
                              const attendance = (roleCells as Record<string, AttendanceItem>)[dateKey];
                              return (
                                <td key={day} className="border-l border-zinc-100 px-2 py-2">
                                  <div className="min-w-[110px] rounded-lg border border-zinc-100 bg-zinc-50/70 px-2 py-2 text-[11px]">
                                    <div className="font-semibold text-emerald-700">Datang: {formatTime(attendance?.checkInAt ?? null)}</div>
                                    <div className="mt-1 font-semibold text-amber-700">Pulang: {formatTime(attendance?.checkOutAt ?? null)}</div>
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td className="py-4 text-sm text-zinc-500" colSpan={dayHeaders.length + 3}>Belum ada data untuk role ini.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}
