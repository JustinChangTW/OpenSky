import { parseProjectInput } from "../../../../packages/contracts/src/projects/index.mjs";
import { ERROR_CODES } from "../../../../packages/contracts/src/errors/index.mjs";
import { jsonResponse, readJsonBody } from "../common/http.mjs";
import { getRecord, listRecords, withRoute, writeAudit, writeRecord } from "../common/service-helpers.mjs";

export function registerProjectRoutes(router) {
  router.add("GET", "/v1/projects", withRoute(async ({ context }) => jsonResponse({ items: await listRecords(context, "projects") })));

  router.add("POST", "/v1/projects", withRoute(async ({ request, context, actor }) => {
    const projectId = await context.store.nextId("project");
    const project = { projectId, ...parseProjectInput(await readJsonBody(request)) };
    await writeRecord(context, "projects", projectId, project);
    await writeAudit(context, { actorId: actor.actorId, action: "projects.create", targetType: "WorkspaceProject", targetId: projectId, result: "success" });
    return jsonResponse(project, { status: 201 });
  }));

  router.add("GET", "/v1/projects/{projectId}", withRoute(async ({ context, params, traceId }) => {
    return jsonResponse(await getRecord(context, "projects", params.projectId, ERROR_CODES.PROJECT_NOT_FOUND, traceId, "Project"));
  }));

  router.add("PATCH", "/v1/projects/{projectId}", withRoute(async ({ request, context, params, traceId, actor }) => {
    const currentProject = await getRecord(context, "projects", params.projectId, ERROR_CODES.PROJECT_NOT_FOUND, traceId, "Project");
    const project = { ...currentProject, ...parseProjectInput({ ...currentProject, ...(await readJsonBody(request)) }), projectId: params.projectId };
    await writeRecord(context, "projects", params.projectId, project);
    await writeAudit(context, { actorId: actor.actorId, action: "projects.update", targetType: "WorkspaceProject", targetId: params.projectId, result: "success" });
    return jsonResponse(project);
  }));

  router.add("DELETE", "/v1/projects/{projectId}", withRoute(async ({ context, params, traceId, actor }) => {
    const currentProject = await getRecord(context, "projects", params.projectId, ERROR_CODES.PROJECT_NOT_FOUND, traceId, "Project");
    await writeRecord(context, "projects", params.projectId, { ...currentProject, status: "deleted" });
    await writeAudit(context, { actorId: actor.actorId, action: "projects.delete", targetType: "WorkspaceProject", targetId: params.projectId, result: "success" });
    return jsonResponse({ deleted: true, projectId: params.projectId });
  }));
}
