import test from "node:test";
import assert from "node:assert/strict";
import {
  createInitialLayoutState,
  layoutReducer,
  toLayoutPreferencePayload
} from "../src/features/layout/state.js";

test("layout starts in maximized mode with hidden side panels", () => {
  const state = createInitialLayoutState();
  assert.equal(state.viewMode, "maximized");
  assert.equal(state.leftPanelState, "hidden");
  assert.equal(state.rightPanelState, "hidden");
});

test("fullscreen failure falls back through reducer-managed banner state", () => {
  const state = createInitialLayoutState();
  const nextState = layoutReducer(state, {
    type: "set-banner",
    payload: {
      tone: "warning",
      title: "Fullscreen unavailable",
      message: "FULLSCREEN_NOT_AVAILABLE"
    }
  });

  assert.equal(nextState.banner.title, "Fullscreen unavailable");
});

test("layout preference payload uses project scope when project is present", () => {
  const payload = toLayoutPreferencePayload(createInitialLayoutState(), "project_0001");
  assert.equal(payload.scope, "project");
  assert.equal(payload.projectId, "project_0001");
});
