export function createRouter() {
  const routes = [];

  function compilePath(pathname) {
    const segments = pathname.split("/").filter(Boolean);
    const keys = [];
    const parts = segments.map((segment) => {
      if (segment.startsWith("{") && segment.endsWith("}")) {
        keys.push(segment.slice(1, -1));
        return "([^/]+)";
      }
      return segment.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
    });

    return {
      keys,
      pattern: new RegExp(`^/${parts.join("/")}/?$`, "u")
    };
  }

  return {
    add(method, pathname, handler) {
      const compiled = compilePath(pathname);
      routes.push({ method, pathname, handler, ...compiled });
    },
    async handle(request, context) {
      const url = new URL(request.url);
      for (const route of routes) {
        if (route.method !== request.method) {
          continue;
        }

        const match = route.pattern.exec(url.pathname);
        if (!match) {
          continue;
        }

        const params = Object.fromEntries(route.keys.map((key, index) => [key, decodeURIComponent(match[index + 1])]));
        return route.handler({ request, context, params, url });
      }

      return new Response(JSON.stringify({
        code: "INVALID_INPUT",
        message: `No route matched ${request.method} ${url.pathname}.`,
        userAction: "Use one of the documented /v1 endpoints.",
        traceId: crypto.randomUUID()
      }, null, 2), {
        status: 404,
        headers: {
          "content-type": "application/json; charset=utf-8"
        }
      });
    }
  };
}
