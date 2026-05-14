import "server-only";

import { existsSync, readFileSync } from "node:fs";

import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

type FirebaseServiceAccount = {
  projectId: string;
  clientEmail: string;
  privateKey: string;
};

export async function verifyFirebaseIdToken(idToken: string) {
  const app = getFirebaseAdminApp();

  if (!app) {
    throw new Error("FIREBASE_ADMIN_NOT_CONFIGURED");
  }

  return getAuth(app).verifyIdToken(idToken);
}

function getFirebaseAdminApp() {
  const existing = getApps()[0];

  if (existing) {
    return existing;
  }

  const account = getFirebaseServiceAccount();

  if (!account) {
    return null;
  }

  return initializeApp({
    credential: cert({
      projectId: account.projectId,
      clientEmail: account.clientEmail,
      privateKey: account.privateKey,
    }),
  });
}

function getFirebaseServiceAccount(): FirebaseServiceAccount | null {
  const jsonPath = process.env.FIREBASE_SERVICE_ACCOUNT_JSON_PATH?.trim();

  if (jsonPath && existsSync(jsonPath)) {
    const account = parseFirebaseServiceAccount(readFileSync(jsonPath, "utf8"));

    if (account) {
      return account;
    }
  }

  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();

  if (json) {
    const account = parseFirebaseServiceAccount(json);

    if (account) {
      return account;
    }
  }

  const encodedJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON_BASE64?.trim();

  if (encodedJson) {
    const account = parseFirebaseServiceAccount(
      Buffer.from(encodedJson, "base64").toString("utf8"),
    );

    if (account) {
      return account;
    }
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    return null;
  }

  return {
    projectId,
    clientEmail,
    privateKey: normalizePrivateKey(privateKey),
  };
}

function parseFirebaseServiceAccount(value: string): FirebaseServiceAccount | null {
  try {
    const parsed = JSON.parse(value) as {
      project_id?: string;
      client_email?: string;
      private_key?: string;
    };

    if (!parsed.project_id || !parsed.client_email || !parsed.private_key) {
      return null;
    }

    return {
      projectId: parsed.project_id,
      clientEmail: parsed.client_email,
      privateKey: normalizePrivateKey(parsed.private_key),
    };
  } catch {
    return null;
  }
}

function normalizePrivateKey(privateKey: string) {
  return privateKey.replace(/\\n/g, "\n");
}
