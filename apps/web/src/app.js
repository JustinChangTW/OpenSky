import { createBannerMarkup } from "./components/banner.js";
import { fetchAuditLog } from "./features/audit/api.js";
import { fetchSession, submitSignIn, submitSignOut } from "./features/auth/api.js";
import { createSignInMarkup } from "./features/auth/view.js";
import { browseClose, browseNavigate, browseOpen } from "./features/browse/api.js";
import { approveTransfer, completeTransfer, createTransfer, previewTransfer } from "./features/file-transfer/api.js";
import {
  createDefaultLayoutState,
  reduceLayoutState,
  toLayoutPreferencePayload,
  toggleFocusMode,
  toggleSidePanel
} from "./features/layout/state.js";
import { requestFullscreenWithFallback } from "./features/layout/fullscreen.js";
import { loadLayoutState, saveLayoutState } from "./features/layout/storage.js";
import { createSessionVault, fetchSessionVault, updateSessionVault } from "./features/session-vault/api.js";
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
import { createWorkspaceShellMarkup } from "./features/workspace/view.js";

function createInitialState() {
  return {
    sessionStatus: "loading",
    session: null,
    layout: loadLayoutState() ?? createDefaultLayoutState(),
    banners: [],
    statusMessage: "Checking current session.",
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
    lastTransfer: null
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
    .catch(() => undefined);
}

async function refreshWorkspaceData(store, projectId = null) {
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
  const activeProjectId = projectId ?? store.getState().activeProjectId ?? projects[0]?.projectId ?? null;
  const activeSiteId = store.getState().activeSiteId ?? sites[0]?.siteId ?? null;
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
  const resolvedLayout = activeProjectId ? await fetchLayoutPreference(activeProjectId).catch(() => null) : null;
  const activeLayoutPreferenceId = resolvedLayout?.resolvedPreference?.layoutPreferenceId ?? null;

  store.setState((state) => ({
    ...state,
    sites,
    projects,
    bookmarks,
    notes,
    vaultItems,
    auditItems,
    tabs,
    activeProjectId,
    activeSiteId,
    activeTabId: tabs[0]?.tabId ?? state.activeTabId,
    currentUrl: tabs[0]?.currentUrl ?? state.currentUrl,
    activeLayoutPreferenceId,
    layout: resolvedLayout?.resolvedPreference ? { ...state.layout, ...resolvedLayout.resolvedPreference } : state.layout
  }));
}

function renderApp(state) {
  if (state.sessionStatus === "signed_in") {
    return createWorkspaceShellMarkup({
      layout: state.layout,
      session: state.session,
      statusMessage: state.statusMessage,
      bannerMarkup: createBannerMarkup(state.banners),
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
        statusMessage: state.statusMessage
      }
    });
  }

  return createSignInMarkup({
    bannerMarkup: createBannerMarkup(state.banners),
    statusMessage: state.statusMessage,
    loading: state.sessionStatus === "loading"
  });
}

async function refreshSession(store) {
  try {
    const session = await fetchSession();
    if (!session?.signedIn) {
      store.setState((state) => ({
        ...state,
        sessionStatus: "signed_out",
        session: null,
        statusMessage: "Sign in to open your allowlisted workspace."
      }));
      return;
    }

    store.setState((state) => ({
      ...state,
      sessionStatus: "signed_in",
      session,
      statusMessage: "Workspace restored."
    }));
    await refreshWorkspaceData(store);
  } catch (error) {
    const errorCode = error?.payload?.code;
    if (errorCode === "AUTH_REQUIRED") {
      store.setState((state) => ({
        ...state,
        sessionStatus: "signed_out",
        session: null,
        statusMessage: "Sign in to open your allowlisted workspace."
      }));
      return;
    }

    pushBanner(store, {
      id: crypto.randomUUID(),
      tone: "warning",
      title: "Backend unavailable",
      message: error.message
    });
    store.setState((state) => ({
      ...state,
      sessionStatus: "signed_out",
      session: null,
      statusMessage: "Backend is warming up or unavailable."
    }));
  }
}

async function handleSignInSubmit(store, formElement) {
  const formData = new FormData(formElement);
  const username = String(formData.get("username") ?? "");
  const password = String(formData.get("password") ?? "");

  store.setState((state) => ({
    ...state,
    sessionStatus: "loading",
    statusMessage: "Signing in."
  }));

  try {
    const session = await submitSignIn({ username, password });
    store.setState((state) => ({
      ...state,
      sessionStatus: "signed_in",
      session,
      statusMessage: "Signed in."
    }));
    await refreshWorkspaceData(store);
  } catch (error) {
    pushBanner(store, {
      id: crypto.randomUUID(),
      tone: "danger",
      title: "Sign-in failed",
      message: error.message
    });
    store.setState((state) => ({
      ...state,
      sessionStatus: "signed_out",
      session: null,
      statusMessage: "Sign in to continue."
    }));
  }
}

async function handleAction(store, action, targetElement, documentRef) {
  try {
    if (action === "dismiss-banner") {
      dismissBanner(store, targetElement.dataset.bannerId);
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
        statusMessage: "Signed out."
      }));
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

    if (action === "enter-fullscreen") {
      const contentStage = documentRef.getElementById("content-stage");
      const result = await requestFullscreenWithFallback({
        documentRef,
        targetElement: contentStage,
        layout: store.getState().layout
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
          title: "Missing workspace context",
          message: "Choose a project and a site before opening a controlled tab."
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
        statusMessage: "Controlled tab opened."
      }));
      return;
    }

    if (action === "refresh-workspace") {
      await refreshWorkspaceData(store);
      return;
    }

    if (action === "browse-open" || action === "browse-navigate") {
      const currentUrl = String(documentRef.querySelector("[data-url-input]")?.value ?? "").trim();
      const { activeProjectId, activeSiteId, activeTabId } = store.getState();

      if (!activeProjectId || !activeSiteId || !currentUrl) {
        pushBanner(store, {
          id: crypto.randomUUID(),
          tone: "warning",
          title: "Missing workspace context",
          message: "Choose a project, a site, and an allowlisted URL first."
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
        statusMessage: action === "browse-open" ? "Controlled tab opened." : "Tab navigated."
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
        statusMessage: "Controlled tab closed."
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
        statusMessage: "Transfer created."
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
          ? "Preview completed."
          : action === "approve-transfer"
            ? "Transfer approved."
            : "Transfer completed."
      }));
      return;
    }
  } catch (error) {
    pushBanner(store, {
      id: crypto.randomUUID(),
      tone: "danger",
      title: error?.payload?.code ?? "REQUEST_FAILED",
      message: error.message
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
    mountNode.innerHTML = renderApp(store.getState());
  }

  store.subscribe(render);
  render();
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

    try {
      if (workspaceForm.dataset.form === "create-site") {
        await createSite({
          displayName: String(formData.get("displayName") ?? ""),
          baseDomains: [String(formData.get("baseDomain") ?? "")],
          pathRules: [String(formData.get("pathRule") ?? "/")],
          loginPersistenceAllowed: formData.get("loginPersistenceAllowed") !== null,
          uploadAllowed: formData.get("uploadAllowed") !== null,
          downloadAllowed: formData.get("downloadAllowed") !== null
        });
      }

      if (workspaceForm.dataset.form === "create-project") {
        await createProject({
          name: String(formData.get("name") ?? ""),
          description: String(formData.get("description") ?? ""),
          defaultSiteId: state.activeSiteId
        });
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

      await refreshWorkspaceData(store, state.activeProjectId);
    } catch (error) {
      pushBanner(store, {
        id: crypto.randomUUID(),
        tone: "danger",
        title: error?.payload?.code ?? "REQUEST_FAILED",
        message: error.message
      });
    }
  });

  mountNode.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-action]");
    if (!button) {
      return;
    }

    event.preventDefault();
    await handleAction(store, button.dataset.action, button, documentRef);
  });
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  window.addEventListener("DOMContentLoaded", () => bootApplication(document));
}
