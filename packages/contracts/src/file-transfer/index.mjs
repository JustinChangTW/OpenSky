import { requireString, toIsoTimestamp } from "../common/index.mjs";

export const FILE_TRANSFER_STATUSES = Object.freeze(["pending", "preview_ready", "approved", "completed", "failed", "deleted"]);

export function parseFileTransferInput(payload) {
  return {
    projectId: requireString(payload.projectId, "projectId"),
    siteId: requireString(payload.siteId, "siteId"),
    direction: typeof payload.direction === "string" ? payload.direction.trim() : "upload",
    originalName: requireString(payload.originalName, "originalName"),
    mimeType: requireString(payload.mimeType, "mimeType"),
    sizeBytes: Number.isFinite(payload.sizeBytes) ? payload.sizeBytes : 0,
    previewStatus: typeof payload.previewStatus === "string" ? payload.previewStatus.trim() : "pending",
    transferStatus: typeof payload.transferStatus === "string" ? payload.transferStatus.trim() : "pending",
    createdAt: payload.createdAt ?? toIsoTimestamp(),
    updatedAt: payload.updatedAt ?? toIsoTimestamp()
  };
}
