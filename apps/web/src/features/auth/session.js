const SESSION_STORAGE_KEY = "opensky.session-token";
const API_BASE = globalThis.OPEN_SKY_API_BASE ?? "";

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
  const response = await fetch(`${API_BASE}${pathname}`, {
    headers: {
      "content-type": "application/json",
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
