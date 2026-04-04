import { randomUUID } from "node:crypto";
import { createAuditEvent } from "../../../../packages/contracts/src/audit/index.mjs";
import { LAYOUT_PREFERENCE_PRECEDENCE, toIsoTimestamp } from "../../../../packages/contracts/src/common/index.mjs";
import { createErrorResponse, ERROR_CODES } from "../../../../packages/contracts/src/errors/index.mjs";
import { jsonResponse } from "./http.mjs";

export function statusForErrorCode(code) {
  switch (code) {
    case ERROR_CODES.AUTH_REQUIRED:
      return 401;
    case ERROR_CODES.FORBIDDEN:
      return 403;
    case ERROR_CODES.SITE_NOT_FOUND:
    case ERROR_CODES.PROJECT_NOT_FOUND:
    case ERROR_CODES.TAB_NOT_FOUND:
    case ERROR_CODES.BOOKMARK_NOT_FOUND:
    case ERROR_CODES.NOTE_NOT_FOUND:
    case ERROR_CODES.SESSION_VAULT_NOT_FOUND:
      return 404;
    case ERROR_CODES.SERVICE_UNAVAILABLE:
      return 503;
    default:
      return 400;
  }
}

export function asStructuredError(error, traceId) {
  if (error?.code && error?.message && error?.userAction && error?.traceId) {
    return error;
  }

  if (error instanceof TypeError) {
    return createErrorResponse(ERROR_CODES.INVALID_INPUT, error.message, "Review the request payload and try again.", traceId);
  }

  return createErrorResponse(
    ERROR_CODES.SERVICE_UNAVAILABLE,
    "The OpenSky service could not complete this request.",
    "Retry in a moment. If the issue persists, inspect the server logs.",
    traceId
  );
}

export function withRoute(handler, { authRequired = true } = {}) {
  return async ({ request, context, params, url }) => {
    const traceId = randomUUID();

    try {
      assertServiceReady(request, traceId, authRequired);
      const actor = authRequired ? await requireActor(request, context, traceId) : null;
      return await handler({ request, context, params, url, traceId, actor });
    } catch (error) {
      const structuredError = asStructuredError(error, traceId);
      return jsonResponse(structuredError, { status: statusForErrorCode(structuredError.code) });
    }
  };
}

export function assertServiceReady(request, traceId, authRequired) {
  const warmupRequested = process.env.OPEN_SKY_FORCE_WARMUP === "1" || request.headers.get("x-opensky-simulate-warmup") === "1";
  if (authRequired && warmupRequested) {
    throw createErrorResponse(
      ERROR_CODES.SERVICE_UNAVAILABLE,
      "The Render service is warming up.",
      "Wait a few seconds and retry your request.",
      traceId
    );
  }
}

export async function requireActor(request, context, traceId) {
  const token = request.headers.get("x-opensky-session")?.trim();
  const session = await context.store.getSession();

  if (!token || !session || session.token !== token || session.signedIn !== true) {
    throw createErrorResponse(ERROR_CODES.AUTH_REQUIRED, "You must sign in to continue.", "Sign in as the owner-admin user.", traceId);
  }

  return session;
}

export async function getRecord(context, collectionName, id, errorCode, traceId, label) {
  const record = await context.store.get(collectionName, id);
  if (!record || record.status === "deleted") {
    throw createErrorResponse(errorCode, `${label} was not found.`, `Refresh the page and select an existing ${label.toLowerCase()}.`, traceId);
  }
  return record;
}

export async function listRecords(context, collectionName) {
  const items = await context.store.list(collectionName);
  return items.filter((item) => item.status !== "deleted");
}

export async function writeRecord(context, collectionName, id, record) {
  return context.store.set(collectionName, id, record);
}

export async function deleteRecord(context, collectionName, id) {
  return context.store.delete(collectionName, id);
}

export async function writeAudit(context, payload) {
  const eventId = await context.store.nextId("event");
  const event = {
    eventId,
    ...createAuditEvent(payload)
  };
  await context.store.set("audit", eventId, event);
  return event;
}

export function derivePageTitle(currentUrl, displayName = "OpenSky") {
  const parsedUrl = new URL(currentUrl);
  const suffix = parsedUrl.pathname === "/" ? parsedUrl.hostname : `${parsedUrl.hostname}${parsedUrl.pathname}`;
  return `${displayName} - ${suffix}`;
}

export async function resolveLayoutPreference(context, projectId = null) {
  const items = await listRecords(context, "layoutPreferences");
  const projectPreference = projectId ? items.find((item) => item.scope === "project" && item.projectId === projectId) : null;
  const globalPreference = items.find((item) => item.scope === "global");

  return {
    precedence: LAYOUT_PREFERENCE_PRECEDENCE,
    resolvedPreference: projectPreference ?? globalPreference ?? {
      layoutPreferenceId: null,
      scope: "system-default",
      projectId: null,
      leftPanelState: "hidden",
      rightPanelState: "hidden",
      topBarState: "autoHide",
      bottomBarState: "autoHide",
      viewMode: "maximized",
      focusMode: "off",
      contentZoomRatio: 1
    },
    items
  };
}

export function maybeExpireVault(vault) {
  if (vault.rememberUntil && new Date(vault.rememberUntil).getTime() < Date.now() && vault.status === "active") {
    return {
      ...vault,
      status: "expired",
      updatedAt: toIsoTimestamp()
    };
  }
  return vault;
}

export function isPreviewSupported(mimeType) {
  return mimeType.startsWith("text/") || mimeType === "application/json" || mimeType.startsWith("image/");
}

export function normalizePreviewPayload(item) {
  if (item.mimeType.startsWith("text/") || item.mimeType === "application/json") {
    return {
      previewType: "text",
      preview: item.previewContent ?? ""
    };
  }

  if (item.mimeType.startsWith("image/")) {
    return {
      previewType: "image-meta",
      preview: {
        originalName: item.originalName,
        sizeBytes: item.sizeBytes,
        mimeType: item.mimeType
      }
    };
  }

  return null;
}

export function parseQuery(url) {
  return {
    projectId: url.searchParams.get("projectId"),
    siteId: url.searchParams.get("siteId"),
    scope: url.searchParams.get("scope")
  };
}

export function ensureSiteForFeature(site, traceId, flagName, errorCode, message, action) {
  if (!site[flagName]) {
    throw createErrorResponse(errorCode, message, action, traceId);
  }
}
