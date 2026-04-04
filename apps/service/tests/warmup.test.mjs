import test from "node:test";
import assert from "node:assert/strict";
import { createTestClient } from "../../../packages/test-utils/src/server-test-utils.mjs";

test("protected routes surface SERVICE_UNAVAILABLE during warmup", async () => {
  const client = createTestClient();
  const response = await client.request("/v1/sites", {
    headers: {
      "x-opensky-simulate-warmup": "1"
    }
  });
  const payload = await response.json();

  assert.equal(response.status, 503);
  assert.equal(payload.code, "SERVICE_UNAVAILABLE");
  assert.equal(typeof payload.traceId, "string");
  assert.ok(payload.traceId.length > 10);
});
