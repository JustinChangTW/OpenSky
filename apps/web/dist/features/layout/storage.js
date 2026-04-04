const STORAGE_KEY = "opensky.layout";

export function loadLayoutState(storageRef = globalThis.localStorage) {
  try {
    const raw = storageRef?.getItem?.(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveLayoutState(layout, storageRef = globalThis.localStorage) {
  try {
    storageRef?.setItem?.(STORAGE_KEY, JSON.stringify(layout));
  } catch {
    // Ignore local cache write failures and keep the UI functional.
  }
}
