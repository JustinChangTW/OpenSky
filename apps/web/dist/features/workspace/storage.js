const WORKSPACE_UI_STORAGE_KEY = "opensky.workspace-ui";

export function loadWorkspaceUiState(storageRef = globalThis.localStorage) {
  try {
    const raw = storageRef?.getItem?.(WORKSPACE_UI_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveWorkspaceUiState(state, storageRef = globalThis.localStorage) {
  try {
    storageRef?.setItem?.(WORKSPACE_UI_STORAGE_KEY, JSON.stringify({
      activeProjectId: state.activeProjectId ?? null,
      activeSiteId: state.activeSiteId ?? null,
      activeTabId: state.activeTabId ?? null,
      currentUrl: state.currentUrl ?? ""
    }));
  } catch {
    // Ignore storage write issues and keep the UI usable.
  }
}

export function clearWorkspaceUiState(storageRef = globalThis.localStorage) {
  try {
    storageRef?.removeItem?.(WORKSPACE_UI_STORAGE_KEY);
  } catch {
    // Ignore storage write issues and keep the UI usable.
  }
}
