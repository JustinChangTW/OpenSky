import test from "node:test";
import assert from "node:assert/strict";
import {
  createDefaultLayoutState,
  reduceLayoutState,
  toggleSidePanel,
  toggleFocusMode
} from "../src/features/layout/state.js";
import { requestFullscreenWithFallback } from "../src/features/layout/fullscreen.js";

test("default layout state starts in maximized mode with hidden side panels", () => {
  const state = createDefaultLayoutState();
  assert.equal(state.viewMode, "maximized");
  assert.equal(state.leftPanelState, "hidden");
  assert.equal(state.rightPanelState, "hidden");
  assert.equal(state.topBarState, "autoHide");
  assert.equal(state.bottomBarState, "autoHide");
});

test("toggleSidePanel cycles hidden -> collapsed -> expanded -> hidden", () => {
  const first = toggleSidePanel(createDefaultLayoutState(), "leftPanelState");
  const second = toggleSidePanel(first, "leftPanelState");
  const third = toggleSidePanel(second, "leftPanelState");

  assert.equal(first.leftPanelState, "collapsed");
  assert.equal(second.leftPanelState, "expanded");
  assert.equal(third.leftPanelState, "hidden");
});

test("toggleFocusMode hides chrome while preserving workspace mode", () => {
  const focused = toggleFocusMode(createDefaultLayoutState());
  const restored = toggleFocusMode(focused);

  assert.equal(focused.focusMode, "on");
  assert.equal(focused.topBarState, "hidden");
  assert.equal(focused.bottomBarState, "hidden");
  assert.equal(restored.focusMode, "off");
});

test("fullscreen fallback returns maximized layout and warning banner", async () => {
  const result = await requestFullscreenWithFallback({
    documentRef: {},
    targetElement: {},
    layout: reduceLayoutState(createDefaultLayoutState(), {
      type: "set-view-mode",
      viewMode: "standard"
    })
  });

  assert.equal(result.layout.viewMode, "maximized");
  assert.equal(result.banner.title, "FULLSCREEN_NOT_AVAILABLE");
});
