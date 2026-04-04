import { toIsoTimestamp } from "../../../contracts/src/common/index.mjs";

export function createMemoryStore() {
  const state = {
    auth: {
      session: null
    },
    sites: new Map(),
    projects: new Map(),
    tabs: new Map(),
    bookmarks: new Map(),
    notes: new Map(),
    layoutPreferences: new Map(),
    sessionVault: new Map(),
    fileTransfers: new Map(),
    audit: new Map(),
    counters: new Map()
  };

  return {
    state,
    nextId(prefix) {
      const nextValue = (state.counters.get(prefix) ?? 0) + 1;
      state.counters.set(prefix, nextValue);
      return `${prefix}_${String(nextValue).padStart(4, "0")}`;
    },
    stampUpdated(record) {
      return {
        ...record,
        updatedAt: toIsoTimestamp()
      };
    }
  };
}
