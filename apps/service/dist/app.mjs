import { createRouter } from "./common/router.mjs";
import { jsonResponse } from "./common/http.mjs";

export function createServiceHandler(context) {
  const router = createRouter();

  router.add("GET", "/health", async () => {
    return jsonResponse({
      ok: true,
      service: "opensky",
      mode: "bootstrap"
    });
  });

  router.add("GET", "/v1/me", async () => {
    return jsonResponse({
      signedIn: false,
      actorId: null
    });
  });

  return {
    async handle(request) {
      return router.handle(request, context);
    }
  };
}
