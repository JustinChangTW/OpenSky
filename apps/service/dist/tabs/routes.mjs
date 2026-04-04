import { parseTabInput } from "../../../../packages/contracts/src/tabs/index.mjs";
import { ERROR_CODES } from "../../../../packages/contracts/src/errors/index.mjs";
import { jsonResponse, readJsonBody } from "../common/http.mjs";
import { getRecord, listRecords, withRoute, writeAudit } from "../common/service-helpers.mjs";

export function registerTabRoutes(router) {
  router.add("GET", "/v1/projects/{projectId}/tabs", withRoute(async ({ context, params }) => {
    const items = listRecords(context.store.state.tabs).filter((tab) => tab.projectId === params.projectId);
    return jsonResponse({ items });
  }));

  router.add("POST", "/v1/projects/{projectId}/tabs", withRoute(async ({ request, context, params, actor }) => {
    const tabId = context.store.nextId("tab");
    const tab = { tabId, ...parseTabInput({ projectId: params.projectId, ...(await readJsonBody(request)) }) };
    context.store.state.tabs.set(tabId, tab);
    writeAudit(context, { actorId: actor.actorId, action: "tabs.create", targetType: "WorkspaceTab", targetId: tabId, result: "success" });
    return jsonResponse(tab, { status: 201 });
  }));

  router.add("PATCH", "/v1/projects/{projectId}/tabs/{tabId}", withRoute(async ({ request, context, params, traceId, actor }) => {
    const currentTab = getRecord(context.store.state.tabs, params.tabId, ERROR_CODES.TAB_NOT_FOUND, traceId, "Tab");
    const tab = { ...currentTab, ...parseTabInput({ ...currentTab, ...(await readJsonBody(request)), projectId: params.projectId }), tabId: params.tabId };
    context.store.state.tabs.set(params.tabId, tab);
    writeAudit(context, { actorId: actor.actorId, action: "tabs.update", targetType: "WorkspaceTab", targetId: params.tabId, result: "success" });
    return jsonResponse(tab);
  }));

  router.add("DELETE", "/v1/projects/{projectId}/tabs/{tabId}", withRoute(async ({ context, params, traceId, actor }) => {
    const currentTab = getRecord(context.store.state.tabs, params.tabId, ERROR_CODES.TAB_NOT_FOUND, traceId, "Tab");
    context.store.state.tabs.set(params.tabId, { ...currentTab, status: "deleted" });
    writeAudit(context, { actorId: actor.actorId, action: "tabs.delete", targetType: "WorkspaceTab", targetId: params.tabId, result: "success" });
    return jsonResponse({ deleted: true, tabId: params.tabId });
  }));
}
