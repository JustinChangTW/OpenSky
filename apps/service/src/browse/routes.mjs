import { parseBrowseNavigateInput, parseBrowseOpenInput } from "../../../../packages/contracts/src/browse/index.mjs";
import { createErrorResponse, ERROR_CODES } from "../../../../packages/contracts/src/errors/index.mjs";
import { parseTabInput } from "../../../../packages/contracts/src/tabs/index.mjs";
import { assertUrlAllowed } from "../../../../packages/policy/src/index.mjs";
import { jsonResponse, readJsonBody } from "../common/http.mjs";
import { derivePageTitle, getRecord, withRoute, writeAudit } from "../common/service-helpers.mjs";

export function registerBrowseRoutes(router) {
  router.add("POST", "/v1/browse/open", withRoute(async ({ request, context, traceId, actor }) => {
    const payload = parseBrowseOpenInput(await readJsonBody(request));
    const site = getRecord(context.store.state.sites, payload.siteId, ERROR_CODES.SITE_NOT_FOUND, traceId, "Site");
    const project = getRecord(context.store.state.projects, payload.projectId, ERROR_CODES.PROJECT_NOT_FOUND, traceId, "Project");

    if (site.status !== "active") {
      throw createErrorResponse(ERROR_CODES.SITE_DISABLED, "This site is not active.", "Choose an active allowlisted site.", traceId);
    }

    assertUrlAllowed(payload.entryUrl, site, traceId);
    const tabId = context.store.nextId("tab");
    const tab = {
      tabId,
      ...parseTabInput({
        projectId: project.projectId,
        siteId: site.siteId,
        entryUrl: payload.entryUrl,
        currentUrl: payload.entryUrl,
        pageTitle: derivePageTitle(payload.entryUrl, site.displayName),
        renderMode: site.defaultRenderMode ?? "iframe",
        status: "open"
      })
    };
    context.store.state.tabs.set(tabId, tab);
    context.store.state.projects.set(project.projectId, { ...project, status: project.status === "draft" ? "active" : project.status, lastOpenedAt: new Date().toISOString() });
    writeAudit(context, { actorId: actor.actorId, action: "browse.open", targetType: "WorkspaceTab", targetId: tabId, result: "success" });
    return jsonResponse(tab, { status: 201 });
  }));

  router.add("POST", "/v1/browse/navigate", withRoute(async ({ request, context, traceId, actor }) => {
    const payload = parseBrowseNavigateInput(await readJsonBody(request));
    const tab = getRecord(context.store.state.tabs, payload.tabId, ERROR_CODES.TAB_NOT_FOUND, traceId, "Tab");
    const site = getRecord(context.store.state.sites, tab.siteId, ERROR_CODES.SITE_NOT_FOUND, traceId, "Site");
    assertUrlAllowed(payload.nextUrl, site, traceId);

    const updatedTab = {
      ...tab,
      currentUrl: payload.nextUrl,
      pageTitle: derivePageTitle(payload.nextUrl, site.displayName),
      status: "open",
      lastVisitedAt: new Date().toISOString()
    };
    context.store.state.tabs.set(tab.tabId, updatedTab);
    writeAudit(context, { actorId: actor.actorId, action: "browse.navigate", targetType: "WorkspaceTab", targetId: tab.tabId, result: "success" });
    return jsonResponse(updatedTab);
  }));

  router.add("POST", "/v1/browse/close", withRoute(async ({ request, context, traceId, actor }) => {
    const payload = await readJsonBody(request);
    const tab = getRecord(context.store.state.tabs, payload.tabId, ERROR_CODES.TAB_NOT_FOUND, traceId, "Tab");
    const updatedTab = { ...tab, status: "closed", lastVisitedAt: new Date().toISOString() };
    context.store.state.tabs.set(payload.tabId, updatedTab);
    writeAudit(context, { actorId: actor.actorId, action: "browse.close", targetType: "WorkspaceTab", targetId: payload.tabId, result: "success" });
    return jsonResponse(updatedTab);
  }));
}
