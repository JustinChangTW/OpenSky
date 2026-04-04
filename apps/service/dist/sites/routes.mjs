import { parseAllowedSiteInput } from "../../../../packages/contracts/src/sites/index.mjs";
import { ERROR_CODES } from "../../../../packages/contracts/src/errors/index.mjs";
import { jsonResponse, readJsonBody } from "../common/http.mjs";
import { getRecord, listRecords, withRoute, writeAudit } from "../common/service-helpers.mjs";

export function registerSiteRoutes(router) {
  router.add("GET", "/v1/sites", withRoute(async ({ context }) => jsonResponse({ items: listRecords(context.store.state.sites) })));

  router.add("POST", "/v1/sites", withRoute(async ({ request, context, actor }) => {
    const siteId = context.store.nextId("site");
    const site = { siteId, ...parseAllowedSiteInput(await readJsonBody(request)) };
    context.store.state.sites.set(siteId, site);
    writeAudit(context, { actorId: actor.actorId, action: "sites.create", targetType: "AllowedSite", targetId: siteId, result: "success" });
    return jsonResponse(site, { status: 201 });
  }));

  router.add("GET", "/v1/sites/{siteId}", withRoute(async ({ context, params, traceId }) => {
    return jsonResponse(getRecord(context.store.state.sites, params.siteId, ERROR_CODES.SITE_NOT_FOUND, traceId, "Site"));
  }));

  router.add("PATCH", "/v1/sites/{siteId}", withRoute(async ({ request, context, params, traceId, actor }) => {
    const currentSite = getRecord(context.store.state.sites, params.siteId, ERROR_CODES.SITE_NOT_FOUND, traceId, "Site");
    const site = { ...currentSite, ...parseAllowedSiteInput({ ...currentSite, ...(await readJsonBody(request)) }), siteId: params.siteId };
    context.store.state.sites.set(params.siteId, site);
    writeAudit(context, { actorId: actor.actorId, action: "sites.update", targetType: "AllowedSite", targetId: params.siteId, result: "success" });
    return jsonResponse(site);
  }));

  router.add("DELETE", "/v1/sites/{siteId}", withRoute(async ({ context, params, traceId, actor }) => {
    const currentSite = getRecord(context.store.state.sites, params.siteId, ERROR_CODES.SITE_NOT_FOUND, traceId, "Site");
    context.store.state.sites.set(params.siteId, { ...currentSite, status: "deleted" });
    writeAudit(context, { actorId: actor.actorId, action: "sites.delete", targetType: "AllowedSite", targetId: params.siteId, result: "success" });
    return jsonResponse({ deleted: true, siteId: params.siteId });
  }));
}
