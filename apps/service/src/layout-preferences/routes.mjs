import { parseLayoutPreferenceInput } from "../../../../packages/contracts/src/layout-preferences/index.mjs";
import { createErrorResponse, ERROR_CODES } from "../../../../packages/contracts/src/errors/index.mjs";
import { jsonResponse, readJsonBody } from "../common/http.mjs";
import { parseQuery, resolveLayoutPreference, withRoute, writeAudit } from "../common/service-helpers.mjs";

export function registerLayoutPreferenceRoutes(router) {
  router.add("GET", "/v1/layout-preferences", withRoute(async ({ context, url }) => {
    const { projectId, scope } = parseQuery(url);
    const resolution = resolveLayoutPreference(context, projectId);
    const items = scope ? resolution.items.filter((item) => item.scope === scope) : resolution.items;
    return jsonResponse({ ...resolution, items });
  }));

  router.add("POST", "/v1/layout-preferences", withRoute(async ({ request, context, actor }) => {
    const layoutPreferenceId = context.store.nextId("layout");
    const preference = { layoutPreferenceId, ...parseLayoutPreferenceInput(await readJsonBody(request)) };
    context.store.state.layoutPreferences.set(layoutPreferenceId, preference);
    writeAudit(context, { actorId: actor.actorId, action: "layout-preferences.create", targetType: "LayoutPreference", targetId: layoutPreferenceId, result: "success" });
    return jsonResponse(preference, { status: 201 });
  }));

  router.add("PATCH", "/v1/layout-preferences/{layoutPreferenceId}", withRoute(async ({ request, context, params, traceId, actor }) => {
    const currentPreference = context.store.state.layoutPreferences.get(params.layoutPreferenceId);
    if (!currentPreference) {
      throw createErrorResponse(ERROR_CODES.INVALID_INPUT, "Layout preference was not found.", "Refresh the page and select an existing layout preference.", traceId);
    }

    const preference = {
      ...currentPreference,
      ...parseLayoutPreferenceInput({ ...currentPreference, ...(await readJsonBody(request)) }),
      layoutPreferenceId: params.layoutPreferenceId
    };
    context.store.state.layoutPreferences.set(params.layoutPreferenceId, preference);
    writeAudit(context, { actorId: actor.actorId, action: "layout-preferences.update", targetType: "LayoutPreference", targetId: params.layoutPreferenceId, result: "success" });
    return jsonResponse(preference);
  }));

  router.add("DELETE", "/v1/layout-preferences/{layoutPreferenceId}", withRoute(async ({ context, params, actor }) => {
    context.store.state.layoutPreferences.delete(params.layoutPreferenceId);
    writeAudit(context, { actorId: actor.actorId, action: "layout-preferences.delete", targetType: "LayoutPreference", targetId: params.layoutPreferenceId, result: "success" });
    return jsonResponse({ deleted: true, layoutPreferenceId: params.layoutPreferenceId });
  }));
}
