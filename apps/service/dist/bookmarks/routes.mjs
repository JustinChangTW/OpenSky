import { parseBookmarkInput } from "../../../../packages/contracts/src/bookmarks/index.mjs";
import { ERROR_CODES } from "../../../../packages/contracts/src/errors/index.mjs";
import { jsonResponse, readJsonBody } from "../common/http.mjs";
import { getRecord, listRecords, withRoute, writeAudit, writeRecord } from "../common/service-helpers.mjs";

export function registerBookmarkRoutes(router) {
  router.add("GET", "/v1/bookmarks", withRoute(async ({ context, url }) => {
    const projectId = url.searchParams.get("projectId");
    const items = (await listRecords(context, "bookmarks")).filter((bookmark) => !projectId || bookmark.projectId === projectId);
    return jsonResponse({ items });
  }));

  router.add("POST", "/v1/bookmarks", withRoute(async ({ request, context, actor }) => {
    const bookmarkId = await context.store.nextId("bookmark");
    const bookmark = { bookmarkId, ...parseBookmarkInput(await readJsonBody(request)) };
    await writeRecord(context, "bookmarks", bookmarkId, bookmark);
    await writeAudit(context, { actorId: actor.actorId, action: "bookmarks.create", targetType: "Bookmark", targetId: bookmarkId, result: "success" });
    return jsonResponse(bookmark, { status: 201 });
  }));

  router.add("PATCH", "/v1/bookmarks/{bookmarkId}", withRoute(async ({ request, context, params, traceId, actor }) => {
    const currentBookmark = await getRecord(context, "bookmarks", params.bookmarkId, ERROR_CODES.BOOKMARK_NOT_FOUND, traceId, "Bookmark");
    const bookmark = { ...currentBookmark, ...parseBookmarkInput({ ...currentBookmark, ...(await readJsonBody(request)) }), bookmarkId: params.bookmarkId };
    await writeRecord(context, "bookmarks", params.bookmarkId, bookmark);
    await writeAudit(context, { actorId: actor.actorId, action: "bookmarks.update", targetType: "Bookmark", targetId: params.bookmarkId, result: "success" });
    return jsonResponse(bookmark);
  }));

  router.add("DELETE", "/v1/bookmarks/{bookmarkId}", withRoute(async ({ context, params, traceId, actor }) => {
    const currentBookmark = await getRecord(context, "bookmarks", params.bookmarkId, ERROR_CODES.BOOKMARK_NOT_FOUND, traceId, "Bookmark");
    await writeRecord(context, "bookmarks", params.bookmarkId, { ...currentBookmark, status: "deleted" });
    await writeAudit(context, { actorId: actor.actorId, action: "bookmarks.delete", targetType: "Bookmark", targetId: params.bookmarkId, result: "success" });
    return jsonResponse({ deleted: true, bookmarkId: params.bookmarkId });
  }));
}
