import { requireString } from "../common/index.mjs";

export function parseBrowseOpenInput(payload) {
  return {
    projectId: requireString(payload.projectId, "projectId"),
    siteId: requireString(payload.siteId, "siteId"),
    entryUrl: requireString(payload.entryUrl, "entryUrl")
  };
}

export function parseBrowseNavigateInput(payload) {
  return {
    projectId: requireString(payload.projectId, "projectId"),
    tabId: requireString(payload.tabId, "tabId"),
    nextUrl: requireString(payload.nextUrl, "nextUrl")
  };
}
