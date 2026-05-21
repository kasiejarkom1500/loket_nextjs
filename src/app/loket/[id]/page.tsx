"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { onValue, ref } from "firebase/database";
import { firebaseClientDb, firebaseClientReady } from "@/lib/firebase-client";
import AppNav from "@/components/AppNav";

type CounterState = {
  queueId: number;
  number: string;
  serviceName: string;
  calledAt: string | null;
  visitorName: string;
  visitorPhone: string;
  visitorOrigin: string;
  visitorPurpose: string;
  staffPurposeDetail: string;
  publicOfficerName: string;
  dataOfficerName: string;
  securityOfficerName: string;
};

type RealtimeState = {
  updatedAt: string;
  counters: Record<string, CounterState | null>;
  pending: Array<{
    queueId: number;
    number: string;
    serviceName: string;
    createdAt: string;
    visitorName: string;
    visitorPhone: string;
    visitorOrigin: string;
    visitorPurpose: string;
  }>;
};

type AttendanceMeta = {
  shift: "PAGI" | "SIANG";
  startTime: string | null;
  endTime: string | null;
  lateMinutes: number;
};

function formatLate(minutes: number) {
  if (minutes < 60) {
    return `${minutes} menit`;
  }
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} jam ${rest} menit` : `${hours} jam`;
}

function AttendanceBadge({
  label,
  done,
  detail,
  lateMinutes,
}: {
  label: string;
  done: boolean;
  detail?: string;
  lateMinutes?: number;
}) {
  const isLate = done && typeof lateMinutes === "number" && lateMinutes > 0;
  const style = done
    ? isLate
      ? "border-amber-200 bg-amber-50 text-amber-800"
      : "border-emerald-200 bg-emerald-50 text-emerald-700"
    : "border-zinc-200 bg-zinc-50 text-zinc-500";

  return (
    <div className={`rounded-2xl border px-4 py-3 ${style}`}>
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-70">
        {label}
      </p>
      <p className="mt-1 text-sm font-bold">
        {done ? "Sudah Presensi" : "Belum Presensi"}
      </p>
      {detail ? <p className="mt-1 text-xs font-medium">{detail}</p> : null}
      {isLate ? (
        <p className="mt-1 text-xs font-bold">
          Terlambat {formatLate(lateMinutes)}
        </p>
      ) : null}
    </div>
  );
}

export default function LoketPage() {
  const params = useParams<{ id: string }>();
  const counterId = Number(params.id);
  const [state, setState] = useState<RealtimeState | null>(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [profile, setProfile] = useState<{
    nama: string;
    username: string;
    role: string;
  } | null>(null);
  const [services, setServices] = useState<Array<{ id: number; name: string }>>(
    [],
  );
  const [dataOfficers, setDataOfficers] = useState<
    Array<{ id: number; nama: string }>
  >([]);
  const [securityOfficers, setSecurityOfficers] = useState<
    Array<{ id: number; name: string }>
  >([]);
  const [defaultDataOfficerId, setDefaultDataOfficerId] = useState("");
  const [defaultSecurityOfficerId, setDefaultSecurityOfficerId] = useState("");
  const [selectedDataOfficer, setSelectedDataOfficer] = useState<
    Record<number, string>
  >({});
  const [selectedSecurityOfficer, setSelectedSecurityOfficer] = useState<
    Record<number, string>
  >({});
  const [attendance, setAttendance] = useState<{
    checkInAt: string | null;
    checkOutAt: string | null;
  } | null>(null);
  const [attendanceMeta, setAttendanceMeta] = useState<AttendanceMeta | null>(
    null,
  );
  const [showDefaults, setShowDefaults] = useState(false);
  const [showOfficerDetail, setShowOfficerDetail] = useState(true);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [attendanceOpen, setAttendanceOpen] = useState(false);
  const [publicCheckout, setPublicCheckout] = useState({
    publicNondataOffline: "",
    publicNondataOnline: "",
    publicComplaintsOffline: "",
    publicSkdCount: "",
    publicNotes: "",
  });
  const [staffNote, setStaffNote] = useState("");
  const searchParams = useSearchParams();
  const activeTab = (searchParams.get("tab") === "attendance" ? "attendance" : "queue") as "queue" | "attendance";
  const currentQueue = useMemo(
    () => (state?.counters ? state.counters[String(counterId)] : null),
    [state, counterId],
  );
  const [lastQueueId, setLastQueueId] = useState<number | null>(null);
  const isDataService = (serviceName: string) =>
    serviceName.toLowerCase().includes("permintaan data");

  useEffect(() => {
    const loadProfile = async () => {
      const response = await fetch("/api/auth/me");
      if (!response.ok) {
        return;
      }
      const data = await response.json();
      setProfile(data.user ?? null);
    };
    loadProfile();
  }, []);

  useEffect(() => {
    const fetchOnce = async () => {
      const response = await fetch("/api/queue/current");
      if (!response.ok) {
        return;
      }
      const data = await response.json();
      setState(data);
    };

    fetchOnce();

    if (!firebaseClientReady || !firebaseClientDb) {
      return;
    }

    const stateRef = ref(firebaseClientDb, "state");
    const unsubscribe = onValue(stateRef, (snapshot) => {
      if (snapshot.exists()) {
        setState(snapshot.val());
      } else {
        fetchOnce();
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const loadServices = async () => {
      const response = await fetch("/api/services");
      if (!response.ok) {
        return;
      }
      const data = await response.json();
      setServices(data.services ?? []);
    };
    loadServices();
  }, []);

  const loadAttendance = useCallback(async () => {
    const response = await fetch("/api/attendance/status");
    if (!response.ok) {
      return;
    }
    const data = await response.json();
    setAttendance(data.attendance ?? null);
    setAttendanceMeta(data.meta ?? null);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadAttendance();
  }, [loadAttendance]);

  useEffect(() => {
    const loadOfficers = async () => {
      const [dataResponse, securityResponse] = await Promise.all([
        fetch("/api/assignments/active?role=PERMINTAAN_DATA"),
        fetch("/api/security-officers"),
      ]);
      if (dataResponse.ok) {
        const data = await dataResponse.json();
        setDataOfficers(data.users ?? []);
      }
      if (securityResponse.ok) {
        const data = await securityResponse.json();
        setSecurityOfficers(data.securityOfficers ?? []);
      }
    };
    loadOfficers();
  }, []);

  useEffect(() => {
    if (!currentQueue) {
      return;
    }
    if (lastQueueId === currentQueue.queueId) {
      return;
    }
    setLastQueueId(currentQueue.queueId);
    setStaffNote(currentQueue.staffPurposeDetail || "");
    setToast(`Antrian ${currentQueue.number} dipanggil.`);
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    }
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [currentQueue, lastQueueId]);

  useEffect(() => {
    if (!currentQueue) {
      return;
    }
    setStaffNote(currentQueue.staffPurposeDetail || "");
  }, [currentQueue?.queueId, currentQueue?.staffPurposeDetail]);

  const refreshState = async () => {
    const response = await fetch("/api/queue/current");
    if (!response.ok) {
      return;
    }
    const data = await response.json();
    setState(data);
  };

  const handleCallNext = async () => {
    if (!counterId) {
      return;
    }
    const nextPending = state?.pending?.reduce((earliest, queue) => {
      if (!earliest) {
        return queue;
      }
      return new Date(queue.createdAt) < new Date(earliest.createdAt)
        ? queue
        : earliest;
    }, null as RealtimeState["pending"][number] | null);
    let dataOfficerIdToSend: number | null = null;
    if (nextPending && isDataService(nextPending.serviceName)) {
      const dataOfficerId = defaultDataOfficerId;
      if (!dataOfficerId) {
        setToast("Petugas permintaan data wajib dipilih.");
        setTimeout(() => setToast(null), 3000);
        return;
      }
      dataOfficerIdToSend = Number(dataOfficerId);
    }
    setLoading(true);
    const response = await fetch("/api/queue/call", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        counterId,
        dataOfficerId: dataOfficerIdToSend,
        securityOfficerId: defaultSecurityOfficerId
          ? Number(defaultSecurityOfficerId)
          : null,
      }),
    });
    setLoading(false);
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setToast(data.error ?? "Gagal memanggil antrian.");
      setTimeout(() => setToast(null), 3000);
      return;
    }
    if (!firebaseClientReady) {
      await refreshState();
    }
  };

  const handleComplete = async () => {
    if (!currentQueue?.queueId) {
      return;
    }
    setLoading(true);
    const response = await fetch("/api/queue/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ queueId: currentQueue.queueId }),
    });
    setLoading(false);
    if (!response.ok) {
      return;
    }
    if (!firebaseClientReady) {
      await refreshState();
    }
  };

  const handleTakeQueue = async (queueId: number) => {
    if (!counterId) {
      return;
    }
    const dataOfficerId =
      selectedDataOfficer[queueId] || defaultDataOfficerId;
    const targetQueue = state?.pending?.find(
      (queue) => queue.queueId === queueId,
    );
    const shouldUseDataOfficer =
      targetQueue && isDataService(targetQueue.serviceName);
    if (shouldUseDataOfficer && !dataOfficerId) {
      setToast("Petugas permintaan data wajib dipilih.");
      setTimeout(() => setToast(null), 3000);
      return;
    }
    setLoading(true);
    const response = await fetch("/api/queue/call", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        counterId,
        queueId,
        dataOfficerId: shouldUseDataOfficer && dataOfficerId
          ? Number(dataOfficerId)
          : null,
        securityOfficerId: selectedSecurityOfficer[queueId]
          ? Number(selectedSecurityOfficer[queueId])
          : defaultSecurityOfficerId
            ? Number(defaultSecurityOfficerId)
            : null,
      }),
    });
    setLoading(false);
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setToast(data.error ?? "Gagal mengambil antrian.");
      setTimeout(() => setToast(null), 3000);
      return;
    }
    if (!firebaseClientReady) {
      await refreshState();
    }
  };

  const handleChangeService = async (queueId: number, serviceId: number) => {
    setLoading(true);
    const response = await fetch("/api/queue/update-service", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ queueId, serviceId }),
    });
    setLoading(false);
    if (!response.ok) {
      return;
    }
    if (!firebaseClientReady) {
      await refreshState();
    }
  };

  const handleSaveStaffNote = async () => {
    if (!currentQueue) {
      return;
    }
    const response = await fetch("/api/queue/update-staff-purpose", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        queueId: currentQueue.queueId,
        staffPurposeDetail: staffNote,
      }),
    });
    if (!response.ok) {
      return;
    }
    if (!firebaseClientReady) {
      await refreshState();
    }
    setToast("Detail keperluan disimpan.");
    setTimeout(() => setToast(null), 3000);
  };

  const handleReplaySound = async () => {
    if (!currentQueue) {
      return;
    }
    const response = await fetch("/api/queue/announce", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ counterId }),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setToast(data.error ?? "Gagal memutar ulang panggilan.");
      setTimeout(() => setToast(null), 3000);
      return;
    }
    setToast("Panggilan diulang.");
    setTimeout(() => setToast(null), 3000);
  };

  const handleCheckIn = async () => {
    setAttendanceLoading(true);
    const response = await fetch("/api/attendance/check-in", {
      method: "POST",
    });
    setAttendanceLoading(false);
    if (!response.ok) {
      return;
    }
    await loadAttendance();
    setToast("Presensi datang tersimpan.");
    setTimeout(() => setToast(null), 3000);
  };

  const handleCheckOut = async () => {
    if (
      !publicCheckout.publicNondataOffline ||
      !publicCheckout.publicNondataOnline ||
      !publicCheckout.publicComplaintsOffline ||
      !publicCheckout.publicSkdCount
    ) {
      setToast("Lengkapi semua isian presensi pulang terlebih dahulu.");
      setTimeout(() => setToast(null), 3000);
      return;
    }
    setAttendanceLoading(true);
    const response = await fetch("/api/attendance/check-out", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(publicCheckout),
    });
    setAttendanceLoading(false);
    if (!response.ok) {
      return;
    }
    await loadAttendance();
    setToast("Presensi pulang tersimpan.");
    setTimeout(() => setToast(null), 3000);
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#dbeafe,transparent_60%),linear-gradient(120deg,#f8fafc,#eff6ff)] px-6 py-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <AppNav />

        <div>
          <h1 className="text-4xl font-semibold text-zinc-900">
            Loket {counterId || "-"}
          </h1>
          <p className="mt-3 text-sm text-zinc-600">
            Panggil antrian berikutnya dan tandai selesai pelayanan.
          </p>
        </div>

        {activeTab === "queue" ? (
          <section className="rounded-3xl border border-white/70 bg-white/80 p-8 shadow-sm">
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
            Antrian Saat Ini
          </p>
          {currentQueue ? (
            <>
              <p className="mt-4 text-4xl font-semibold text-zinc-900">
                {currentQueue.number}
              </p>
              <p className="mt-2 text-sm text-zinc-600">
                {currentQueue.serviceName}
              </p>
              <div className="mt-4 rounded-2xl border border-zinc-200 bg-white px-4 py-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                    Detail Petugas
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowOfficerDetail((prev) => !prev)}
                    className="text-xs font-semibold text-zinc-600 hover:text-zinc-900"
                  >
                    {showOfficerDetail ? "Sembunyikan" : "Tampilkan"}
                  </button>
                </div>
                {showOfficerDetail ? (
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                        Petugas Layanan Publik
                      </p>
                      <p className="mt-2 text-sm font-semibold text-zinc-900">
                        {currentQueue.publicOfficerName}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                        Petugas Permintaan Data
                      </p>
                      <p className="mt-2 text-sm font-semibold text-zinc-900">
                        {currentQueue.dataOfficerName}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                        Satpam
                      </p>
                      <p className="mt-2 text-sm font-semibold text-zinc-900">
                        {currentQueue.securityOfficerName}
                      </p>
                    </div>
                  </div>
                ) : null}
              </div>
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                    Nama
                  </p>
                  <p className="mt-2 text-sm font-semibold text-zinc-900">
                    {currentQueue.visitorName}
                  </p>
                </div>
                <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                    Nomor Telepon
                  </p>
                  <p className="mt-2 text-sm font-semibold text-zinc-900">
                    {currentQueue.visitorPhone}
                  </p>
                </div>
                <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                    Asal
                  </p>
                  <p className="mt-2 text-sm font-semibold text-zinc-900">
                    {currentQueue.visitorOrigin}
                  </p>
                </div>
                <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                    Keperluan
                  </p>
                  <p className="mt-2 text-sm font-semibold text-zinc-900">
                    {currentQueue.visitorPurpose}
                  </p>
                </div>
              </div>
              <div className="mt-6 rounded-2xl border border-zinc-200 bg-white px-4 py-3">
                <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                  Detail Keperluan (Petugas)
                </p>
                <textarea
                  value={staffNote}
                  onChange={(event) => setStaffNote(event.target.value)}
                  className="mt-3 min-h-[90px] w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-amber-500"
                  placeholder="Catatan tambahan dari petugas."
                />
                <button
                  type="button"
                  onClick={handleSaveStaffNote}
                  className="mt-3 inline-flex h-10 items-center justify-center rounded-full bg-zinc-900 px-5 text-xs font-semibold text-white transition hover:bg-zinc-800"
                >
                  Simpan Detail
                </button>
              </div>
            </>
          ) : (
            <p className="mt-4 text-sm text-zinc-500">
              Belum ada antrian yang dipanggil untuk loket ini.
            </p>
          )}
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={handleCallNext}
              disabled={loading}
              className="inline-flex h-12 items-center justify-center rounded-full bg-zinc-900 px-8 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
            >
              Panggil Selanjutnya
            </button>
            <button
              type="button"
              onClick={handleReplaySound}
              disabled={!currentQueue || loading}
              className="inline-flex h-12 items-center justify-center rounded-full border border-amber-200 bg-amber-50 px-8 text-sm font-semibold text-amber-700 transition hover:border-amber-300 disabled:cursor-not-allowed disabled:text-amber-300"
            >
              Ulangi Panggilan
            </button>
            <button
              type="button"
              onClick={handleComplete}
              disabled={!currentQueue || loading}
              className="inline-flex h-12 items-center justify-center rounded-full border border-zinc-300 bg-white px-8 text-sm font-semibold text-zinc-800 transition hover:border-zinc-400 disabled:cursor-not-allowed disabled:text-zinc-400"
            >
              Selesai
            </button>
          </div>
        </section>
        ) : null}

        {activeTab === "queue" ? (
          <section className="rounded-3xl border border-white/70 bg-white/80 p-6 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                  Default Petugas
                </p>
                <p className="mt-2 text-sm text-zinc-600">
                  Pilih petugas permintaan data dan satpam default.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowDefaults((prev) => !prev)}
                className="inline-flex h-10 items-center justify-center rounded-full border border-zinc-300 bg-white px-5 text-xs font-semibold text-zinc-700 transition hover:border-zinc-400"
              >
                {showDefaults ? "Sembunyikan" : "Tampilkan"}
              </button>
            </div>
            {showDefaults ? (
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                    Petugas Permintaan Data (Default)
                  </p>
                  <select
                    value={defaultDataOfficerId}
                    onChange={(event) =>
                      setDefaultDataOfficerId(event.target.value)
                    }
                    className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900"
                  >
                    <option value="">Pilih Petugas</option>
                    {dataOfficers.map((officer) => (
                      <option key={officer.id} value={officer.id}>
                        {officer.nama}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                    Satpam (Default)
                  </p>
                  <select
                    value={defaultSecurityOfficerId}
                    onChange={(event) =>
                      setDefaultSecurityOfficerId(event.target.value)
                    }
                    className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900"
                  >
                    <option value="">Pilih Satpam</option>
                    {securityOfficers.map((officer) => (
                      <option key={officer.id} value={officer.id}>
                        {officer.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ) : null}
          </section>
        ) : null}

        {activeTab === "queue" ? (
          <section className="rounded-3xl border border-white/70 bg-white/80 p-8 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-semibold text-zinc-900">
              Daftar Antrian Baru
            </h2>
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
              Total: {state?.pending?.length ?? 0}
            </p>
          </div>
          <div className="mt-4 overflow-auto">
            <table className="min-w-full text-left text-sm text-zinc-700">
              <thead className="border-b border-zinc-200 text-xs uppercase tracking-[0.2em] text-zinc-500">
                <tr>
                  <th className="py-3 pr-4">Nomor</th>
                  <th className="py-3 pr-4">Layanan</th>
                  <th className="py-3 pr-4">Nama</th>
                  <th className="py-3 pr-4">Telepon</th>
                  <th className="py-3 pr-4">Asal</th>
                  <th className="py-3 pr-4">Keperluan</th>
                  <th className="py-3 pr-4">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {state?.pending?.length ? (
                  state.pending.map((queue) => (
                    <tr key={queue.queueId} className="border-b border-zinc-100">
                      <td className="py-3 pr-4 font-semibold">
                        {queue.number}
                      </td>
                      <td className="py-3 pr-4">{queue.serviceName}</td>
                      <td className="py-3 pr-4">{queue.visitorName}</td>
                      <td className="py-3 pr-4">{queue.visitorPhone}</td>
                      <td className="py-3 pr-4">{queue.visitorOrigin}</td>
                      <td className="py-3 pr-4">{queue.visitorPurpose}</td>
                      <td className="py-3 pr-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <select
                            value={
                              services.find(
                                (service) => service.name === queue.serviceName,
                              )?.id ?? ""
                            }
                            onChange={(event) =>
                              handleChangeService(
                                queue.queueId,
                                Number(event.target.value),
                              )
                            }
                            className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs text-zinc-700"
                          >
                            {services.map((service) => (
                              <option key={service.id} value={service.id}>
                                {service.name}
                              </option>
                            ))}
                          </select>
                          <select
                            value={
                              selectedDataOfficer[queue.queueId] ??
                              defaultDataOfficerId
                            }
                            onChange={(event) =>
                              setSelectedDataOfficer((prev) => ({
                                ...prev,
                                [queue.queueId]: event.target.value,
                              }))
                            }
                            className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs text-zinc-700"
                            disabled={!isDataService(queue.serviceName)}
                          >
                            {isDataService(queue.serviceName) ? (
                              <>
                                <option value="">Petugas Data</option>
                                {dataOfficers.map((officer) => (
                                  <option key={officer.id} value={officer.id}>
                                    {officer.nama}
                                  </option>
                                ))}
                              </>
                            ) : (
                              <option value="">Tidak diperlukan</option>
                            )}
                          </select>
                          <select
                            value={
                              selectedSecurityOfficer[queue.queueId] ??
                              defaultSecurityOfficerId
                            }
                            onChange={(event) =>
                              setSelectedSecurityOfficer((prev) => ({
                                ...prev,
                                [queue.queueId]: event.target.value,
                              }))
                            }
                            className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs text-zinc-700"
                          >
                            <option value="">Satpam</option>
                            {securityOfficers.map((officer) => (
                              <option key={officer.id} value={officer.id}>
                                {officer.name}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => handleTakeQueue(queue.queueId)}
                            className="rounded-full border border-zinc-300 bg-white px-3 py-1 text-xs font-semibold text-zinc-700 hover:border-zinc-400"
                          >
                            Ambil
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="py-4 text-sm text-zinc-500" colSpan={7}>
                      Belum ada antrian baru.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
        ) : null}

        {activeTab === "attendance" ? (
          <section className="rounded-3xl border border-white/70 bg-white/80 p-6 shadow-sm">
            <div className="flex flex-col gap-5">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                  Presensi Petugas Layanan Publik
                </p>
                <p className="mt-2 text-sm text-zinc-600">
                  Shift {attendanceMeta?.shift === "SIANG" ? "Siang" : "Pagi"}
                  {attendanceMeta?.startTime && attendanceMeta?.endTime
                    ? ` · ${attendanceMeta.startTime}-${attendanceMeta.endTime}`
                    : ""}
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <AttendanceBadge
                  label="Presensi Datang"
                  done={Boolean(attendance?.checkInAt)}
                  detail={
                    attendanceMeta?.startTime
                      ? `Mulai shift ${attendanceMeta.startTime}`
                      : undefined
                  }
                  lateMinutes={attendanceMeta?.lateMinutes}
                />
                <AttendanceBadge
                  label="Presensi Pulang"
                  done={Boolean(attendance?.checkOutAt)}
                  detail={
                    attendanceMeta?.endTime
                      ? `Selesai shift ${attendanceMeta.endTime}`
                      : undefined
                  }
                />
              </div>
              <div className="flex flex-wrap gap-3 sm:justify-end">
                <button
                  type="button"
                  onClick={handleCheckIn}
                  disabled={attendanceLoading || Boolean(attendance?.checkInAt)}
                  className="inline-flex h-10 items-center justify-center rounded-full bg-zinc-900 px-5 text-xs font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
                >
                  Presensi Datang
                </button>
                <button
                  type="button"
                  onClick={() => setAttendanceOpen(true)}
                  className="inline-flex h-10 items-center justify-center rounded-full border border-zinc-300 bg-white px-5 text-xs font-semibold text-zinc-700 transition hover:border-zinc-400"
                >
                  Presensi Pulang
                </button>
              </div>
            </div>
          </section>
        ) : null}
        {toast ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
            {toast}
          </div>
        ) : null}
      </div>
      {toast ? (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800 shadow-lg">
          {toast}
        </div>
      ) : null}
      {attendanceOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6">
          <div className="w-full max-w-4xl rounded-3xl border border-white/70 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-zinc-100 px-8 py-5">
              <h2 className="text-lg font-semibold text-zinc-900">
                Presensi Pulang - Layanan Publik
              </h2>
              <button
                type="button"
                onClick={() => setAttendanceOpen(false)}
                className="text-sm font-semibold text-zinc-500 hover:text-zinc-800"
              >
                Tutup
              </button>
            </div>
            <div className="px-8 py-6">
              <div className="grid gap-5 md:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <label className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                    Permintaan informasi publik (nondata) kunjungan langsung
                  </label>
                  <input
                    type="number"
                    value={publicCheckout.publicNondataOffline}
                    onChange={(event) =>
                      setPublicCheckout((prev) => ({
                        ...prev,
                        publicNondataOffline: event.target.value,
                      }))
                    }
                    className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none focus:border-amber-500"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                    Permintaan informasi publik (nondata) online
                  </label>
                  <input
                    type="number"
                    value={publicCheckout.publicNondataOnline}
                    onChange={(event) =>
                      setPublicCheckout((prev) => ({
                        ...prev,
                        publicNondataOnline: event.target.value,
                      }))
                    }
                    className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none focus:border-amber-500"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                    Jumlah pengaduan masuk (kunjungan langsung)
                  </label>
                  <input
                    type="number"
                    value={publicCheckout.publicComplaintsOffline}
                    onChange={(event) =>
                      setPublicCheckout((prev) => ({
                        ...prev,
                        publicComplaintsOffline: event.target.value,
                      }))
                    }
                    className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none focus:border-amber-500"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                    Jumlah pengunjung isi/dikirim link SKD
                  </label>
                  <input
                    type="number"
                    value={publicCheckout.publicSkdCount}
                    onChange={(event) =>
                      setPublicCheckout((prev) => ({
                        ...prev,
                        publicSkdCount: event.target.value,
                      }))
                    }
                    className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none focus:border-amber-500"
                  />
                </div>
              </div>
              <div className="mt-4">
                <label className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                  Komentar/Saran (opsional)
                </label>
                <textarea
                  value={publicCheckout.publicNotes}
                  onChange={(event) =>
                    setPublicCheckout((prev) => ({
                      ...prev,
                      publicNotes: event.target.value,
                    }))
                  }
                  className="mt-2 min-h-[90px] w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none focus:border-amber-500"
                />
              </div>
            </div>
            <div className="flex flex-col gap-3 border-t border-zinc-100 bg-zinc-50 px-8 py-5 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={() => setAttendanceOpen(false)}
                className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-300 bg-white px-6 text-xs font-semibold text-zinc-700 transition hover:border-zinc-400"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={async () => {
                  await handleCheckOut();
                  setAttendanceOpen(false);
                }}
                disabled={attendanceLoading || Boolean(attendance?.checkOutAt)}
                className="inline-flex h-11 items-center justify-center rounded-full bg-emerald-600 px-6 text-xs font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-zinc-400"
              >
                Simpan Presensi Pulang
              </button>
            </div>
          </div>
        </div>
      ) : null}
      <audio ref={audioRef} src="/audio/notify.wav" preload="auto" />
    </div>
  );
}
