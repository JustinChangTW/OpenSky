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

  const demoSites = [
    {
      siteId: "site_demo_example",
      displayName: "Example",
      baseDomains: ["example.com"],
      pathRules: ["/"],
      verifiedUrl: "https://example.com/"
    },
    {
      siteId: "site_demo_mdn",
      displayName: "MDN Docs",
      baseDomains: ["developer.mozilla.org", "transcend-cdn.com"],
      pathRules: ["/"],
      verifiedUrl: "https://developer.mozilla.org/zh-TW/"
    },
    {
      siteId: "site_demo_iana",
      displayName: "IANA Reserved Domains",
      baseDomains: ["www.iana.org", "iana.org"],
      pathRules: ["/domains/reserved"],
      verifiedUrl: "https://www.iana.org/domains/reserved"
    },
    {
      siteId: "site_demo_chatgpt_login",
      displayName: "ChatGPT Login",
      baseDomains: ["chatgpt.com", "cdn.oaistatic.com", "oaistatic.com"],
      pathRules: ["/"],
      verifiedUrl: "https://chatgpt.com/auth/login"
    }
  ];

  const demoShortcuts = [
    {
      id: "demo-example",
      label: "Example.com",
      url: "https://example.com/"
    },
    {
      id: "demo-mdn",
      label: "MDN zh-TW",
      url: "https://developer.mozilla.org/zh-TW/"
    },
    {
      id: "demo-iana",
      label: "IANA Reserved Domains",
      url: "https://www.iana.org/domains/reserved"
    },
    {
      id: "demo-chatgpt-login",
      label: "ChatGPT Login",
      url: "https://chatgpt.com/auth/login"
    }
  ];

  const ensureDemoSeeded = async () => {
    if (context.runtime.environment === "production" || !context.runtime.demoPresetEnabled) {
      return;
    }

    if (!demoSeedPromise) {
      demoSeedPromise = (async () => {
        const [sites, projects, tabs, layoutPreferences] = await Promise.all([
          context.store.list("sites"),
          context.store.list("projects"),
          context.store.list("tabs"),
          context.store.list("layoutPreferences")
        ]);

        const legacyDemoSites = sites.filter((site) => (
          site.siteId === "site_demo"
          || site.displayName === "OpenSky Demo"
          || (Array.isArray(site.baseDomains) && site.baseDomains.includes("demo.opensky.local"))
        ));

        for (const legacySite of legacyDemoSites) {
          await context.store.delete("sites", legacySite.siteId);
          const relatedTabs = tabs.filter((tab) => tab.siteId === legacySite.siteId);
          for (const tab of relatedTabs) {
            await context.store.delete("tabs", tab.tabId);
          }
        }

        for (const demoSite of demoSites) {
          await context.store.set("sites", demoSite.siteId, {
            siteId: demoSite.siteId,
            displayName: demoSite.displayName,
            baseDomains: demoSite.baseDomains,
            pathRules: demoSite.pathRules,
            defaultRenderMode: "allowlist-proxy-phase1",
            loginPersistenceAllowed: true,
            downloadAllowed: true,
            uploadAllowed: true,
            status: "active",
            createdAt: context.runtime.startedAt,
            updatedAt: context.runtime.startedAt
          });
        }

        const existingProject = projects.find((project) => project.projectId === "project_demo");
        await context.store.set("projects", "project_demo", {
          projectId: "project_demo",
          name: "Demo Workspace",
          description: "Verified real-site demo preset",
          defaultSiteId: "site_demo_example",
          status: "active",
          lastOpenedAt: context.runtime.startedAt,
          createdAt: existingProject?.createdAt ?? context.runtime.startedAt,
          updatedAt: context.runtime.startedAt
        });

        if (!layoutPreferences.length) {
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
      siteDisplayName: "Example",
      projectName: "Demo Workspace",
      verifiedEntryUrl: "https://example.com/",
      verifiedSecondaryUrl: "https://developer.mozilla.org/zh-TW/",
      demoSites: demoSites.map((site) => ({
        siteId: site.siteId,
        displayName: site.displayName,
        baseDomains: site.baseDomains,
        pathRules: site.pathRules,
        verifiedUrl: site.verifiedUrl
      })),
      shortcuts: demoShortcuts
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
      siteDisplayName: "Example",
      projectName: "Demo Workspace",
      verifiedEntryUrl: "https://example.com/",
      verifiedSecondaryUrl: "https://developer.mozilla.org/zh-TW/",
      demoSites: demoSites.map((site) => ({
        siteId: site.siteId,
        displayName: site.displayName,
        baseDomains: site.baseDomains,
        pathRules: site.pathRules,
        verifiedUrl: site.verifiedUrl
      })),
      shortcuts: demoShortcuts
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
