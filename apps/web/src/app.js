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
  createNote,
  createProject,
  createSite,
  fetchBookmarks,
  fetchLayoutPreference,
  fetchNotes,
  fetchProjects,
  fetchSites,
  fetchTabs,
  saveLayoutPreference
} from "./features/workspace/api.js";
import { normalizeSiteDraft } from "./features/workspace/site-input.js";
import { clearWorkspaceUiState, loadWorkspaceUiState, saveWorkspaceUiState } from "./features/workspace/storage.js";
import { createWorkspaceShellMarkup } from "./features/workspace/view.js";
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
    banners: [banner, ...state.banners].slice(0, 4)
  }));
}

function getTranslator(store) {
  return createTranslator(store.getState().locale);
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

  const sites = normalizeItems(sitesPayload);
  const projects = normalizeItems(projectsPayload);
  const vaultItems = normalizeItems(vaultPayload);
  const auditItems = normalizeItems(auditPayload);
  const activeProjectId = projectId ?? previousState.activeProjectId ?? projects[0]?.projectId ?? null;
  const activeProject = projects.find((item) => item.projectId === activeProjectId) ?? null;
  const activeSiteId = previousState.activeSiteId ?? activeProject?.defaultSiteId ?? sites[0]?.siteId ?? null;
  const [tabsPayload, bookmarksPayload, notesPayload] = activeProjectId
    ? await Promise.all([
        fetchTabs(activeProjectId).catch(() => ({ items: [] })),
        fetchBookmarks(activeProjectId).catch(() => ({ items: [] })),
        fetchNotes(activeProjectId).catch(() => ({ items: [] }))
      ])
    : [{ items: [] }, { items: [] }, { items: [] }];
  const tabs = normalizeItems(tabsPayload);
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
    return createWorkspaceShellMarkup({
      locale: state.locale,
      layout: state.layout,
      session: state.session,
      statusMessage: state.statusMessage,
      bannerMarkup: createBannerMarkup(state.banners, state.locale),
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
        serviceStatus: state.serviceStatus
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
        session: null,
        statusMessage: t("status.signInToOpen")
      }));
      return;
    }

    store.setState((state) => ({
      ...state,
      sessionStatus: "signed_in",
      session,
      statusMessage: t("status.workspaceRestored")
    }));
    await refreshWorkspaceData(store);
  } catch (error) {
    logFrontendIssue("refresh-session", error);
    const errorCode = error?.payload?.code;
    if (errorCode === "AUTH_REQUIRED") {
      store.setState((state) => ({
        ...state,
        sessionStatus: "signed_out",
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
    statusMessage: t("status.signingIn")
  }));

  try {
    const session = await submitSignIn({ username, password });
    store.setState((state) => ({
      ...state,
      sessionStatus: "signed_in",
      session,
      statusMessage: t("status.signedIn")
    }));
    await refreshWorkspaceData(store);
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
      session: null,
      statusMessage: t("status.signInToContinue")
    }));
  }
}

async function handleAction(store, action, targetElement, documentRef) {
  const t = getTranslator(store);
  try {
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

    if (action === "toggle-settings-tray") {
      store.setState((state) => ({
        ...state,
        layout: {
          ...state.layout,
          topBarState: state.layout.topBarState === "expanded" ? "hidden" : "expanded"
        }
      }));
      await persistLayoutPreference(store);
      return;
    }

    if (action === "sign-out") {
      await submitSignOut();
      store.setState((state) => ({
        ...state,
        sessionStatus: "signed_out",
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
      const contentStage = documentRef.getElementById("content-stage");
      const result = await requestFullscreenWithFallback({
        documentRef,
        targetElement: contentStage,
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

    if (action === "select-tab") {
      store.setState((state) => {
        const activeTab = state.tabs.find((tab) => tab.tabId === targetElement.dataset.tabId);
        return {
          ...state,
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
        activeSiteId: site.siteId,
        currentUrl: entryUrl,
        statusMessage: t("status.controlledTabOpened")
      }));
      return;
    }

    if (action === "refresh-workspace") {
      await refreshWorkspaceData(store);
      return;
    }

    if (action === "back-to-workspace") {
      store.setState((state) => ({
        ...state,
        activeTabId: null,
        currentUrl: "",
        activeDocument: null,
        statusMessage: t("status.workspaceOverview")
      }));
      return;
    }

    if (action === "browse-open" || action === "browse-navigate") {
      const currentUrl = String(documentRef.querySelector("[data-url-input]")?.value ?? "").trim();
      const { activeProjectId, activeSiteId, activeTabId } = store.getState();

      if (!activeProjectId || !activeSiteId || !currentUrl) {
        pushBanner(store, {
          id: crypto.randomUUID(),
          tone: "warning",
          title: t("banner.missingWorkspaceContext"),
          message: t("banner.missingProjectSiteUrl")
        });
        return;
      }

      if (action === "browse-open") {
        await browseOpen({
          projectId: activeProjectId,
          siteId: activeSiteId,
          entryUrl: currentUrl
        });
      } else if (activeTabId) {
        await browseNavigate({
          projectId: activeProjectId,
          tabId: activeTabId,
          nextUrl: currentUrl
        });
      }

      await refreshWorkspaceData(store, activeProjectId);
      store.setState((state) => ({
        ...state,
        currentUrl,
        statusMessage: action === "browse-open" ? t("status.controlledTabOpened") : t("status.tabNavigated")
      }));
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
