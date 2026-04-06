import { createOwnerSession, parseSignInInput } from "../../../../packages/contracts/src/auth/index.mjs";
import { createErrorResponse, ERROR_CODES } from "../../../../packages/contracts/src/errors/index.mjs";
import { createClearedSessionCookie, createSessionCookie, jsonResponse, readJsonBody } from "../common/http.mjs";
import { withRoute, writeAudit } from "../common/service-helpers.mjs";

export function registerAuthRoutes(router) {
  router.add("POST", "/v1/auth/sign-in", withRoute(async ({ request, context, traceId }) => {
    const payload = parseSignInInput(await readJsonBody(request));
    if (payload.username !== context.config.ownerUsername || payload.password !== context.config.ownerPassword) {
      throw createErrorResponse(ERROR_CODES.FORBIDDEN, "Owner credentials did not match.", "Sign in with the configured owner-admin credentials.", traceId);
    }

    const session = {
      ...createOwnerSession(),
      token: crypto.randomUUID()
    };
    await context.store.setSession(session);
    await writeAudit(context, { actorId: session.actorId, action: "auth.sign-in", targetType: "session", targetId: session.token, result: "success" });
    return jsonResponse(session, {
      status: 201,
      headers: {
        "set-cookie": createSessionCookie(session.token)
      }
    });
  }, { authRequired: false }));

  router.add("POST", "/v1/auth/sign-out", withRoute(async ({ context, actor }) => {
    const token = actor.token;
    await context.store.clearSession();
    await writeAudit(context, { actorId: actor.actorId, action: "auth.sign-out", targetType: "session", targetId: token, result: "success" });
    return jsonResponse({ signedOut: true }, {
      headers: {
        "set-cookie": createClearedSessionCookie()
      }
    });
  }));

  router.add("GET", "/v1/me", withRoute(async ({ actor }) => {
    return jsonResponse({
      signedIn: true,
      actorId: actor.actorId,
      displayName: actor.displayName,
      token: actor.token
    });
  }));
}
