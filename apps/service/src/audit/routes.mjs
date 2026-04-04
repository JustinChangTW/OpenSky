import { jsonResponse } from "../common/http.mjs";
import { listRecords, withRoute } from "../common/service-helpers.mjs";

export function registerAuditRoutes(router) {
  router.add("GET", "/v1/audit", withRoute(async ({ context, url }) => {
    const projectId = url.searchParams.get("projectId");
    const items = listRecords(context.store.state.audit)
      .filter((event) => !projectId || event.targetId === projectId || event.targetId.startsWith(`${projectId}_`))
      .sort((left, right) => right.occurredAt.localeCompare(left.occurredAt));
    return jsonResponse({ items });
  }));
}
