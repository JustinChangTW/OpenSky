import fs from "node:fs/promises";
import http from "node:http";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.join(moduleDir, "src");
const defaultPort = Number.parseInt(process.env.OPEN_SKY_WEB_PORT ?? "4173", 10);
const defaultApiBase = "http://127.0.0.1:8787";

function normalizeApiBase(value) {
  return String(value ?? "").trim().replace(/\/$/, "");
}

function resolveRequestPath(requestUrl) {
  const parsedUrl = new URL(requestUrl, "http://localhost");
  const pathname = decodeURIComponent(parsedUrl.pathname);

  if (pathname === "/" || pathname === "") {
    return "/index.html";
  }

  return pathname;
}

function getContentType(filePath) {
  const extension = path.extname(filePath).toLowerCase();

  switch (extension) {
    case ".css":
      return "text/css; charset=utf-8";
    case ".html":
      return "text/html; charset=utf-8";
    case ".js":
      return "text/javascript; charset=utf-8";
    case ".json":
      return "application/json; charset=utf-8";
    default:
      return "application/octet-stream";
  }
}

function hasRequestBody(method) {
  return method !== "GET" && method !== "HEAD";
}

function shouldProxyPath(requestPath) {
  return requestPath === "/health" || requestPath.startsWith("/v1/");
}

function toProxyHeaders(headers) {
  const proxyHeaders = new Headers();

  for (const [key, value] of Object.entries(headers)) {
    if (value == null) {
      continue;
    }

    const normalizedKey = key.toLowerCase();
    if (
      normalizedKey === "host"
      || normalizedKey === "connection"
      || normalizedKey === "content-length"
      || normalizedKey === "origin"
    ) {
      continue;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        proxyHeaders.append(key, item);
      }
      continue;
    }

    proxyHeaders.set(key, value);
  }

  return proxyHeaders;
}

async function proxyRequest(request, response, { apiBase }) {
  const targetUrl = new URL(request.url ?? "/", apiBase);
  const method = request.method ?? "GET";
  const requestInit = {
    method,
    headers: toProxyHeaders(request.headers),
    body: hasRequestBody(method) ? request : undefined
  };

  if (requestInit.body) {
    requestInit.duplex = "half";
  }

  try {
    const proxiedResponse = await fetch(targetUrl, requestInit);
    response.writeHead(
      proxiedResponse.status,
      Object.fromEntries(proxiedResponse.headers.entries())
    );
    response.end(Buffer.from(await proxiedResponse.arrayBuffer()));
  } catch {
    const payload = {
      code: "SERVICE_UNAVAILABLE",
      message: "OpenSky local backend is not reachable.",
      userAction: "Start `npm run start:service` or use `npm run dev` to launch the local full stack.",
      traceId: randomUUID()
    };
    response.writeHead(503, {
      "content-type": "application/json; charset=utf-8"
    });
    response.end(JSON.stringify(payload));
  }
}

async function handleRequest(request, response, { apiBase, injectedApiBase, rootDir }) {
  const requestPath = resolveRequestPath(request.url ?? "/");

  if (shouldProxyPath(requestPath)) {
    await proxyRequest(request, response, { apiBase });
    return;
  }

  if (requestPath === "/config.js") {
    const body = `globalThis.OPEN_SKY_CONFIG = {\n  apiBase: "${injectedApiBase}"\n};\n`;
    response.writeHead(200, { "content-type": "text/javascript; charset=utf-8" });
    response.end(body);
    return;
  }

  const normalizedPath = path.normalize(requestPath).replace(/^(\.\.(\/|\\|$))+/, "");
  const filePath = path.join(rootDir, normalizedPath.replace(/^[/\\]/, ""));

  if (!filePath.startsWith(rootDir)) {
    response.writeHead(403, { "content-type": "text/plain; charset=utf-8" });
    response.end("Forbidden");
    return;
  }

  try {
    const file = await fs.readFile(filePath);
    response.writeHead(200, { "content-type": getContentType(filePath) });
    response.end(file);
  } catch (error) {
    if (error?.code === "ENOENT") {
      response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      response.end("Not Found");
      return;
    }

    response.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
    response.end("Internal Server Error");
  }
}

export function createDevServer(options = {}) {
  const apiBase = normalizeApiBase(options.apiBase ?? process.env.OPEN_SKY_API_BASE ?? defaultApiBase);
  const port = Number.parseInt(options.port ?? `${defaultPort}`, 10);
  const rootDir = options.rootDir ?? webRoot;
  const proxyApi = options.proxyApi ?? process.env.OPEN_SKY_WEB_PROXY !== "off";
  const injectedApiBase = normalizeApiBase(
    options.injectedApiBase
    ?? (proxyApi ? "" : apiBase)
  );
  const server = http.createServer((request, response) => handleRequest(request, response, {
    apiBase,
    injectedApiBase,
    rootDir
  }));

  return {
    apiBase,
    injectedApiBase,
    proxyApi,
    port,
    rootDir,
    server,
    start() {
      return new Promise((resolve, reject) => {
        server.once("error", (error) => {
          if (error?.code === "EADDRINUSE") {
            const friendlyError = new Error(
              `OpenSky web dev server could not start because port ${port} is already in use. Stop the process using that port or set OPEN_SKY_WEB_PORT to another port.`
            );
            friendlyError.code = error.code;
            reject(friendlyError);
            return;
          }

          reject(error);
        });

        server.listen(port, () => {
          const address = server.address();
          const resolvedPort = typeof address === "object" && address ? address.port : port;
          resolve({
            apiBase,
            injectedApiBase,
            proxyApi,
            port: resolvedPort,
            rootDir,
            server
          });
        });
      });
    }
  };
}

const isEntrypoint = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isEntrypoint) {
  try {
    const devServer = createDevServer();
    const { apiBase, injectedApiBase, port, proxyApi } = await devServer.start();
    console.log(`OpenSky web dev server listening on http://localhost:${port}`);
    console.log(`Backend API target=${apiBase}`);
    console.log(
      proxyApi
        ? "Local dev relay enabled for /v1/* and /health; frontend uses same-origin requests."
        : `Frontend API configured via OPEN_SKY_API_BASE=${injectedApiBase}`
    );
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
