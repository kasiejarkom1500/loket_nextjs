import { jwtVerify, SignJWT } from "jose";
import type { AdminLevel } from "@prisma/client";

export const ADMIN_LEVELS = ["SUPER_ADMIN", "ADMIN_PENILAIAN", "ADMIN_OPERASIONAL"] as const;
export type { AdminLevel };

export const isAdminLevel = (value: unknown): value is AdminLevel =>
  typeof value === "string" && ADMIN_LEVELS.includes(value as AdminLevel);

export const isOperationalAdmin = (level: AdminLevel | null | undefined) =>
  level === "SUPER_ADMIN" || level === "ADMIN_OPERASIONAL";

export const isEvaluationAdmin = (level: AdminLevel | null | undefined) =>
  level === "SUPER_ADMIN" || level === "ADMIN_PENILAIAN";

export type SessionPayload = {
  userId: number;
  counterId: number | null;
  nama: string;
  username: string;
  role: "ADMIN" | "LAYANAN_PUBLIK" | "PERMINTAAN_DATA" | null;
  shift: "PAGI" | "SIANG" | null;
  assignmentId: number | null;
  adminLevel: AdminLevel | null;
  isSubstitute?: boolean;
};

const getSecret = () => {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET is not set");
  }
  return new TextEncoder().encode(secret);
};

export async function signSession(
  payload: SessionPayload,
  expiresInSeconds: number,
) {
  const secret = getSecret();
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${expiresInSeconds}s`)
    .sign(secret);
}

export async function verifySession(token: string) {
  const secret = getSecret();
  const { payload } = await jwtVerify(token, secret);
  return payload as SessionPayload;
}

export function getAdminHomePath(level: AdminLevel | null | undefined) {
  if (level === "ADMIN_PENILAIAN") return "/admin/penilaian-petugas";
  if (level === "SUPER_ADMIN") return "/admin/assignments";
  return "/admin/attendance-recap";
}
