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

test("auth sign-in and protected sites CRUD work", async () => {
  const client = createTestClient();
  const session = await signIn(client);

  const createSiteResponse = await client.request("/v1/sites", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-opensky-session": session.token
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

  const createdSite = await createSiteResponse.json();
  assert.equal(createSiteResponse.status, 201);
  assert.equal(createdSite.displayName, "Docs");

  const listResponse = await client.request("/v1/sites", {
    headers: {
      "x-opensky-session": session.token
    }
  });
  const listedSites = await listResponse.json();
  assert.equal(listedSites.items.length, 1);
  assert.equal(listedSites.items[0].siteId, createdSite.siteId);
});

test("protected routes reject missing auth", async () => {
  const client = createTestClient();
  const response = await client.request("/v1/sites");
  const payload = await response.json();
  assert.equal(response.status, 401);
  assert.equal(payload.code, "AUTH_REQUIRED");
});
