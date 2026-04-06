import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { pathToFileURL } from "node:url";
import { createServiceHandler } from "./app.mjs";
import { createServiceContext } from "./common/service-context.mjs";
import { formatStartupLog } from "./common/service-config.mjs";
import { jsonResponse } from "./common/http.mjs";
import { asStructuredError, statusForErrorCode } from "./common/service-helpers.mjs";
import { localizeStructuredError } from "./common/i18n.mjs";

function hasRequestBody(method) {
  return method !== "GET" && method !== "HEAD";
}

function isLocalDevOrigin(origin) {
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/u.test(origin);
}

function resolveAllowedOrigin(origin, context) {
  if (!origin) {
    return "";
  }

  if (context.config.allowedOrigins.includes(origin)) {
    return origin;
  }

  if (context.runtime.environment !== "production" && isLocalDevOrigin(origin)) {
    return origin;
  }

  return "";
}

function buildCorsHeaders(origin, context) {
  const allowedOrigin = resolveAllowedOrigin(origin, context);
  const headers = {
    vary: "Origin"
  };

  if (!allowedOrigin) {
    return headers;
  }

  return {
    ...headers,
    "access-control-allow-origin": allowedOrigin,
    "access-control-allow-credentials": "true",
    "access-control-allow-methods": "GET,POST,PUT,PATCH,DELETE,HEAD,OPTIONS",
    "access-control-allow-headers": "content-type,x-opensky-session,accept-language",
    "access-control-max-age": "600"
  };
}

export function startServer(port = Number(process.env.PORT ?? "8787"), options = {}) {
  const context = createServiceContext(options);
  const handler = createServiceHandler(context);

  const server = createServer(async (incomingMessage, serverResponse) => {
    const origin = String(incomingMessage.headers.origin ?? "");
    const corsHeaders = buildCorsHeaders(origin, context);

    if ((incomingMessage.method ?? "GET") === "OPTIONS") {
      const allowedOrigin = corsHeaders["access-control-allow-origin"];
      serverResponse.statusCode = allowedOrigin ? 204 : 403;
      Object.entries(corsHeaders).forEach(([key, value]) => {
        serverResponse.setHeader(key, value);
      });
      serverResponse.end();
      return;
    }

    try {
      const requestUrl = new URL(incomingMessage.url ?? "/", `http://${incomingMessage.headers.host ?? "localhost"}`);
      const method = incomingMessage.method ?? "GET";
      const requestInit = {
        method,
        headers: incomingMessage.headers,
        body: hasRequestBody(method) ? incomingMessage : undefined
      };

      if (requestInit.body) {
        requestInit.duplex = "half";
      }

      const request = new Request(requestUrl, requestInit);
      const response = await handler.handle(request);
      serverResponse.statusCode = response.status;
      Object.entries(corsHeaders).forEach(([key, value]) => {
        serverResponse.setHeader(key, value);
      });
      response.headers.forEach((value, key) => {
        serverResponse.setHeader(key, value);
      });

      const buffer = Buffer.from(await response.arrayBuffer());
      serverResponse.end(buffer);
    } catch (error) {
      const fallbackRequest = new Request("http://localhost/", {
        headers: incomingMessage.headers
      });
      const structuredError = localizeStructuredError(asStructuredError(error, randomUUID()), fallbackRequest);
      await context.logger?.write?.({
        level: "error",
        scope: "server",
        method: incomingMessage.method ?? "GET",
        pathname: incomingMessage.url ?? "/",
        code: structuredError.code,
        traceId: structuredError.traceId,
        message: structuredError.message,
        userAction: structuredError.userAction
      }).catch(() => undefined);
      const response = jsonResponse(structuredError, { status: statusForErrorCode(structuredError.code) });
      serverResponse.statusCode = response.status;
      Object.entries(corsHeaders).forEach(([key, value]) => {
        serverResponse.setHeader(key, value);
      });
      response.headers.forEach((value, key) => {
        serverResponse.setHeader(key, value);
      });
      const buffer = Buffer.from(await response.arrayBuffer());
      serverResponse.end(buffer);
    }
  });

  server.listen(port, () => {
    console.log(`OpenSky service listening on http://localhost:${port}`);
    console.log(formatStartupLog(context.runtime));
    context.logger.write({
      level: "info",
      scope: "startup",
      message: `OpenSky service listening on http://localhost:${port}`,
      runtime: context.runtime
    }).catch(() => undefined);
  });

  return server;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  startServer();
}
