import { jwtVerify, SignJWT } from "jose";

export type SessionPayload = {
  userId: number;
  counterId: number | null;
  nama: string;
  username: string;
  role: "ADMIN" | "LAYANAN_PUBLIK" | "PERMINTAAN_DATA";
  shift: "PAGI" | "SIANG" | null;
  assignmentId: number | null;
  isAdmin: boolean;
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
