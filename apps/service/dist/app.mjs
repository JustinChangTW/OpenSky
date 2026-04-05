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
  let demoSeedPromise = null;

  const ensureDemoSeeded = async () => {
    if (context.runtime.environment === "production" || !context.runtime.demoPresetEnabled) {
      return;
    }

    if (!demoSeedPromise) {
      demoSeedPromise = (async () => {
        const [sites, projects, layoutPreferences] = await Promise.all([
          context.store.list("sites"),
          context.store.list("projects"),
          context.store.list("layoutPreferences")
        ]);

        const shouldSeedDemoWorkspace = !sites.length && !projects.length;

        if (shouldSeedDemoWorkspace) {
          await context.store.set("sites", "site_demo", {
            siteId: "site_demo",
            displayName: "OpenSky Demo",
            baseDomains: ["demo.opensky.local"],
            pathRules: ["/"],
            defaultRenderMode: "allowlist-proxy-phase1",
            loginPersistenceAllowed: true,
            downloadAllowed: true,
            uploadAllowed: true,
            status: "active",
            createdAt: context.runtime.startedAt,
            updatedAt: context.runtime.startedAt
          });
          await context.store.set("projects", "project_demo", {
            projectId: "project_demo",
            name: "Demo Workspace",
            description: "Verified local demo preset",
            defaultSiteId: "site_demo",
            status: "active",
            lastOpenedAt: context.runtime.startedAt,
            createdAt: context.runtime.startedAt,
            updatedAt: context.runtime.startedAt
          });
        }

        if (shouldSeedDemoWorkspace && !layoutPreferences.length) {
          await context.store.set("layoutPreferences", "layout_demo_global", {
            layoutPreferenceId: "layout_demo_global",
            scope: "global",
            projectId: null,
            leftPanelState: "hidden",
            rightPanelState: "hidden",
            topBarState: "autoHide",
            bottomBarState: "hidden",
            viewMode: "maximized",
            focusMode: "off",
            contentZoomRatio: 1,
            createdAt: context.runtime.startedAt,
            updatedAt: context.runtime.startedAt
          });
        }
      })();
    }

    await demoSeedPromise;
  };

  const createHealthPayload = () => ({
    ok: true,
    service: "opensky",
    mode: "ready",
    environment: context.runtime.environment,
    persistenceMode: context.runtime.persistenceMode,
    persistPathConfigured: context.runtime.persistPathConfigured,
    firebaseConfigured: context.runtime.firebaseConfigured,
    startupWarnings: context.runtime.startupWarnings,
    startedAt: context.runtime.startedAt
  });

  router.add("GET", "/", withRoute(async () => jsonResponse({
    ...createHealthPayload(),
    summary: "OpenSky backend is running.",
    infoPath: "/info",
    healthPath: "/health",
    apiBasePath: "/v1",
    demo: {
      username: "owner-admin",
      passwordHint: context.runtime.environment === "production" ? "disabled in production" : "opensky-demo"
    }
  }), { authRequired: false }));
  router.add("GET", "/health", withRoute(async () => jsonResponse(createHealthPayload()), { authRequired: false }));
  router.add("GET", "/v1/health", withRoute(async () => jsonResponse(createHealthPayload()), { authRequired: false }));
  router.add("GET", "/info", withRoute(async () => jsonResponse({
    ...createHealthPayload(),
    productName: "OpenSky",
    prototypeStage: "demoable-minimal-prototype",
    browsingMode: "allowlist-based remote browsing / controlled relay",
    demoConstraints: [
      "single-user owner-admin",
      "approved demo sites only",
      "no arbitrary URL browsing",
      "no unrestricted proxy"
    ],
    demoNotes: [
      "Use /health for runtime diagnostics.",
      "Sign in before calling protected /v1 routes.",
      "Allowlisted sites must use hostname-only base domains and explicit path rules."
    ],
    demoPreset: {
      siteDisplayName: "OpenSky Demo",
      projectName: "Demo Workspace",
      verifiedEntryUrl: "https://demo.opensky.local/",
      verifiedSecondaryUrl: "https://demo.opensky.local/status"
    },
    routes: {
      health: "/health",
      info: "/info",
      versionedInfo: "/v1/info"
    }
  }), { authRequired: false }));
  router.add("GET", "/v1/info", withRoute(async () => jsonResponse({
    ...createHealthPayload(),
    productName: "OpenSky",
    prototypeStage: "demoable-minimal-prototype",
    browsingMode: "allowlist-based remote browsing / controlled relay",
    demoConstraints: [
      "single-user owner-admin",
      "approved demo sites only",
      "no arbitrary URL browsing",
      "no unrestricted proxy"
    ],
    primaryActions: [
      "Select site",
      "Open",
      "Maximize",
      "Back to workspace"
    ],
    demoNotes: [
      "Use /health for runtime diagnostics.",
      "Sign in before calling protected /v1 routes.",
      "Allowlisted sites must use hostname-only base domains and explicit path rules."
    ],
    demoPreset: {
      siteDisplayName: "OpenSky Demo",
      projectName: "Demo Workspace",
      verifiedEntryUrl: "https://demo.opensky.local/",
      verifiedSecondaryUrl: "https://demo.opensky.local/status"
    },
    routes: {
      health: "/health",
      info: "/info",
      versionedInfo: "/v1/info"
    }
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
      await ensureDemoSeeded();
      return router.handle(request, context);
    }
  };
}
