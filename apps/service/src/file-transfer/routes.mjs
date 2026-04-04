import { createErrorResponse, ERROR_CODES } from "../../../../packages/contracts/src/errors/index.mjs";
import { parseFileTransferInput } from "../../../../packages/contracts/src/file-transfer/index.mjs";
import { jsonResponse, readJsonBody } from "../common/http.mjs";
import { ensureSiteForFeature, getRecord, isPreviewSupported, normalizePreviewPayload, withRoute, writeAudit } from "../common/service-helpers.mjs";

export function registerFileTransferRoutes(router) {
  router.add("POST", "/v1/file-transfer", withRoute(async ({ request, context, traceId, actor }) => {
    const payload = await readJsonBody(request);
    const itemId = context.store.nextId("file");
    const item = { itemId, ...parseFileTransferInput(payload), previewContent: typeof payload.previewContent === "string" ? payload.previewContent : "" };
    const site = getRecord(context.store.state.sites, item.siteId, ERROR_CODES.SITE_NOT_FOUND, traceId, "Site");
    ensureSiteForFeature(site, traceId, "uploadAllowed", ERROR_CODES.UPLOAD_DISABLED, "Uploads are disabled for this site.", "Choose a site that allows uploads.");
    context.store.state.fileTransfers.set(itemId, item);
    writeAudit(context, { actorId: actor.actorId, action: "file-transfer.create", targetType: "FileTransferItem", targetId: itemId, result: "success" });
    return jsonResponse(item, { status: 201 });
  }));

  router.add("POST", "/v1/file-transfer/{itemId}/preview", withRoute(async ({ context, params, traceId, actor }) => {
    const currentItem = getRecord(context.store.state.fileTransfers, params.itemId, ERROR_CODES.INVALID_INPUT, traceId, "File transfer item");
    if (!isPreviewSupported(currentItem.mimeType)) {
      const failedItem = { ...currentItem, previewStatus: "failed", transferStatus: "failed" };
      context.store.state.fileTransfers.set(params.itemId, failedItem);
      writeAudit(context, { actorId: actor.actorId, action: "file-transfer.preview", targetType: "FileTransferItem", targetId: params.itemId, result: "blocked" });
      throw createErrorResponse(ERROR_CODES.FILE_TYPE_NOT_ALLOWED, "This file type does not support preview.", "Choose a previewable file type before approving the upload.", traceId);
    }
    const updatedItem = { ...currentItem, previewStatus: "preview_ready", transferStatus: "preview_ready" };
    context.store.state.fileTransfers.set(params.itemId, updatedItem);
    writeAudit(context, { actorId: actor.actorId, action: "file-transfer.preview", targetType: "FileTransferItem", targetId: params.itemId, result: "success" });
    return jsonResponse({ item: updatedItem, ...normalizePreviewPayload(updatedItem) });
  }));

  router.add("POST", "/v1/file-transfer/{itemId}/approve", withRoute(async ({ context, params, traceId, actor }) => {
    const currentItem = getRecord(context.store.state.fileTransfers, params.itemId, ERROR_CODES.INVALID_INPUT, traceId, "File transfer item");
    if (currentItem.transferStatus !== "preview_ready") {
      throw createErrorResponse(ERROR_CODES.UPLOAD_PREVIEW_REQUIRED, "A preview must be completed before approval.", "Run the preview step before approving this transfer.", traceId);
    }
    const updatedItem = { ...currentItem, transferStatus: "approved" };
    context.store.state.fileTransfers.set(params.itemId, updatedItem);
    writeAudit(context, { actorId: actor.actorId, action: "file-transfer.approve", targetType: "FileTransferItem", targetId: params.itemId, result: "success" });
    return jsonResponse(updatedItem);
  }));

  router.add("POST", "/v1/file-transfer/{itemId}/complete", withRoute(async ({ context, params, traceId, actor }) => {
    const currentItem = getRecord(context.store.state.fileTransfers, params.itemId, ERROR_CODES.INVALID_INPUT, traceId, "File transfer item");
    if (currentItem.transferStatus !== "approved") {
      throw createErrorResponse(ERROR_CODES.CONFLICT_RETRY, "This transfer is not ready to complete.", "Approve the transfer before completing it.", traceId);
    }
    const updatedItem = { ...currentItem, transferStatus: "completed" };
    context.store.state.fileTransfers.set(params.itemId, updatedItem);
    writeAudit(context, { actorId: actor.actorId, action: "file-transfer.complete", targetType: "FileTransferItem", targetId: params.itemId, result: "success" });
    return jsonResponse(updatedItem);
  }));

  router.add("DELETE", "/v1/file-transfer/{itemId}", withRoute(async ({ context, params, traceId, actor }) => {
    const currentItem = getRecord(context.store.state.fileTransfers, params.itemId, ERROR_CODES.INVALID_INPUT, traceId, "File transfer item");
    context.store.state.fileTransfers.set(params.itemId, { ...currentItem, transferStatus: "deleted" });
    writeAudit(context, { actorId: actor.actorId, action: "file-transfer.delete", targetType: "FileTransferItem", targetId: params.itemId, result: "success" });
    return jsonResponse({ deleted: true, itemId: params.itemId });
  }));
}
