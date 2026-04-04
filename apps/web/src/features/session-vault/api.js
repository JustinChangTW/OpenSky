import { requestJson } from "../auth/session.js";

export function fetchSessionVault() {
  return requestJson("/v1/session-vault", { method: "GET" });
}

export function createSessionVault(payload) {
  return requestJson("/v1/session-vault", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function updateSessionVault(vaultId, payload) {
  return requestJson(`/v1/session-vault/${vaultId}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}
