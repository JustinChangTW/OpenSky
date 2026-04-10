import { requestJson } from "../auth/session.js";

function encodeResourceId(value) {
  return encodeURIComponent(String(value ?? "").trim());
}

export function fetchSites() {
  return requestJson("/v1/sites", { method: "GET" });
}

export function createSite(payload) {
  return requestJson("/v1/sites", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function updateSite(siteId, payload) {
  return requestJson(`/v1/sites/${encodeResourceId(siteId)}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

export function deleteSite(siteId) {
  return requestJson(`/v1/sites/${encodeResourceId(siteId)}`, { method: "DELETE" });
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

export function deleteProject(projectId) {
  return requestJson(`/v1/projects/${encodeResourceId(projectId)}`, { method: "DELETE" });
}

export function fetchTabs(projectId) {
  if (!projectId) {
    return Promise.resolve({ items: [] });
  }
  return requestJson(`/v1/projects/${encodeResourceId(projectId)}/tabs`, { method: "GET" });
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

export function deleteBookmark(bookmarkId) {
  return requestJson(`/v1/bookmarks/${encodeResourceId(bookmarkId)}`, { method: "DELETE" });
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

export function deleteNote(noteId) {
  return requestJson(`/v1/notes/${encodeResourceId(noteId)}`, { method: "DELETE" });
}

export function fetchLayoutPreference(projectId) {
  const suffix = projectId ? `?projectId=${encodeURIComponent(projectId)}` : "";
  return requestJson(`/v1/layout-preferences${suffix}`, { method: "GET" });
}

export function saveLayoutPreference(payload, layoutPreferenceId = null) {
  if (layoutPreferenceId) {
    return requestJson(`/v1/layout-preferences/${encodeResourceId(layoutPreferenceId)}`, {
      method: "PATCH",
      body: JSON.stringify(payload)
    });
  }

  return requestJson("/v1/layout-preferences", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}
