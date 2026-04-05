import test from "node:test";
import assert from "node:assert/strict";
import { requestJson } from "../src/features/auth/session.js";

test("requestJson always sends x-opensky-session header", async () => {
  const originalFetch = globalThis.fetch;
  const originalStorage = globalThis.localStorage;
  const originalConfig = globalThis.OPEN_SKY_CONFIG;
  let headers = null;
  let requestedUrl = "";

  globalThis.localStorage = {
    getItem() {
      return "session_demo";
    }
  };
  globalThis.OPEN_SKY_CONFIG = {
    apiBase: "https://api.example.com/"
  };
  globalThis.fetch = async (url, init) => {
    requestedUrl = url;
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
    assert.equal(requestedUrl, "https://api.example.com/v1/me");
    assert.equal(headers["x-opensky-session"], "session_demo");
    assert.equal(headers["content-type"], "application/json");
  } finally {
    globalThis.fetch = originalFetch;
    globalThis.localStorage = originalStorage;
    globalThis.OPEN_SKY_CONFIG = originalConfig;
  }
});

test("requestJson keeps x-opensky-session header present when no token exists", async () => {
  const originalFetch = globalThis.fetch;
  const originalStorage = globalThis.localStorage;
  const originalConfig = globalThis.OPEN_SKY_CONFIG;
  let headers = null;
  let requestedUrl = "";

  globalThis.localStorage = {
    getItem() {
      return "";
    }
  };
  globalThis.OPEN_SKY_CONFIG = {
    apiBase: "https://api.example.com"
  };
  globalThis.fetch = async (url, init) => {
    requestedUrl = url;
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
    assert.equal(requestedUrl, "https://api.example.com/v1/auth/sign-in");
    assert.equal(headers["x-opensky-session"], "");
  } finally {
    globalThis.fetch = originalFetch;
    globalThis.localStorage = originalStorage;
    globalThis.OPEN_SKY_CONFIG = originalConfig;
  }
});
