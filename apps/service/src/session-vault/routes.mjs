import { createErrorResponse, ERROR_CODES } from "../../../../packages/contracts/src/errors/index.mjs";
import { parseSessionVaultInput } from "../../../../packages/contracts/src/session-vault/index.mjs";
import { jsonResponse, readJsonBody } from "../common/http.mjs";
import { ensureSiteForFeature, getRecord, listRecords, maybeExpireVault, parseQuery, withRoute, writeAudit, writeRecord } from "../common/service-helpers.mjs";

export function registerSessionVaultRoutes(router) {
  router.add("GET", "/v1/session-vault", withRoute(async ({ context, url }) => {
    const { projectId, siteId } = parseQuery(url);
    const items = (await listRecords(context, "sessionVault"))
      .map(async (item) => {
        const nextItem = maybeExpireVault(item);
        await writeRecord(context, "sessionVault", nextItem.vaultId, nextItem);
        return nextItem;
      })
      ;
    const resolvedItems = (await Promise.all(items))
      .filter((item) => (!projectId || item.projectId === projectId) && (!siteId || item.siteId === siteId));
    return jsonResponse({ items: resolvedItems });
  }));

  router.add("POST", "/v1/session-vault", withRoute(async ({ request, context, traceId, actor }) => {
    const payload = parseSessionVaultInput(await readJsonBody(request));
    const site = await getRecord(context, "sites", payload.siteId, ERROR_CODES.SITE_NOT_FOUND, traceId, "Site");
    ensureSiteForFeature(
      site,
      traceId,
      "loginPersistenceAllowed",
      ERROR_CODES.LOGIN_PERSISTENCE_DISABLED,
      "Login persistence is disabled for this site.",
      "Choose a site that explicitly allows session persistence."
    );
    const vaultId = await context.store.nextId("vault");
    const vault = { vaultId, ...payload };
    await writeRecord(context, "sessionVault", vaultId, vault);
    await writeAudit(context, { actorId: actor.actorId, action: "session-vault.create", targetType: "ExternalSessionVault", targetId: vaultId, result: "success" });
    return jsonResponse(vault, { status: 201 });
  }));

  router.add("PATCH", "/v1/session-vault/{vaultId}", withRoute(async ({ request, context, params, traceId, actor }) => {
    const currentVault = await getRecord(context, "sessionVault", params.vaultId, ERROR_CODES.SESSION_VAULT_NOT_FOUND, traceId, "Session vault");
    const payload = { ...currentVault, ...(await readJsonBody(request)) };
    if (payload.status === "expired" && currentVault.status === "revoked") {
      throw createErrorResponse(ERROR_CODES.CONFLICT_RETRY, "A revoked session vault cannot transition to expired.", "Refresh the session vault list and retry with a valid transition.", traceId);
    }
    const vault = { ...currentVault, ...parseSessionVaultInput(payload), vaultId: params.vaultId };
    await writeRecord(context, "sessionVault", params.vaultId, vault);
    await writeAudit(context, { actorId: actor.actorId, action: "session-vault.update", targetType: "ExternalSessionVault", targetId: params.vaultId, result: "success" });
    return jsonResponse(vault);
  }));

  router.add("DELETE", "/v1/session-vault/{vaultId}", withRoute(async ({ context, params, traceId, actor }) => {
    const currentVault = await getRecord(context, "sessionVault", params.vaultId, ERROR_CODES.SESSION_VAULT_NOT_FOUND, traceId, "Session vault");
    await writeRecord(context, "sessionVault", params.vaultId, { ...currentVault, status: "deleted" });
    await writeAudit(context, { actorId: actor.actorId, action: "session-vault.delete", targetType: "ExternalSessionVault", targetId: params.vaultId, result: "success" });
    return jsonResponse({ deleted: true, vaultId: params.vaultId });
  }));
}
