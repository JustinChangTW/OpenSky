import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createTestClient } from "../../../packages/test-utils/src/server-test-utils.mjs";

async function signIn(client) {
  const response = await client.request("/v1/auth/sign-in", {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({
      username: "owner-admin",
      password: "opensky-demo"
    })
  });
  return response.json();
}

test("file-backed persistence restores projects, tabs, and layout preferences across restart", async (t) => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "opensky-persist-"));
  const persistPath = path.join(tempDir, "state.json");
  t.after(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  const firstClient = createTestClient({ persistPath });
  const firstSession = await signIn(firstClient);

  const siteResponse = await firstClient.request("/v1/sites", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-opensky-session": firstSession.token
    },
    body: JSON.stringify({
      displayName: "Docs",
      baseDomains: ["example.com"],
      pathRules: ["/team"],
      defaultRenderMode: "iframe",
      loginPersistenceAllowed: true,
      downloadAllowed: true,
      uploadAllowed: true
    })
  });
  const site = await siteResponse.json();

  const projectResponse = await firstClient.request("/v1/projects", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-opensky-session": firstSession.token
    },
    body: JSON.stringify({
      name: "Persistent workspace",
      description: "Restart baseline"
    })
  });
  const project = await projectResponse.json();

  const openResponse = await firstClient.request("/v1/browse/open", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-opensky-session": firstSession.token
    },
    body: JSON.stringify({
      projectId: project.projectId,
      siteId: site.siteId,
      entryUrl: "https://example.com/team/home"
    })
  });
  const tab = await openResponse.json();

  const closeResponse = await firstClient.request("/v1/browse/close", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-opensky-session": firstSession.token
    },
    body: JSON.stringify({
      tabId: tab.tabId
    })
  });
  const closedTab = await closeResponse.json();
  assert.equal(closedTab.status, "closed");

  const layoutResponse = await firstClient.request("/v1/layout-preferences", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-opensky-session": firstSession.token
    },
    body: JSON.stringify({
      scope: "project",
      projectId: project.projectId,
      leftPanelState: "collapsed",
      rightPanelState: "hidden",
      topBarState: "compact",
      bottomBarState: "autoHide",
      viewMode: "maximized",
      focusMode: "on",
      contentZoomRatio: 1.25
    })
  });
  const layoutPreference = await layoutResponse.json();
  assert.equal(layoutPreference.projectId, project.projectId);

  const secondClient = createTestClient({ persistPath });

  const unauthorizedResponse = await secondClient.request("/v1/projects");
  const unauthorizedPayload = await unauthorizedResponse.json();
  assert.equal(unauthorizedResponse.status, 401);
  assert.equal(unauthorizedPayload.code, "AUTH_REQUIRED");

  const secondSession = await signIn(secondClient);
  const projectsResponse = await secondClient.request("/v1/projects", {
    headers: {
      "x-opensky-session": secondSession.token
    }
  });
  const projectsPayload = await projectsResponse.json();
  assert.equal(projectsPayload.items.length, 1);
  assert.equal(projectsPayload.items[0].projectId, project.projectId);
  assert.equal(projectsPayload.items[0].status, "active");

  const tabsResponse = await secondClient.request(`/v1/projects/${project.projectId}/tabs`, {
    headers: {
      "x-opensky-session": secondSession.token
    }
  });
  const tabsPayload = await tabsResponse.json();
  assert.equal(tabsPayload.items.length, 1);
  assert.equal(tabsPayload.items[0].tabId, tab.tabId);
  assert.equal(tabsPayload.items[0].status, "closed");
  assert.equal(tabsPayload.items[0].currentUrl, "https://example.com/team/home");
  assert.match(tabsPayload.items[0].pageTitle, /Docs/);

  const resolvedLayoutResponse = await secondClient.request(`/v1/layout-preferences?projectId=${project.projectId}`, {
    headers: {
      "x-opensky-session": secondSession.token
    }
  });
  const resolvedLayoutPayload = await resolvedLayoutResponse.json();
  assert.equal(resolvedLayoutPayload.resolvedPreference.layoutPreferenceId, layoutPreference.layoutPreferenceId);
  assert.equal(resolvedLayoutPayload.resolvedPreference.focusMode, "on");
  assert.equal(resolvedLayoutPayload.resolvedPreference.contentZoomRatio, 1.25);
});
