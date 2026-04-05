import test from "node:test";
import assert from "node:assert/strict";
import { createDefaultLayoutState } from "../src/features/layout/state.js";
import { createWorkspaceShellMarkup } from "../src/features/workspace/view.js";

test("workspace shell accepts app workspace state shape and renders the top settings tray", () => {
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
      serviceStatus: "ready",
      serviceInfo: {
        environment: "development",
        persistenceMode: "memory"
      }
    }
  });

  assert.match(markup, /Owner Admin/);
  assert.match(markup, /工作區設定/);
  assert.match(markup, /開啟已選網站/);
  assert.match(markup, /允許路徑更新/);
  assert.match(markup, /導向目前分頁/);
  assert.match(markup, /切換設定/);
  assert.match(markup, /最大化/);
  assert.match(markup, /回到工作區/);
  assert.match(markup, /目前白名單網址/);
  assert.match(markup, /主要流程/);
  assert.match(markup, /開啟目前已選網站/);
  assert.match(markup, /Backend 已連線/);
  assert.match(markup, /可填一個或多個白名單網域/);
  assert.match(markup, /路徑規則只填路徑/);
  assert.match(markup, /新網站目前預設啟用工作階段記住、上傳與下載/);
  assert.doesNotMatch(markup, /工作階段<\/label>/);
  assert.doesNotMatch(markup, /上傳<\/label>/);
  assert.doesNotMatch(markup, /下載<\/label>/);
  assert.match(markup, /workspace-settings workspace-settings--expanded/);
  assert.match(markup, /workspace-settings__grid workspace-settings__grid--expanded/);
  assert.doesNotMatch(markup, /workspace-panel/);
  assert.doesNotMatch(markup, /<iframe/);
  assert.doesNotMatch(markup, /Open URL/);
  assert.doesNotMatch(markup, /undefined/);
});
