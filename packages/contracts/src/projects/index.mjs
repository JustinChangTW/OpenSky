import { assertOneOf, requireString, toIsoTimestamp } from "../common/index.mjs";

export const PROJECT_STATUSES = Object.freeze(["draft", "active", "paused", "archived", "deleted"]);

export function parseProjectInput(payload) {
  return {
    name: requireString(payload.name, "name"),
    description: typeof payload.description === "string" ? payload.description.trim() : "",
    defaultSiteId: typeof payload.defaultSiteId === "string" ? payload.defaultSiteId.trim() : null,
    status: payload.status ? assertOneOf(payload.status, PROJECT_STATUSES, "status") : "draft",
    lastOpenedAt: payload.lastOpenedAt ?? null,
    createdAt: payload.createdAt ?? toIsoTimestamp(),
    updatedAt: payload.updatedAt ?? toIsoTimestamp()
  };
}
