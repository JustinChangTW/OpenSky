import test from "node:test";
import assert from "node:assert/strict";
import { createDefaultLayoutState } from "../src/features/layout/state.js";
import { createWorkspaceShellMarkup } from "../src/features/workspace/view.js";

test("workspace shell accepts app workspace state shape", () => {
  const markup = createWorkspaceShellMarkup({
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
      transferItemId: null,
      lastTransfer: null,
      statusMessage: "Workspace restored."
    }
  });

  assert.match(markup, /Owner Admin/);
  assert.match(markup, /Open selected site/);
  assert.match(markup, /token/);
  assert.match(markup, /site\.open/);
  assert.doesNotMatch(markup, /undefined/);
});
