import test from "node:test";
import assert from "node:assert/strict";
import { createTestClient } from "../../../packages/test-utils/src/server-test-utils.mjs";

test("service health endpoint responds with bootstrap status", async () => {
  const client = createTestClient();
  const response = await client.request("/health");
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(payload.ok, true);
  assert.equal(payload.service, "opensky");
});
