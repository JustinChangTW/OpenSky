export function createDefaultLayoutState() {
  return {
    leftPanelState: "hidden",
    rightPanelState: "hidden",
    topBarState: "autoHide",
    bottomBarState: "autoHide",
    viewMode: "maximized",
    focusMode: "off",
    contentZoomRatio: 1
  };
}

export const createInitialLayoutState = createDefaultLayoutState;

const LAYOUT_KEYS = [
  "leftPanelState",
  "rightPanelState",
  "topBarState",
  "bottomBarState",
  "viewMode",
  "focusMode",
  "contentZoomRatio"
];

const BAR_STATE_CYCLES = {
  topBarState: ["expanded", "compact", "autoHide", "hidden"],
  bottomBarState: ["expanded", "collapsed", "autoHide", "hidden"]
};

export function pickLayoutState(source = {}) {
  const layout = createDefaultLayoutState();
  for (const key of LAYOUT_KEYS) {
    if (Object.hasOwn(source, key) && source[key] !== undefined) {
      layout[key] = source[key];
    }
  }
  return layout;
}

export function mergeLayoutState(currentLayout, source = {}) {
  return {
    ...currentLayout,
    ...pickLayoutState(source)
  };
}

export function reduceLayoutState(state, action) {
  switch (action.type) {
    case "set-view-mode":
      if (action.viewMode === "standard") {
        return {
          ...state,
          viewMode: "standard",
          topBarState: "compact",
          bottomBarState: "collapsed"
        };
      }

      if (action.viewMode === "fullscreen") {
        return {
          ...state,
          viewMode: "fullscreen",
          leftPanelState: "hidden",
          rightPanelState: "hidden",
          topBarState: "hidden",
          bottomBarState: "hidden"
        };
      }

      return {
        ...state,
        viewMode: "maximized",
        leftPanelState: "hidden",
        rightPanelState: "hidden",
        topBarState: "autoHide",
        bottomBarState: "autoHide"
      };
    case "set-panel":
      return {
        ...state,
        [action.panel]: action.value
      };
    case "set-banner":
      return {
        ...state,
        banner: action.payload
      };
    case "toggle-focus":
      return {
        ...state,
        focusMode: state.focusMode === "on" ? "off" : "on",
        topBarState: state.focusMode === "on" ? "autoHide" : "hidden",
        bottomBarState: state.focusMode === "on" ? "autoHide" : "hidden"
      };
    default:
      return state;
  }
}

export const layoutReducer = reduceLayoutState;

export function toggleSidePanel(state, panelKey) {
  const currentValue = state[panelKey];
  const nextValue = currentValue === "hidden" ? "collapsed" : currentValue === "collapsed" ? "expanded" : "hidden";
  return reduceLayoutState(state, {
    type: "set-panel",
    panel: panelKey,
    value: nextValue
  });
}

export function toggleFocusMode(state) {
  return reduceLayoutState(state, { type: "toggle-focus" });
}

export function toggleBarState(state, panelKey) {
  const cycle = BAR_STATE_CYCLES[panelKey];
  if (!cycle) {
    return state;
  }

  const currentValue = state[panelKey];
  const currentIndex = cycle.indexOf(currentValue);
  const nextValue = cycle[(currentIndex + 1) % cycle.length];
  return reduceLayoutState(state, {
    type: "set-panel",
    panel: panelKey,
    value: nextValue
  });
}

export function toLayoutPreferencePayload(layout, projectId = null) {
  return {
    scope: projectId ? "project" : "global",
    projectId,
    leftPanelState: layout.leftPanelState,
    rightPanelState: layout.rightPanelState,
    topBarState: layout.topBarState,
    bottomBarState: layout.bottomBarState,
    viewMode: layout.viewMode,
    focusMode: layout.focusMode,
    contentZoomRatio: layout.contentZoomRatio
  };
}
