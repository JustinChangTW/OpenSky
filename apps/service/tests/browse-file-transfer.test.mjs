import test from "node:test";
import assert from "node:assert/strict";
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

async function createSite(client, token) {
  const response = await client.request("/v1/sites", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-opensky-session": token
    },
    body: JSON.stringify({
      displayName: "Workspace",
      baseDomains: ["example.com"],
      pathRules: ["/team"],
      defaultRenderMode: "iframe",
      loginPersistenceAllowed: true,
      downloadAllowed: true,
      uploadAllowed: true
    })
  });
  return response.json();
}

async function createProject(client, token) {
  const response = await client.request("/v1/projects", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-opensky-session": token
    },
    body: JSON.stringify({
      name: "Research",
      description: "Project",
      status: "draft"
    })
  });
  return response.json();
}

test("browse blocks redirects outside allowlist", async () => {
  const client = createTestClient();
  const session = await signIn(client);
  const site = await createSite(client, session.token);
  const project = await createProject(client, session.token);

  const openResponse = await client.request("/v1/browse/open", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-opensky-session": session.token
    },
    body: JSON.stringify({
      projectId: project.projectId,
      siteId: site.siteId,
      entryUrl: "https://example.com/team/home"
    })
  });
  const openedTab = await openResponse.json();
  assert.equal(openResponse.status, 201);

  const navigateResponse = await client.request("/v1/browse/navigate", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-opensky-session": session.token
    },
    body: JSON.stringify({
      projectId: project.projectId,
      tabId: openedTab.tabId,
      nextUrl: "https://evil.example.org/team/escape"
    })
  });
  const navigatePayload = await navigateResponse.json();
  assert.equal(navigateResponse.status, 400);
  assert.equal(navigatePayload.code, "URL_NOT_ALLOWED");
});

test("file transfer requires preview before approve", async () => {
  const client = createTestClient();
  const session = await signIn(client);
  const site = await createSite(client, session.token);
  const project = await createProject(client, session.token);

  const createResponse = await client.request("/v1/file-transfer", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-opensky-session": session.token
    },
    body: JSON.stringify({
      projectId: project.projectId,
      siteId: site.siteId,
      direction: "upload",
      originalName: "memo.txt",
      mimeType: "text/plain",
      sizeBytes: 4,
      previewContent: "memo"
    })
  });
  const item = await createResponse.json();
  assert.equal(createResponse.status, 201);

  const approveResponse = await client.request(`/v1/file-transfer/${item.itemId}/approve`, {
    method: "POST",
    headers: {
      "x-opensky-session": session.token
    }
  });
  const approvePayload = await approveResponse.json();
  assert.equal(approveResponse.status, 400);
  assert.equal(approvePayload.code, "UPLOAD_PREVIEW_REQUIRED");
});
