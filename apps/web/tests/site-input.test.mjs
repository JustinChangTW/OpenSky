import test from "node:test";
import assert from "node:assert/strict";
import { normalizeSiteDraft } from "../src/features/workspace/site-input.js";

test("normalizeSiteDraft extracts hostname and path from a full URL", () => {
  const result = normalizeSiteDraft({
    displayName: "Mega",
    baseDomain: "https://www.megaholdings.com.tw/news/list",
    pathRule: "/"
  });

  assert.deepEqual(result.payload, {
    displayName: "Mega",
    baseDomains: ["www.megaholdings.com.tw"],
    pathRules: ["/news/list"]
  });
  assert.equal(result.normalizedFromUrl, true);
});

test("normalizeSiteDraft accepts multiple base domains separated by commas", () => {
  const result = normalizeSiteDraft({
    displayName: "Google",
    baseDomain: "google.com, www.google.com, https://www.gstatic.com",
    pathRule: "/"
  });

  assert.deepEqual(result.payload, {
    displayName: "Google",
    baseDomains: ["google.com", "www.google.com", "www.gstatic.com"],
    pathRules: ["/"]
  });
  assert.equal(result.normalizedFromUrl, true);
});

test("normalizeSiteDraft rejects an invalid hostname", () => {
  assert.throws(
    () => normalizeSiteDraft({
      displayName: "Broken",
      baseDomain: "https://",
      pathRule: "/"
    }),
    (error) => error?.payload?.code === "INVALID_INPUT" && /hostname/i.test(error?.payload?.message ?? "")
  );
});

test("normalizeSiteDraft prefixes path rules that omit the leading slash", () => {
  const result = normalizeSiteDraft({
    displayName: "Example",
    baseDomain: "example.com",
    pathRule: "team"
  });

  assert.deepEqual(result.payload, {
    displayName: "Example",
    baseDomains: ["example.com"],
    pathRules: ["/team"]
  });
});
