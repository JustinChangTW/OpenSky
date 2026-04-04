import { randomUUID } from "node:crypto";
import { createErrorResponse } from "../../../../packages/contracts/src/errors/index.mjs";

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
