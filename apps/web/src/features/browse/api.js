import { requestJson } from "../auth/session.js";

export function browseOpen(payload) {
  return requestJson("/v1/browse/open", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function browseNavigate(payload) {
  return requestJson("/v1/browse/navigate", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function browseClose(payload) {
  return requestJson("/v1/browse/close", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function fetchBrowseContent(tabId) {
  return requestJson(`/v1/browse/content?tabId=${encodeURIComponent(tabId)}`, {
    method: "GET"
  });
}

export function createBrowseResourceUrl(tabId, resourceUrl) {
  return `/v1/browse/resource?tabId=${encodeURIComponent(tabId)}&resourceUrl=${encodeURIComponent(resourceUrl)}`;
}
