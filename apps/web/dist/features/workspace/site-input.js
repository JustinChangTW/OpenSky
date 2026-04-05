function createInputError(message, userAction) {
  const error = new Error(message);
  error.payload = {
    code: "INVALID_INPUT",
    message,
    userAction,
    traceId: "client-site-input"
  };
  return error;
}

function normalizeHostLikeValue(value) {
  return String(value ?? "")
    .trim()
    .replace(/^[a-z][a-z0-9+.-]*:\/\//iu, "")
    .replace(/[/?#].*$/u, "")
    .replace(/:\d+$/u, "")
    .replace(/\.+$/u, "")
    .toLowerCase();
}

function normalizePathRule(value) {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) {
    return "/";
  }

  if (trimmed.startsWith("/")) {
    return trimmed;
  }

  if (trimmed.startsWith("?") || trimmed.startsWith("#")) {
    return `/${trimmed}`;
  }

  return `/${trimmed}`;
}

function isValidBaseDomain(value) {
  if (!value) {
    return false;
  }

  if (value === "localhost") {
    return true;
  }

  if (/^\d{1,3}(?:\.\d{1,3}){3}$/u.test(value)) {
    return true;
  }

  if (!/^[a-z0-9.-]+$/iu.test(value)) {
    return false;
  }

  if (value.startsWith(".") || value.endsWith(".")) {
    return false;
  }

  return value.includes(".");
}

function tryParseAsUrl(value) {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) {
    return null;
  }

  try {
    return new URL(trimmed);
  } catch {
    return null;
  }
}

function splitBaseDomainInput(value) {
  return String(value ?? "")
    .split(/[,\n]/u)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function normalizeSiteDraft(input) {
  const displayName = String(input?.displayName ?? "").trim();
  const rawBaseDomain = String(input?.baseDomain ?? "").trim();
  const rawPathRule = String(input?.pathRule ?? "").trim();
  const domainEntries = splitBaseDomainInput(rawBaseDomain);
  let extractedPathRule = null;
  const normalizedBaseDomains = [];
  let normalizedFromUrl = false;

  for (const entry of domainEntries) {
    const parsedUrl = tryParseAsUrl(entry);
    let normalizedDomain = normalizeHostLikeValue(entry);

    if (parsedUrl) {
      normalizedDomain = normalizeHostLikeValue(parsedUrl.hostname);
      normalizedFromUrl = true;
      if (!extractedPathRule && parsedUrl.pathname && parsedUrl.pathname !== "/") {
        extractedPathRule = `${parsedUrl.pathname}${parsedUrl.search || ""}${parsedUrl.hash || ""}`;
      }
    }

    if (normalizedDomain) {
      normalizedBaseDomains.push(normalizedDomain);
    }
  }

  const dedupedBaseDomains = [...new Set(normalizedBaseDomains)];
  let baseDomain = dedupedBaseDomains[0] ?? "";
  let pathRule = normalizePathRule(rawPathRule || "/");

  if (extractedPathRule && (!rawPathRule || rawPathRule === "/" || rawPathRule === "/team")) {
    pathRule = normalizePathRule(extractedPathRule);
  }

  if (!displayName) {
    throw createInputError(
      "Site name is required.",
      "Enter a site name before saving the allowlisted site."
    );
  }

  if (!dedupedBaseDomains.length || dedupedBaseDomains.some((domain) => !isValidBaseDomain(domain))) {
    throw createInputError(
      "Base domain must contain one or more hostnames such as example.com. Do not paste unsupported values into this field.",
      "Enter hostnames only, separated by commas if you need more than one, for example www.megaholdings.com.tw, static.megaholdings.com.tw."
    );
  }

  if (!pathRule.startsWith("/")) {
    throw createInputError(
      "Path rule must start with '/'.",
      "Enter a path such as / or /team in the path rule field."
    );
  }

  return {
    payload: {
      displayName,
      baseDomains: dedupedBaseDomains,
      pathRules: [pathRule]
    },
    normalizedFromUrl,
    normalizedBaseDomain: baseDomain,
    normalizedBaseDomains: dedupedBaseDomains,
    normalizedPathRule: pathRule
  };
}
