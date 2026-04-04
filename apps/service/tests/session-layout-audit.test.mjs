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
      displayName: "Portal",
      baseDomains: ["example.com"],
      pathRules: ["/"],
      defaultRenderMode: "iframe",
      loginPersistenceAllowed: true,
      downloadAllowed: true,
      uploadAllowed: false
    })
  });
  return response.json();
}

test("session vault can be revoked and layout preference resolves project over global", async () => {
  const client = createTestClient();
  const session = await signIn(client);
  const site = await createSite(client, session.token);

  const globalPreferenceResponse = await client.request("/v1/layout-preferences", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-opensky-session": session.token
    },
    body: JSON.stringify({
      scope: "global",
      viewMode: "maximized",
      focusMode: "off"
    })
  });
  const globalPreference = await globalPreferenceResponse.json();

  const projectPreferenceResponse = await client.request("/v1/layout-preferences", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-opensky-session": session.token
    },
    body: JSON.stringify({
      scope: "project",
      projectId: "project_0001",
      viewMode: "fullscreen",
      focusMode: "on"
    })
  });
  await projectPreferenceResponse.json();

  const resolvedResponse = await client.request("/v1/layout-preferences?projectId=project_0001", {
    headers: {
      "x-opensky-session": session.token
    }
  });
  const resolution = await resolvedResponse.json();
  assert.equal(resolution.resolvedPreference.viewMode, "fullscreen");
  assert.equal(resolution.precedence[0], "project");
  assert.equal(globalPreference.viewMode, "maximized");

  const vaultCreateResponse = await client.request("/v1/session-vault", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-opensky-session": session.token
    },
    body: JSON.stringify({
      siteId: site.siteId,
      persistenceScope: "site",
      secretType: "token",
      rememberUntil: new Date(Date.now() + 60_000).toISOString()
    })
  });
  const vault = await vaultCreateResponse.json();
  assert.equal(vaultCreateResponse.status, 201);

  const revokeResponse = await client.request(`/v1/session-vault/${vault.vaultId}`, {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
      "x-opensky-session": session.token
    },
    body: JSON.stringify({
      status: "revoked"
    })
  });
  const revokedVault = await revokeResponse.json();
  assert.equal(revokedVault.status, "revoked");

  const auditResponse = await client.request("/v1/audit", {
    headers: {
      "x-opensky-session": session.token
    }
  });
  const auditPayload = await auditResponse.json();
  assert.ok(auditPayload.items.length >= 4);
});
