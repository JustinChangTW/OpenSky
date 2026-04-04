import { parseAllowedSiteInput } from "../../../../packages/contracts/src/sites/index.mjs";
import { ERROR_CODES } from "../../../../packages/contracts/src/errors/index.mjs";
import { jsonResponse, readJsonBody } from "../common/http.mjs";
import { getRecord, listRecords, withRoute, writeAudit, writeRecord } from "../common/service-helpers.mjs";

export function registerSiteRoutes(router) {
  router.add("GET", "/v1/sites", withRoute(async ({ context }) => jsonResponse({ items: await listRecords(context, "sites") })));

  router.add("POST", "/v1/sites", withRoute(async ({ request, context, actor }) => {
    const siteId = await context.store.nextId("site");
    const site = { siteId, ...parseAllowedSiteInput(await readJsonBody(request)) };
    await writeRecord(context, "sites", siteId, site);
    await writeAudit(context, { actorId: actor.actorId, action: "sites.create", targetType: "AllowedSite", targetId: siteId, result: "success" });
    return jsonResponse(site, { status: 201 });
  }));

  router.add("GET", "/v1/sites/{siteId}", withRoute(async ({ context, params, traceId }) => {
    return jsonResponse(await getRecord(context, "sites", params.siteId, ERROR_CODES.SITE_NOT_FOUND, traceId, "Site"));
  }));

  router.add("PATCH", "/v1/sites/{siteId}", withRoute(async ({ request, context, params, traceId, actor }) => {
    const currentSite = await getRecord(context, "sites", params.siteId, ERROR_CODES.SITE_NOT_FOUND, traceId, "Site");
    const site = { ...currentSite, ...parseAllowedSiteInput({ ...currentSite, ...(await readJsonBody(request)) }), siteId: params.siteId };
    await writeRecord(context, "sites", params.siteId, site);
    await writeAudit(context, { actorId: actor.actorId, action: "sites.update", targetType: "AllowedSite", targetId: params.siteId, result: "success" });
    return jsonResponse(site);
  }));

  router.add("DELETE", "/v1/sites/{siteId}", withRoute(async ({ context, params, traceId, actor }) => {
    const currentSite = await getRecord(context, "sites", params.siteId, ERROR_CODES.SITE_NOT_FOUND, traceId, "Site");
    await writeRecord(context, "sites", params.siteId, { ...currentSite, status: "deleted" });
    await writeAudit(context, { actorId: actor.actorId, action: "sites.delete", targetType: "AllowedSite", targetId: params.siteId, result: "success" });
    return jsonResponse({ deleted: true, siteId: params.siteId });
  }));
}
