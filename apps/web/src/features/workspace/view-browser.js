import { escapeHtml } from "../../components/ui.js";
import { createTranslator, normalizeLocale, translateEnumValue } from "../../i18n-runtime.js";

function normalizeWorkspaceData(input) {
  return {
    sites: input?.sites ?? [],
    projects: input?.projects ?? [],
    tabs: input?.tabs ?? [],
    bookmarks: input?.bookmarks ?? [],
    notes: input?.notes ?? [],
    sessionVault: input?.sessionVault ?? input?.vaultItems ?? [],
    audit: input?.audit ?? input?.auditItems ?? [],
    activeProjectId: input?.activeProjectId ?? null,
    activeSiteId: input?.activeSiteId ?? null,
    activeTabId: input?.activeTabId ?? null,
    activeProject: input?.activeProject ?? null,
    activeSite: input?.activeSite ?? null,
    currentUrl: input?.currentUrl ?? "",
    activeDocument: input?.activeDocument ?? null,
    lastTransfer: input?.lastTransfer ?? null,
    statusMessage: input?.statusMessage ?? "",
    bottomMessage: input?.bottomMessage ?? "",
    serviceInfo: input?.serviceInfo ?? null,
    serviceStatus: input?.serviceStatus ?? "loading",
    settingsTrayOpen: Boolean(input?.settingsTrayOpen),
    settingsMenuOpen: Boolean(input?.settingsMenuOpen)
  };
}

function createServiceStatusMarkup(data, t) {
  if (data.serviceStatus === "ready" && data.serviceInfo) {
    return `
      <div class="workspace-health workspace-health--ready">
        <strong>${t("service.readyTitle")}</strong>
        <span>${t("service.readyMessage", {
          environment: data.serviceInfo.environment,
          persistence: data.serviceInfo.persistenceMode
        })}</span>
      </div>
    `;
  }

  if (data.serviceStatus === "unavailable") {
    return `
      <div class="workspace-health workspace-health--warning">
        <strong>${t("service.unavailableTitle")}</strong>
        <span>${t("service.unavailableMessage")}</span>
      </div>
    `;
  }

  return `
    <div class="workspace-health workspace-health--loading">
      <strong>${t("service.loadingTitle")}</strong>
      <span>${t("service.loadingMessage")}</span>
    </div>
  `;
}

function createDemoShortcutsMarkup(data, t) {
  const demoShortcuts = Array.isArray(data.serviceInfo?.demoPreset?.shortcuts)
    ? data.serviceInfo.demoPreset.shortcuts
    : [];

  if (!demoShortcuts.length) {
    return "";
  }

  return `
    <section class="browser-shortcuts">
      <p class="eyebrow">${t("workspace.demoShortcutsEyebrow")}</p>
      <div class="browser-shortcuts__list">
        ${demoShortcuts.map((shortcut) => `
          <button
            type="button"
            class="ghost-button"
            data-action="open-demo-url"
            data-url="${escapeHtml(shortcut.url)}"
          >${escapeHtml(shortcut.label)}</button>
        `).join("")}
      </div>
    </section>
  `;
}

function renderSiteList(data, t) {
  const items = data.sites.length ? data.sites.map((site) => `
    <li class="data-list__item ${data.activeSiteId === site.siteId ? "is-active" : ""}">
      <div>
        <strong>${escapeHtml(site.displayName)}</strong>
        <span>${escapeHtml((site.baseDomains ?? []).join(", "))}</span>
      </div>
      <div class="stack-actions">
        <button type="button" class="ghost-button" data-action="select-site" data-site-id="${site.siteId}">${t("workspace.select")}</button>
        <button type="button" class="ghost-button" data-action="open-site" data-site-id="${site.siteId}">${t("workspace.open")}</button>
        <button type="button" class="ghost-button" data-action="edit-site" data-site-id="${site.siteId}">${t("workspace.editSite")}</button>
        <button type="button" class="ghost-button" data-action="delete-site" data-site-id="${site.siteId}">${t("workspace.deleteSite")}</button>
      </div>
    </li>
  `).join("") : `<li class="empty-state">${t("workspace.noSites")}</li>`;

  return `
    <section class="panel-section panel-section--advanced" id="settings-allowlisted-sites">
      <p class="eyebrow">${t("workspace.allowlistedSites")}</p>
      <ul class="data-list data-list--scroll">${items}</ul>
      <details class="panel-section panel-section--advanced">
        <summary class="panel-section__summary-toggle">${t("workspace.addSite")}</summary>
        <form class="mini-form" data-form="create-site">
          <input name="displayName" type="text" placeholder="${t("workspace.siteName")}" required />
          <input name="baseDomain" type="text" placeholder="example.com, static.example.com" required />
          <p class="panel-meta">${t("workspace.baseDomainHint")}</p>
          <input name="pathRule" type="text" placeholder="/team" required />
          <p class="panel-meta">${t("workspace.pathRuleHint")}</p>
          <p class="panel-meta">${t("workspace.siteDefaultsHint")}</p>
          <button type="submit" class="primary-button">${t("workspace.addSite")}</button>
        </form>
      </details>
    </section>
  `;
}

function renderProjectList(data, t, locale) {
  const items = data.projects.length ? data.projects.map((project) => `
    <li class="data-list__item ${data.activeProjectId === project.projectId ? "is-active" : ""}">
      <div>
        <strong>${escapeHtml(project.name)}</strong>
        <span>${escapeHtml(translateEnumValue(project.status, locale))}</span>
      </div>
      <button type="button" class="ghost-button" data-action="select-project" data-project-id="${project.projectId}">${t("workspace.useProject")}</button>
    </li>
  `).join("") : `<li class="empty-state">${t("workspace.noProjects")}</li>`;

  return `
    <section class="panel-section panel-section--advanced" id="settings-projects">
      <p class="eyebrow">${t("workspace.projects")}</p>
      <ul class="data-list data-list--scroll">${items}</ul>
      <details class="panel-section panel-section--advanced">
        <summary class="panel-section__summary-toggle">${t("workspace.createProject")}</summary>
        <form class="mini-form" data-form="create-project">
          <input name="name" type="text" placeholder="${t("workspace.projectName")}" required />
          <input name="description" type="text" placeholder="${t("workspace.description")}" />
          <button type="submit" class="primary-button">${t("workspace.createProject")}</button>
        </form>
      </details>
    </section>
  `;
}

function createSecondarySettings(data, t, locale) {
  return `
    <section class="panel-section panel-section--advanced" id="settings-bookmarks">
      <p class="eyebrow">${t("workspace.bookmarks")}</p>
      <ul class="data-list">
        ${data.bookmarks.length ? data.bookmarks.map((bookmark) => `
          <li class="data-list__item">
            <div>
              <strong>${escapeHtml(bookmark.title)}</strong>
              <span>${escapeHtml(bookmark.url)}</span>
            </div>
          </li>
        `).join("") : `<li class="empty-state">${t("workspace.noBookmarks")}</li>`}
      </ul>
      <form class="mini-form" data-form="create-bookmark">
        <input name="title" type="text" placeholder="${t("workspace.bookmarkTitle")}" required />
        <input name="url" type="url" placeholder="https://example.com/team/page" required />
        <textarea name="note" placeholder="${t("workspace.optionalNote")}"></textarea>
        <button type="submit" class="primary-button">${t("workspace.saveBookmark")}</button>
      </form>
    </section>
    <section class="panel-section panel-section--advanced" id="settings-notes">
      <p class="eyebrow">${t("workspace.notes")}</p>
      <ul class="data-list">
        ${data.notes.length ? data.notes.map((note) => `
          <li class="data-list__item">
            <div>
              <strong>${escapeHtml(note.title)}</strong>
              <span>${escapeHtml(note.content)}</span>
            </div>
          </li>
        `).join("") : `<li class="empty-state">${t("workspace.noNotes")}</li>`}
      </ul>
      <form class="mini-form" data-form="create-note">
        <input name="title" type="text" placeholder="${t("workspace.noteTitle")}" required />
        <textarea name="content" placeholder="${t("workspace.noteContent")}"></textarea>
        <button type="submit" class="primary-button">${t("workspace.saveNote")}</button>
      </form>
    </section>
    <section class="panel-section panel-section--advanced" id="settings-session-vault">
      <p class="eyebrow">${t("workspace.sessionVault")}</p>
      <ul class="data-list">
        ${data.sessionVault.length ? data.sessionVault.map((vault) => `
          <li class="data-list__item">
            <div>
              <strong>${escapeHtml(vault.secretType)}</strong>
              <span>${escapeHtml(translateEnumValue(vault.status, locale))}</span>
            </div>
            <button type="button" class="ghost-button" data-action="revoke-vault" data-vault-id="${vault.vaultId}">${t("workspace.revoke")}</button>
          </li>
        `).join("") : `<li class="empty-state">${t("workspace.noSessions")}</li>`}
      </ul>
      <button type="button" class="ghost-button" data-action="create-vault">${t("workspace.rememberSelectedSite")}</button>
    </section>
    <section class="panel-section panel-section--advanced" id="settings-file-transfer">
      <p class="eyebrow">${t("workspace.fileTransfer")}</p>
      <form class="mini-form" data-form="create-transfer">
        <input name="originalName" type="text" placeholder="memo.txt" required />
        <input name="mimeType" type="text" placeholder="text/plain" required />
        <textarea name="previewContent" placeholder="${t("workspace.previewContent")}"></textarea>
        <button type="submit" class="primary-button">${t("workspace.createTransfer")}</button>
      </form>
      ${data.lastTransfer ? `
        <div class="stack-actions">
          <button type="button" class="ghost-button" data-action="preview-transfer" data-item-id="${data.lastTransfer.itemId}">${t("workspace.preview")}</button>
          <button type="button" class="ghost-button" data-action="approve-transfer" data-item-id="${data.lastTransfer.itemId}">${t("workspace.approve")}</button>
          <button type="button" class="ghost-button" data-action="complete-transfer" data-item-id="${data.lastTransfer.itemId}">${t("workspace.complete")}</button>
        </div>
        <p class="panel-meta">${escapeHtml(data.lastTransfer.originalName)} - ${escapeHtml(translateEnumValue(data.lastTransfer.transferStatus ?? "pending", locale))}</p>
      ` : `<p class="empty-state">${t("workspace.createTransferPrompt")}</p>`}
    </section>
    <section class="panel-section panel-section--advanced" id="settings-audit">
      <p class="eyebrow">${t("workspace.audit")}</p>
      <ul class="data-list data-list--compact">
        ${data.audit.length ? data.audit.slice(0, 8).map((event) => `
          <li class="data-list__item">
            <div>
              <strong>${escapeHtml(event.action)}</strong>
              <span>${escapeHtml(translateEnumValue(event.result, locale))}</span>
            </div>
          </li>
        `).join("") : `<li class="empty-state">${t("workspace.noAudit")}</li>`}
      </ul>
    </section>
  `;
}

function createSettingsPage(data, t, locale) {
  return `
    <section class="settings-page">
      <aside class="settings-page__sidebar">
        <p class="eyebrow">${t("workspace.settingsEyebrow")}</p>
        <h3>${t("workspace.settingsTitle")}</h3>
        <nav class="settings-page__nav" aria-label="${t("workspace.settingsTitle")}">
          <a href="#settings-allowlisted-sites">${t("workspace.allowlistedSites")}</a>
          <a href="#settings-projects">${t("workspace.projects")}</a>
          <a href="#settings-bookmarks">${t("workspace.bookmarks")}</a>
          <a href="#settings-notes">${t("workspace.notes")}</a>
          <a href="#settings-session-vault">${t("workspace.sessionVault")}</a>
          <a href="#settings-file-transfer">${t("workspace.fileTransfer")}</a>
          <a href="#settings-audit">${t("workspace.audit")}</a>
        </nav>
      </aside>
      <section class="settings-page__content">
        ${renderSiteList(data, t)}
        ${renderProjectList(data, t, locale)}
        ${createSecondarySettings(data, t, locale)}
      </section>
    </section>
  `;
}

function renderTabs(data, t) {
  const settingsTabOpen = Boolean(data.settingsTrayOpen);
  if (!data.tabs.length && !settingsTabOpen) {
    return "";
  }

  return `
    <div class="tab-strip browser-tabs">
      ${settingsTabOpen ? `
        <div class="browser-tab browser-tab--settings is-active">
          <button type="button" class="tab-chip browser-tab__select is-active" data-action="open-settings-page">
            <span>${t("workspace.settingsTabTitle")}</span>
          </button>
          <button type="button" class="browser-tab__close" data-action="close-settings-page" aria-label="${t("workspace.closeTab")}">&times;</button>
        </div>
      ` : ""}
      ${data.tabs.map((tab) => `
        <div class="browser-tab ${!settingsTabOpen && data.activeTabId === tab.tabId ? "is-active" : ""}">
          <button type="button" class="tab-chip browser-tab__select ${!settingsTabOpen && data.activeTabId === tab.tabId ? "is-active" : ""}" data-action="select-tab" data-tab-id="${tab.tabId}">
            <span>${escapeHtml(tab.pageTitle || tab.currentUrl)}</span>
          </button>
          <button type="button" class="browser-tab__close" data-action="close-tab" data-tab-id="${tab.tabId}" aria-label="${t("workspace.closeTab")}">&times;</button>
        </div>
      `).join("")}
      <button type="button" class="ghost-button tab-strip__close-active" data-action="close-tab" data-tab-id="${data.activeTabId ?? ""}" ${data.activeTabId && !settingsTabOpen ? "" : "disabled"}>
        ${t("workspace.closeTab")}
      </button>
    </div>
  `;
}

function createTopbarTitle(data, t) {
  if (data.settingsTrayOpen) {
    return t("workspace.settingsTabTitle");
  }
  const activeTab = data.tabs.find((tab) => tab.tabId === data.activeTabId) ?? null;
  if (activeTab) {
    return escapeHtml(activeTab.pageTitle || activeTab.currentUrl);
  }
  return t("workspace.proxyTitle");
}

function createTopbarStatus(data, t) {
  if (data.settingsTrayOpen) {
    return t("workspace.settingsTabSubtitle");
  }
  const activeTab = data.tabs.find((tab) => tab.tabId === data.activeTabId) ?? null;
  if (activeTab) {
    return escapeHtml(activeTab.currentUrl);
  }
  return escapeHtml(data.statusMessage || t("workspace.noActiveTab"));
}

function createBrowserMenuMarkup(data, t, locale, fullscreenActive) {
  return `
    <div class="browser-menu" data-browser-menu-root>
      <button
        type="button"
        class="ghost-button browser-menu__trigger"
        data-action="toggle-settings-menu"
        aria-haspopup="menu"
        aria-expanded="${data.settingsMenuOpen ? "true" : "false"}"
      >${t("workspace.browserMenu")}</button>
      <div class="browser-menu__panel" data-browser-menu ${data.settingsMenuOpen ? "" : "hidden"}>
        <button type="button" class="browser-menu__item" data-action="open-settings-page">${t("workspace.openSettingsPage")}</button>
        <button type="button" class="browser-menu__item" data-action="maximize-workspace">${t("workspace.maximizeAction")}</button>
        <button type="button" class="browser-menu__item" data-action="back-to-workspace">${t("workspace.backToWorkspace")}</button>
        <button type="button" class="browser-menu__item" data-action="${fullscreenActive ? "exit-fullscreen" : "enter-fullscreen"}">${fullscreenActive ? t("workspace.exitFullscreen") : t("workspace.fullscreen")}</button>
        <div class="browser-menu__divider"></div>
        <button type="button" class="browser-menu__item" data-action="set-locale" data-locale="zh" ${locale === "zh" ? "disabled" : ""}>${t("locale.zh")}</button>
        <button type="button" class="browser-menu__item" data-action="set-locale" data-locale="en" ${locale === "en" ? "disabled" : ""}>${t("locale.en")}</button>
        <div class="browser-menu__divider"></div>
        <button type="button" class="browser-menu__item browser-menu__item--danger" data-action="sign-out">${t("workspace.signOut")}</button>
      </div>
    </div>
  `;
}

function createContentStage(layout, data, t, locale) {
  const activeTab = data.tabs.find((tab) => tab.tabId === data.activeTabId) ?? null;
  const fullscreenActive = layout.viewMode === "fullscreen";
  const settingsPageOpen = Boolean(data.settingsTrayOpen);
  const urlValue = data.currentUrl || activeTab?.currentUrl || "";
  const activeTabTitle = activeTab?.pageTitle || activeTab?.currentUrl || t("workspace.allowlistedViewport");
  const activeSiteDomain = data.activeSite?.baseDomains?.[0] ?? "selected-allowlisted-domain.example";
  const hasVisibleBanner = Boolean(data.bannerMarkup) && !data.bannerMarkup.includes("banner-stack--empty");
  const hasActiveWorkspaceContext = Boolean(data.activeSite && data.activeProject);
  const startMessage = hasActiveWorkspaceContext
    ? t("workspace.workflowOpenSiteMessage", {
        site: data.activeSite?.displayName ?? t("workspace.none"),
        project: data.activeProject?.name ?? t("workspace.none")
      })
    : t("workspace.openSiteToStart");

  return `
    <section class="workspace-content">
      <header class="workspace-topbar workspace-topbar--${layout.topBarState} browser-shell__topbar">
        <div class="browser-shell__window" aria-hidden="true">
          <span class="browser-shell__dot browser-shell__dot--red"></span>
          <span class="browser-shell__dot browser-shell__dot--amber"></span>
          <span class="browser-shell__dot browser-shell__dot--green"></span>
        </div>
        <form class="workspace-topbar__urlbar browser-shell__urlbar" data-form="quick-open">
          <input
            name="targetUrl"
            type="url"
            inputmode="url"
            spellcheck="false"
            autocapitalize="off"
            autocomplete="off"
            placeholder="https://developer.mozilla.org/zh-TW/"
            value="${escapeHtml(urlValue)}"
            required
          />
          <button type="submit" class="primary-button">${activeTab && !settingsPageOpen ? t("workspace.navigateActiveTab") : t("workspace.openUrlPrimary")}</button>
        </form>
        <div class="toolbar browser-shell__actions ${fullscreenActive ? "browser-shell__actions--fullscreen" : ""}">
          <button type="button" class="ghost-button" data-action="${fullscreenActive ? "exit-fullscreen" : "enter-fullscreen"}">${fullscreenActive ? t("workspace.exitFullscreen") : t("workspace.fullscreen")}</button>
          ${createBrowserMenuMarkup(data, t, locale, fullscreenActive)}
        </div>
      </header>
      ${fullscreenActive ? "" : createDemoShortcutsMarkup(data, t)}
      ${renderTabs(data, t)}
      <div class="content-stage-wrap ${layout.focusMode === "on" ? "content-stage-wrap--focus" : ""}">
        <article id="content-stage" class="content-stage browser-stage">
          <div class="content-stage__header">
            <div>
              <h3>${createTopbarTitle(data, t)}</h3>
            </div>
            <span class="content-stage__status">${createTopbarStatus(data, t)}</span>
          </div>
          <div class="content-stage__frame ${settingsPageOpen ? "content-stage__frame--settings" : ""}">
            ${hasVisibleBanner ? `<div class="content-stage__inline-message">${data.bannerMarkup}</div>` : ""}
            ${settingsPageOpen ? `
              ${createSettingsPage(data, t, locale)}
            ` : activeTab ? `
              <div class="content-stage__document-shell">
                <div class="content-stage__document-meta">
                  <span>${escapeHtml(data.activeDocument?.finalUrl ?? activeTab.currentUrl)}</span>
                  <span>${escapeHtml(t("workspace.controlledPageLabel"))}</span>
                </div>
                ${data.activeDocument?.errorMessage ? `
                  <div class="content-stage__document-error">
                    <strong>${escapeHtml(data.activeDocument.pageTitle ?? activeTabTitle)}</strong>
                    <p>${escapeHtml(data.activeDocument.errorMessage)}</p>
                  </div>
                ` : `
                  <div class="content-stage__document content-stage__document--frame">
                    <iframe
                      class="content-stage__document-frame"
                      title="${escapeHtml(activeTabTitle)}"
                      data-relay-frame
                      sandbox="allow-scripts allow-forms allow-same-origin allow-downloads"
                      referrerpolicy="no-referrer"
                      loading="eager"
                    >${t("workspace.relayLoading")}</iframe>
                  </div>
                  <div class="content-stage__document-note" data-relay-note>${t("workspace.proxyResourceMode")}</div>
                `}
              </div>
            ` : `
              <div class="content-stage__mock-site">
                <div class="content-stage__start-copy">
                  <p class="eyebrow">${t("workspace.proxyEyebrow")}</p>
                  <h3>${t("workspace.proxyTitle")}</h3>
                  <p>${startMessage}</p>
                </div>
                ${hasActiveWorkspaceContext ? `<button type="button" class="primary-button" data-action="open-site" data-site-id="${data.activeSite.siteId}">${t("workspace.openSelectedSite")}</button>` : ""}
                <p class="content-stage__hint">${escapeHtml(t("workspace.activeTabNote", { domain: activeSiteDomain }))}</p>
              </div>
            `}
          </div>
        </article>
      </div>
      <footer class="workspace-bottombar workspace-bottombar--${layout.bottomBarState}">
        <div class="workspace-bottombar__content">
          <span>${escapeHtml(data.bottomMessage)}</span>
          <button type="button" class="ghost-button" data-action="toggle-bottom-bar">${t("workspace.bottomBar")}</button>
        </div>
      </footer>
    </section>
  `;
}

export function createWorkspaceShellMarkup({ layout, statusMessage, bannerMarkup, workspace: workspaceData, data, locale = "en" }) {
  const resolvedLocale = normalizeLocale(locale);
  const t = createTranslator(resolvedLocale);
  const workspace = normalizeWorkspaceData(workspaceData ?? data);

  return `
    <main class="workspace-shell workspace-shell--${layout.viewMode} ${layout.focusMode === "on" ? "workspace-shell--focus" : ""}" data-locale="${resolvedLocale}">
      <section class="workspace-main ${workspace.settingsTrayOpen ? "workspace-main--settings-open" : ""}">
        ${createContentStage(layout, {
          ...workspace,
          statusMessage,
          bannerMarkup,
          bottomMessage: workspace.lastTransfer
            ? t("workspace.bottomMessageTransfer", {
                name: workspace.lastTransfer.originalName,
                status: translateEnumValue(workspace.lastTransfer.transferStatus, resolvedLocale)
              })
            : t("workspace.bottomMessageDefault")
        }, t, resolvedLocale)}
      </section>
    </main>
  `;
}
