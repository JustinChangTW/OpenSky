import test from "node:test";
import assert from "node:assert/strict";
import { createDefaultLayoutState } from "../src/features/layout/state.js";
import { createWorkspaceShellMarkup } from "../src/features/workspace/view.js";

test("workspace shell accepts app workspace state shape and renders the top settings tray", () => {
  const markup = createWorkspaceShellMarkup({
    locale: "zh",
    layout: createDefaultLayoutState(),
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
      statusMessage: "Workspace restored."
    }
  });

  assert.match(markup, /Owner Admin/);
  assert.match(markup, /工作區設定/);
  assert.match(markup, /開啟已選網站/);
  assert.match(markup, /目前分頁導覽/);
  assert.match(markup, /導向目前分頁/);
  assert.match(markup, /上方列/);
  assert.match(markup, /下方列/);
  assert.match(markup, /目前白名單網址/);
  assert.match(markup, /workspace-settings workspace-settings--autoHide/);
  assert.match(markup, /workspace-settings__grid workspace-settings__grid--collapsed/);
  assert.doesNotMatch(markup, /workspace-panel/);
  assert.doesNotMatch(markup, /<iframe/);
  assert.doesNotMatch(markup, /Open URL/);
  assert.doesNotMatch(markup, /undefined/);
});
