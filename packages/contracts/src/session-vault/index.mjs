import { assertOneOf, requireString, toIsoTimestamp } from "../common/index.mjs";

export const SESSION_VAULT_STATUSES = Object.freeze(["active", "expired", "revoked", "deleted"]);

export function parseSessionVaultInput(payload) {
  return {
    siteId: requireString(payload.siteId, "siteId"),
    projectId: typeof payload.projectId === "string" ? payload.projectId.trim() : null,
    persistenceScope: typeof payload.persistenceScope === "string" ? payload.persistenceScope.trim() : "site",
    secretType: typeof payload.secretType === "string" ? payload.secretType.trim() : "token",
    rememberUntil: typeof payload.rememberUntil === "string" ? payload.rememberUntil : null,
    status: payload.status ? assertOneOf(payload.status, SESSION_VAULT_STATUSES, "status") : "active",
    createdAt: payload.createdAt ?? toIsoTimestamp(),
    updatedAt: payload.updatedAt ?? toIsoTimestamp()
  };
}
