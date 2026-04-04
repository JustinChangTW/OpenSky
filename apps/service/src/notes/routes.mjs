import { parseNoteInput } from "../../../../packages/contracts/src/notes/index.mjs";
import { ERROR_CODES } from "../../../../packages/contracts/src/errors/index.mjs";
import { jsonResponse, readJsonBody } from "../common/http.mjs";
import { getRecord, listRecords, withRoute, writeAudit, writeRecord } from "../common/service-helpers.mjs";

export function registerNoteRoutes(router) {
  router.add("GET", "/v1/notes", withRoute(async ({ context, url }) => {
    const projectId = url.searchParams.get("projectId");
    const items = (await listRecords(context, "notes")).filter((note) => !projectId || note.projectId === projectId);
    return jsonResponse({ items });
  }));

  router.add("POST", "/v1/notes", withRoute(async ({ request, context, actor }) => {
    const noteId = await context.store.nextId("note");
    const note = { noteId, ...parseNoteInput(await readJsonBody(request)) };
    await writeRecord(context, "notes", noteId, note);
    await writeAudit(context, { actorId: actor.actorId, action: "notes.create", targetType: "Note", targetId: noteId, result: "success" });
    return jsonResponse(note, { status: 201 });
  }));

  router.add("PATCH", "/v1/notes/{noteId}", withRoute(async ({ request, context, params, traceId, actor }) => {
    const currentNote = await getRecord(context, "notes", params.noteId, ERROR_CODES.NOTE_NOT_FOUND, traceId, "Note");
    const note = { ...currentNote, ...parseNoteInput({ ...currentNote, ...(await readJsonBody(request)) }), noteId: params.noteId };
    await writeRecord(context, "notes", params.noteId, note);
    await writeAudit(context, { actorId: actor.actorId, action: "notes.update", targetType: "Note", targetId: params.noteId, result: "success" });
    return jsonResponse(note);
  }));

  router.add("DELETE", "/v1/notes/{noteId}", withRoute(async ({ context, params, traceId, actor }) => {
    const currentNote = await getRecord(context, "notes", params.noteId, ERROR_CODES.NOTE_NOT_FOUND, traceId, "Note");
    await writeRecord(context, "notes", params.noteId, { ...currentNote, status: "deleted" });
    await writeAudit(context, { actorId: actor.actorId, action: "notes.delete", targetType: "Note", targetId: params.noteId, result: "success" });
    return jsonResponse({ deleted: true, noteId: params.noteId });
  }));
}
