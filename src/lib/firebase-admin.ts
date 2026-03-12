import fs from "fs";
import path from "path";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getDatabase } from "firebase-admin/database";

const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
const resolvedPath = serviceAccountPath
  ? path.isAbsolute(serviceAccountPath)
    ? serviceAccountPath
    : path.join(process.cwd(), serviceAccountPath)
  : null;

let fileAccount: {
  projectId?: string;
  clientEmail?: string;
  privateKey?: string;
} | null = null;

if (resolvedPath && fs.existsSync(resolvedPath)) {
  const raw = fs.readFileSync(resolvedPath, "utf-8");
  const json = JSON.parse(raw) as {
    project_id?: string;
    client_email?: string;
    private_key?: string;
  };
  fileAccount = {
    projectId: json.project_id,
    clientEmail: json.client_email,
    privateKey: json.private_key,
  };
}

const projectId = fileAccount?.projectId ?? process.env.FIREBASE_PROJECT_ID;
const clientEmail = fileAccount?.clientEmail ?? process.env.FIREBASE_CLIENT_EMAIL;
const privateKey =
  fileAccount?.privateKey ??
  process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

export const firebaseAdminReady = Boolean(projectId && clientEmail && privateKey);

if (!getApps().length && firebaseAdminReady) {
  initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey,
    }),
    databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  });
}

export const firebaseDb = firebaseAdminReady ? getDatabase() : null;
