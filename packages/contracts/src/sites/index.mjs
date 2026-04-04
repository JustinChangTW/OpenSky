import { assertOneOf, requireBoolean, requireString, toIsoTimestamp } from "../common/index.mjs";

export const ALLOWED_SITE_STATUSES = Object.freeze(["active", "disabled", "archived", "deleted"]);

export function parseAllowedSiteInput(payload) {
  const baseDomains = Array.isArray(payload.baseDomains) ? payload.baseDomains.map((value) => requireString(value, "baseDomains[]")) : [];
  const pathRules = Array.isArray(payload.pathRules) ? payload.pathRules.map((value) => requireString(value, "pathRules[]")) : [];

  return {
    displayName: requireString(payload.displayName, "displayName"),
    baseDomains,
    pathRules,
    defaultRenderMode: payload.defaultRenderMode ? requireString(payload.defaultRenderMode, "defaultRenderMode") : "iframe",
    loginPersistenceAllowed: requireBoolean(Boolean(payload.loginPersistenceAllowed), "loginPersistenceAllowed"),
    downloadAllowed: requireBoolean(Boolean(payload.downloadAllowed), "downloadAllowed"),
    uploadAllowed: requireBoolean(Boolean(payload.uploadAllowed), "uploadAllowed"),
    status: payload.status ? assertOneOf(payload.status, ALLOWED_SITE_STATUSES, "status") : "active",
    createdAt: payload.createdAt ?? toIsoTimestamp(),
    updatedAt: payload.updatedAt ?? toIsoTimestamp()
  };
}
