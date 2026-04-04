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

async function createSite(client, token) {
  const response = await client.request("/v1/sites", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-opensky-session": token
    },
    body: JSON.stringify({
      displayName: "Portal",
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
      name: "Ops",
      description: "Durable baseline"
    })
  });
  return response.json();
}

test("browse, session vault, file transfer, and audit survive restart and project filtering", async (t) => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "opensky-c-scope-"));
  const persistPath = path.join(tempDir, "state.json");
  t.after(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  const client1 = createTestClient({ persistPath });
  const session1 = await signIn(client1);
  const site = await createSite(client1, session1.token);
  const project = await createProject(client1, session1.token);

  const openResponse = await client1.request("/v1/browse/open", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-opensky-session": session1.token
    },
    body: JSON.stringify({
      projectId: project.projectId,
      siteId: site.siteId,
      entryUrl: "https://example.com/team/home"
    })
  });
  const tab = await openResponse.json();
  assert.equal(openResponse.status, 201);

  const navigateResponse = await client1.request("/v1/browse/navigate", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-opensky-session": session1.token
    },
    body: JSON.stringify({
      projectId: project.projectId,
      tabId: tab.tabId,
      nextUrl: "https://example.com/team/reports"
    })
  });
  assert.equal(navigateResponse.status, 200);

  const closeResponse = await client1.request("/v1/browse/close", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-opensky-session": session1.token
    },
    body: JSON.stringify({
      tabId: tab.tabId
    })
  });
  assert.equal(closeResponse.status, 200);

  const vaultResponse = await client1.request("/v1/session-vault", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-opensky-session": session1.token
    },
    body: JSON.stringify({
      siteId: site.siteId,
      projectId: project.projectId,
      persistenceScope: "project",
      secretType: "token",
      rememberUntil: new Date(Date.now() + 60_000).toISOString()
    })
  });
  const vault = await vaultResponse.json();
  assert.equal(vaultResponse.status, 201);

  const revokeResponse = await client1.request(`/v1/session-vault/${vault.vaultId}`, {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
      "x-opensky-session": session1.token
    },
    body: JSON.stringify({
      status: "revoked"
    })
  });
  assert.equal(revokeResponse.status, 200);

  const transferCreateResponse = await client1.request("/v1/file-transfer", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-opensky-session": session1.token
    },
    body: JSON.stringify({
      projectId: project.projectId,
      siteId: site.siteId,
      direction: "upload",
      originalName: "notes.txt",
      mimeType: "text/plain",
      sizeBytes: 5,
      previewContent: "notes"
    })
  });
  const transfer = await transferCreateResponse.json();
  assert.equal(transferCreateResponse.status, 201);

  const previewResponse = await client1.request(`/v1/file-transfer/${transfer.itemId}/preview`, {
    method: "POST",
    headers: {
      "x-opensky-session": session1.token
    }
  });
  assert.equal(previewResponse.status, 200);

  const approveResponse = await client1.request(`/v1/file-transfer/${transfer.itemId}/approve`, {
    method: "POST",
    headers: {
      "x-opensky-session": session1.token
    }
  });
  assert.equal(approveResponse.status, 200);

  const client2 = createTestClient({ persistPath });
  const session2 = await signIn(client2);

  const tabsResponse = await client2.request(`/v1/projects/${project.projectId}/tabs`, {
    headers: {
      "x-opensky-session": session2.token
    }
  });
  const tabsPayload = await tabsResponse.json();
  assert.equal(tabsPayload.items.length, 1);
  assert.equal(tabsPayload.items[0].status, "closed");
  assert.equal(tabsPayload.items[0].currentUrl, "https://example.com/team/reports");

  const vaultListResponse = await client2.request(`/v1/session-vault?projectId=${project.projectId}`, {
    headers: {
      "x-opensky-session": session2.token
    }
  });
  const vaultListPayload = await vaultListResponse.json();
  assert.equal(vaultListPayload.items.length, 1);
  assert.equal(vaultListPayload.items[0].status, "revoked");

  const completeResponse = await client2.request(`/v1/file-transfer/${transfer.itemId}/complete`, {
    method: "POST",
    headers: {
      "x-opensky-session": session2.token
    }
  });
  const completedItem = await completeResponse.json();
  assert.equal(completeResponse.status, 200);
  assert.equal(completedItem.transferStatus, "completed");

  const auditResponse = await client2.request(`/v1/audit?projectId=${project.projectId}`, {
    headers: {
      "x-opensky-session": session2.token
    }
  });
  const auditPayload = await auditResponse.json();
  const actions = auditPayload.items.map((item) => item.action);

  assert.ok(actions.includes("browse.open"));
  assert.ok(actions.includes("browse.close"));
  assert.ok(actions.includes("session-vault.update"));
  assert.ok(actions.includes("file-transfer.complete"));
  assert.ok(actions.every((action) => !action.startsWith("auth.")));
});
