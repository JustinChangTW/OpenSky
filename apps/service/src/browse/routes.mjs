import { requireString } from "../../../../packages/contracts/src/common/index.mjs";
import { parseBrowseNavigateInput, parseBrowseOpenInput } from "../../../../packages/contracts/src/browse/index.mjs";
import { createErrorResponse, ERROR_CODES } from "../../../../packages/contracts/src/errors/index.mjs";
import { parseTabInput } from "../../../../packages/contracts/src/tabs/index.mjs";
import { assertUrlAllowed } from "../../../../packages/policy/src/index.mjs";
import { jsonResponse, readJsonBody } from "../common/http.mjs";
import { derivePageTitle, getRecord, withRoute, writeAudit, writeRecord } from "../common/service-helpers.mjs";

const RELAY_USER_AGENT = "OpenSkyRelay/1.0";

function matchAllowedDomain(candidateUrl, site) {
  const hostname = new URL(candidateUrl).hostname.toLowerCase();
  return (site.baseDomains ?? []).some((domain) => {
    const normalizedDomain = String(domain ?? "").trim().toLowerCase();
    return hostname === normalizedDomain || hostname.endsWith(`.${normalizedDomain}`);
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

function collectUnsupportedResourceHosts(documentHtml, baseUrl, site) {
  const hosts = new Set();
  const urlPattern = /\b(?:src|href)\s*=\s*["']([^"']+)["']|\b(?:srcset)\s*=\s*["']([^"']+)["']/giu;
  const cssPattern = /url\(([^)]+)\)|@import\s+(?:url\()?["']?([^"')\s]+)["']?\)?/giu;

  const tryAddUrl = (candidate) => {
    const trimmed = String(candidate ?? "").trim().replace(/^['"]|['"]$/gu, "");
    if (!trimmed || trimmed.startsWith("data:") || trimmed.startsWith("javascript:") || trimmed.startsWith("#")) {
      return;
    }

    try {
      const absoluteUrl = new URL(trimmed, baseUrl).href;
      if (!matchAllowedDomain(absoluteUrl, site)) {
        hosts.add(new URL(absoluteUrl).hostname.toLowerCase());
      }
    } catch {
      // Ignore malformed upstream URLs.
    }
  };

  for (const match of String(documentHtml ?? "").matchAll(urlPattern)) {
    if (match[1]) {
      tryAddUrl(match[1]);
    }
    if (match[2]) {
      for (const entry of match[2].split(",")) {
        const [candidateUrl] = entry.trim().split(/\s+/, 1);
        tryAddUrl(candidateUrl);
      }
    }
  }

  for (const match of String(documentHtml ?? "").matchAll(cssPattern)) {
    tryAddUrl(match[1] ?? match[2]);
  }

  return [...hosts].sort();
}

async function fetchRelayResponse(currentUrl, site, context, traceId, scope = "browse-relay", scopeRef = { siteId: site.siteId, projectId: null }) {
  const cookieHeader = await context.relayCookieJar?.getCookieHeader?.(scopeRef, currentUrl);
  const requestHeaders = {
    "user-agent": RELAY_USER_AGENT
  };
  if (cookieHeader) {
    requestHeaders.cookie = cookieHeader;
  }

  const response = await context.fetch(currentUrl, {
    method: "GET",
    redirect: "follow",
    headers: requestHeaders
  }).catch(async (error) => {
    await context.logger?.write?.({
      level: "error",
      scope,
      siteId: site.siteId,
      currentUrl,
      message: `Relay fetch failed: ${error.message}`
    }).catch(() => undefined);
    throw createErrorResponse(
      ERROR_CODES.SERVICE_UNAVAILABLE,
      "OpenSky could not retrieve the requested allowlisted page.",
      "Retry in a moment. If the issue persists, inspect the backend log.",
      traceId
    );
  });

  await context.relayCookieJar?.capture?.(scopeRef, currentUrl, response, { persist: true }).catch(async (error) => {
    await context.logger?.write?.({
      level: "warning",
      scope: "relay-cookie-capture",
      siteId: scopeRef.siteId,
      projectId: scopeRef.projectId,
      currentUrl,
      message: `Failed to capture upstream cookies: ${error.message}`
    }).catch(() => undefined);
  });

  return response;
}

async function fetchRelayDocument(currentUrl, tabId, site, projectId, context, traceId) {
  const response = await fetchRelayResponse(currentUrl, site, context, traceId, "browse-relay", {
    siteId: site.siteId,
    projectId: projectId ?? null
  });
  const finalUrl = response.url || currentUrl;
  assertUrlAllowed(finalUrl, site, traceId);

  const contentType = String(response.headers.get("content-type") ?? "text/html");
  const body = await response.text();
  const unsupportedHosts = collectUnsupportedResourceHosts(body, finalUrl, site);

  if (unsupportedHosts.length) {
    await context.logger?.write?.({
      level: "warning",
      scope: "browse-content",
      siteId: site.siteId,
      currentUrl,
      finalUrl,
      unsupportedHosts,
      message: `Proxy Phase 1 detected cross-domain assets outside the allowlist: ${unsupportedHosts.join(", ")}`
    }).catch(() => undefined);
  }

  return {
    finalUrl,
    contentType,
    documentHtml: body,
    scriptCount: (body.match(/<script\b/giu) ?? []).length,
    renderMode: "allowlist-proxy-phase1",
    resourceBaseUrl: createProxyResourceUrl(tabId, finalUrl),
    unsupportedHosts
  };
}

export function registerBrowseRoutes(router) {
  router.add("POST", "/v1/browse/open", withRoute(async ({ request, context, traceId, actor }) => {
    const payload = parseBrowseOpenInput(await readJsonBody(request));
    const site = await getRecord(context, "sites", payload.siteId, ERROR_CODES.SITE_NOT_FOUND, traceId, "Site");
    const project = await getRecord(context, "projects", payload.projectId, ERROR_CODES.PROJECT_NOT_FOUND, traceId, "Project");

    if (site.status !== "active") {
      throw createErrorResponse(ERROR_CODES.SITE_DISABLED, "This site is not active.", "Choose an active allowlisted site.", traceId);
    }

    assertUrlAllowed(payload.entryUrl, site, traceId);
    const tabId = await context.store.nextId("tab");
    const tab = {
      tabId,
      ...parseTabInput({
        projectId: project.projectId,
        siteId: site.siteId,
        entryUrl: payload.entryUrl,
        currentUrl: payload.entryUrl,
        pageTitle: derivePageTitle(payload.entryUrl, site.displayName),
        renderMode: site.defaultRenderMode ?? "allowlist-proxy-phase1",
        status: "open"
      })
    };
    await writeRecord(context, "tabs", tabId, tab);
    await writeRecord(context, "projects", project.projectId, {
      ...project,
      status: project.status === "draft" ? "active" : project.status,
      lastOpenedAt: new Date().toISOString()
    });
    await writeAudit(context, { actorId: actor.actorId, action: "browse.open", targetType: "WorkspaceTab", targetId: tabId, result: "success" });
    return jsonResponse(tab, { status: 201 });
  }));

  router.add("POST", "/v1/browse/navigate", withRoute(async ({ request, context, traceId, actor }) => {
    const payload = parseBrowseNavigateInput(await readJsonBody(request));
    const tab = await getRecord(context, "tabs", payload.tabId, ERROR_CODES.TAB_NOT_FOUND, traceId, "Tab");
    const site = await getRecord(context, "sites", tab.siteId, ERROR_CODES.SITE_NOT_FOUND, traceId, "Site");
    assertUrlAllowed(payload.nextUrl, site, traceId);

    const updatedTab = {
      ...tab,
      currentUrl: payload.nextUrl,
      pageTitle: derivePageTitle(payload.nextUrl, site.displayName),
      status: "open",
      lastVisitedAt: new Date().toISOString()
    };
    await writeRecord(context, "tabs", tab.tabId, updatedTab);
    await writeAudit(context, { actorId: actor.actorId, action: "browse.navigate", targetType: "WorkspaceTab", targetId: tab.tabId, result: "success" });
    return jsonResponse(updatedTab);
  }));

  router.add("POST", "/v1/browse/close", withRoute(async ({ request, context, traceId, actor }) => {
    const payload = await readJsonBody(request);
    const tab = await getRecord(context, "tabs", payload.tabId, ERROR_CODES.TAB_NOT_FOUND, traceId, "Tab");
    const updatedTab = { ...tab, status: "closed", lastVisitedAt: new Date().toISOString() };
    await writeRecord(context, "tabs", payload.tabId, updatedTab);
    await writeAudit(context, { actorId: actor.actorId, action: "browse.close", targetType: "WorkspaceTab", targetId: payload.tabId, result: "success" });
    return jsonResponse(updatedTab);
  }));

  router.add("GET", "/v1/browse/content", withRoute(async ({ context, url, traceId, actor }) => {
    const tabId = requireString(url.searchParams.get("tabId"), "tabId");
    const tab = await getRecord(context, "tabs", tabId, ERROR_CODES.TAB_NOT_FOUND, traceId, "Tab");
    const site = await getRecord(context, "sites", tab.siteId, ERROR_CODES.SITE_NOT_FOUND, traceId, "Site");
    assertUrlAllowed(tab.currentUrl, site, traceId);

    const relay = await fetchRelayDocument(tab.currentUrl, tab.tabId, site, tab.projectId ?? null, context, traceId);
    const nextPageTitle = derivePageTitle(relay.finalUrl, site.displayName);
    const updatedTab = relay.finalUrl !== tab.currentUrl || nextPageTitle !== tab.pageTitle
      ? {
          ...tab,
          currentUrl: relay.finalUrl,
          pageTitle: nextPageTitle,
          lastVisitedAt: new Date().toISOString()
        }
      : tab;

    if (updatedTab !== tab) {
      await writeRecord(context, "tabs", tab.tabId, updatedTab);
    }

    await writeAudit(context, {
      actorId: actor.actorId,
      action: "browse.content",
      targetType: "WorkspaceTab",
      targetId: tab.tabId,
      result: "success"
    });

    return jsonResponse({
      tabId: tab.tabId,
      requestedUrl: tab.currentUrl,
      finalUrl: relay.finalUrl,
      pageTitle: updatedTab.pageTitle,
      contentType: relay.contentType,
      documentHtml: relay.documentHtml,
      scriptCount: relay.scriptCount,
      renderMode: relay.renderMode,
      resourceBaseUrl: relay.resourceBaseUrl,
      unsupportedHosts: relay.unsupportedHosts,
      warningMessage: relay.unsupportedHosts.length
        ? `This site loads assets from additional domains (${relay.unsupportedHosts.join(", ")}). Add those domains to the allowlist if you need a closer proxy match.`
        : null
    });
  }));

  router.add("GET", "/v1/browse/resource", withRoute(async ({ context, url, traceId }) => {
    const tabId = requireString(url.searchParams.get("tabId"), "tabId");
    const resourceUrl = requireString(url.searchParams.get("resourceUrl"), "resourceUrl");
    const tab = await getRecord(context, "tabs", tabId, ERROR_CODES.TAB_NOT_FOUND, traceId, "Tab");
    const site = await getRecord(context, "sites", tab.siteId, ERROR_CODES.SITE_NOT_FOUND, traceId, "Site");

    assertResourceUrlAllowed(resourceUrl, site, traceId);
    const response = await fetchRelayResponse(resourceUrl, site, context, traceId, "browse-resource", {
      siteId: site.siteId,
      projectId: tab.projectId ?? null
    });
    const finalUrl = response.url || resourceUrl;
    assertResourceUrlAllowed(finalUrl, site, traceId);

    const contentType = String(response.headers.get("content-type") ?? "application/octet-stream");
    const baseHeaders = {
      "content-type": contentType,
      "cache-control": response.headers.get("cache-control") ?? "private, max-age=60"
    };

    if (contentType.includes("text/css")) {
      const cssText = await response.text();
      const rewrittenCss = rewriteCssContent(cssText, finalUrl, tab.tabId);
      return new Response(rewrittenCss, {
        status: response.status,
        headers: baseHeaders
      });
    }

    return new Response(await response.arrayBuffer(), {
      status: response.status,
      headers: baseHeaders
    });
  }));
}
