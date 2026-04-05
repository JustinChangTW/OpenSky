import test from "node:test";
import assert from "node:assert/strict";
import { bootApplication } from "../src/app.js";

function createStorage(seed = {}) {
  const state = new Map(Object.entries({
    "opensky.locale": "en",
    ...seed
  }));

  return {
    getItem(key) {
      return state.has(key) ? state.get(key) : null;
    },
    setItem(key, value) {
      state.set(key, String(value));
    },
    removeItem(key) {
      state.delete(key);
    }
  };
}

function createJsonResponse(payload, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() {
      return payload;
    }
  };
}

function createFetchMock(routeMap) {
  return async (url, init = {}) => {
    const parsedUrl = new URL(url, "https://opensky.test");
    const method = init.method ?? "GET";
    const key = `${method} ${parsedUrl.pathname}${parsedUrl.search}`;
    const fallbackKey = `${method} ${parsedUrl.pathname}`;
    const handler = routeMap.get(key)
      ?? routeMap.get(fallbackKey)
      ?? (method === "GET" && parsedUrl.pathname === "/v1/info"
        ? {
            ok: true,
            service: "opensky",
            mode: "ready",
            environment: "development",
            persistenceMode: "memory",
            productName: "OpenSky",
            prototypeStage: "demoable-minimal-prototype",
            browsingMode: "allowlist-based remote browsing / controlled relay",
            primaryActions: ["Select site", "Open", "Maximize", "Back to workspace"],
            routes: {
              health: "/health",
              info: "/v1/info"
            }
          }
        : null);

    if (!handler) {
      throw new Error(`Unexpected request: ${key}`);
    }

    const payload = typeof handler === "function"
      ? await handler({ url: parsedUrl, init })
      : handler;

    return createJsonResponse(payload);
  };
}

function createDocumentHarness(options = {}) {
  const contentStage = options.contentStage ?? {};
  const mountNode = {
    innerHTML: "",
    listeners: new Map(),
    addEventListener(type, handler) {
      this.listeners.set(type, handler);
    }
  };

  const documentRef = {
    documentElement: { lang: "en" },
    getElementById(id) {
      if (id === "app") {
        return mountNode;
      }

      if (id === "content-stage") {
        return contentStage;
      }

      return null;
    },
    querySelector() {
      return null;
    }
  };

  return {
    mountNode,
    documentRef,
    async clickAction(action, dataset = {}) {
      const button = {
        dataset: {
          action,
          ...dataset
        }
      };

      const event = {
        preventDefault() {},
        target: {
          closest(selector) {
            return selector === "[data-action]" ? button : null;
          }
        }
      };

      await mountNode.listeners.get("click")?.(event);
    }
  };
}

async function waitFor(predicate, timeoutMs = 1000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (predicate()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  assert.fail("Timed out waiting for UI state.");
}

test("bootApplication restores global layout preference into the top settings tray", async () => {
  const originalFetch = globalThis.fetch;
  const originalStorage = globalThis.localStorage;
  const storage = createStorage({
    "opensky.session-token": "session_demo",
    "opensky.layout": JSON.stringify({
      leftPanelState: "hidden",
      rightPanelState: "hidden",
      topBarState: "autoHide",
      bottomBarState: "autoHide",
      viewMode: "maximized",
      focusMode: "off",
      contentZoomRatio: 1
    })
  });
  const routes = new Map([
    ["GET /v1/me", { signedIn: true, actorId: "owner_admin", displayName: "Owner Admin", token: "session_demo" }],
    ["GET /v1/sites", { items: [{ siteId: "site_1", displayName: "Example", baseDomains: ["example.com"], pathRules: ["/"] }] }],
    ["GET /v1/projects", { items: [] }],
    ["GET /v1/session-vault", { items: [] }],
    ["GET /v1/audit", { items: [] }],
    ["GET /v1/layout-preferences", {
      precedence: ["project", "global", "system-default"],
      resolvedPreference: {
        layoutPreferenceId: "layout_global",
        scope: "global",
        projectId: null,
        leftPanelState: "collapsed",
        rightPanelState: "hidden",
        topBarState: "compact",
        bottomBarState: "collapsed",
        viewMode: "standard",
        focusMode: "off",
        contentZoomRatio: 1
      },
      items: []
    }]
  ]);
  const { mountNode, documentRef } = createDocumentHarness();

  globalThis.localStorage = storage;
  globalThis.fetch = createFetchMock(routes);

  try {
    bootApplication(documentRef);
    await waitFor(() => mountNode.innerHTML.includes("Owner Admin"));

    assert.match(mountNode.innerHTML, /workspace-shell--standard/);
    assert.match(mountNode.innerHTML, /workspace-settings workspace-settings--compact/);
    assert.match(mountNode.innerHTML, /workspace-settings__pane--left workspace-settings__pane--collapsed/);
    assert.match(mountNode.innerHTML, /workspace-topbar workspace-topbar--compact/);
    assert.match(mountNode.innerHTML, /workspace-bottombar workspace-bottombar--collapsed/);

    const persistedLayout = JSON.parse(storage.getItem("opensky.layout"));
    assert.equal(persistedLayout.viewMode, "standard");
    assert.equal(persistedLayout.leftPanelState, "collapsed");
  } finally {
    globalThis.fetch = originalFetch;
    globalThis.localStorage = originalStorage;
  }
});

test("project switch reloads project-scoped layout preference into the top settings tray", async () => {
  const originalFetch = globalThis.fetch;
  const originalStorage = globalThis.localStorage;
  const storage = createStorage({
    "opensky.session-token": "session_demo"
  });
  const routes = new Map([
    ["GET /v1/me", { signedIn: true, actorId: "owner_admin", displayName: "Owner Admin", token: "session_demo" }],
    ["GET /v1/sites", { items: [{ siteId: "site_1", displayName: "Example", baseDomains: ["example.com"], pathRules: ["/"] }] }],
    ["GET /v1/projects", {
      items: [
        { projectId: "project_1", name: "Primary", status: "active", defaultSiteId: "site_1" },
        { projectId: "project_2", name: "Secondary", status: "active", defaultSiteId: "site_1" }
      ]
    }],
    ["GET /v1/session-vault", { items: [] }],
    ["GET /v1/audit", { items: [] }],
    ["GET /v1/projects/project_1/tabs", { items: [] }],
    ["GET /v1/projects/project_2/tabs", { items: [] }],
    ["GET /v1/bookmarks?projectId=project_1", { items: [] }],
    ["GET /v1/bookmarks?projectId=project_2", { items: [] }],
    ["GET /v1/notes?projectId=project_1", { items: [] }],
    ["GET /v1/notes?projectId=project_2", { items: [] }],
    ["GET /v1/layout-preferences?projectId=project_1", {
      precedence: ["project", "global", "system-default"],
      resolvedPreference: {
        layoutPreferenceId: "layout_project_1",
        scope: "project",
        projectId: "project_1",
        leftPanelState: "hidden",
        rightPanelState: "hidden",
        topBarState: "compact",
        bottomBarState: "collapsed",
        viewMode: "standard",
        focusMode: "off",
        contentZoomRatio: 1
      },
      items: []
    }],
    ["GET /v1/layout-preferences?projectId=project_2", {
      precedence: ["project", "global", "system-default"],
      resolvedPreference: {
        layoutPreferenceId: "layout_project_2",
        scope: "project",
        projectId: "project_2",
        leftPanelState: "hidden",
        rightPanelState: "expanded",
        topBarState: "expanded",
        bottomBarState: "hidden",
        viewMode: "maximized",
        focusMode: "off",
        contentZoomRatio: 1
      },
      items: []
    }]
  ]);
  const { mountNode, documentRef, clickAction } = createDocumentHarness();

  globalThis.localStorage = storage;
  globalThis.fetch = createFetchMock(routes);

  try {
    bootApplication(documentRef);
    await waitFor(() => mountNode.innerHTML.includes("Primary"));
    assert.match(mountNode.innerHTML, /workspace-shell--standard/);

    await clickAction("select-project", { projectId: "project_2" });
    await waitFor(() => mountNode.innerHTML.includes("Secondary"));

    assert.match(mountNode.innerHTML, /workspace-shell--maximized/);
    assert.match(mountNode.innerHTML, /workspace-settings workspace-settings--expanded/);
    assert.match(mountNode.innerHTML, /workspace-settings__pane--right workspace-settings__pane--expanded/);
    assert.match(mountNode.innerHTML, /workspace-topbar workspace-topbar--expanded/);
    assert.match(mountNode.innerHTML, /workspace-bottombar workspace-bottombar--hidden/);
  } finally {
    globalThis.fetch = originalFetch;
    globalThis.localStorage = originalStorage;
  }
});

test("refresh-workspace keeps the selected active tab instead of jumping back to the first tab", async () => {
  const originalFetch = globalThis.fetch;
  const originalStorage = globalThis.localStorage;
  const storage = createStorage({
    "opensky.session-token": "session_demo"
  });
  const tabItems = [
    {
      tabId: "tab_1",
      projectId: "project_1",
      siteId: "site_1",
      currentUrl: "https://example.com/one",
      pageTitle: "Example - one",
      status: "open"
    },
    {
      tabId: "tab_2",
      projectId: "project_1",
      siteId: "site_1",
      currentUrl: "https://example.com/two",
      pageTitle: "Example - two",
      status: "open"
    }
  ];
  const routes = new Map([
    ["GET /v1/me", { signedIn: true, actorId: "owner_admin", displayName: "Owner Admin", token: "session_demo" }],
    ["GET /v1/sites", { items: [{ siteId: "site_1", displayName: "Example", baseDomains: ["example.com"], pathRules: ["/"] }] }],
    ["GET /v1/projects", { items: [{ projectId: "project_1", name: "Primary", status: "active", defaultSiteId: "site_1" }] }],
    ["GET /v1/session-vault", { items: [] }],
    ["GET /v1/audit", { items: [] }],
    ["GET /v1/projects/project_1/tabs", { items: tabItems }],
    ["GET /v1/browse/content?tabId=tab_1", {
      tabId: "tab_1",
      requestedUrl: "https://example.com/one",
      finalUrl: "https://example.com/one",
      pageTitle: "Example - one",
      contentType: "text/html",
      documentHtml: "<main>One</main>",
      renderMode: "allowlist-proxy-phase1",
      resourceBaseUrl: "/v1/browse/resource?tabId=tab_1&resourceUrl=https%3A%2F%2Fexample.com%2Fone"
    }],
    ["GET /v1/browse/content?tabId=tab_2", {
      tabId: "tab_2",
      requestedUrl: "https://example.com/two",
      finalUrl: "https://example.com/two",
      pageTitle: "Example - two",
      contentType: "text/html",
      documentHtml: "<main>Two</main>",
      renderMode: "allowlist-proxy-phase1",
      resourceBaseUrl: "/v1/browse/resource?tabId=tab_2&resourceUrl=https%3A%2F%2Fexample.com%2Ftwo"
    }],
    ["GET /v1/bookmarks?projectId=project_1", { items: [] }],
    ["GET /v1/notes?projectId=project_1", { items: [] }],
    ["GET /v1/layout-preferences?projectId=project_1", {
      precedence: ["project", "global", "system-default"],
      resolvedPreference: {
        layoutPreferenceId: "layout_project_1",
        scope: "project",
        projectId: "project_1",
        leftPanelState: "hidden",
        rightPanelState: "hidden",
        topBarState: "autoHide",
        bottomBarState: "autoHide",
        viewMode: "maximized",
        focusMode: "off",
        contentZoomRatio: 1
      },
      items: []
    }]
  ]);
  const { mountNode, documentRef, clickAction } = createDocumentHarness();

  globalThis.localStorage = storage;
  globalThis.fetch = createFetchMock(routes);

  try {
    bootApplication(documentRef);
    await waitFor(() => mountNode.innerHTML.includes("Example - one"));

    await clickAction("select-tab", { tabId: "tab_2" });
    await waitFor(() => /tab-chip is-active" data-action="select-tab" data-tab-id="tab_2"/.test(mountNode.innerHTML));

    await clickAction("refresh-workspace");
    await waitFor(() => mountNode.innerHTML.includes("https://example.com/two"));

    assert.match(mountNode.innerHTML, /tab-chip is-active" data-action="select-tab" data-tab-id="tab_2"/);
    assert.match(mountNode.innerHTML, /value="https:\/\/example\.com\/two"/);
  } finally {
    globalThis.fetch = originalFetch;
    globalThis.localStorage = originalStorage;
  }
});

test("workspace selection is restored from local storage on boot", async () => {
  const originalFetch = globalThis.fetch;
  const originalStorage = globalThis.localStorage;
  const storage = createStorage({
    "opensky.session-token": "session_demo",
    "opensky.workspace-ui": JSON.stringify({
      activeProjectId: "project_2",
      activeSiteId: "site_1",
      activeTabId: "tab_2",
      currentUrl: "https://example.com/two"
    })
  });
  const routes = new Map([
    ["GET /v1/me", { signedIn: true, actorId: "owner_admin", displayName: "Owner Admin", token: "session_demo" }],
    ["GET /v1/sites", { items: [{ siteId: "site_1", displayName: "Example", baseDomains: ["example.com"], pathRules: ["/"] }] }],
    ["GET /v1/projects", {
      items: [
        { projectId: "project_1", name: "Primary", status: "active", defaultSiteId: "site_1" },
        { projectId: "project_2", name: "Secondary", status: "active", defaultSiteId: "site_1" }
      ]
    }],
    ["GET /v1/session-vault", { items: [] }],
    ["GET /v1/audit", { items: [] }],
    ["GET /v1/projects/project_2/tabs", {
      items: [
        {
          tabId: "tab_1",
          projectId: "project_2",
          siteId: "site_1",
          currentUrl: "https://example.com/one",
          pageTitle: "Example - one",
          status: "open"
        },
        {
          tabId: "tab_2",
          projectId: "project_2",
          siteId: "site_1",
          currentUrl: "https://example.com/two",
          pageTitle: "Example - two",
          status: "open"
        }
      ]
    }],
    ["GET /v1/bookmarks?projectId=project_2", { items: [] }],
    ["GET /v1/notes?projectId=project_2", { items: [] }],
    ["GET /v1/browse/content?tabId=tab_2", {
      tabId: "tab_2",
      requestedUrl: "https://example.com/two",
      finalUrl: "https://example.com/two",
      pageTitle: "Example - two",
      contentType: "text/html",
      documentHtml: "<main>Two</main>",
      renderMode: "allowlist-proxy-phase1",
      resourceBaseUrl: "/v1/browse/resource?tabId=tab_2&resourceUrl=https%3A%2F%2Fexample.com%2Ftwo"
    }],
    ["GET /v1/layout-preferences?projectId=project_2", {
      precedence: ["project", "global", "system-default"],
      resolvedPreference: {
        layoutPreferenceId: "layout_project_2",
        scope: "project",
        projectId: "project_2",
        leftPanelState: "hidden",
        rightPanelState: "hidden",
        topBarState: "autoHide",
        bottomBarState: "autoHide",
        viewMode: "maximized",
        focusMode: "off",
        contentZoomRatio: 1
      },
      items: []
    }]
  ]);
  const { mountNode, documentRef } = createDocumentHarness();

  globalThis.localStorage = storage;
  globalThis.fetch = createFetchMock(routes);

  try {
    bootApplication(documentRef);
    await waitFor(() => mountNode.innerHTML.includes("Secondary"));
    assert.match(mountNode.innerHTML, /tab-chip is-active" data-action="select-tab" data-tab-id="tab_2"/);
    assert.match(mountNode.innerHTML, /value="https:\/\/example\.com\/two"/);
  } finally {
    globalThis.fetch = originalFetch;
    globalThis.localStorage = originalStorage;
  }
});

test("layout actions persist pure layout state to backend and local storage", async () => {
  const originalFetch = globalThis.fetch;
  const originalStorage = globalThis.localStorage;
  const storage = createStorage({
    "opensky.session-token": "session_demo"
  });
  const savedPayloads = [];
  const routes = new Map([
    ["GET /v1/me", { signedIn: true, actorId: "owner_admin", displayName: "Owner Admin", token: "session_demo" }],
    ["GET /v1/sites", { items: [{ siteId: "site_1", displayName: "Example", baseDomains: ["example.com"], pathRules: ["/"] }] }],
    ["GET /v1/projects", { items: [{ projectId: "project_1", name: "Primary", status: "active", defaultSiteId: "site_1" }] }],
    ["GET /v1/session-vault", { items: [] }],
    ["GET /v1/audit", { items: [] }],
    ["GET /v1/projects/project_1/tabs", { items: [] }],
    ["GET /v1/bookmarks?projectId=project_1", { items: [] }],
    ["GET /v1/notes?projectId=project_1", { items: [] }],
    ["GET /v1/layout-preferences?projectId=project_1", {
      precedence: ["project", "global", "system-default"],
      resolvedPreference: {
        layoutPreferenceId: "layout_project_1",
        scope: "project",
        projectId: "project_1",
        leftPanelState: "hidden",
        rightPanelState: "hidden",
        topBarState: "autoHide",
        bottomBarState: "autoHide",
        viewMode: "maximized",
        focusMode: "off",
        contentZoomRatio: 1
      },
      items: []
    }],
    ["PATCH /v1/layout-preferences/layout_project_1", ({ init }) => {
      const payload = JSON.parse(init.body);
      savedPayloads.push(payload);
      return {
        layoutPreferenceId: "layout_project_1",
        ...payload
      };
    }]
  ]);
  const { mountNode, documentRef, clickAction } = createDocumentHarness();

  globalThis.localStorage = storage;
  globalThis.fetch = createFetchMock(routes);

  try {
    bootApplication(documentRef);
    await waitFor(() => mountNode.innerHTML.includes("Primary"));

    await clickAction("toggle-left-panel");
    await clickAction("toggle-top-bar");
    await clickAction("toggle-bottom-bar");
    await clickAction("toggle-focus");
    await clickAction("set-view-mode", { viewMode: "standard" });

    assert.equal(savedPayloads.length, 5);

    const latestPayload = savedPayloads.at(-1);
    assert.deepEqual(Object.keys(latestPayload).sort(), [
      "bottomBarState",
      "contentZoomRatio",
      "focusMode",
      "leftPanelState",
      "projectId",
      "rightPanelState",
      "scope",
      "topBarState",
      "viewMode"
    ]);
    assert.equal(latestPayload.scope, "project");
    assert.equal(latestPayload.projectId, "project_1");
    assert.equal(latestPayload.viewMode, "standard");
    assert.equal(latestPayload.leftPanelState, "collapsed");
    assert.equal(latestPayload.focusMode, "on");
    assert.equal(latestPayload.topBarState, "compact");
    assert.equal(latestPayload.bottomBarState, "collapsed");

    const persistedLayout = JSON.parse(storage.getItem("opensky.layout"));
    assert.equal(persistedLayout.viewMode, "standard");
    assert.equal(persistedLayout.leftPanelState, "collapsed");
    assert.equal(persistedLayout.topBarState, "compact");
    assert.equal(persistedLayout.bottomBarState, "collapsed");
    assert.equal(persistedLayout.focusMode, "on");
    assert.equal(persistedLayout.layoutPreferenceId, undefined);
    assert.equal(persistedLayout.scope, undefined);
  } finally {
    globalThis.fetch = originalFetch;
    globalThis.localStorage = originalStorage;
  }
});

test("enter-fullscreen failure falls back to maximized, shows a banner, and persists safe layout", async () => {
  const originalFetch = globalThis.fetch;
  const originalStorage = globalThis.localStorage;
  const storage = createStorage({
    "opensky.session-token": "session_demo"
  });
  const savedPayloads = [];
  const routes = new Map([
    ["GET /v1/me", { signedIn: true, actorId: "owner_admin", displayName: "Owner Admin", token: "session_demo" }],
    ["GET /v1/sites", { items: [{ siteId: "site_1", displayName: "Example", baseDomains: ["example.com"], pathRules: ["/"] }] }],
    ["GET /v1/projects", { items: [{ projectId: "project_1", name: "Primary", status: "active", defaultSiteId: "site_1" }] }],
    ["GET /v1/session-vault", { items: [] }],
    ["GET /v1/audit", { items: [] }],
    ["GET /v1/projects/project_1/tabs", { items: [] }],
    ["GET /v1/bookmarks?projectId=project_1", { items: [] }],
    ["GET /v1/notes?projectId=project_1", { items: [] }],
    ["GET /v1/layout-preferences?projectId=project_1", {
      precedence: ["project", "global", "system-default"],
      resolvedPreference: {
        layoutPreferenceId: "layout_project_1",
        scope: "project",
        projectId: "project_1",
        leftPanelState: "hidden",
        rightPanelState: "hidden",
        topBarState: "autoHide",
        bottomBarState: "autoHide",
        viewMode: "maximized",
        focusMode: "off",
        contentZoomRatio: 1
      },
      items: []
    }],
    ["PATCH /v1/layout-preferences/layout_project_1", ({ init }) => {
      const payload = JSON.parse(init.body);
      savedPayloads.push(payload);
      return {
        layoutPreferenceId: "layout_project_1",
        ...payload
      };
    }]
  ]);
  const { mountNode, documentRef, clickAction } = createDocumentHarness({
    contentStage: {
      async requestFullscreen() {
        throw new Error("Fullscreen is not available in this environment.");
      }
    }
  });

  globalThis.localStorage = storage;
  globalThis.fetch = createFetchMock(routes);

  try {
    bootApplication(documentRef);
    await waitFor(() => mountNode.innerHTML.includes("Primary"));

    await clickAction("enter-fullscreen");
    await waitFor(() => mountNode.innerHTML.includes("Fullscreen unavailable"));

    assert.match(mountNode.innerHTML, /workspace-shell--maximized/);
    assert.match(mountNode.innerHTML, /Fullscreen unavailable/);
    assert.match(mountNode.innerHTML, /Fullscreen is not available in this environment\./);

    assert.equal(savedPayloads.length, 1);
    assert.equal(savedPayloads[0].viewMode, "maximized");

    const persistedLayout = JSON.parse(storage.getItem("opensky.layout"));
    assert.equal(persistedLayout.viewMode, "maximized");
    assert.equal(persistedLayout.leftPanelState, "hidden");
    assert.equal(persistedLayout.rightPanelState, "hidden");
  } finally {
    globalThis.fetch = originalFetch;
    globalThis.localStorage = originalStorage;
  }
});

test("bootApplication renders Chinese sign-in UI when locale storage requests zh", async () => {
  const originalFetch = globalThis.fetch;
  const originalStorage = globalThis.localStorage;
  const originalConsoleLog = console.log;
  const storage = createStorage({
    "opensky.locale": "zh"
  });
  const { mountNode, documentRef } = createDocumentHarness();
  const loggedEntries = [];

  globalThis.localStorage = storage;
  globalThis.fetch = async () => {
    throw new TypeError("Failed to fetch");
  };
  console.log = (...args) => {
    loggedEntries.push(args);
  };

  try {
    bootApplication(documentRef);
    await waitFor(() => mountNode.innerHTML.includes("單一使用者白名單工作區"));
    await waitFor(() => loggedEntries.length > 0);

    assert.match(mountNode.innerHTML, /使用者名稱/);
    assert.match(mountNode.innerHTML, /密碼/);
    assert.match(mountNode.innerHTML, /登入/);
    assert.match(JSON.stringify(loggedEntries), /refresh-session/);
  } finally {
    globalThis.fetch = originalFetch;
    globalThis.localStorage = originalStorage;
    console.log = originalConsoleLog;
  }
});
