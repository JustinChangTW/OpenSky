import httpProxy from "http-proxy";
import { randomUUID } from "node:crypto";
import { requireString } from "../../../../packages/contracts/src/common/index.mjs";
import { createErrorResponse, ERROR_CODES } from "../../../../packages/contracts/src/errors/index.mjs";
import { jsonResponse, parseCookies, SESSION_COOKIE_NAME } from "../common/http.mjs";
import { asStructuredError, getRecord, statusForErrorCode } from "../common/service-helpers.mjs";
import { localizeStructuredError } from "../common/i18n.mjs";

const RELAY_USER_AGENT = "OpenSkyRelay/1.0";
const PROXY_RESOURCE_METHODS = new Set(["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE"]);
const FORWARDED_REQUEST_HEADERS = new Set([
  "accept",
  "accept-language",
  "accept-encoding",
  "cache-control",
  "content-type",
  "if-none-match",
  "if-modified-since",
  "range",
  "x-requested-with",
  "x-csrf-token",
  "x-xsrf-token"
]);
const BLOCKED_RESPONSE_HEADERS = new Set([
  "connection",
  "content-encoding",
  "content-length",
  "content-security-policy",
  "content-security-policy-report-only",
  "set-cookie",
  "set-cookie2",
  "transfer-encoding",
  "x-frame-options"
]);

function createProxyResourceUrl(tabId, resourceUrl) {
  return `/v1/browse/resource?tabId=${encodeURIComponent(tabId)}&resourceUrl=${encodeURIComponent(resourceUrl)}`;
}

function rewriteCssContent(cssText, baseUrl, tabId) {
  const rewriteUrl = (value) => {
    const trimmed = String(value ?? "").trim().replace(/^['"]|['"]$/gu, "");
    if (!trimmed || trimmed.startsWith("data:") || trimmed.startsWith("javascript:")) {
      return trimmed;
    }

    try {
      const resolvedUrl = new URL(trimmed, baseUrl).href;
      return createProxyResourceUrl(tabId, resolvedUrl);
    } catch {
      return trimmed;
    }
  };

  return String(cssText ?? "")
    .replace(/url\(([^)]+)\)/giu, (_, value) => `url("${rewriteUrl(value)}")`)
    .replace(/@import\s+(?:url\()?["']?([^"')\s]+)["']?\)?/giu, (_, value) => `@import url("${rewriteUrl(value)}")`);
}

function buildProxyRequestHeaders(incomingHeaders, cookieHeader = "") {
  const headers = {
    "user-agent": RELAY_USER_AGENT
  };

  for (const [headerName, headerValue] of Object.entries(incomingHeaders ?? {})) {
    const normalizedHeaderName = String(headerName ?? "").toLowerCase();
    if (!FORWARDED_REQUEST_HEADERS.has(normalizedHeaderName)) {
      continue;
    }

    headers[normalizedHeaderName] = Array.isArray(headerValue)
      ? headerValue.join(", ")
      : String(headerValue ?? "");
  }

  if (cookieHeader) {
    headers.cookie = cookieHeader;
  }

  return headers;
}

function toProxyResponseHeaders(nodeHeaders) {
  const headers = {};
  for (const [key, value] of Object.entries(nodeHeaders ?? {})) {
    const normalizedKey = String(key ?? "").toLowerCase();
    if (BLOCKED_RESPONSE_HEADERS.has(normalizedKey)) {
      continue;
    }

    if (Array.isArray(value)) {
      headers[normalizedKey] = value.join(", ");
    } else if (value != null) {
      headers[normalizedKey] = String(value);
    }
  }

  if (!headers["cache-control"]) {
    headers["cache-control"] = "private, max-age=60";
  }

  return headers;
}

function matchAllowedDomain(candidateUrl, site) {
  const hostname = new URL(candidateUrl).hostname.toLowerCase();
  return (site.baseDomains ?? []).some((domain) => {
    const normalizedDomain = String(domain ?? "").trim().toLowerCase();
    return normalizedDomain && (hostname === normalizedDomain || hostname.endsWith(`.${normalizedDomain}`));
  });
}

function assertResourceUrlAllowed(candidateUrl, site, traceId) {
  if (!matchAllowedDomain(candidateUrl, site)) {
    throw createErrorResponse(
      ERROR_CODES.RESOURCE_DOMAIN_NOT_ALLOWED,
      "This page depends on assets that are outside the current allowlisted site domains.",
      "Add the required asset domains to the site allowlist, or treat this site as partially supported.",
      traceId
    );
  }
}

function setCorsHeaders(response, corsHeaders = {}) {
  for (const [key, value] of Object.entries(corsHeaders)) {
    response.setHeader(key, value);
  }
}

async function writeStructuredError(response, incomingRequest, corsHeaders, error) {
  const fallbackRequest = new Request("http://localhost/", {
    headers: incomingRequest.headers
  });
  const structuredError = localizeStructuredError(asStructuredError(error, randomUUID()), fallbackRequest);
  const payload = jsonResponse(structuredError, { status: statusForErrorCode(structuredError.code) });

  response.statusCode = payload.status;
  setCorsHeaders(response, corsHeaders);
  payload.headers.forEach((value, key) => {
    response.setHeader(key, value);
  });
  response.end(Buffer.from(await payload.arrayBuffer()));
}

function captureRelayResponseCookies(proxyRes) {
  const setCookieHeaders = proxyRes?.headers?.["set-cookie"];
  if (Array.isArray(setCookieHeaders)) {
    return setCookieHeaders;
  }

  if (!setCookieHeaders) {
    return [];
  }

  return String(setCookieHeaders)
    .split(/,(?=[^;,]+=)/gu)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function proxyToPromise(proxy, request, response, options) {
  return new Promise((resolve, reject) => {
    proxy.web(request, response, options, (error) => reject(error));
    response.once("finish", resolve);
  });
}

export function createProxyResourceGateway(context) {
  return {
    async handle(incomingRequest, outgoingResponse, { requestUrl, corsHeaders }) {
      const method = String(incomingRequest.method ?? "GET").toUpperCase();
      if (!PROXY_RESOURCE_METHODS.has(method) || requestUrl.pathname !== "/v1/browse/resource") {
        return false;
      }

      try {
        const tabId = requireString(requestUrl.searchParams.get("tabId"), "tabId");
        const resourceUrl = requireString(requestUrl.searchParams.get("resourceUrl"), "resourceUrl");
        const resourceTarget = new URL(resourceUrl);
        const scope = "proxy-resource-http-proxy";
        const traceId = randomUUID();

        const cookieRequest = new Request("http://localhost/", {
          headers: incomingRequest.headers
        });
        const cookieToken = parseCookies(cookieRequest)[SESSION_COOKIE_NAME]?.trim() ?? "";
        const headerToken = String(incomingRequest.headers["x-opensky-session"] ?? "").trim();
        const sessionToken = headerToken || cookieToken;
        const session = await context.store.getSession();

        if (!sessionToken || !session || session.token !== sessionToken || session.signedIn !== true) {
          throw createErrorResponse(
            ERROR_CODES.AUTH_REQUIRED,
            "You must sign in to continue.",
            "Sign in as the owner-admin user.",
            traceId
          );
        }

        const tab = await getRecord(context, "tabs", tabId, ERROR_CODES.TAB_NOT_FOUND, traceId, "Tab");
        const site = await getRecord(context, "sites", tab.siteId, ERROR_CODES.SITE_NOT_FOUND, traceId, "Site");
        assertResourceUrlAllowed(resourceUrl, site, traceId);

        const scopeRef = {
          siteId: site.siteId,
          projectId: tab.projectId ?? null
        };
        const upstreamCookieHeader = await context.relayCookieJar?.getCookieHeader?.(scopeRef, resourceUrl);
        const proxyHeaders = buildProxyRequestHeaders(incomingRequest.headers, upstreamCookieHeader);
        const proxyTarget = `${resourceTarget.origin}${resourceTarget.pathname}${resourceTarget.search}`;
        const proxy = httpProxy.createProxyServer({
          changeOrigin: true,
          secure: resourceTarget.protocol === "https:",
          ignorePath: false,
          prependPath: false,
          xfwd: true,
          selfHandleResponse: true
        });

        const proxyOptions = {
          target: resourceTarget.origin,
          headers: proxyHeaders
        };

        proxy.on("proxyRes", async (proxyRes, request, response) => {
          try {
            const finalUrl = proxyTarget;
            assertResourceUrlAllowed(finalUrl, site, traceId);

            const fakeResponse = {
              headers: {
                getSetCookie: () => captureRelayResponseCookies(proxyRes),
                get: (headerName) => {
                  const key = String(headerName ?? "").toLowerCase();
                  const value = proxyRes.headers?.[key];
                  return Array.isArray(value) ? value.join(", ") : String(value ?? "");
                }
              }
            };

            await context.relayCookieJar?.capture?.(scopeRef, finalUrl, fakeResponse, { persist: true }).catch(async (error) => {
              await context.logger?.write?.({
                level: "warning",
                scope: "relay-cookie-capture",
                siteId: scopeRef.siteId,
                projectId: scopeRef.projectId,
                currentUrl: finalUrl,
                message: `Failed to capture upstream cookies: ${error.message}`
              }).catch(() => undefined);
            });

            const proxyResponseHeaders = {
              ...toProxyResponseHeaders(proxyRes.headers),
              "x-opensky-relay-url": finalUrl
            };
            setCorsHeaders(response, corsHeaders);
            Object.entries(proxyResponseHeaders).forEach(([key, value]) => {
              response.setHeader(key, value);
            });

            const contentType = String(proxyRes.headers?.["content-type"] ?? "application/octet-stream");
            response.statusCode = proxyRes.statusCode ?? 200;

            if (method === "HEAD") {
              response.end();
              return;
            }

            if (contentType.includes("text/css")) {
              const chunks = [];
              proxyRes.on("data", (chunk) => chunks.push(chunk));
              proxyRes.on("end", () => {
                const cssText = Buffer.concat(chunks).toString("utf8");
                const rewrittenCss = rewriteCssContent(cssText, finalUrl, tabId);
                response.setHeader("content-type", contentType);
                response.end(rewrittenCss);
              });
              return;
            }

            proxyRes.pipe(response);
          } catch (error) {
            await context.logger?.write?.({
              level: "error",
              scope,
              siteId: site.siteId,
              projectId: tab.projectId ?? null,
              currentUrl: proxyTarget,
              message: `Proxy relay failed: ${error.message}`
            }).catch(() => undefined);
            if (!response.writableEnded) {
              await writeStructuredError(response, incomingRequest, corsHeaders, error);
            }
          } finally {
            proxy.close();
          }
        });

        proxy.on("error", async (error, request, response) => {
          await context.logger?.write?.({
            level: "error",
            scope,
            siteId: site.siteId,
            projectId: tab.projectId ?? null,
            currentUrl: proxyTarget,
            message: `Proxy upstream error: ${error.message}`
          }).catch(() => undefined);
          if (response && !response.writableEnded) {
            await writeStructuredError(response, incomingRequest, corsHeaders, createErrorResponse(
              ERROR_CODES.SERVICE_UNAVAILABLE,
              "OpenSky could not retrieve the requested allowlisted page.",
              "Retry in a moment. If the issue persists, inspect the backend log.",
              traceId
            ));
          }
          proxy.close();
        });

        const originalIncomingUrl = incomingRequest.url;
        incomingRequest.url = `${resourceTarget.pathname}${resourceTarget.search}`;

        try {
          await proxyToPromise(proxy, incomingRequest, outgoingResponse, proxyOptions);
          return true;
        } finally {
          incomingRequest.url = originalIncomingUrl;
        }
      } catch (error) {
        await writeStructuredError(outgoingResponse, incomingRequest, corsHeaders, error);
        return true;
      }
    }
  };
}
