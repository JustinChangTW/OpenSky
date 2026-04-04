import { createRouter } from "./common/router.mjs";
import { jsonResponse } from "./common/http.mjs";
import { registerAuthRoutes } from "./auth/routes.mjs";
import { registerSiteRoutes } from "./sites/routes.mjs";
import { registerProjectRoutes } from "./projects/routes.mjs";
import { registerTabRoutes } from "./tabs/routes.mjs";
import { registerBookmarkRoutes } from "./bookmarks/routes.mjs";
import { registerNoteRoutes } from "./notes/routes.mjs";
import { registerLayoutPreferenceRoutes } from "./layout-preferences/routes.mjs";
import { registerBrowseRoutes } from "./browse/routes.mjs";
import { registerSessionVaultRoutes } from "./session-vault/routes.mjs";
import { registerFileTransferRoutes } from "./file-transfer/routes.mjs";
import { registerAuditRoutes } from "./audit/routes.mjs";
import { withRoute } from "./common/service-helpers.mjs";

export function createServiceHandler(context) {
  const router = createRouter();

  router.add("GET", "/health", withRoute(async () => jsonResponse({
    ok: true,
    service: "opensky",
    mode: "ready",
    environment: context.runtime.environment,
    persistenceMode: context.runtime.persistenceMode,
    persistPathConfigured: context.runtime.persistPathConfigured,
    startupWarnings: context.runtime.startupWarnings,
    startedAt: context.runtime.startedAt
  }), { authRequired: false }));
  registerAuthRoutes(router);
  registerSiteRoutes(router);
  registerProjectRoutes(router);
  registerTabRoutes(router);
  registerBookmarkRoutes(router);
  registerNoteRoutes(router);
  registerLayoutPreferenceRoutes(router);
  registerBrowseRoutes(router);
  registerSessionVaultRoutes(router);
  registerFileTransferRoutes(router);
  registerAuditRoutes(router);

  return {
    async handle(request) {
      return router.handle(request, context);
    }
  };
}
