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

test("auth sign-in and protected sites CRUD work", async () => {
  const client = createTestClient();
  const signInResponse = await client.request("/v1/auth/sign-in", {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({
      username: "owner-admin",
      password: "opensky-demo"
    })
  });
  const session = await signInResponse.json();

  assert.match(signInResponse.headers.get("set-cookie") ?? "", /opensky_session=/);

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

test("protected routes localize structured errors when Accept-Language requests Chinese", async () => {
  const client = createTestClient();
  const response = await client.request("/v1/sites", {
    headers: {
      "accept-language": "zh-TW"
    }
  });
  const payload = await response.json();

  assert.equal(response.status, 401);
  assert.equal(payload.code, "AUTH_REQUIRED");
  assert.equal(payload.message, "你必須先登入才能繼續。");
  assert.equal(payload.userAction, "請以 owner-admin 身分登入。");
});

test("protected routes accept the backend session cookie without x-opensky-session", async () => {
  const client = createTestClient();
  const signInResponse = await client.request("/v1/auth/sign-in", {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({
      username: "owner-admin",
      password: "opensky-demo"
    })
  });
  const cookieHeader = signInResponse.headers.get("set-cookie");
  assert.match(cookieHeader ?? "", /opensky_session=/);

  const response = await client.request("/v1/me", {
    headers: {
      cookie: cookieHeader
    }
  });
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(payload.signedIn, true);
});

test("protected route errors are appended to the backend log file", async (t) => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "opensky-log-"));
  const logPath = path.join(tempDir, "service.log");
  t.after(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  const client = createTestClient({
    env: {
      OPEN_SKY_LOG_PATH: logPath
    }
  });

  const response = await client.request("/v1/sites");
  const payload = await response.json();
  const logText = await fs.readFile(logPath, "utf8");

  assert.equal(response.status, 401);
  assert.equal(payload.code, "AUTH_REQUIRED");
  assert.match(logText, /"scope":"route"/);
  assert.match(logText, /"pathname":"\/v1\/sites"/);
  assert.match(logText, /"code":"AUTH_REQUIRED"/);
});
