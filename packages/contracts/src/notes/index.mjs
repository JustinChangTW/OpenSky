import { assertOneOf, requireString, toIsoTimestamp } from "../common/index.mjs";

export const NOTE_STATUSES = Object.freeze(["active", "archived", "deleted"]);

export function parseNoteInput(payload) {
  return {
    projectId: requireString(payload.projectId, "projectId"),
    relatedTabId: typeof payload.relatedTabId === "string" ? payload.relatedTabId.trim() : null,
    title: requireString(payload.title, "title"),
    content: typeof payload.content === "string" ? payload.content : "",
    status: payload.status ? assertOneOf(payload.status, NOTE_STATUSES, "status") : "active",
    createdAt: payload.createdAt ?? toIsoTimestamp(),
    updatedAt: payload.updatedAt ?? toIsoTimestamp()
  };
}
