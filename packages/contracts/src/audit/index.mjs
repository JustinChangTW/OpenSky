import { assertOneOf, requireString, toIsoTimestamp } from "../common/index.mjs";

export const AUDIT_RETENTION_STATES = Object.freeze(["active", "redacted", "purged"]);

export function createAuditEvent(payload) {
  return {
    actorId: requireString(payload.actorId, "actorId"),
    action: requireString(payload.action, "action"),
    targetType: requireString(payload.targetType, "targetType"),
    targetId: requireString(payload.targetId, "targetId"),
    result: typeof payload.result === "string" ? payload.result.trim() : "success",
    occurredAt: payload.occurredAt ?? toIsoTimestamp(),
    retentionState: payload.retentionState ? assertOneOf(payload.retentionState, AUDIT_RETENTION_STATES, "retentionState") : "active"
  };
}
