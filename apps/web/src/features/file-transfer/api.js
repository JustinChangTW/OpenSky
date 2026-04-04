import { requestJson } from "../auth/session.js";

export function createTransfer(payload) {
  return requestJson("/v1/file-transfer", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function previewTransfer(itemId) {
  return requestJson(`/v1/file-transfer/${itemId}/preview`, { method: "POST", body: JSON.stringify({}) });
}

export function approveTransfer(itemId) {
  return requestJson(`/v1/file-transfer/${itemId}/approve`, { method: "POST", body: JSON.stringify({}) });
}

export function completeTransfer(itemId) {
  return requestJson(`/v1/file-transfer/${itemId}/complete`, { method: "POST", body: JSON.stringify({}) });
}
