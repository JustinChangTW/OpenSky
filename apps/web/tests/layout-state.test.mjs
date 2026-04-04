import test from "node:test";
import assert from "node:assert/strict";
import {
  createInitialLayoutState,
  layoutReducer,
  mergeLayoutState,
  toLayoutPreferencePayload,
  toggleBarState
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

test("mergeLayoutState strips preference metadata and keeps pure layout fields", () => {
  const merged = mergeLayoutState(createInitialLayoutState(), {
    layoutPreferenceId: "layout_1",
    scope: "project",
    projectId: "project_1",
    leftPanelState: "collapsed",
    rightPanelState: "expanded",
    topBarState: "compact",
    bottomBarState: "hidden",
    viewMode: "standard",
    focusMode: "on",
    contentZoomRatio: 1.25,
    createdAt: "2024-01-01T00:00:00.000Z"
  });

  assert.equal(merged.leftPanelState, "collapsed");
  assert.equal(merged.rightPanelState, "expanded");
  assert.equal(merged.topBarState, "compact");
  assert.equal(merged.bottomBarState, "hidden");
  assert.equal(merged.viewMode, "standard");
  assert.equal(merged.focusMode, "on");
  assert.equal(merged.contentZoomRatio, 1.25);
  assert.equal(merged.layoutPreferenceId, undefined);
  assert.equal(merged.scope, undefined);
});

test("toggleBarState cycles top and bottom bar states", () => {
  const topFirst = toggleBarState(createInitialLayoutState(), "topBarState");
  const topSecond = toggleBarState(topFirst, "topBarState");
  const bottomFirst = toggleBarState(createInitialLayoutState(), "bottomBarState");
  const bottomSecond = toggleBarState(bottomFirst, "bottomBarState");

  assert.equal(topFirst.topBarState, "hidden");
  assert.equal(topSecond.topBarState, "expanded");
  assert.equal(bottomFirst.bottomBarState, "hidden");
  assert.equal(bottomSecond.bottomBarState, "expanded");
});
