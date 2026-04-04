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
