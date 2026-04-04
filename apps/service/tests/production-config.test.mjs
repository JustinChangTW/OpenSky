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
