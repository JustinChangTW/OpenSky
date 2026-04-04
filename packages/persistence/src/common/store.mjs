import fs from "node:fs";
import path from "node:path";
import { toIsoTimestamp } from "../../../contracts/src/common/index.mjs";

const PERSISTED_MAP_KEYS = Object.freeze([
  "sites",
  "projects",
  "tabs",
  "bookmarks",
  "notes",
  "layoutPreferences",
  "sessionVault",
  "fileTransfers",
  "audit",
  "counters"
]);

class PersistentMap extends Map {
  constructor(entries, onMutate) {
    super();
    this.onMutate = typeof onMutate === "function" ? onMutate : () => undefined;
    for (const [key, value] of entries ?? []) {
      Map.prototype.set.call(this, key, value);
    }
  }

  set(key, value) {
    super.set(key, value);
    this.onMutate();
    return this;
  }

  delete(key) {
    const didDelete = super.delete(key);
    if (didDelete) {
      this.onMutate();
    }
    return didDelete;
  }

  clear() {
    if (this.size) {
      super.clear();
      this.onMutate();
    }
  }
}

function createEmptySnapshot() {
  return {
    sites: [],
    projects: [],
    tabs: [],
    bookmarks: [],
    notes: [],
    layoutPreferences: [],
    sessionVault: [],
    fileTransfers: [],
    audit: [],
    counters: []
  };
}

function sanitizeSnapshot(snapshot) {
  const safeSnapshot = createEmptySnapshot();
  for (const key of PERSISTED_MAP_KEYS) {
    safeSnapshot[key] = Array.isArray(snapshot?.[key]) ? snapshot[key] : [];
  }
  return safeSnapshot;
}

function readSnapshot(filePath) {
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    return sanitizeSnapshot(JSON.parse(raw));
  } catch (error) {
    if (error?.code === "ENOENT") {
      return createEmptySnapshot();
    }
    throw error;
  }
}

function writeSnapshot(filePath, state) {
  const snapshot = createEmptySnapshot();
  for (const key of PERSISTED_MAP_KEYS) {
    snapshot[key] = Array.from(state[key].entries());
  }

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(snapshot, null, 2), "utf8");
  fs.renameSync(tempPath, filePath);
}

function createState(snapshot, onMutate) {
  let session = null;
  const auth = {};

  Object.defineProperty(auth, "session", {
    get() {
      return session;
    },
    set(value) {
      session = value;
    },
    enumerable: true
  });

  return {
    auth,
    sites: new PersistentMap(snapshot.sites, onMutate),
    projects: new PersistentMap(snapshot.projects, onMutate),
    tabs: new PersistentMap(snapshot.tabs, onMutate),
    bookmarks: new PersistentMap(snapshot.bookmarks, onMutate),
    notes: new PersistentMap(snapshot.notes, onMutate),
    layoutPreferences: new PersistentMap(snapshot.layoutPreferences, onMutate),
    sessionVault: new PersistentMap(snapshot.sessionVault, onMutate),
    fileTransfers: new PersistentMap(snapshot.fileTransfers, onMutate),
    audit: new PersistentMap(snapshot.audit, onMutate),
    counters: new PersistentMap(snapshot.counters, onMutate)
  };
}

function createStore(snapshot, persist) {
  const state = createState(snapshot, persist);

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

export function createMemoryStore() {
  return createStore(createEmptySnapshot(), () => undefined);
}

export function createFileStore(filePath) {
  let store;
  const snapshot = readSnapshot(filePath);
  store = createStore(snapshot, () => writeSnapshot(filePath, store.state));
  writeSnapshot(filePath, store.state);
  return store;
}
