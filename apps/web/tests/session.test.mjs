import test from "node:test";
import assert from "node:assert/strict";
import { requestJson } from "../src/features/auth/session.js";

test("requestJson always sends x-opensky-session header", async () => {
  const originalFetch = globalThis.fetch;
  const originalStorage = globalThis.localStorage;
  let headers = null;

  globalThis.localStorage = {
    getItem() {
      return "session_demo";
    }
  };
  globalThis.fetch = async (_url, init) => {
    headers = init.headers;
    return {
      ok: true,
      async json() {
        return { ok: true };
      }
    };
  };

  try {
    await requestJson("/v1/me", { method: "GET" });
    assert.equal(headers["x-opensky-session"], "session_demo");
    assert.equal(headers["content-type"], "application/json");
  } finally {
    globalThis.fetch = originalFetch;
    globalThis.localStorage = originalStorage;
  }
});

test("requestJson keeps x-opensky-session header present when no token exists", async () => {
  const originalFetch = globalThis.fetch;
  const originalStorage = globalThis.localStorage;
  let headers = null;

  globalThis.localStorage = {
    getItem() {
      return "";
    }
  };
  globalThis.fetch = async (_url, init) => {
    headers = init.headers;
    return {
      ok: true,
      async json() {
        return { ok: true };
      }
    };
  };

  try {
    await requestJson("/v1/auth/sign-in", { method: "POST", body: "{}" });
    assert.equal(headers["x-opensky-session"], "");
  } finally {
    globalThis.fetch = originalFetch;
    globalThis.localStorage = originalStorage;
  }
});
