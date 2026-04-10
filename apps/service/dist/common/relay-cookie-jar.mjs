import { toIsoTimestamp } from "../../../../packages/contracts/src/common/index.mjs";
import { Cookie, CookieJar } from "tough-cookie";

function normalizeDomain(value = "") {
  return String(value ?? "").trim().toLowerCase().replace(/^\./u, "");
}

function normalizePath(value = "/") {
  const nextValue = String(value || "/").trim();
  return nextValue.startsWith("/") ? nextValue : `/${nextValue}`;
}

function normalizeSameSite(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized === "strict" || normalized === "lax" || normalized === "none") {
    return normalized;
  }
  return "lax";
}

function normalizeExpires(value) {
  if (!value || value === "Infinity") {
    return null;
  }
  const expiresDate = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(expiresDate.getTime())) {
    return null;
  }
  return expiresDate.toISOString();
}

function cookieToRecord(cookieLike) {
  const source = cookieLike instanceof Cookie ? cookieLike.toJSON() : cookieLike ?? {};
  return {
    name: String(source.key ?? source.name ?? ""),
    value: String(source.value ?? ""),
    domain: normalizeDomain(source.domain ?? ""),
    path: normalizePath(source.path ?? "/"),
    secure: Boolean(source.secure),
    httpOnly: Boolean(source.httpOnly),
    sameSite: String(source.sameSite ?? "Lax")[0].toUpperCase() + String(source.sameSite ?? "Lax").slice(1).toLowerCase(),
    expiresAt: normalizeExpires(source.expires)
  };
}

function getSetCookieHeaders(response) {
  const directHeaders = response?.headers?.getSetCookie?.();
  if (Array.isArray(directHeaders) && directHeaders.length) {
    return directHeaders;
  }

  const headerValue = response?.headers?.get?.("set-cookie");
  if (!headerValue) {
    return [];
  }

  return String(headerValue)
    .split(/,(?=[^;,]+=)/gu)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function createScopeKey({ siteId, projectId = null }) {
  return `${siteId}::${projectId ?? "global"}`;
}

async function findActiveVault(context, siteId, projectId = null) {
  const items = await context.store.list("sessionVault");
  return items.find((item) => (
    item.status === "active"
      && item.siteId === siteId
      && (projectId ? item.projectId === projectId : item.projectId == null)
  )) ?? null;
}

function serializeCookiesFromJar(jar) {
  const serialized = jar.serializeSync();
  const cookies = Array.isArray(serialized.cookies)
    ? serialized.cookies
      .map((cookie) => cookieToRecord(cookie))
      .filter((cookie) => cookie.name && cookie.domain)
    : [];
  return {
    serializedJar: serialized,
    cookies
  };
}

function hydrateJarFromLegacyCookies(jar, cookies = []) {
  for (const cookie of cookies) {
    const domain = normalizeDomain(cookie.domain);
    const path = normalizePath(cookie.path);
    const secure = Boolean(cookie.secure);
    const expires = cookie.expiresAt ? new Date(cookie.expiresAt) : "Infinity";
    const sameSite = normalizeSameSite(cookie.sameSite);

    try {
      const legacyCookie = new Cookie({
        key: String(cookie.name ?? ""),
        value: String(cookie.value ?? ""),
        domain,
        path,
        secure,
        httpOnly: Boolean(cookie.httpOnly),
        sameSite,
        expires
      });
      const seedUrl = `${secure ? "https" : "http"}://${domain}${path}`;
      jar.setCookieSync(legacyCookie, seedUrl, { ignoreError: true });
    } catch {
      // Ignore malformed legacy cookie records.
    }
  }
}

function toPersistentRecord(scope, jar, vaultId = null, createdAt = null) {
  const { serializedJar, cookies } = serializeCookiesFromJar(jar);
  return {
    relaySessionId: createScopeKey(scope),
    siteId: scope.siteId,
    projectId: scope.projectId ?? null,
    vaultId,
    cookies,
    serializedJar,
    status: "active",
    createdAt: createdAt ?? toIsoTimestamp(),
    updatedAt: toIsoTimestamp()
  };
}

export function createRelayCookieJar(context) {
  const memory = new Map();

  async function loadScope(scope) {
    const scopeKey = createScopeKey(scope);
    if (memory.has(scopeKey)) {
      return memory.get(scopeKey);
    }

    const persisted = await context.store.get("relaySessions", scopeKey);
    let jar;
    if (persisted?.serializedJar) {
      try {
        jar = CookieJar.deserializeSync(persisted.serializedJar);
      } catch {
        jar = new CookieJar();
      }
    } else {
      jar = new CookieJar();
      if (Array.isArray(persisted?.cookies) && persisted.cookies.length) {
        hydrateJarFromLegacyCookies(jar, persisted.cookies);
      }
    }

    const state = {
      jar,
      createdAt: persisted?.createdAt ?? null
    };
    memory.set(scopeKey, state);
    return state;
  }

  async function persistJar(scope, jar, { persist = false, createdAt = null } = {}) {
    if (!persist) {
      return;
    }

    const vault = await findActiveVault(context, scope.siteId, scope.projectId);
    if (!vault) {
      return;
    }

    const scopeKey = createScopeKey(scope);
    await context.store.set("relaySessions", scopeKey, toPersistentRecord(scope, jar, vault.vaultId, createdAt));
  }

  return {
    async getCookieHeader(scope, requestUrl) {
      const { jar } = await loadScope(scope);
      try {
        return jar.getCookieStringSync(requestUrl);
      } catch {
        return "";
      }
    },
    async capture(scope, requestUrl, response, { persist = false } = {}) {
      const setCookieHeaders = getSetCookieHeaders(response);
      const scopeState = await loadScope(scope);

      for (const headerValue of setCookieHeaders) {
        try {
          scopeState.jar.setCookieSync(headerValue, requestUrl, { ignoreError: true });
        } catch {
          // Ignore malformed set-cookie from upstream.
        }
      }

      await persistJar(scope, scopeState.jar, {
        persist,
        createdAt: scopeState.createdAt
      });

      return serializeCookiesFromJar(scopeState.jar).cookies;
    },
    async clear(scope) {
      const scopeKey = createScopeKey(scope);
      memory.delete(scopeKey);
      await context.store.delete("relaySessions", scopeKey).catch(() => undefined);
    }
  };
}
