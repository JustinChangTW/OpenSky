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
  const persistenceMode = persistPath ? "file" : "memory";
  const startupWarnings = [];

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

    if (persistenceMode !== "file") {
      throw new Error("OPEN_SKY_PERSIST_PATH must be configured in production so workspace data survives restart.");
    }
  }

  return {
    environment,
    ownerUsername,
    ownerPassword,
    persistPath,
    persistenceMode,
    startupWarnings
  };
}

export function createRuntimeDiagnostics(config, startedAt = toIsoTimestamp()) {
  return {
    startedAt,
    environment: config.environment,
    persistenceMode: config.persistenceMode,
    persistPathConfigured: config.persistenceMode === "file",
    startupWarnings: [...config.startupWarnings]
  };
}

export function formatStartupLog(runtime) {
  const warningSuffix = runtime.startupWarnings.length
    ? ` warnings=${runtime.startupWarnings.join(",")}`
    : "";
  return `OpenSky runtime env=${runtime.environment} persistence=${runtime.persistenceMode}${warningSuffix}`;
}
