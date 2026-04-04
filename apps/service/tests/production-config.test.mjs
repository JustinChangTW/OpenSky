import test from "node:test";
import assert from "node:assert/strict";
import { createServiceConfig } from "../src/common/service-config.mjs";

test("production config rejects demo credentials", () => {
  assert.throws(
    () => createServiceConfig({
      OPEN_SKY_ENV: "production",
      OPEN_SKY_PERSIST_PATH: "/var/data/opensky/state.json"
    }),
    /non-demo values/
  );
});

test("production config requires file-backed persistence", () => {
  assert.throws(
    () => createServiceConfig({
      OPEN_SKY_ENV: "production",
      OPEN_SKY_OWNER_USERNAME: "opensky-owner",
      OPEN_SKY_OWNER_PASSWORD: "correct-horse-battery-staple"
    }),
    /OPEN_SKY_PERSIST_PATH/
  );
});

test("production config rejects partial firebase configuration", () => {
  assert.throws(
    () => createServiceConfig({
      OPEN_SKY_FIREBASE_PROJECT_ID: "opensky-prod"
    }),
    /must be configured together/
  );
});

test("production config accepts non-demo credentials with persistence", () => {
  const config = createServiceConfig({
    OPEN_SKY_ENV: "production",
    OPEN_SKY_OWNER_USERNAME: "opensky-owner",
    OPEN_SKY_OWNER_PASSWORD: "correct-horse-battery-staple",
    OPEN_SKY_PERSIST_PATH: "/var/data/opensky/state.json"
  });

  assert.equal(config.environment, "production");
  assert.equal(config.persistenceMode, "file");
  assert.equal(config.startupWarnings.length, 0);
});

test("production config accepts non-demo credentials with firestore persistence", () => {
  const config = createServiceConfig({
    OPEN_SKY_ENV: "production",
    OPEN_SKY_OWNER_USERNAME: "opensky-owner",
    OPEN_SKY_OWNER_PASSWORD: "correct-horse-battery-staple",
    OPEN_SKY_FIREBASE_PROJECT_ID: "opensky-prod",
    OPEN_SKY_FIREBASE_CLIENT_EMAIL: "service-account@example.com",
    OPEN_SKY_FIREBASE_PRIVATE_KEY: "-----BEGIN PRIVATE KEY-----\\nmock\\n-----END PRIVATE KEY-----"
  });

  assert.equal(config.environment, "production");
  assert.equal(config.persistenceMode, "firestore");
  assert.equal(config.startupWarnings.length, 0);
});
