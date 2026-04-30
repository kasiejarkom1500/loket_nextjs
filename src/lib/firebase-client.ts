import { FirebaseApp, getApps, initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const requiredConfigKeys: Array<keyof typeof firebaseConfig> = [
  "apiKey",
  "databaseURL",
  "projectId",
];
const hasConfig = requiredConfigKeys.every((key) => Boolean(firebaseConfig[key]));

if (!hasConfig && process.env.NODE_ENV !== "production") {
  const missing = requiredConfigKeys.filter((key) => !firebaseConfig[key]);
  if (missing.length) {
    console.warn(
      `[firebase-client] Firebase disabled, missing: ${missing.join(", ")}`,
    );
  }
}

let app: FirebaseApp | null = null;

if (hasConfig) {
  app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
}

export const firebaseClientApp = app;
export const firebaseClientDb = app ? getDatabase(app) : null;
export const firebaseClientReady = Boolean(app);
