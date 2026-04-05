import fs from "node:fs";
import path from "node:path";
import { createSign } from "node:crypto";
import { toIsoTimestamp } from "../../../contracts/src/common/index.mjs";

export const STORE_COLLECTIONS = Object.freeze([
  "sites",
  "projects",
  "tabs",
  "bookmarks",
  "notes",
  "layoutPreferences",
  "sessionVault",
  "relaySessions",
  "fileTransfers",
  "audit"
]);

function createEmptySnapshot() {
  return {
    sites: [],
    projects: [],
    tabs: [],
    bookmarks: [],
    notes: [],
    layoutPreferences: [],
    sessionVault: [],
    relaySessions: [],
    fileTransfers: [],
    audit: [],
    counters: []
  };
}

function ensureCollectionName(collectionName) {
  if (!STORE_COLLECTIONS.includes(collectionName)) {
    throw new TypeError(`${collectionName} is not a supported persistence collection.`);
  }
}

function sanitizeSnapshot(snapshot) {
  const safeSnapshot = createEmptySnapshot();
  for (const key of [...STORE_COLLECTIONS, "counters"]) {
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
  for (const key of STORE_COLLECTIONS) {
    snapshot[key] = Array.from(state.collections[key].entries());
  }
  snapshot.counters = Array.from(state.counters.entries());

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(snapshot, null, 2), "utf8");
  fs.renameSync(tempPath, filePath);
}

function createMemoryCollections(snapshot = createEmptySnapshot()) {
  return {
    collections: Object.fromEntries(STORE_COLLECTIONS.map((key) => [key, new Map(snapshot[key])])),
    counters: new Map(snapshot.counters)
  };
}

function createLocalStore(snapshot = createEmptySnapshot(), onMutate = () => undefined) {
  const state = createMemoryCollections(snapshot);
  let session = null;

  return {
    async getSession() {
      return session;
    },
    async setSession(nextSession) {
      session = nextSession;
    },
    async clearSession() {
      session = null;
    },
    async list(collectionName) {
      ensureCollectionName(collectionName);
      return Array.from(state.collections[collectionName].values());
    },
    async get(collectionName, id) {
      ensureCollectionName(collectionName);
      return state.collections[collectionName].get(id) ?? null;
    },
    async set(collectionName, id, record) {
      ensureCollectionName(collectionName);
      state.collections[collectionName].set(id, record);
      onMutate(state);
      return record;
    },
    async delete(collectionName, id) {
      ensureCollectionName(collectionName);
      state.collections[collectionName].delete(id);
      onMutate(state);
    },
    async nextId(prefix) {
      const nextValue = (state.counters.get(prefix) ?? 0) + 1;
      state.counters.set(prefix, nextValue);
      onMutate(state);
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

function base64UrlEncode(value) {
  return Buffer.from(value)
    .toString("base64")
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

function encodeFirestoreValue(value) {
  if (value === null) {
    return { nullValue: null };
  }

  if (Array.isArray(value)) {
    return {
      arrayValue: {
        values: value.map((entry) => encodeFirestoreValue(entry))
      }
    };
  }

  switch (typeof value) {
    case "string":
      return { stringValue: value };
    case "boolean":
      return { booleanValue: value };
    case "number":
      return Number.isInteger(value)
        ? { integerValue: String(value) }
        : { doubleValue: value };
    case "object":
      return {
        mapValue: {
          fields: Object.fromEntries(
            Object.entries(value).map(([key, entryValue]) => [key, encodeFirestoreValue(entryValue)])
          )
        }
      };
    default:
      return { stringValue: String(value) };
  }
}

function decodeFirestoreValue(value) {
  if ("nullValue" in value) {
    return null;
  }
  if ("stringValue" in value) {
    return value.stringValue;
  }
  if ("booleanValue" in value) {
    return value.booleanValue;
  }
  if ("integerValue" in value) {
    return Number(value.integerValue);
  }
  if ("doubleValue" in value) {
    return value.doubleValue;
  }
  if ("arrayValue" in value) {
    return (value.arrayValue.values ?? []).map((entry) => decodeFirestoreValue(entry));
  }
  if ("mapValue" in value) {
    return Object.fromEntries(
      Object.entries(value.mapValue.fields ?? {}).map(([key, entryValue]) => [key, decodeFirestoreValue(entryValue)])
    );
  }
  return null;
}

function serializeFirestoreDocument(record) {
  return {
    fields: Object.fromEntries(
      Object.entries(record).map(([key, value]) => [key, encodeFirestoreValue(value)])
    )
  };
}

function parseFirestoreDocument(document) {
  return Object.fromEntries(
    Object.entries(document?.fields ?? {}).map(([key, value]) => [key, decodeFirestoreValue(value)])
  );
}

function normalizePrivateKey(value) {
  return String(value ?? "").replaceAll("\\n", "\n");
}

function createFirestoreClient(config) {
  const baseUrl = `https://firestore.googleapis.com/v1/projects/${config.projectId}/databases/${config.databaseId}/documents`;
  const tokenUri = config.tokenUri ?? "https://oauth2.googleapis.com/token";
  let accessToken = "";
  let accessTokenExpiresAt = 0;

  async function getAccessToken() {
    if (accessToken && accessTokenExpiresAt - 60_000 > Date.now()) {
      return accessToken;
    }

    const nowSeconds = Math.floor(Date.now() / 1000);
    const header = base64UrlEncode(JSON.stringify({ alg: "RS256", typ: "JWT" }));
    const payload = base64UrlEncode(JSON.stringify({
      iss: config.clientEmail,
      scope: "https://www.googleapis.com/auth/datastore",
      aud: tokenUri,
      iat: nowSeconds,
      exp: nowSeconds + 3600
    }));
    const signer = createSign("RSA-SHA256");
    signer.update(`${header}.${payload}`);
    signer.end();
    const signature = signer.sign(normalizePrivateKey(config.privateKey));
    const assertion = `${header}.${payload}.${base64UrlEncode(signature)}`;

    const response = await fetch(tokenUri, {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion
      })
    });
    const tokenPayload = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(tokenPayload?.error_description ?? "Unable to obtain Firestore access token.");
    }

    accessToken = tokenPayload.access_token;
    accessTokenExpiresAt = Date.now() + Number(tokenPayload.expires_in ?? 3600) * 1000;
    return accessToken;
  }

  async function request(method, resourcePath, body = null, { allowMissing = false } = {}) {
    const token = await getAccessToken();
    const response = await fetch(`${baseUrl}/${resourcePath}`, {
      method,
      headers: {
        authorization: `Bearer ${token}`,
        ...(body ? { "content-type": "application/json" } : {})
      },
      body: body ? JSON.stringify(body) : undefined
    });

    if (allowMissing && response.status === 404) {
      return null;
    }

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(payload?.error?.message ?? `Firestore request failed: ${method} ${resourcePath}`);
    }

    return payload;
  }

  return {
    async list(collectionName) {
      const payload = await request("GET", `${collectionName}?pageSize=500`, null, { allowMissing: true });
      return (payload?.documents ?? []).map((document) => parseFirestoreDocument(document));
    },
    async get(collectionName, id) {
      const payload = await request("GET", `${collectionName}/${encodeURIComponent(id)}`, null, { allowMissing: true });
      return payload ? parseFirestoreDocument(payload) : null;
    },
    async set(collectionName, id, record) {
      await request("PATCH", `${collectionName}/${encodeURIComponent(id)}`, serializeFirestoreDocument(record));
      return record;
    },
    async delete(collectionName, id) {
      await request("DELETE", `${collectionName}/${encodeURIComponent(id)}`, null, { allowMissing: true });
    },
    async getCounter(prefix) {
      const payload = await request("GET", `counters/${encodeURIComponent(prefix)}`, null, { allowMissing: true });
      return payload ? parseFirestoreDocument(payload) : null;
    },
    async setCounter(prefix, value) {
      await request("PATCH", `counters/${encodeURIComponent(prefix)}`, serializeFirestoreDocument({ prefix, value }));
    }
  };
}

function createFirestoreStore(config) {
  const client = createFirestoreClient(config);
  let session = null;

  return {
    async getSession() {
      return session;
    },
    async setSession(nextSession) {
      session = nextSession;
    },
    async clearSession() {
      session = null;
    },
    async list(collectionName) {
      ensureCollectionName(collectionName);
      return client.list(collectionName);
    },
    async get(collectionName, id) {
      ensureCollectionName(collectionName);
      return client.get(collectionName, id);
    },
    async set(collectionName, id, record) {
      ensureCollectionName(collectionName);
      return client.set(collectionName, id, record);
    },
    async delete(collectionName, id) {
      ensureCollectionName(collectionName);
      await client.delete(collectionName, id);
    },
    async nextId(prefix) {
      const currentCounter = await client.getCounter(prefix);
      const nextValue = Number(currentCounter?.value ?? 0) + 1;
      await client.setCounter(prefix, nextValue);
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
  return createLocalStore();
}

export function createFileStore(filePath) {
  const snapshot = readSnapshot(filePath);
  return createLocalStore(snapshot, (state) => writeSnapshot(filePath, state));
}

export function createFirebaseStore(config) {
  return createFirestoreStore(config);
}
