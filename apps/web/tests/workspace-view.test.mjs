import test from "node:test";
import assert from "node:assert/strict";
import { createDefaultLayoutState } from "../src/features/layout/state.js";
import { createWorkspaceShellMarkup } from "../src/features/workspace/view-browser.js";

test("workspace shell accepts app workspace state shape and renders browser menu with settings tab", () => {
  const markup = createWorkspaceShellMarkup({
    locale: "zh",
    layout: {
      ...createDefaultLayoutState(),
      topBarState: "expanded",
      leftPanelState: "expanded"
    },
    session: { displayName: "Owner Admin" },
    statusMessage: "Workspace restored.",
    bannerMarkup: "",
    workspace: {
      sites: [{ siteId: "site_1", displayName: "Example", baseDomains: ["example.com"] }],
      projects: [{ projectId: "project_1", name: "Primary", status: "active" }],
      tabs: [],
      bookmarks: [],
      notes: [],
      vaultItems: [{ vaultId: "vault_1", secretType: "token", status: "active" }],
      auditItems: [{ eventId: "audit_1", action: "site.open", result: "success" }],
      activeProjectId: "project_1",
      activeSiteId: "site_1",
      activeTabId: null,
      activeProject: { projectId: "project_1", name: "Primary", status: "active" },
      activeSite: { siteId: "site_1", displayName: "Example" },
      currentUrl: "",
      activeDocument: null,
      transferItemId: null,
      lastTransfer: null,
      statusMessage: "Workspace restored.",
      settingsTrayOpen: true,
      settingsMenuOpen: true,
      serviceStatus: "ready",
      serviceInfo: {
        environment: "development",
        persistenceMode: "memory",
        demoPreset: {
          shortcuts: [
            { id: "demo-example", label: "Example.com", url: "https://example.com/" },
            { id: "demo-mdn", label: "MDN zh-TW", url: "https://developer.mozilla.org/zh-TW/" }
          ]
        }
      }
    }
  });

  assert.match(markup, /workspace-main--settings-open/);
  assert.match(markup, /settings-page/);
  assert.match(markup, /browser-menu__panel/);
  assert.match(markup, /data-action="toggle-settings-menu"/);
  assert.match(markup, /最大化/);
  assert.match(markup, /回到工作區/);
  assert.match(markup, /開啟網址|Open URL/);
  assert.match(markup, /Direct tests/);
  assert.match(markup, /Example\.com/);
  assert.match(markup, /MDN zh-TW/);
  assert.match(markup, /data-action="edit-site"/);
  assert.match(markup, /data-action="delete-site"/);
  assert.match(markup, /可填一個或多個白名單網域/);
  assert.match(markup, /路徑規則只填路徑/);
  assert.match(markup, /新網站目前預設啟用工作階段記住、上傳與下載/);
  assert.match(markup, /data-form="quick-open"/);
  assert.match(markup, /workspace-topbar__urlbar/);
  assert.doesNotMatch(markup, /工作階段<\/label>/);
  assert.doesNotMatch(markup, /上傳<\/label>/);
  assert.doesNotMatch(markup, /下載<\/label>/);
  assert.match(markup, /settings-page__sidebar/);
  assert.match(markup, /settings-page__content/);
  assert.doesNotMatch(markup, /workspace-panel/);
  assert.doesNotMatch(markup, /<iframe/);
  assert.doesNotMatch(markup, /undefined/);
});

test("fullscreen shell exposes exit-fullscreen action", () => {
  const markup = createWorkspaceShellMarkup({
    locale: "en",
    layout: {
      ...createDefaultLayoutState(),
      viewMode: "fullscreen",
      topBarState: "compact",
      bottomBarState: "hidden"
    },
    session: { displayName: "Owner Admin" },
    statusMessage: "Workspace restored.",
    bannerMarkup: "",
    workspace: {
      sites: [],
      projects: [],
      tabs: [],
      bookmarks: [],
      notes: [],
      vaultItems: [],
      auditItems: [],
      activeProjectId: null,
      activeSiteId: null,
      activeTabId: null,
      activeProject: null,
      activeSite: null,
      currentUrl: "",
      activeDocument: null,
      transferItemId: null,
      lastTransfer: null,
      statusMessage: "Workspace restored.",
      settingsTrayOpen: false,
      settingsMenuOpen: false,
      serviceStatus: "ready",
      serviceInfo: null
    }
  });

  assert.match(markup, /data-action="exit-fullscreen"/);
  assert.doesNotMatch(markup, /data-action="enter-fullscreen"/);
});
