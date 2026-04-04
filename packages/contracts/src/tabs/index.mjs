import { assertOneOf, requireString, toIsoTimestamp } from "../common/index.mjs";

export const TAB_STATUSES = Object.freeze(["open", "suspended", "closed", "deleted"]);

export function parseTabInput(payload) {
  return {
    projectId: requireString(payload.projectId, "projectId"),
    siteId: requireString(payload.siteId, "siteId"),
    entryUrl: requireString(payload.entryUrl, "entryUrl"),
    currentUrl: payload.currentUrl ? requireString(payload.currentUrl, "currentUrl") : requireString(payload.entryUrl, "entryUrl"),
    pageTitle: typeof payload.pageTitle === "string" ? payload.pageTitle.trim() : "",
    renderMode: typeof payload.renderMode === "string" ? payload.renderMode.trim() : "iframe",
    scrollPosition: Number.isFinite(payload.scrollPosition) ? payload.scrollPosition : 0,
    zoomRatio: Number.isFinite(payload.zoomRatio) ? payload.zoomRatio : 1,
    pinned: Boolean(payload.pinned),
    status: payload.status ? assertOneOf(payload.status, TAB_STATUSES, "status") : "open",
    lastVisitedAt: payload.lastVisitedAt ?? toIsoTimestamp()
  };
}
