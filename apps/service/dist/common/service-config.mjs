import path from "node:path";
import { toIsoTimestamp } from "../../../../packages/contracts/src/common/index.mjs";

export const DEFAULT_OWNER_USERNAME = "owner-admin";
export const DEFAULT_OWNER_PASSWORD = "opensky-demo";

function normalizeEnvironment(value) {
  const normalized = String(value ?? "development").trim().toLowerCase();
  if (normalized === "production" || normalized === "staging" || normalized === "test") {
    return normalized;
  }
  return "development";
}

function isDemoCredentialPair(username, password) {
  return username === DEFAULT_OWNER_USERNAME && password === DEFAULT_OWNER_PASSWORD;
}

export function createServiceConfig(env = process.env) {
  const environment = normalizeEnvironment(env.OPEN_SKY_ENV);
  const ownerUsername = String(env.OPEN_SKY_OWNER_USERNAME ?? DEFAULT_OWNER_USERNAME).trim();
  const ownerPassword = String(env.OPEN_SKY_OWNER_PASSWORD ?? DEFAULT_OWNER_PASSWORD);
  const rawPersistPath = String(env.OPEN_SKY_PERSIST_PATH ?? "").trim();
  const persistPath = rawPersistPath ? path.resolve(rawPersistPath) : "";
  const firebaseProjectId = String(env.OPEN_SKY_FIREBASE_PROJECT_ID ?? "").trim();
  const firebaseClientEmail = String(env.OPEN_SKY_FIREBASE_CLIENT_EMAIL ?? "").trim();
  const firebasePrivateKey = String(env.OPEN_SKY_FIREBASE_PRIVATE_KEY ?? "");
  const firebaseDatabaseId = String(env.OPEN_SKY_FIREBASE_DATABASE_ID ?? "(default)").trim();
  const firebaseTokenUri = String(env.OPEN_SKY_FIREBASE_TOKEN_URI ?? "https://oauth2.googleapis.com/token").trim();
  const firebaseConfigured = Boolean(firebaseProjectId && firebaseClientEmail && firebasePrivateKey);
  const firebasePartiallyConfigured = !firebaseConfigured && Boolean(firebaseProjectId || firebaseClientEmail || firebasePrivateKey);
  const persistenceMode = firebaseConfigured ? "firestore" : persistPath ? "file" : "memory";
  const startupWarnings = [];

  if (firebasePartiallyConfigured) {
    throw new Error("OPEN_SKY_FIREBASE_PROJECT_ID, OPEN_SKY_FIREBASE_CLIENT_EMAIL, and OPEN_SKY_FIREBASE_PRIVATE_KEY must be configured together.");
  }

  if (isDemoCredentialPair(ownerUsername, ownerPassword)) {
    startupWarnings.push("demo_credentials");
  }

  if (persistenceMode === "memory") {
    startupWarnings.push("ephemeral_persistence");
  }

  if (environment === "production") {
    if (isDemoCredentialPair(ownerUsername, ownerPassword)) {
      throw new Error("OPEN_SKY_OWNER_USERNAME and OPEN_SKY_OWNER_PASSWORD must be set to non-demo values in production.");
    }

    if (persistenceMode === "memory") {
      throw new Error("Configure OPEN_SKY_FIREBASE_* or OPEN_SKY_PERSIST_PATH in production so workspace data survives restart.");
    }
  }

  return {
    environment,
    ownerUsername,
    ownerPassword,
    persistPath,
    persistenceMode,
    startupWarnings,
    firebase: {
      configured: firebaseConfigured,
      projectId: firebaseProjectId,
      clientEmail: firebaseClientEmail,
      privateKey: firebasePrivateKey,
      databaseId: firebaseDatabaseId,
      tokenUri: firebaseTokenUri
    }
  };
}

export function createRuntimeDiagnostics(config, startedAt = toIsoTimestamp()) {
  return {
    startedAt,
    environment: config.environment,
    persistenceMode: config.persistenceMode,
    persistPathConfigured: config.persistenceMode === "file",
    firebaseConfigured: config.persistenceMode === "firestore",
    startupWarnings: [...config.startupWarnings]
  };
}

export function formatStartupLog(runtime) {
  const warningSuffix = runtime.startupWarnings.length
    ? ` warnings=${runtime.startupWarnings.join(",")}`
    : "";
  return `OpenSky runtime env=${runtime.environment} persistence=${runtime.persistenceMode}${warningSuffix}`;
}
