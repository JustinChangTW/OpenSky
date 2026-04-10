import test from "node:test";
import assert from "node:assert/strict";
import { isUrlAllowed } from "./index.mjs";

test("isUrlAllowed permits base domain and matching path rules", () => {
  assert.equal(isUrlAllowed("https://docs.example.com/team/home", {
    baseDomains: ["example.com"],
    pathRules: ["/team"]
  }), true);
});

test("isUrlAllowed blocks non-matching domains", () => {
  assert.equal(isUrlAllowed("https://evil.example.org/team/home", {
    baseDomains: ["example.com"],
    pathRules: ["/team"]
  }), false);
});

test("isUrlAllowed supports exact host allowlist with trailing dot normalization", () => {
  assert.equal(isUrlAllowed("https://developer.mozilla.org/en-US/docs", {
    baseDomains: ["developer.mozilla.org."],
    pathRules: ["/"]
  }), true);
});

test("isUrlAllowed supports ip host matching only when exact ip is allowlisted", () => {
  assert.equal(isUrlAllowed("http://127.0.0.1:8080/home", {
    baseDomains: ["127.0.0.1"],
    pathRules: ["/"]
  }), true);

  assert.equal(isUrlAllowed("http://127.0.0.2:8080/home", {
    baseDomains: ["127.0.0.1"],
    pathRules: ["/"]
  }), false);
});

test("isUrlAllowed permits subdomains when base registrable domain is allowlisted", () => {
  assert.equal(isUrlAllowed("https://support.chatgpt.com/help", {
    baseDomains: ["chatgpt.com"],
    pathRules: ["/"]
  }), true);
});
