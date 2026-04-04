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
