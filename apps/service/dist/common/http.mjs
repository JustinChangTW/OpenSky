import { randomUUID } from "node:crypto";
import { createErrorResponse } from "../../../../packages/contracts/src/errors/index.mjs";

export const SESSION_COOKIE_NAME = "opensky_session";

export async function readJsonBody(request) {
  const raw = await request.text();
  if (!raw) {
    return {};
  }

  try {
    return JSON.parse(raw);
  } catch {
    throw createErrorResponse("INVALID_INPUT", "Request body must be valid JSON.", "Send a valid JSON payload.", randomUUID());
  }
}

export function jsonResponse(payload, init = {}) {
  return new Response(JSON.stringify(payload, null, 2), {
    ...init,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...(init.headers ?? {})
    }
  });
}

export function parseCookies(request) {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const pairs = cookieHeader
    .split(";")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const separatorIndex = entry.indexOf("=");
      if (separatorIndex === -1) {
        return [entry, ""];
      }
      return [entry.slice(0, separatorIndex), decodeURIComponent(entry.slice(separatorIndex + 1))];
    });

  return Object.fromEntries(pairs);
}

export function createSessionCookie(token) {
  return `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax`;
}

export function createClearedSessionCookie() {
  return `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}
