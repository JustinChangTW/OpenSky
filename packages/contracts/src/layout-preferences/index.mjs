import {
  assertOneOf,
  BOTTOM_BAR_STATES,
  FOCUS_MODES,
  SIDE_PANEL_STATES,
  TOP_BAR_STATES,
  VIEW_MODES,
  toIsoTimestamp
} from "../common/index.mjs";

export function parseLayoutPreferenceInput(payload) {
  return {
    scope: payload.scope === "project" ? "project" : "global",
    projectId: typeof payload.projectId === "string" ? payload.projectId.trim() : null,
    leftPanelState: payload.leftPanelState ? assertOneOf(payload.leftPanelState, SIDE_PANEL_STATES, "leftPanelState") : "hidden",
    rightPanelState: payload.rightPanelState ? assertOneOf(payload.rightPanelState, SIDE_PANEL_STATES, "rightPanelState") : "hidden",
    topBarState: payload.topBarState ? assertOneOf(payload.topBarState, TOP_BAR_STATES, "topBarState") : "autoHide",
    bottomBarState: payload.bottomBarState ? assertOneOf(payload.bottomBarState, BOTTOM_BAR_STATES, "bottomBarState") : "autoHide",
    viewMode: payload.viewMode ? assertOneOf(payload.viewMode, VIEW_MODES, "viewMode") : "maximized",
    focusMode: payload.focusMode ? assertOneOf(payload.focusMode, FOCUS_MODES, "focusMode") : "off",
    contentZoomRatio: Number.isFinite(payload.contentZoomRatio) ? payload.contentZoomRatio : 1,
    createdAt: payload.createdAt ?? toIsoTimestamp(),
    updatedAt: payload.updatedAt ?? toIsoTimestamp()
  };
}
