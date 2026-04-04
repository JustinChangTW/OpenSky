import { assertOneOf, requireString, toIsoTimestamp } from "../common/index.mjs";

export const BOOKMARK_STATUSES = Object.freeze(["active", "archived", "deleted"]);

export function parseBookmarkInput(payload) {
  return {
    projectId: typeof payload.projectId === "string" ? payload.projectId.trim() : null,
    siteId: requireString(payload.siteId, "siteId"),
    url: requireString(payload.url, "url"),
    title: requireString(payload.title, "title"),
    note: typeof payload.note === "string" ? payload.note.trim() : "",
    status: payload.status ? assertOneOf(payload.status, BOOKMARK_STATUSES, "status") : "active",
    createdAt: payload.createdAt ?? toIsoTimestamp(),
    updatedAt: payload.updatedAt ?? toIsoTimestamp()
  };
}
