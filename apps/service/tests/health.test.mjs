import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createTestClient } from "../../../packages/test-utils/src/server-test-utils.mjs";

test("service health endpoint responds with bootstrap status", async () => {
  const client = createTestClient();
  const response = await client.request("/health");
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(payload.ok, true);
  assert.equal(payload.service, "opensky");
  assert.equal(payload.mode, "ready");
  assert.equal(payload.environment, "development");
  assert.equal(payload.persistenceMode, "memory");
  assert.equal(payload.persistPathConfigured, false);
  assert.equal(payload.firebaseConfigured, false);
  assert.deepEqual(payload.startupWarnings, ["demo_credentials", "ephemeral_persistence"]);
  assert.equal(typeof payload.startedAt, "string");
});

test("production health diagnostics report file-backed persistence without startup warnings", async (t) => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "opensky-health-"));
  const persistPath = path.join(tempDir, "state.json");
  t.after(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  const client = createTestClient({
    env: {
      OPEN_SKY_ENV: "production",
      OPEN_SKY_OWNER_USERNAME: "opensky-owner",
      OPEN_SKY_OWNER_PASSWORD: "correct-horse-battery-staple",
      OPEN_SKY_PERSIST_PATH: persistPath
    }
  });

  const response = await client.request("/health");
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(payload.environment, "production");
  assert.equal(payload.persistenceMode, "file");
  assert.equal(payload.persistPathConfigured, true);
  assert.equal(payload.firebaseConfigured, false);
  assert.deepEqual(payload.startupWarnings, []);
});

test("health diagnostics report Firestore-backed persistence when firebase env is configured", async () => {
  const client = createTestClient({
    env: {
      OPEN_SKY_FIREBASE_PROJECT_ID: "opensky-dev",
      OPEN_SKY_FIREBASE_CLIENT_EMAIL: "service-account@example.com",
      OPEN_SKY_FIREBASE_PRIVATE_KEY: "-----BEGIN PRIVATE KEY-----\\nmock\\n-----END PRIVATE KEY-----"
    }
  });

  const response = await client.request("/health");
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(payload.persistenceMode, "firestore");
  assert.equal(payload.persistPathConfigured, false);
  assert.equal(payload.firebaseConfigured, true);
  assert.deepEqual(payload.startupWarnings, ["demo_credentials"]);
});
