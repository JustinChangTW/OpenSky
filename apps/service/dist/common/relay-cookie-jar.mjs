import { toIsoTimestamp } from "../../../../packages/contracts/src/common/index.mjs";

function normalizeDomain(value = "") {
  return String(value).trim().toLowerCase().replace(/^\./u, "");
}

function normalizePath(value = "/") {
  const nextValue = String(value || "/").trim();
  return nextValue.startsWith("/") ? nextValue : `/${nextValue}`;
}

function parseHttpDate(value) {
  const timestamp = Date.parse(String(value ?? ""));
  return Number.isNaN(timestamp) ? null : new Date(timestamp).toISOString();
}

function parseSameSite(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (!normalized) {
    return "Lax";
  }

  if (normalized === "none" || normalized === "strict" || normalized === "lax") {
    return normalized[0].toUpperCase() + normalized.slice(1);
  }

  return "Lax";
}

function parseSetCookieHeader(headerValue, requestUrl) {
  const url = new URL(requestUrl);
  const [nameValue, ...attributes] = String(headerValue ?? "").split(";").map((entry) => entry.trim()).filter(Boolean);
  const separatorIndex = nameValue.indexOf("=");
  if (separatorIndex <= 0) {
    return null;
  }

  const cookie = {
    name: nameValue.slice(0, separatorIndex),
    value: nameValue.slice(separatorIndex + 1),
    domain: url.hostname.toLowerCase(),
    path: "/",
    secure: false,
    httpOnly: false,
    sameSite: "Lax",
    expiresAt: null
  };

  for (const attribute of attributes) {
    const [rawKey, ...rawValueParts] = attribute.split("=");
    const key = String(rawKey ?? "").trim().toLowerCase();
    const value = rawValueParts.join("=").trim();

    if (key === "domain" && value) {
      cookie.domain = normalizeDomain(value);
    } else if (key === "path" && value) {
      cookie.path = normalizePath(value);
    } else if (key === "secure") {
      cookie.secure = true;
    } else if (key === "httponly") {
      cookie.httpOnly = true;
    } else if (key === "samesite") {
      cookie.sameSite = parseSameSite(value);
    } else if (key === "max-age") {
      const seconds = Number(value);
      if (Number.isFinite(seconds)) {
        cookie.expiresAt = seconds <= 0
          ? new Date(0).toISOString()
          : new Date(Date.now() + seconds * 1000).toISOString();
      }
    } else if (key === "expires" && value) {
      cookie.expiresAt = parseHttpDate(value);
    }
  }

  return cookie;
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

function isExpired(cookie) {
  return cookie.expiresAt ? new Date(cookie.expiresAt).getTime() <= Date.now() : false;
}

function domainMatches(hostname, cookieDomain) {
  const normalizedHostname = normalizeDomain(hostname);
  const normalizedCookieDomain = normalizeDomain(cookieDomain);
  return normalizedHostname === normalizedCookieDomain || normalizedHostname.endsWith(`.${normalizedCookieDomain}`);
}

function pathMatches(pathname, cookiePath) {
  return normalizePath(pathname).startsWith(normalizePath(cookiePath));
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

function toPersistentRecord(scope, cookies, vaultId = null) {
  return {
    relaySessionId: createScopeKey(scope),
    siteId: scope.siteId,
    projectId: scope.projectId ?? null,
    vaultId,
    cookies,
    status: "active",
    createdAt: toIsoTimestamp(),
    updatedAt: toIsoTimestamp()
  };
}

export function createRelayCookieJar(context) {
  const memory = new Map();

  async function loadCookies(scope) {
    const scopeKey = createScopeKey(scope);
    if (memory.has(scopeKey)) {
      return memory.get(scopeKey);
    }

    const persisted = await context.store.get("relaySessions", scopeKey);
    const cookies = Array.isArray(persisted?.cookies) ? persisted.cookies.filter((cookie) => !isExpired(cookie)) : [];
    memory.set(scopeKey, cookies);
    return cookies;
  }

  async function persistCookies(scope, cookies, vaultId = null) {
    const scopeKey = createScopeKey(scope);
    memory.set(scopeKey, cookies);
    if (!vaultId) {
      return;
    }

    await context.store.set("relaySessions", scopeKey, toPersistentRecord(scope, cookies, vaultId));
  }

  return {
    async getCookieHeader(scope, requestUrl) {
      const cookies = await loadCookies(scope);
      const targetUrl = new URL(requestUrl);
      const allowedCookies = cookies.filter((cookie) => (
        !isExpired(cookie)
        && domainMatches(targetUrl.hostname, cookie.domain)
        && pathMatches(targetUrl.pathname, cookie.path)
        && (!cookie.secure || targetUrl.protocol === "https:")
      ));

      if (!allowedCookies.length) {
        return "";
      }

      return allowedCookies.map((cookie) => `${cookie.name}=${cookie.value}`).join("; ");
    },
    async capture(scope, requestUrl, response, { persist = false } = {}) {
      const setCookieHeaders = getSetCookieHeaders(response);
      if (!setCookieHeaders.length) {
        return [];
      }

      const currentCookies = await loadCookies(scope);
      const nextCookies = currentCookies.filter((cookie) => !isExpired(cookie));

      for (const headerValue of setCookieHeaders) {
        const parsedCookie = parseSetCookieHeader(headerValue, requestUrl);
        if (!parsedCookie) {
          continue;
        }

        const existingIndex = nextCookies.findIndex((cookie) => (
          cookie.name === parsedCookie.name
            && normalizeDomain(cookie.domain) === normalizeDomain(parsedCookie.domain)
            && normalizePath(cookie.path) === normalizePath(parsedCookie.path)
        ));

        if (isExpired(parsedCookie) || parsedCookie.value === "") {
          if (existingIndex >= 0) {
            nextCookies.splice(existingIndex, 1);
          }
          continue;
        }

        if (existingIndex >= 0) {
          nextCookies.splice(existingIndex, 1, parsedCookie);
        } else {
          nextCookies.push(parsedCookie);
        }
      }

      const vault = persist ? await findActiveVault(context, scope.siteId, scope.projectId) : null;
      await persistCookies(scope, nextCookies, vault?.vaultId ?? null);
      return nextCookies;
    },
    async clear(scope) {
      const scopeKey = createScopeKey(scope);
      memory.delete(scopeKey);
      await context.store.delete("relaySessions", scopeKey).catch(() => undefined);
    }
  };
}
