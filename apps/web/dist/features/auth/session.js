import { loadLocale } from "../../i18n-runtime.js";

const SESSION_STORAGE_KEY = "opensky.session-token";

function normalizeApiBase(value) {
  return String(value ?? "").trim().replace(/\/$/, "");
}

function resolveApiBase() {
  return normalizeApiBase(
    globalThis.OPEN_SKY_CONFIG?.apiBase
    ?? globalThis.OPEN_SKY_API_BASE
    ?? globalThis.document?.querySelector?.('meta[name="opensky-api-base"]')?.content
    ?? ""
  );
}

export function loadSessionToken(storageRef = globalThis.localStorage) {
  try {
    return storageRef?.getItem?.(SESSION_STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

export function saveSessionToken(token, storageRef = globalThis.localStorage) {
  try {
    if (!token) {
      storageRef?.removeItem?.(SESSION_STORAGE_KEY);
      return;
    }
    storageRef?.setItem?.(SESSION_STORAGE_KEY, token);
  } catch {
    // Keep the UI usable even if storage is unavailable.
  }
}

export async function requestJson(pathname, init = {}) {
  const token = loadSessionToken();
  const locale = loadLocale();
  const response = await fetch(`${resolveApiBase()}${pathname}`, {
    credentials: "include",
    headers: {
      "content-type": "application/json",
      "accept-language": locale,
      "x-opensky-session": token,
      ...(init.headers ?? {})
    },
    ...init
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const error = new Error(payload?.message ?? "The backend request failed.");
    error.payload = payload;
    throw error;
  }

  return payload;
}
