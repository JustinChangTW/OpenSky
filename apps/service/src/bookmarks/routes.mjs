import { parseBookmarkInput } from "../../../../packages/contracts/src/bookmarks/index.mjs";
import { ERROR_CODES } from "../../../../packages/contracts/src/errors/index.mjs";
import { jsonResponse, readJsonBody } from "../common/http.mjs";
import { getRecord, listRecords, withRoute, writeAudit } from "../common/service-helpers.mjs";

export function registerBookmarkRoutes(router) {
  router.add("GET", "/v1/bookmarks", withRoute(async ({ context, url }) => {
    const projectId = url.searchParams.get("projectId");
    const items = listRecords(context.store.state.bookmarks).filter((bookmark) => !projectId || bookmark.projectId === projectId);
    return jsonResponse({ items });
  }));

  router.add("POST", "/v1/bookmarks", withRoute(async ({ request, context, actor }) => {
    const bookmarkId = context.store.nextId("bookmark");
    const bookmark = { bookmarkId, ...parseBookmarkInput(await readJsonBody(request)) };
    context.store.state.bookmarks.set(bookmarkId, bookmark);
    writeAudit(context, { actorId: actor.actorId, action: "bookmarks.create", targetType: "Bookmark", targetId: bookmarkId, result: "success" });
    return jsonResponse(bookmark, { status: 201 });
  }));

  router.add("PATCH", "/v1/bookmarks/{bookmarkId}", withRoute(async ({ request, context, params, traceId, actor }) => {
    const currentBookmark = getRecord(context.store.state.bookmarks, params.bookmarkId, ERROR_CODES.BOOKMARK_NOT_FOUND, traceId, "Bookmark");
    const bookmark = { ...currentBookmark, ...parseBookmarkInput({ ...currentBookmark, ...(await readJsonBody(request)) }), bookmarkId: params.bookmarkId };
    context.store.state.bookmarks.set(params.bookmarkId, bookmark);
    writeAudit(context, { actorId: actor.actorId, action: "bookmarks.update", targetType: "Bookmark", targetId: params.bookmarkId, result: "success" });
    return jsonResponse(bookmark);
  }));

  router.add("DELETE", "/v1/bookmarks/{bookmarkId}", withRoute(async ({ context, params, traceId, actor }) => {
    const currentBookmark = getRecord(context.store.state.bookmarks, params.bookmarkId, ERROR_CODES.BOOKMARK_NOT_FOUND, traceId, "Bookmark");
    context.store.state.bookmarks.set(params.bookmarkId, { ...currentBookmark, status: "deleted" });
    writeAudit(context, { actorId: actor.actorId, action: "bookmarks.delete", targetType: "Bookmark", targetId: params.bookmarkId, result: "success" });
    return jsonResponse({ deleted: true, bookmarkId: params.bookmarkId });
  }));
}
