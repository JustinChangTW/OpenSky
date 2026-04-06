import { createBannerMarkup } from "./components/banner.js";
import { fetchAuditLog } from "./features/audit/api.js";
import { fetchServiceInfo, fetchSession, submitSignIn, submitSignOut } from "./features/auth/api.js";
import { createSignInMarkup } from "./features/auth/view.js";
import { browseClose, browseNavigate, browseOpen, createBrowseResourceUrl, fetchBrowseContent } from "./features/browse/api.js";
import { approveTransfer, completeTransfer, createTransfer, previewTransfer } from "./features/file-transfer/api.js";
import {
  createDefaultLayoutState,
  mergeLayoutState,
  reduceLayoutState,
  toLayoutPreferencePayload,
  toggleBarState,
  toggleFocusMode,
  toggleSidePanel
} from "./features/layout/state.js";
import { requestFullscreenWithFallback } from "./features/layout/fullscreen.js";
import { loadLayoutState, saveLayoutState } from "./features/layout/storage.js";
import { createSessionVault, fetchSessionVault, updateSessionVault } from "./features/session-vault/api.js";
import { createTranslator, describeUiError, loadLocale, saveLocale } from "./i18n-runtime.js";
import {
  createBookmark,
  deleteSite,
  createNote,
  createProject,
  createSite,
  fetchBookmarks,
  fetchLayoutPreference,
  fetchNotes,
  fetchProjects,
  fetchSites,
  fetchTabs,
  saveLayoutPreference,
  updateSite
} from "./features/workspace/api.js";
import { normalizeSiteDraft } from "./features/workspace/site-input.js";
import { clearWorkspaceUiState, loadWorkspaceUiState, saveWorkspaceUiState } from "./features/workspace/storage.js";
import { createWorkspaceShellMarkup } from "./features/workspace/view-browser.js";
import { escapeHtml } from "./components/ui.js";

function logFrontendIssue(scope, error, extra = {}) {
  console.log("OpenSky frontend issue", {
    scope,
    message: error?.message ?? String(error),
    code: error?.payload?.code ?? null,
    traceId: error?.payload?.traceId ?? null,
    userAction: error?.payload?.userAction ?? null,
    extra
  });
}

function createInitialState() {
  const locale = loadLocale();
  const t = createTranslator(locale);
  const workspaceUiState = loadWorkspaceUiState();
  return {
    locale,
    serviceStatus: "loading",
    serviceInfo: null,
    sessionStatus: "loading",
    workspaceStatus: "idle",
    settingsTrayOpen: false,
    settingsMenuOpen: false,
    session: null,
    layout: mergeLayoutState(createDefaultLayoutState(), loadLayoutState() ?? {}),
    banners: [],
    statusMessage: t("status.checkingSession"),
    sites: [],
    projects: [],
    tabs: [],
    bookmarks: [],
    notes: [],
    vaultItems: [],
    auditItems: [],
    activeProjectId: workspaceUiState.activeProjectId ?? null,
    activeSiteId: workspaceUiState.activeSiteId ?? null,
    activeTabId: workspaceUiState.activeTabId ?? null,
    currentUrl: workspaceUiState.currentUrl ?? "",
    transferItemId: null,
    activeLayoutPreferenceId: null,
    lastTransfer: null,
    activeDocument: null
  };
}

function createWorkspaceBootMarkup(state) {
  const t = createTranslator(state.locale);
  return `
    <main class="workspace-boot-shell">
      <section class="workspace-boot-card">
        <p class="eyebrow">${t("workspace.proxyEyebrow")}</p>
        <h1>${t("workspace.proxyTitle")}</h1>
        <p class="workspace-status">${escapeHtml(state.statusMessage)}</p>
        ${createServiceInfoMarkup(state)}
      </section>
    </main>
  `;
}

function createStore(initialState) {
  let state = initialState;
  const subscribers = new Set();

  return {
    getState() {
      return state;
    },
    setState(updater) {
      const nextState = typeof updater === "function" ? updater(state) : updater;
      state = nextState;
      saveLayoutState(state.layout);
      saveWorkspaceUiState(state);
      for (const subscriber of subscribers) {
        subscriber(state);
      }
    },
    subscribe(subscriber) {
      subscribers.add(subscriber);
      return () => subscribers.delete(subscriber);
    }
  };
}

function normalizeItems(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }
  return payload?.items ?? [];
}

function pushBanner(store, banner) {
  store.setState((state) => ({
    ...state,
    banners: [
      banner,
      ...state.banners.filter((item) => !(
        item.tone === banner.tone
        && item.title === banner.title
        && item.message === banner.message
      ))
    ].slice(0, 4)
  }));
}

function matchesPathRule(pathname, pathRules = []) {
  const rules = Array.isArray(pathRules) && pathRules.length ? pathRules : ["/"];
  return rules.some((rule) => {
    const normalizedRule = String(rule ?? "/").trim() || "/";
    if (normalizedRule === "/") {
      return true;
    }
    const compactRule = normalizedRule.replace(/\/+$/u, "");
    return pathname === normalizedRule || pathname === compactRule || pathname.startsWith(`${compactRule}/`);
  });
}

function findMatchingSiteForUrl(targetUrl, sites = []) {
  let parsedUrl;
  try {
    parsedUrl = new URL(String(targetUrl ?? "").trim());
  } catch {
    return null;
  }

  const hostname = parsedUrl.hostname.toLowerCase();
  const pathname = parsedUrl.pathname || "/";

  return sites.find((site) => {
    const baseDomains = Array.isArray(site.baseDomains) ? site.baseDomains : [];
    const domainMatches = baseDomains.some((domain) => {
      const normalizedDomain = String(domain ?? "").trim().toLowerCase();
      return normalizedDomain && (hostname === normalizedDomain || hostname.endsWith(`.${normalizedDomain}`));
    });
    return domainMatches && matchesPathRule(pathname, site.pathRules);
  }) ?? null;
}

function isLegacyDemoSite(site) {
  const baseDomains = Array.isArray(site?.baseDomains) ? site.baseDomains : [];
  return (
    site?.siteId === "site_demo"
    || site?.displayName === "OpenSky Demo"
    || baseDomains.some((domain) => String(domain ?? "").trim().toLowerCase() === "demo.opensky.local")
  );
}

function getTranslator(store) {
  return createTranslator(store.getState().locale);
}

async function ensureDemoAutoReady(store) {
  const state = store.getState();
  if (state.activeTabId || state.tabs.length) {
    return;
  }

  const demoProject = state.projects.find((project) => project.projectId === "project_demo") ?? null;
  const demoSite = state.sites.find((site) => site.siteId === "site_demo_example") ?? null;
  const verifiedEntryUrl = state.serviceInfo?.demoPreset?.verifiedEntryUrl ?? "https://example.com/";

  if (!demoProject || !demoSite) {
    return;
  }

  await browseOpen({
    projectId: demoProject.projectId,
    siteId: demoSite.siteId,
    entryUrl: verifiedEntryUrl
  });

  await refreshWorkspaceData(store, demoProject.projectId);
  store.setState((currentState) => ({
    ...currentState,
    activeProjectId: demoProject.projectId,
    activeSiteId: demoSite.siteId,
    currentUrl: verifiedEntryUrl
  }));
}

function createServiceInfoMarkup(state) {
  const t = createTranslator(state.locale);

  if (state.serviceStatus === "ready" && state.serviceInfo) {
    return `
      <section class="service-status-card service-status-card--ready">
        <p class="eyebrow">${t("service.eyebrow")}</p>
        <strong>${t("service.readyTitle")}</strong>
        <p>${t("service.readyMessage", {
          environment: state.serviceInfo.environment,
          persistence: state.serviceInfo.persistenceMode
        })}</p>
      </section>
    `;
  }

  if (state.serviceStatus === "unavailable") {
    return `
      <section class="service-status-card service-status-card--warning">
        <p class="eyebrow">${t("service.eyebrow")}</p>
        <strong>${t("service.unavailableTitle")}</strong>
        <p>${t("service.unavailableMessage")}</p>
      </section>
    `;
  }

  return `
    <section class="service-status-card service-status-card--loading">
      <p class="eyebrow">${t("service.eyebrow")}</p>
      <strong>${t("service.loadingTitle")}</strong>
      <p>${t("service.loadingMessage")}</p>
    </section>
  `;
}

function setLocaleOnDocument(documentRef, locale) {
  const root = documentRef?.documentElement ?? documentRef?.querySelector?.("html");
  if (root) {
    root.lang = locale;
  }
}

function rewriteCssUrls(cssText, baseUrl, tabId) {
  return String(cssText ?? "")
    .replace(/url\(([^)]+)\)/giu, (_, value) => {
      const trimmedValue = String(value ?? "").trim().replace(/^['"]|['"]$/gu, "");
      if (!trimmedValue || trimmedValue.startsWith("data:") || trimmedValue.startsWith("javascript:")) {
        return `url("${trimmedValue}")`;
      }

      try {
        return `url("${createBrowseResourceUrl(tabId, new URL(trimmedValue, baseUrl).href)}")`;
      } catch {
        return `url("${trimmedValue}")`;
      }
    })
    .replace(/@import\s+(?:url\()?["']?([^"')\s]+)["']?\)?/giu, (_, value) => {
      try {
        return `@import url("${createBrowseResourceUrl(tabId, new URL(value, baseUrl).href)}")`;
      } catch {
        return `@import url("${value}")`;
      }
    });
}

function sanitizeRelayedDocument(activeDocument) {
  const { documentHtml, finalUrl, requestedUrl, tabId } = activeDocument ?? {};
  const baseUrl = finalUrl ?? requestedUrl ?? "";
  if (typeof DOMParser === "undefined") {
    return {
      html: `<pre class="content-stage__relay-text">${escapeHtml(documentHtml)}</pre>`,
      strippedScripts: 0
    };
  }

  const parser = new DOMParser();
  const parsed = parser.parseFromString(String(documentHtml ?? ""), "text/html");
  let strippedScripts = 0;

  parsed.querySelectorAll("script").forEach((node) => {
    strippedScripts += 1;
    node.remove();
  });

  parsed.querySelectorAll("iframe, frame, object, embed, form, input, button, textarea, select, base, meta[http-equiv]").forEach((node) => {
    node.remove();
  });

  parsed.querySelectorAll("style").forEach((node) => {
    node.textContent = rewriteCssUrls(node.textContent ?? "", baseUrl, tabId);
  });

  parsed.querySelectorAll("*").forEach((element) => {
    const tagName = element.tagName.toLowerCase();
    for (const attribute of [...element.attributes]) {
      const name = attribute.name.toLowerCase();
      const value = attribute.value;

      if (name.startsWith("on")) {
        element.removeAttribute(attribute.name);
        continue;
      }

      if (name === "src" || name === "href") {
        if (/^\s*javascript:/iu.test(value)) {
          element.removeAttribute(attribute.name);
          continue;
        }

        try {
          const absoluteUrl = new URL(value, baseUrl).href;
          if (tagName === "a" && name === "href") {
            element.setAttribute("data-proxy-href", absoluteUrl);
            element.setAttribute(attribute.name, absoluteUrl);
            continue;
          }

          if (tagName === "link" && name === "href") {
            const rel = String(element.getAttribute("rel") ?? "").toLowerCase();
            if (rel.includes("stylesheet") || rel.includes("icon") || rel.includes("preload")) {
              element.setAttribute(attribute.name, createBrowseResourceUrl(tabId, absoluteUrl));
              continue;
            }
          }

          if (name === "src") {
            element.setAttribute(attribute.name, createBrowseResourceUrl(tabId, absoluteUrl));
            continue;
          }

          element.setAttribute(attribute.name, absoluteUrl);
        } catch {
          element.removeAttribute(attribute.name);
        }
      }

      if (name === "srcset") {
        const rewrittenSrcSet = value
          .split(",")
          .map((entry) => {
            const [candidateUrl, descriptor] = entry.trim().split(/\s+/, 2);
            if (!candidateUrl) {
              return "";
            }

            try {
              const absoluteUrl = new URL(candidateUrl, baseUrl).href;
              const proxiedUrl = createBrowseResourceUrl(tabId, absoluteUrl);
              return descriptor ? `${proxiedUrl} ${descriptor}` : proxiedUrl;
            } catch {
              return entry.trim();
            }
          })
          .filter(Boolean)
          .join(", ");

        if (rewrittenSrcSet) {
          element.setAttribute(attribute.name, rewrittenSrcSet);
        } else {
          element.removeAttribute(attribute.name);
        }
      }
    }

    if (tagName === "a" && element.hasAttribute("data-proxy-href")) {
      element.setAttribute("target", "_self");
      element.setAttribute("rel", "nofollow");
    }
  });

  const body = parsed.body ?? parsed.documentElement;
  return {
    html: body.innerHTML,
    strippedScripts
  };
}

function hydrateRelayedDocument(documentRef, activeDocument) {
  const mountNode = documentRef?.querySelector?.("[data-relay-document]");
  const noteNode = documentRef?.querySelector?.("[data-relay-note]");
  if (!mountNode) {
    return;
  }

  if (!activeDocument?.documentHtml) {
    mountNode.innerHTML = "";
    if (noteNode) {
      noteNode.textContent = "";
    }
    return;
  }

  const sanitized = sanitizeRelayedDocument(activeDocument);
  mountNode.innerHTML = sanitized.html;
  if (noteNode) {
    const t = createTranslator(documentRef?.documentElement?.lang ?? "en");
    if (Array.isArray(activeDocument?.unsupportedHosts) && activeDocument.unsupportedHosts.length) {
      noteNode.textContent = t("workspace.proxyAdditionalDomains", {
        domains: activeDocument.unsupportedHosts.join(", ")
      });
    } else {
      noteNode.textContent = sanitized.strippedScripts > 0
        ? t("workspace.proxyScriptsDisabled")
        : t("workspace.proxyResourceMode");
    }
  }
}

function dismissBanner(store, id) {
  store.setState((state) => ({
    ...state,
    banners: state.banners.filter((banner) => banner.id !== id)
  }));
}

async function openUrlInWorkspace(store, rawUrl, mode = "auto") {
  const targetUrl = String(rawUrl ?? "").trim();
  const t = getTranslator(store);
  const state = store.getState();

  if (!targetUrl) {
    pushBanner(store, {
      id: crypto.randomUUID(),
      tone: "warning",
      title: t("banner.missingWorkspaceContext"),
      message: t("banner.missingUrlOnly")
    });
    return;
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(targetUrl);
  } catch {
    pushBanner(store, {
      id: crypto.randomUUID(),
      tone: "danger",
      title: t("banner.invalidUrlTitle"),
      message: t("banner.invalidUrlMessage")
    });
    return;
  }

  const matchedSite = findMatchingSiteForUrl(parsedUrl.href, state.sites);
  if (!matchedSite) {
    pushBanner(store, {
      id: crypto.randomUUID(),
      tone: "warning",
      title: t("banner.urlNotConfiguredTitle"),
      message: t("banner.urlNotConfiguredMessage", {
        host: parsedUrl.hostname
      })
    });
    return;
  }

  const projectId = state.activeProjectId ?? state.projects[0]?.projectId ?? null;
  if (!projectId) {
    pushBanner(store, {
      id: crypto.randomUUID(),
      tone: "warning",
      title: t("banner.missingWorkspaceContext"),
      message: t("banner.missingProjectOnly")
    });
    return;
  }

  const shouldNavigate = (mode === "navigate" || mode === "auto") && Boolean(state.activeTabId) && state.activeSiteId === matchedSite.siteId;

  if (shouldNavigate) {
    await browseNavigate({
      projectId,
      tabId: state.activeTabId,
      nextUrl: parsedUrl.href
    });
  } else {
    await browseOpen({
      projectId,
      siteId: matchedSite.siteId,
      entryUrl: parsedUrl.href
    });
  }

  await refreshWorkspaceData(store, projectId);
  store.setState((currentState) => ({
    ...currentState,
    settingsTrayOpen: false,
    activeProjectId: projectId,
    activeSiteId: matchedSite.siteId,
    currentUrl: parsedUrl.href,
    statusMessage: shouldNavigate ? t("status.tabNavigated") : t("status.controlledTabOpened")
  }));
}

async function persistLayoutPreference(store) {
  const state = store.getState();
  if (state.sessionStatus !== "signed_in") {
    return;
  }

  const payload = toLayoutPreferencePayload(state.layout, state.activeProjectId);
  await saveLayoutPreference(payload, state.activeLayoutPreferenceId)
    .then((response) => {
      if (response?.layoutPreferenceId) {
        store.setState((currentState) => ({
          ...currentState,
          activeLayoutPreferenceId: response.layoutPreferenceId
        }));
      }
    })
    .catch((error) => {
      logFrontendIssue("persist-layout-preference", error, {
        activeProjectId: state.activeProjectId,
        layoutPreferenceId: state.activeLayoutPreferenceId
      });
      return undefined;
    });
}

async function refreshWorkspaceData(store, projectId = null) {
  const previousState = store.getState();
  const [sitesPayload, projectsPayload, vaultPayload, auditPayload] = await Promise.all([
    fetchSites().catch(() => ({ items: [] })),
    fetchProjects().catch(() => ({ items: [] })),
    fetchSessionVault().catch(() => ({ items: [] })),
    fetchAuditLog().catch(() => ({ items: [] }))
  ]);

  const sites = normalizeItems(sitesPayload).filter((site) => !isLegacyDemoSite(site));
  const projects = normalizeItems(projectsPayload);
  const vaultItems = normalizeItems(vaultPayload);
  const auditItems = normalizeItems(auditPayload);
  const storedProjectId = projects.some((item) => item.projectId === previousState.activeProjectId)
    ? previousState.activeProjectId
    : null;
  const activeProjectId = projectId
    ?? storedProjectId
    ?? projects.find((item) => item.projectId === "project_demo")?.projectId
    ?? projects[0]?.projectId
    ?? null;
  const activeProject = projects.find((item) => item.projectId === activeProjectId) ?? null;
  const storedSiteId = sites.some((item) => item.siteId === previousState.activeSiteId)
    ? previousState.activeSiteId
    : null;
  const activeSiteId = storedSiteId
    ?? activeProject?.defaultSiteId
    ?? sites.find((item) => item.siteId === "site_demo_example")?.siteId
    ?? sites[0]?.siteId
    ?? null;
  const [tabsPayload, bookmarksPayload, notesPayload] = activeProjectId
    ? await Promise.all([
        fetchTabs(activeProjectId).catch(() => ({ items: [] })),
        fetchBookmarks(activeProjectId).catch(() => ({ items: [] })),
        fetchNotes(activeProjectId).catch(() => ({ items: [] }))
      ])
    : [{ items: [] }, { items: [] }, { items: [] }];
  const tabs = normalizeItems(tabsPayload).filter((tab) => !["closed", "deleted"].includes(String(tab?.status ?? "")));
  const bookmarks = normalizeItems(bookmarksPayload);
  const notes = normalizeItems(notesPayload);
  const resolvedLayout = await fetchLayoutPreference(activeProjectId ?? undefined).catch(() => null);
  const activeLayoutPreferenceId = resolvedLayout?.resolvedPreference?.layoutPreferenceId ?? null;
  const nextActiveTab = tabs.find((tab) => tab.tabId === previousState.activeTabId) ?? tabs[0] ?? null;
  let activeDocument = null;
  const syncedTabs = [...tabs];

    if (nextActiveTab) {
      try {
        activeDocument = await fetchBrowseContent(nextActiveTab.tabId);
      if (Array.isArray(activeDocument?.unsupportedHosts) && activeDocument.unsupportedHosts.length) {
        console.log("OpenSky proxy warning", {
          scope: "browse-content",
          activeProjectId,
          activeTabId: nextActiveTab.tabId,
          unsupportedHosts: activeDocument.unsupportedHosts
        });
      }
      const activeIndex = syncedTabs.findIndex((tab) => tab.tabId === nextActiveTab.tabId);
      if (activeIndex >= 0) {
        syncedTabs[activeIndex] = {
          ...syncedTabs[activeIndex],
          currentUrl: activeDocument.finalUrl ?? syncedTabs[activeIndex].currentUrl,
          pageTitle: activeDocument.pageTitle ?? syncedTabs[activeIndex].pageTitle
        };
      }
    } catch (error) {
      logFrontendIssue("browse-content", error, {
        activeProjectId,
        activeTabId: nextActiveTab.tabId
      });
      const displayError = describeUiError(error, store.getState().locale);
      pushBanner(store, {
        id: crypto.randomUUID(),
        tone: "warning",
        title: displayError.title,
        message: displayError.message
      });
        activeDocument = {
          tabId: nextActiveTab.tabId,
          requestedUrl: nextActiveTab.currentUrl,
          finalUrl: nextActiveTab.currentUrl,
          pageTitle: nextActiveTab.pageTitle,
          contentType: "text/plain",
          documentHtml: "",
          renderMode: "allowlist-proxy-phase1",
          errorMessage: displayError.message
        };
      }
  }

  store.setState((state) => ({
    ...state,
    sites,
    projects,
    bookmarks,
    notes,
    vaultItems,
    auditItems,
    tabs: syncedTabs,
    activeProjectId,
    activeSiteId,
    activeTabId: nextActiveTab?.tabId ?? null,
    currentUrl: activeDocument?.finalUrl ?? nextActiveTab?.currentUrl ?? state.currentUrl,
    activeLayoutPreferenceId,
    layout: resolvedLayout?.resolvedPreference ? mergeLayoutState(state.layout, resolvedLayout.resolvedPreference) : state.layout,
    activeDocument
  }));
}

function renderApp(state) {
  if (state.sessionStatus === "signed_in") {
    if (state.workspaceStatus === "loading") {
      return createWorkspaceBootMarkup(state);
    }

    return createWorkspaceShellMarkup({
      locale: state.locale,
      layout: state.layout,
      session: state.session,
      statusMessage: state.statusMessage,
      bannerMarkup: createBannerMarkup(state.banners.slice(0, 1), state.locale),
      workspace: {
        sites: state.sites,
        projects: state.projects,
        tabs: state.tabs,
        bookmarks: state.bookmarks,
        notes: state.notes,
        vaultItems: state.vaultItems,
        auditItems: state.auditItems,
        sessionVault: state.vaultItems,
        audit: state.auditItems,
        activeProjectId: state.activeProjectId,
        activeSiteId: state.activeSiteId,
        activeTabId: state.activeTabId,
        activeTab: state.tabs.find((tab) => tab.tabId === state.activeTabId) ?? null,
        activeProject: state.projects.find((project) => project.projectId === state.activeProjectId) ?? null,
        activeSite: state.sites.find((site) => site.siteId === state.activeSiteId) ?? null,
        currentUrl: state.currentUrl,
        transferItemId: state.transferItemId,
        lastTransfer: state.lastTransfer,
        statusMessage: state.statusMessage,
        activeDocument: state.activeDocument,
        serviceInfo: state.serviceInfo,
        serviceStatus: state.serviceStatus,
        settingsTrayOpen: state.settingsTrayOpen,
        settingsMenuOpen: state.settingsMenuOpen
      }
    });
  }

  return createSignInMarkup({
    locale: state.locale,
    bannerMarkup: createBannerMarkup(state.banners, state.locale),
    statusMessage: state.statusMessage,
    loading: state.sessionStatus === "loading",
    serviceInfoMarkup: createServiceInfoMarkup(state)
  });
}

async function refreshServiceInfo(store) {
  try {
    const serviceInfo = await fetchServiceInfo();
    store.setState((state) => ({
      ...state,
      serviceStatus: "ready",
      serviceInfo
    }));
  } catch (error) {
    logFrontendIssue("service-info", error);
    store.setState((state) => ({
      ...state,
      serviceStatus: "unavailable",
      serviceInfo: null
    }));
  }
}

async function refreshSession(store) {
  const t = getTranslator(store);
  try {
    const session = await fetchSession();
    if (!session?.signedIn) {
      store.setState((state) => ({
        ...state,
        sessionStatus: "signed_out",
        workspaceStatus: "idle",
        settingsTrayOpen: false,
        settingsMenuOpen: false,
        session: null,
        statusMessage: t("status.signInToOpen")
      }));
      return;
    }

    store.setState((state) => ({
      ...state,
      sessionStatus: "signed_in",
      workspaceStatus: "loading",
      settingsTrayOpen: false,
      settingsMenuOpen: false,
      session,
      statusMessage: t("service.loadingMessage")
    }));
    await refreshWorkspaceData(store);
    await ensureDemoAutoReady(store);
    store.setState((state) => ({
      ...state,
      workspaceStatus: "ready",
      statusMessage: t("status.workspaceRestored")
    }));
  } catch (error) {
    logFrontendIssue("refresh-session", error);
    const errorCode = error?.payload?.code;
    if (errorCode === "AUTH_REQUIRED") {
      store.setState((state) => ({
        ...state,
        sessionStatus: "signed_out",
        workspaceStatus: "idle",
        settingsTrayOpen: false,
        settingsMenuOpen: false,
        session: null,
        statusMessage: t("status.signInToOpen")
      }));
      return;
    }

    const displayError = describeUiError(error, store.getState().locale);
    pushBanner(store, {
      id: crypto.randomUUID(),
      tone: "warning",
      title: t("banner.backendUnavailableTitle"),
      message: displayError.message
    });
    store.setState((state) => ({
      ...state,
      sessionStatus: "signed_out",
      workspaceStatus: "idle",
      settingsTrayOpen: false,
      settingsMenuOpen: false,
      session: null,
      statusMessage: t("status.backendUnavailable")
    }));
  }
}

async function handleSignInSubmit(store, formElement) {
  const t = getTranslator(store);
  const formData = new FormData(formElement);
  const username = String(formData.get("username") ?? "");
  const password = String(formData.get("password") ?? "");

  store.setState((state) => ({
    ...state,
    sessionStatus: "loading",
    workspaceStatus: "idle",
    statusMessage: t("status.signingIn")
  }));

  try {
    const session = await submitSignIn({ username, password });
    store.setState((state) => ({
      ...state,
      sessionStatus: "signed_in",
      workspaceStatus: "loading",
      settingsTrayOpen: false,
      settingsMenuOpen: false,
      session,
      statusMessage: t("service.loadingMessage")
    }));
    await refreshWorkspaceData(store);
    await ensureDemoAutoReady(store);
    store.setState((state) => ({
      ...state,
      workspaceStatus: "ready",
      statusMessage: t("status.signedIn")
    }));
  } catch (error) {
    logFrontendIssue("sign-in", error, { username });
    const displayError = describeUiError(error, store.getState().locale);
    pushBanner(store, {
      id: crypto.randomUUID(),
      tone: "danger",
      title: t("banner.signInFailedTitle"),
      message: displayError.message
    });
    store.setState((state) => ({
      ...state,
      sessionStatus: "signed_out",
      workspaceStatus: "idle",
      settingsTrayOpen: false,
      settingsMenuOpen: false,
      session: null,
      statusMessage: t("status.signInToContinue")
    }));
  }
}

async function handleAction(store, action, targetElement, documentRef) {
  const t = getTranslator(store);
  try {
    if (action !== "toggle-settings-menu" && store.getState().settingsMenuOpen) {
      store.setState((state) => ({
        ...state,
        settingsMenuOpen: false
      }));
    }

    if (action === "dismiss-banner") {
      dismissBanner(store, targetElement.dataset.bannerId);
      return;
    }

    if (action === "set-locale") {
      const nextLocale = saveLocale(targetElement.dataset.locale ?? store.getState().locale);
      store.setState((state) => ({
        ...state,
        locale: nextLocale
      }));
      setLocaleOnDocument(documentRef, nextLocale);
      return;
    }

    if (action === "toggle-settings-menu") {
      store.setState((state) => ({
        ...state,
        settingsMenuOpen: !state.settingsMenuOpen
      }));
      return;
    }

    if (action === "open-settings-page") {
      store.setState((state) => ({
        ...state,
        settingsTrayOpen: true,
        settingsMenuOpen: false,
        statusMessage: t("status.workspaceOverview")
      }));
      return;
    }

    if (action === "close-settings-page") {
      store.setState((state) => ({
        ...state,
        settingsTrayOpen: false,
        settingsMenuOpen: false
      }));
      return;
    }

    if (action === "toggle-settings-tray") {
      store.setState((state) => ({
        ...state,
        settingsTrayOpen: !state.settingsTrayOpen,
        settingsMenuOpen: false
      }));
      return;
    }

    if (action === "sign-out") {
      await submitSignOut();
      store.setState((state) => ({
        ...state,
        sessionStatus: "signed_out",
        workspaceStatus: "idle",
        settingsTrayOpen: false,
        settingsMenuOpen: false,
        session: null,
        sites: [],
        projects: [],
        tabs: [],
        bookmarks: [],
        notes: [],
        vaultItems: [],
        auditItems: [],
        activeProjectId: null,
        activeSiteId: null,
        activeTabId: null,
        currentUrl: "",
        transferItemId: null,
        activeLayoutPreferenceId: null,
        lastTransfer: null,
        activeDocument: null,
        statusMessage: t("status.signedOut")
      }));
      clearWorkspaceUiState();
      return;
    }

    if (action === "toggle-focus") {
      store.setState((state) => ({
        ...state,
        layout: toggleFocusMode(state.layout)
      }));
      await persistLayoutPreference(store);
      return;
    }

    if (action === "toggle-left-panel" || action === "toggle-right-panel") {
      const panelKey = action === "toggle-left-panel" ? "leftPanelState" : "rightPanelState";
      store.setState((state) => ({
        ...state,
        layout: toggleSidePanel(state.layout, panelKey)
      }));
      await persistLayoutPreference(store);
      return;
    }

    if (action === "toggle-top-bar" || action === "toggle-bottom-bar") {
      const panelKey = action === "toggle-top-bar" ? "topBarState" : "bottomBarState";
      store.setState((state) => ({
        ...state,
        layout: toggleBarState(state.layout, panelKey)
      }));
      await persistLayoutPreference(store);
      return;
    }

    if (action === "set-view-mode") {
      const nextViewMode = targetElement.dataset.viewMode;
      store.setState((state) => ({
        ...state,
        layout: reduceLayoutState(state.layout, {
          type: "set-view-mode",
          viewMode: nextViewMode
        })
      }));
      await persistLayoutPreference(store);
      return;
    }

    if (action === "maximize-workspace") {
      store.setState((state) => ({
        ...state,
        layout: reduceLayoutState(state.layout, {
          type: "set-view-mode",
          viewMode: "maximized"
        })
      }));
      await persistLayoutPreference(store);
      return;
    }

    if (action === "enter-fullscreen") {
      const fullscreenTarget = documentRef.getElementById("app")
        ?? documentRef.getElementById("content-stage");
      const result = await requestFullscreenWithFallback({
        documentRef,
        targetElement: fullscreenTarget,
        layout: store.getState().layout,
        locale: store.getState().locale
      });

      store.setState((state) => ({
        ...state,
        layout: result.layout
      }));

      if (result.banner) {
        pushBanner(store, result.banner);
      }
      await persistLayoutPreference(store);
      return;
    }

    if (action === "exit-fullscreen") {
      try {
        await documentRef?.exitFullscreen?.();
      } catch (error) {
        logFrontendIssue("exit-fullscreen", error);
      }

      store.setState((state) => ({
        ...state,
        layout: reduceLayoutState(state.layout, {
          type: "set-view-mode",
          viewMode: "maximized"
        })
      }));
      await persistLayoutPreference(store);
      return;
    }

    if (action === "select-project") {
      await refreshWorkspaceData(store, targetElement.dataset.projectId);
      return;
    }

    if (action === "select-site") {
      store.setState((state) => ({
        ...state,
        activeSiteId: targetElement.dataset.siteId
      }));
      return;
    }

    if (action === "edit-site") {
      const state = store.getState();
      const siteId = targetElement.dataset.siteId;
      const site = state.sites.find((item) => item.siteId === siteId);
      if (!site) {
        return;
      }

      const isZh = String(state.locale).startsWith("zh");
      const displayName = globalThis.prompt?.(
        isZh ? "網站名稱" : "Site name",
        site.displayName ?? ""
      );
      if (displayName == null) {
        return;
      }

      const baseDomain = globalThis.prompt?.(
        isZh ? "白名單網域（用逗號分隔）" : "Allowlisted base domains (comma separated)",
        Array.isArray(site.baseDomains) ? site.baseDomains.join(", ") : ""
      );
      if (baseDomain == null) {
        return;
      }

      const pathRule = globalThis.prompt?.(
        isZh ? "路徑規則（例如 / 或 /team）" : "Path rule (for example / or /team)",
        Array.isArray(site.pathRules) ? (site.pathRules[0] ?? "/") : "/"
      );
      if (pathRule == null) {
        return;
      }

      const normalizedSite = normalizeSiteDraft({
        displayName,
        baseDomain,
        pathRule
      });

      await updateSite(siteId, normalizedSite.payload);
      await refreshWorkspaceData(store, state.activeProjectId);
      store.setState((currentState) => ({
        ...currentState,
        activeSiteId: siteId
      }));
      return;
    }

    if (action === "delete-site") {
      const state = store.getState();
      const siteId = targetElement.dataset.siteId;
      const site = state.sites.find((item) => item.siteId === siteId);
      if (!site) {
        return;
      }

      const isZh = String(state.locale).startsWith("zh");
      const confirmed = globalThis.confirm
        ? globalThis.confirm(isZh ? `刪除網站「${site.displayName}」？` : `Delete site "${site.displayName}"?`)
        : true;
      if (!confirmed) {
        return;
      }

      await deleteSite(siteId);
      await refreshWorkspaceData(store, state.activeProjectId);
      return;
    }

    if (action === "select-tab") {
      store.setState((state) => {
        const activeTab = state.tabs.find((tab) => tab.tabId === targetElement.dataset.tabId);
        return {
          ...state,
          settingsTrayOpen: false,
          activeTabId: targetElement.dataset.tabId,
          currentUrl: activeTab?.currentUrl ?? state.currentUrl
        };
      });
      return;
    }

    if (action === "open-site") {
      const state = store.getState();
      const siteId = targetElement.dataset.siteId ?? state.activeSiteId;
      const projectId = state.activeProjectId;
      const site = state.sites.find((item) => item.siteId === siteId);

      if (!projectId || !site) {
        pushBanner(store, {
          id: crypto.randomUUID(),
          tone: "warning",
          title: t("banner.missingWorkspaceContext"),
          message: t("banner.missingProjectAndSite")
        });
        return;
      }

      const pathRule = site.pathRules?.[0] ?? "/";
      const entryUrl = `https://${site.baseDomains?.[0] ?? ""}${pathRule}`;
      await browseOpen({
        projectId,
        siteId: site.siteId,
        entryUrl
      });

      await refreshWorkspaceData(store, projectId);
      store.setState((currentState) => ({
        ...currentState,
        settingsTrayOpen: false,
        activeSiteId: site.siteId,
        currentUrl: entryUrl,
        statusMessage: t("status.controlledTabOpened")
      }));
      return;
    }

    if (action === "open-demo-url") {
      await openUrlInWorkspace(store, String(targetElement.dataset.url ?? ""), "open");
      return;
    }

    if (action === "refresh-workspace") {
      await refreshWorkspaceData(store);
      return;
    }

    if (action === "back-to-workspace") {
      store.setState((state) => ({
        ...state,
        settingsTrayOpen: false,
        activeTabId: null,
        currentUrl: "",
        activeDocument: null,
        statusMessage: t("status.workspaceOverview")
      }));
      return;
    }

    if (action === "browse-open" || action === "browse-navigate") {
      const currentUrl = String(documentRef.querySelector("[data-url-input]")?.value ?? "").trim();
      await openUrlInWorkspace(store, currentUrl, action === "browse-navigate" ? "navigate" : "open");
      return;
    }

    if (action === "browse-close" || action === "close-tab") {
      const { activeProjectId, activeTabId } = store.getState();
      const tabId = targetElement.dataset.tabId ?? activeTabId;
      if (!activeProjectId || !tabId) {
        return;
      }
      await browseClose({ tabId });
      await refreshWorkspaceData(store, activeProjectId);
      store.setState((state) => ({
        ...state,
        statusMessage: t("status.controlledTabClosed")
      }));
      return;
    }

    if (action === "create-transfer") {
      const { activeProjectId, activeSiteId } = store.getState();
      if (!activeProjectId || !activeSiteId) {
        return;
      }
      const payload = await createTransfer({
        projectId: activeProjectId,
        siteId: activeSiteId,
        direction: "upload",
        originalName: "demo.txt",
        mimeType: "text/plain",
        sizeBytes: 24,
        previewContent: "OpenSky demo transfer payload"
      });
      const item = payload.item ?? payload;
      store.setState((state) => ({
        ...state,
        transferItemId: item.itemId,
        lastTransfer: item,
        statusMessage: t("status.transferCreated")
      }));
      return;
    }

    if (action === "create-vault") {
      const { activeProjectId, activeSiteId } = store.getState();
      if (!activeSiteId) {
        return;
      }
      await createSessionVault({
        siteId: activeSiteId,
        projectId: activeProjectId,
        persistenceScope: activeProjectId ? "project" : "site",
        secretType: "token",
        rememberUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      });
      await refreshWorkspaceData(store, activeProjectId);
      return;
    }

    if (action === "revoke-vault") {
      await updateSessionVault(targetElement.dataset.vaultId, { status: "revoked" });
      await refreshWorkspaceData(store, store.getState().activeProjectId);
      return;
    }

    if (action === "preview-transfer" || action === "approve-transfer" || action === "complete-transfer") {
      const itemId = targetElement.dataset.itemId ?? store.getState().transferItemId;
      if (!itemId) {
        return;
      }

      let lastTransfer = null;
      if (action === "preview-transfer") {
        const response = await previewTransfer(itemId);
        lastTransfer = response.item ?? null;
      } else if (action === "approve-transfer") {
        lastTransfer = await approveTransfer(itemId);
      } else {
        lastTransfer = await completeTransfer(itemId);
      }

      store.setState((state) => ({
        ...state,
        lastTransfer: lastTransfer ?? state.lastTransfer,
        statusMessage: action === "preview-transfer"
          ? t("status.previewCompleted")
          : action === "approve-transfer"
            ? t("status.transferApproved")
            : t("status.transferCompleted")
      }));
      return;
    }
  } catch (error) {
    logFrontendIssue(`action:${action}`, error, {
      activeProjectId: store.getState().activeProjectId,
      activeSiteId: store.getState().activeSiteId,
      activeTabId: store.getState().activeTabId
    });
    const displayError = describeUiError(error, store.getState().locale);
    pushBanner(store, {
      id: crypto.randomUUID(),
      tone: "danger",
      title: displayError.title,
      message: displayError.message
    });
  }
}

async function handleProxyDocumentClick(store, anchorElement) {
  const nextUrl = String(anchorElement?.dataset?.proxyHref ?? "").trim();
  const { activeProjectId, activeTabId } = store.getState();
  const t = getTranslator(store);

  if (!nextUrl || !activeProjectId || !activeTabId) {
    return;
  }

  try {
    await browseNavigate({
      projectId: activeProjectId,
      tabId: activeTabId,
      nextUrl
    });
    await refreshWorkspaceData(store, activeProjectId);
    store.setState((state) => ({
      ...state,
      currentUrl: nextUrl,
      statusMessage: t("status.tabNavigated")
    }));
  } catch (error) {
    logFrontendIssue("proxy-document-click", error, {
      activeProjectId,
      activeTabId,
      nextUrl
    });
    const displayError = describeUiError(error, store.getState().locale);
    pushBanner(store, {
      id: crypto.randomUUID(),
      tone: "danger",
      title: displayError.title,
      message: displayError.message
    });
  }
}

export function bootApplication(documentRef = globalThis.document) {
  const mountNode = documentRef?.getElementById?.("app");
  if (!mountNode) {
    return;
  }

  const store = createStore(createInitialState());

  function render() {
    setLocaleOnDocument(documentRef, store.getState().locale);
    mountNode.innerHTML = renderApp(store.getState());
    hydrateRelayedDocument(documentRef, store.getState().activeDocument);
  }

  store.subscribe(render);
  render();
  refreshServiceInfo(store);
  refreshSession(store);

  mountNode.addEventListener("submit", async (event) => {
    const form = event.target.closest("[data-sign-in-form]");
    if (form) {
      event.preventDefault();
      await handleSignInSubmit(store, form);
      return;
    }

    const workspaceForm = event.target.closest("[data-form]");
    if (!workspaceForm) {
      return;
    }

    event.preventDefault();
    const formData = new FormData(workspaceForm);
    const state = store.getState();
    let nextProjectId = state.activeProjectId;
    let nextSiteId = state.activeSiteId;

    try {
      if (workspaceForm.dataset.form === "create-site") {
        const normalizedSite = normalizeSiteDraft({
          displayName: formData.get("displayName"),
          baseDomain: formData.get("baseDomain"),
          pathRule: formData.get("pathRule")
        });
        const createdSite = await createSite({
          ...normalizedSite.payload,
          loginPersistenceAllowed: true,
          uploadAllowed: true,
          downloadAllowed: true
        });
        nextSiteId = createdSite.siteId ?? nextSiteId;
        if (normalizedSite.normalizedFromUrl) {
          pushBanner(store, {
            id: crypto.randomUUID(),
            tone: "warning",
            title: t("workspace.siteInputNormalizedTitle"),
            message: t("workspace.siteInputNormalizedMessage", {
              domain: normalizedSite.normalizedBaseDomains.join(", "),
              path: normalizedSite.normalizedPathRule
            })
          });
        }
      }

      if (workspaceForm.dataset.form === "create-project") {
        const createdProject = await createProject({
          name: String(formData.get("name") ?? ""),
          description: String(formData.get("description") ?? ""),
          defaultSiteId: state.activeSiteId
        });
        nextProjectId = createdProject.projectId ?? nextProjectId;
      }

      if (workspaceForm.dataset.form === "create-bookmark" && state.activeSiteId) {
        await createBookmark({
          projectId: state.activeProjectId,
          siteId: state.activeSiteId,
          title: String(formData.get("title") ?? ""),
          url: String(formData.get("url") ?? ""),
          note: String(formData.get("note") ?? "")
        });
      }

      if (workspaceForm.dataset.form === "create-note" && state.activeProjectId) {
        await createNote({
          projectId: state.activeProjectId,
          relatedTabId: state.activeTabId,
          title: String(formData.get("title") ?? ""),
          content: String(formData.get("content") ?? "")
        });
      }

      if (workspaceForm.dataset.form === "create-transfer" && state.activeProjectId && state.activeSiteId) {
        const transfer = await createTransfer({
          projectId: state.activeProjectId,
          siteId: state.activeSiteId,
          direction: "upload",
          originalName: String(formData.get("originalName") ?? ""),
          mimeType: String(formData.get("mimeType") ?? ""),
          sizeBytes: String(formData.get("previewContent") ?? "").length,
          previewContent: String(formData.get("previewContent") ?? "")
        });
        const item = transfer.item ?? transfer;
        store.setState((currentState) => ({
          ...currentState,
          transferItemId: item.itemId,
          lastTransfer: item
        }));
      }

      if (workspaceForm.dataset.form === "quick-open") {
        await openUrlInWorkspace(store, String(formData.get("targetUrl") ?? ""), "auto");
        return;
      }

      if (workspaceForm.dataset.form === "navigate-tab" && state.activeProjectId && state.activeTabId) {
        const nextUrl = String(formData.get("nextUrl") ?? "").trim();
        if (nextUrl) {
          await browseNavigate({
            projectId: state.activeProjectId,
            tabId: state.activeTabId,
            nextUrl
          });
        }
      }

      await refreshWorkspaceData(store, nextProjectId);
      if (nextSiteId && nextSiteId !== store.getState().activeSiteId) {
        store.setState((currentState) => ({
          ...currentState,
          activeSiteId: nextSiteId
        }));
      }
    } catch (error) {
      logFrontendIssue(`submit:${workspaceForm.dataset.form}`, error, {
        activeProjectId: state.activeProjectId,
        activeSiteId: state.activeSiteId,
        activeTabId: state.activeTabId
      });
      const displayError = describeUiError(error, store.getState().locale);
      pushBanner(store, {
        id: crypto.randomUUID(),
        tone: "danger",
        title: displayError.title,
        message: displayError.message
      });
    }
  });

  mountNode.addEventListener("click", async (event) => {
    const menuRoot = event.target.closest?.("[data-browser-menu-root]");
    if (store.getState().settingsMenuOpen && !menuRoot) {
      store.setState((state) => ({
        ...state,
        settingsMenuOpen: false
      }));
    }

    const proxyAnchor = event.target.closest("[data-proxy-href]");
    if (proxyAnchor) {
      event.preventDefault();
      await handleProxyDocumentClick(store, proxyAnchor);
      return;
    }

    const button = event.target.closest("[data-action]");
    if (!button) {
      return;
    }

    event.preventDefault();
    await handleAction(store, button.dataset.action, button, documentRef);
  });

  documentRef?.addEventListener?.("fullscreenchange", () => {
    const state = store.getState();
    if (!documentRef?.fullscreenElement && state.layout.viewMode === "fullscreen") {
      store.setState((currentState) => ({
        ...currentState,
        layout: reduceLayoutState(currentState.layout, {
          type: "set-view-mode",
          viewMode: "maximized"
        })
      }));
      persistLayoutPreference(store).catch((error) => {
        logFrontendIssue("persist-layout-after-fullscreenchange", error);
      });
    }
  });

  globalThis.addEventListener?.("error", (event) => {
    logFrontendIssue("window-error", event?.error ?? event?.message ?? "Unknown window error");
  });

  globalThis.addEventListener?.("unhandledrejection", (event) => {
    logFrontendIssue("unhandled-rejection", event?.reason ?? "Unhandled promise rejection");
  });
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  window.addEventListener("DOMContentLoaded", () => bootApplication(document));
}
