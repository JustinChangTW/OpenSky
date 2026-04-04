import { createMemoryStore } from "../../../../packages/persistence/src/common/store.mjs";

export function createServiceContext() {
  return {
    store: createMemoryStore()
  };
}
