import { createErrorResponse } from "../../contracts/src/errors/index.mjs";

export function normalizeDomain(value) {
  return value.toLowerCase().trim();
}

export function matchPathRule(pathname, pathRules = []) {
  if (!pathRules.length) {
    return true;
  }
  return pathRules.some((rule) => pathname.startsWith(rule));
}

export function isUrlAllowed(candidateUrl, allowedSite) {
  const url = new URL(candidateUrl);
  const domain = normalizeDomain(url.hostname);
  const allowedDomains = (allowedSite.baseDomains ?? []).map(normalizeDomain);
  const domainAllowed = allowedDomains.some((allowedDomain) => domain === allowedDomain || domain.endsWith(`.${allowedDomain}`));

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
