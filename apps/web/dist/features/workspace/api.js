import { requestJson } from "../auth/session.js";

export function fetchSites() {
  return requestJson("/v1/sites", { method: "GET" });
}

export function createSite(payload) {
  return requestJson("/v1/sites", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function fetchProjects() {
  return requestJson("/v1/projects", { method: "GET" });
}

export function createProject(payload) {
  return requestJson("/v1/projects", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function fetchTabs(projectId) {
  if (!projectId) {
    return Promise.resolve({ items: [] });
  }
  return requestJson(`/v1/projects/${projectId}/tabs`, { method: "GET" });
}

export function fetchBookmarks(projectId) {
  const suffix = projectId ? `?projectId=${encodeURIComponent(projectId)}` : "";
  return requestJson(`/v1/bookmarks${suffix}`, { method: "GET" });
}

export function createBookmark(payload) {
  return requestJson("/v1/bookmarks", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function fetchNotes(projectId) {
  const suffix = projectId ? `?projectId=${encodeURIComponent(projectId)}` : "";
  return requestJson(`/v1/notes${suffix}`, { method: "GET" });
}

export function createNote(payload) {
  return requestJson("/v1/notes", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function fetchLayoutPreference(projectId) {
  const suffix = projectId ? `?projectId=${encodeURIComponent(projectId)}` : "";
  return requestJson(`/v1/layout-preferences${suffix}`, { method: "GET" });
}

export function saveLayoutPreference(payload, layoutPreferenceId = null) {
  if (layoutPreferenceId) {
    return requestJson(`/v1/layout-preferences/${layoutPreferenceId}`, {
      method: "PATCH",
      body: JSON.stringify(payload)
    });
  }

  return requestJson("/v1/layout-preferences", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}
