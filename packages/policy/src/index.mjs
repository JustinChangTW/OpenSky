import { createErrorResponse } from "../../contracts/src/errors/index.mjs";
import { parse } from "tldts";

export function normalizeDomain(value) {
  return String(value ?? "").toLowerCase().trim().replace(/\.+$/u, "");
}

function parseHostnameParts(hostname) {
  const parsed = parse(hostname);
  return {
    hostname: normalizeDomain(hostname),
    domain: normalizeDomain(parsed.domain ?? ""),
    subdomain: normalizeDomain(parsed.subdomain ?? ""),
    isIp: Boolean(parsed.isIp)
  };
}

export function matchPathRule(pathname, pathRules = []) {
  if (!pathRules.length) {
    return true;
  }
  return pathRules.some((rule) => pathname.startsWith(rule));
}

export function isUrlAllowed(candidateUrl, allowedSite) {
  const url = new URL(candidateUrl);
  const candidateHost = parseHostnameParts(url.hostname);
  const allowedDomains = (allowedSite.baseDomains ?? [])
    .map(normalizeDomain)
    .filter(Boolean);

  const domainAllowed = allowedDomains.some((allowedDomain) => {
    const allowedHost = parseHostnameParts(allowedDomain);

    if (candidateHost.isIp || allowedHost.isIp) {
      return candidateHost.hostname === allowedHost.hostname;
    }

    if (candidateHost.hostname === allowedHost.hostname) {
      return true;
    }

    if (allowedHost.domain && candidateHost.domain && candidateHost.domain === allowedHost.domain) {
      if (!allowedHost.subdomain) {
        return true;
      }
      return candidateHost.hostname.endsWith(`.${allowedHost.hostname}`) || candidateHost.hostname === allowedHost.hostname;
    }

    return candidateHost.hostname.endsWith(`.${allowedHost.hostname}`);
  });

  if (!domainAllowed) {
    return false;
  }

  return matchPathRule(url.pathname, allowedSite.pathRules ?? []);
}

export function assertUrlAllowed(candidateUrl, allowedSite, traceId) {
  if (!isUrlAllowed(candidateUrl, allowedSite)) {
    throw createErrorResponse(
      "URL_NOT_ALLOWED",
      "The requested URL is not on the allowed site list.",
      "Choose an allowed site or navigate within the configured path rules.",
      traceId
    );
  }
}
