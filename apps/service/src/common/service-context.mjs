import { createFileStore, createFirebaseStore, createMemoryStore } from "../../../../packages/persistence/src/common/store.mjs";
import { createRuntimeDiagnostics, createServiceConfig } from "./service-config.mjs";

export function createServiceContext({ persistPath, env = process.env } = {}) {
  const mergedEnv = {
    ...env,
    ...(persistPath !== undefined ? { OPEN_SKY_PERSIST_PATH: persistPath } : {})
  };
  const config = createServiceConfig(mergedEnv);

  return {
    config,
    runtime: createRuntimeDiagnostics(config),
    store: config.persistenceMode === "firestore"
      ? createFirebaseStore(config.firebase)
      : config.persistenceMode === "file"
        ? createFileStore(config.persistPath)
        : createMemoryStore()
  };
}
