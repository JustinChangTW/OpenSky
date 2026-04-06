import { createFileStore, createFirebaseStore, createMemoryStore } from "../../../../packages/persistence/src/common/store.mjs";
import { createServiceLogger } from "./logger.mjs";
import { createRelayCookieJar } from "./relay-cookie-jar.mjs";
import { createRuntimeDiagnostics, createServiceConfig } from "./service-config.mjs";

export function createServiceContext({ persistPath, env = process.env, fetchImpl = globalThis.fetch } = {}) {
  const mergedEnv = {
    ...env,
    ...(persistPath !== undefined ? { OPEN_SKY_PERSIST_PATH: persistPath } : {})
  };
  const config = createServiceConfig(mergedEnv);

  const logger = createServiceLogger(config.logPath);
  const store = config.persistenceMode === "firestore"
    ? createFirebaseStore(config.firebase)
    : config.persistenceMode === "file"
      ? createFileStore(config.persistPath)
      : createMemoryStore();

  const context = {
    config,
    runtime: createRuntimeDiagnostics(config),
    logger,
    fetch: fetchImpl,
    store
  };

  return {
    ...context,
    relayCookieJar: createRelayCookieJar(context)
  };
}
