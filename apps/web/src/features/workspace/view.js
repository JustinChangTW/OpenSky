import { escapeHtml } from "../../components/ui.js";
import { createLocaleSwitcherMarkup, createTranslator, normalizeLocale, translateEnumValue } from "../../i18n-runtime.js";

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
    bottomMessage: input?.bottomMessage ?? ""
  };
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
      </div>
    </li>
  `).join("") : `<li class="empty-state">${t("workspace.noSites")}</li>`;

  return `
    <section class="panel-section">
      <p class="eyebrow">${t("workspace.allowlistedSites")}</p>
      <ul class="data-list">${items}</ul>
      <form class="mini-form" data-form="create-site">
        <input name="displayName" type="text" placeholder="${t("workspace.siteName")}" required />
        <input name="baseDomain" type="text" placeholder="example.com" required />
        <input name="pathRule" type="text" placeholder="/team" required />
        <label><input name="loginPersistenceAllowed" type="checkbox" checked /> ${t("workspace.sessionShort")}</label>
        <label><input name="uploadAllowed" type="checkbox" checked /> ${t("workspace.uploadShort")}</label>
        <label><input name="downloadAllowed" type="checkbox" checked /> ${t("workspace.downloadShort")}</label>
        <button type="submit" class="primary-button">${t("workspace.addSite")}</button>
      </form>
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
    <section class="panel-section">
      <p class="eyebrow">${t("workspace.projects")}</p>
      <ul class="data-list">${items}</ul>
      <form class="mini-form" data-form="create-project">
        <input name="name" type="text" placeholder="${t("workspace.projectName")}" required />
        <input name="description" type="text" placeholder="${t("workspace.description")}" />
        <button type="submit" class="primary-button">${t("workspace.createProject")}</button>
      </form>
    </section>
  `;
}

function createSettingsPaneMarkup(side, state, data, t, locale) {
  if (state === "hidden") {
    return "";
  }

  if (state === "collapsed") {
    const summary = side === "left"
      ? [
          `${t("workspace.allowlistedSites")}: ${data.sites.length}`,
          `${t("workspace.projects")}: ${data.projects.length}`
        ]
      : [
          `${t("workspace.bookmarks")}: ${data.bookmarks.length}`,
          `${t("workspace.notes")}: ${data.notes.length}`,
          `${t("workspace.fileTransfer")}: ${data.lastTransfer ? 1 : 0}`
        ];

    return `
      <section class="workspace-settings__pane workspace-settings__pane--${side} workspace-settings__pane--collapsed">
        <p class="eyebrow">${side === "left" ? t("workspace.primarySettings") : t("workspace.secondarySettings")}</p>
        <div class="workspace-settings__summary">
          ${summary.map((line) => `<span>${escapeHtml(line)}</span>`).join("")}
        </div>
      </section>
    `;
  }

  const inner = side === "left"
    ? `${renderSiteList(data, t)}${renderProjectList(data, t, locale)}`
    : `
      <section class="panel-section">
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
      <section class="panel-section">
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
      <section class="panel-section">
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
      <section class="panel-section">
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
      <section class="panel-section">
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

  return `
    <section class="workspace-settings__pane workspace-settings__pane--${side} workspace-settings__pane--expanded">
      ${inner}
    </section>
  `;
}

function renderTabs(data, t) {
  if (!data.tabs.length) {
    return `<p class="empty-state">${t("workspace.openSiteToStart")}</p>`;
  }

  return `
    <div class="tab-strip">
      ${data.tabs.map((tab) => `
        <button type="button" class="tab-chip ${data.activeTabId === tab.tabId ? "is-active" : ""}" data-action="select-tab" data-tab-id="${tab.tabId}">
          <span>${escapeHtml(tab.pageTitle || tab.currentUrl)}</span>
        </button>
      `).join("")}
      ${data.activeTabId ? `<button type="button" class="ghost-button" data-action="close-tab" data-tab-id="${data.activeTabId}">${t("workspace.closeTab")}</button>` : ""}
    </div>
  `;
}

function createContentStage(layout, data, t, locale) {
  const activeTab = data.tabs.find((tab) => tab.tabId === data.activeTabId) ?? null;
  const urlValue = data.currentUrl || activeTab?.currentUrl || "";
  const activeTabTitle = activeTab?.pageTitle || activeTab?.currentUrl || t("workspace.allowlistedViewport");
  const activeSiteDomain = data.activeSite?.baseDomains?.[0] ?? "selected-allowlisted-domain.example";

  return `
    <section class="workspace-content">
      <header class="workspace-topbar workspace-topbar--${layout.topBarState}">
        <div>
          <p class="eyebrow">${t("workspace.topbarEyebrow")}</p>
          <h2>${t("workspace.topbarTitle")}</h2>
          <p class="workspace-status">${escapeHtml(data.statusMessage)}</p>
        </div>
        <div class="toolbar">
          ${createLocaleSwitcherMarkup(locale)}
          <button type="button" class="ghost-button" data-action="set-view-mode" data-view-mode="standard">${t("workspace.standard")}</button>
          <button type="button" class="ghost-button" data-action="set-view-mode" data-view-mode="maximized">${t("workspace.maximized")}</button>
          <button type="button" class="ghost-button" data-action="enter-fullscreen">${t("workspace.fullscreen")}</button>
          <button type="button" class="ghost-button" data-action="toggle-focus">${t("workspace.focus")}</button>
          <button type="button" class="ghost-button" data-action="toggle-top-bar">${t("workspace.topBar")}</button>
          <button type="button" class="ghost-button" data-action="sign-out">${t("workspace.signOut")}</button>
        </div>
      </header>
      <section class="content-controls">
        <div class="panel-meta-group">
          <span>${t("workspace.projectLabel")}: ${escapeHtml(data.activeProject?.name ?? t("workspace.none"))}</span>
          <span>${t("workspace.siteLabel")}: ${escapeHtml(data.activeSite?.displayName ?? t("workspace.none"))}</span>
          <span>${t("workspace.viewLabel")}: ${escapeHtml(translateEnumValue(layout.viewMode, locale))}</span>
          <span>${t("workspace.focusLabel")}: ${escapeHtml(translateEnumValue(layout.focusMode, locale))}</span>
          <span>${t("workspace.topBarLabel")}: ${escapeHtml(translateEnumValue(layout.topBarState, locale))}</span>
          <span>${t("workspace.bottomBarLabel")}: ${escapeHtml(translateEnumValue(layout.bottomBarState, locale))}</span>
        </div>
        <div class="stack-actions">
          ${data.activeSite && data.activeProject ? `<button type="button" class="primary-button" data-action="open-site" data-site-id="${data.activeSite.siteId}">${t("workspace.openSelectedSite")}</button>` : ""}
          ${data.activeProject ? `<button type="button" class="ghost-button" data-action="refresh-workspace">${t("workspace.refreshWorkspace")}</button>` : ""}
        </div>
      </section>
      ${renderTabs(data, t)}
      <section class="workspace-urlbar">
        <div class="workspace-urlbar__header">
          <p class="eyebrow">${t("workspace.activeTabNavigation")}</p>
          <p class="workspace-urlbar__note">${escapeHtml(t("workspace.activeTabNote", { domain: activeSiteDomain }))}</p>
        </div>
        <label class="workspace-urlbar__field">
          <span class="workspace-urlbar__label">${t("workspace.currentAllowlistedUrl")}</span>
          <input data-url-input type="url" value="${escapeHtml(urlValue)}" placeholder="https://${escapeHtml(activeSiteDomain)}/team/path" ${activeTab ? "" : "disabled"} />
        </label>
        <div class="stack-actions">
          <button type="button" class="primary-button" data-action="browse-navigate" ${activeTab ? "" : "disabled"}>${t("workspace.navigateActiveTab")}</button>
        </div>
      </section>
      <div class="content-stage-wrap ${layout.focusMode === "on" ? "content-stage-wrap--focus" : ""}">
        <article id="content-stage" class="content-stage">
          <div class="content-stage__header">
            <div>
              <p class="eyebrow">${t("workspace.centralContentArea")}</p>
              <h3>${escapeHtml(activeTabTitle)}</h3>
            </div>
            <div class="content-stage__meta">
              <span>${escapeHtml(activeTab?.currentUrl ?? t("workspace.noActiveTab"))}</span>
            </div>
          </div>
          <div class="content-stage__frame">
            ${activeTab ? `
              <div class="content-stage__document-shell">
                <div class="content-stage__document-meta">
                  <span>${escapeHtml(data.activeDocument?.finalUrl ?? activeTab.currentUrl)}</span>
                  <span>${escapeHtml(t("workspace.proxyPhase1Label"))}</span>
                </div>
                ${data.activeDocument?.errorMessage ? `
                  <div class="content-stage__document-error">
                    <strong>${escapeHtml(data.activeDocument.pageTitle ?? activeTabTitle)}</strong>
                    <p>${escapeHtml(data.activeDocument.errorMessage)}</p>
                  </div>
                ` : `
                  <div class="content-stage__document" data-relay-document>
                    <div class="content-stage__document-loading">${t("workspace.relayLoading")}</div>
                  </div>
                  <div class="content-stage__document-note" data-relay-note>${t("workspace.proxyResourceMode")}</div>
                `}
              </div>
            ` : `
              <div class="content-stage__mock-site">
                <p>${t("workspace.mockTitle")}</p>
                <p>${t("workspace.mockSubtitle")}</p>
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

function createSettingsTray(layout, data, t, locale) {
  if (layout.topBarState === "hidden") {
    return "";
  }

  const shellState = layout.topBarState === "expanded" ? "expanded" : "collapsed";
  const leftState = layout.leftPanelState === "expanded" && shellState === "expanded" ? "expanded" : layout.leftPanelState === "hidden" ? "hidden" : "collapsed";
  const rightState = layout.rightPanelState === "expanded" && shellState === "expanded" ? "expanded" : layout.rightPanelState === "hidden" ? "hidden" : "collapsed";

  return `
    <section class="workspace-settings workspace-settings--${layout.topBarState}">
      <div class="workspace-settings__header">
        <div>
          <p class="eyebrow">${t("workspace.settingsEyebrow")}</p>
          <h2>${t("workspace.settingsTitle")}</h2>
        </div>
        <div class="toolbar">
          ${createLocaleSwitcherMarkup(locale)}
          <button type="button" class="ghost-button" data-action="toggle-left-panel">${t("workspace.leftPanel")}</button>
          <button type="button" class="ghost-button" data-action="toggle-right-panel">${t("workspace.rightPanel")}</button>
          <button type="button" class="ghost-button" data-action="toggle-top-bar">${t("workspace.settingsToggle")}</button>
        </div>
      </div>
      <div class="workspace-settings__grid workspace-settings__grid--${shellState}">
        ${createSettingsPaneMarkup("left", leftState, data, t, locale)}
        ${createSettingsPaneMarkup("right", rightState, data, t, locale)}
      </div>
    </section>
  `;
}

export function createWorkspaceShellMarkup({ layout, session, statusMessage, bannerMarkup, workspace: workspaceData, data, locale = "en" }) {
  const resolvedLocale = normalizeLocale(locale);
  const t = createTranslator(resolvedLocale);
  const workspace = normalizeWorkspaceData(workspaceData ?? data);

  return `
    <main class="workspace-shell workspace-shell--${layout.viewMode} ${layout.focusMode === "on" ? "workspace-shell--focus" : ""}" data-locale="${resolvedLocale}">
      <section class="workspace-main">
        <header class="workspace-header">
          <div>
            <p class="eyebrow">${t("workspace.ownerSession")}</p>
            <h1>${escapeHtml(session.displayName)}</h1>
          </div>
          <div class="workspace-header__actions">
            <button type="button" class="ghost-button" data-action="toggle-top-bar">${t("workspace.settingsToggle")}</button>
            <button type="button" class="ghost-button" data-action="toggle-bottom-bar">${t("workspace.bottomBar")}</button>
          </div>
        </header>
        ${createSettingsTray(layout, workspace, t, resolvedLocale)}
        ${bannerMarkup}
        ${createContentStage(layout, {
          ...workspace,
          statusMessage,
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
