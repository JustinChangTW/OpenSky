import { jsonResponse } from "../common/http.mjs";
import { listRecords, withRoute } from "../common/service-helpers.mjs";

async function isProjectRelatedEvent(context, event, projectId) {
  if (!projectId) {
    return true;
  }

  if (!event?.targetId) {
    return false;
  }

  switch (event.targetType) {
    case "WorkspaceProject":
      return event.targetId === projectId;
    case "WorkspaceTab":
      return (await context.store.get("tabs", event.targetId))?.projectId === projectId;
    case "Bookmark":
      return (await context.store.get("bookmarks", event.targetId))?.projectId === projectId;
    case "Note":
      return (await context.store.get("notes", event.targetId))?.projectId === projectId;
    case "ExternalSessionVault":
      return (await context.store.get("sessionVault", event.targetId))?.projectId === projectId;
    case "FileTransferItem":
      return (await context.store.get("fileTransfers", event.targetId))?.projectId === projectId;
    case "LayoutPreference":
      return (await context.store.get("layoutPreferences", event.targetId))?.projectId === projectId;
    default:
      return false;
  }
}

export function registerAuditRoutes(router) {
  router.add("GET", "/v1/audit", withRoute(async ({ context, url }) => {
    const projectId = url.searchParams.get("projectId");
    const events = await listRecords(context, "audit");
    const items = (await Promise.all(events.map(async (event) => ({
      event,
      included: await isProjectRelatedEvent(context, event, projectId)
    }))))
      .filter((entry) => entry.included)
      .map((entry) => entry.event)
      .sort((left, right) => right.occurredAt.localeCompare(left.occurredAt));
    return jsonResponse({ items });
  }));
}
