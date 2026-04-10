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

function renderSiteList(data, t, locale) {
  const isZh = String(locale).startsWith("zh");
  const editLabel = isZh ? "修改" : "Edit";
  const deleteLabel = isZh ? "刪除" : "Delete";
  const createSiteLabel = isZh ? "新增網站" : "Add site";
  const items = data.sites.length ? data.sites.map((site) => `
    <li class="data-list__item ${data.activeSiteId === site.siteId ? "is-active" : ""}">
      <div>
        <strong>${escapeHtml(site.displayName)}</strong>
        <span>${escapeHtml((site.baseDomains ?? []).join(", "))}</span>
      </div>
      <div class="stack-actions">
        <button type="button" class="ghost-button" data-action="select-site" data-site-id="${site.siteId}">${t("workspace.select")}</button>
        <button type="button" class="ghost-button" data-action="open-site" data-site-id="${site.siteId}">${t("workspace.open")}</button>
        <button type="button" class="ghost-button" data-action="edit-site" data-site-id="${site.siteId}">${editLabel}</button>
        <button type="button" class="ghost-button" data-action="delete-site" data-site-id="${site.siteId}">${deleteLabel}</button>
      </div>
    </li>
  `).join("") : `<li class="empty-state">${t("workspace.noSites")}</li>`;

  return `
    <section class="panel-section">
      <p class="eyebrow">${t("workspace.allowlistedSites")}</p>
      <ul class="data-list data-list--scroll">${items}</ul>
      <details class="panel-section panel-section--advanced">
        <summary class="panel-section__summary-toggle">${createSiteLabel}</summary>
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

function createPrimaryWorkflowMarkup(data, t) {
  const hasSites = data.sites.length > 0;
  const hasProjects = data.projects.length > 0;
  const hasActiveSite = Boolean(data.activeSiteId && data.activeSite);
  const hasActiveProject = Boolean(data.activeProjectId && data.activeProject);
  const hasActiveTab = Boolean(data.activeTabId && data.tabs.some((tab) => tab.tabId === data.activeTabId));

  let title = t("workspace.workflowNeedSiteTitle");
  let message = t("workspace.workflowNeedSiteMessage");
  let action = "";

  if (hasSites && !hasActiveSite) {
    title = t("workspace.workflowPickSiteTitle");
    message = t("workspace.workflowPickSiteMessage");
  } else if (hasActiveSite && !hasProjects) {
    title = t("workspace.workflowNeedProjectTitle");
    message = t("workspace.workflowNeedProjectMessage");
  } else if (hasProjects && !hasActiveProject) {
    title = t("workspace.workflowPickProjectTitle");
    message = t("workspace.workflowPickProjectMessage");
  } else if (hasActiveSite && hasActiveProject && !hasActiveTab) {
    title = t("workspace.workflowOpenSiteTitle");
    message = t("workspace.workflowOpenSiteMessage", {
      site: data.activeSite?.displayName ?? t("workspace.none"),
      project: data.activeProject?.name ?? t("workspace.none")
    });
    action = `<button type="button" class="primary-button" data-action="open-site" data-site-id="${data.activeSite.siteId}">${t("workspace.openSelectedSite")}</button>`;
  } else if (hasActiveTab) {
    title = t("workspace.workflowTabReadyTitle");
    message = t("workspace.workflowTabReadyMessage");
  }

  return `
    <section class="workspace-workflow">
      <div>
        <p class="eyebrow">${t("workspace.quickStartEyebrow")}</p>
        <h2>${t("workspace.quickStartTitle")}</h2>
      </div>
      ${createServiceStatusMarkup(data, t)}
      <div class="workspace-workflow__summary">
        <span>${t("workspace.siteLabel")}: ${escapeHtml(data.activeSite?.displayName ?? t("workspace.none"))}</span>
        <span>${t("workspace.projectLabel")}: ${escapeHtml(data.activeProject?.name ?? t("workspace.none"))}</span>
        <span>${t("workspace.currentTabLabel")}: ${escapeHtml(data.tabs.find((tab) => tab.tabId === data.activeTabId)?.pageTitle ?? t("workspace.noActiveTab"))}</span>
      </div>
      <div class="workspace-workflow__callout">
        <div>
          <strong>${title}</strong>
          <p>${message}</p>
        </div>
        <div class="stack-actions">${action}</div>
      </div>
    </section>
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

function renderProjectList(data, t, locale) {
  const isZh = String(locale).startsWith("zh");
  const createProjectLabel = isZh ? "新增專案" : "Create project";
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
      <ul class="data-list data-list--scroll">${items}</ul>
      <details class="panel-section panel-section--advanced">
        <summary class="panel-section__summary-toggle">${createProjectLabel}</summary>
        <form class="mini-form" data-form="create-project">
          <input name="name" type="text" placeholder="${t("workspace.projectName")}" required />
          <input name="description" type="text" placeholder="${t("workspace.description")}" />
          <button type="submit" class="primary-button">${t("workspace.createProject")}</button>
        </form>
      </details>
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
    ? `${renderSiteList(data, t, locale)}${renderProjectList(data, t, locale)}`
    : `
      <details class="panel-section panel-section--advanced">
        <summary class="panel-section__summary-toggle">${t("workspace.bookmarks")}</summary>
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
      </details>
      <details class="panel-section panel-section--advanced">
        <summary class="panel-section__summary-toggle">${t("workspace.notes")}</summary>
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
      </details>
      <details class="panel-section panel-section--advanced">
        <summary class="panel-section__summary-toggle">${t("workspace.sessionVault")}</summary>
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
      </details>
      <details class="panel-section panel-section--advanced">
        <summary class="panel-section__summary-toggle">${t("workspace.fileTransfer")}</summary>
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
      </details>
      <details class="panel-section panel-section--advanced">
        <summary class="panel-section__summary-toggle">${t("workspace.audit")}</summary>
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
      </details>
    `;

  return `
    <section class="workspace-settings__pane workspace-settings__pane--${side} workspace-settings__pane--expanded">
      ${inner}
    </section>
  `;
}

function renderTabs(data, t) {
  if (!data.tabs.length) {
    return "";
  }

  return `
    <div class="tab-strip browser-tabs">
      ${data.tabs.map((tab) => `
        <div class="browser-tab ${data.activeTabId === tab.tabId ? "is-active" : ""}">
          <button type="button" class="tab-chip browser-tab__select ${data.activeTabId === tab.tabId ? "is-active" : ""}" data-action="select-tab" data-tab-id="${tab.tabId}">
            <span>${escapeHtml(tab.pageTitle || tab.currentUrl)}</span>
          </button>
          <button type="button" class="browser-tab__close" data-action="close-tab" data-tab-id="${tab.tabId}" aria-label="${t("workspace.closeTab")}">×</button>
        </div>
      `).join("")}
      <button type="button" class="ghost-button tab-strip__close-active" data-action="close-tab" data-tab-id="${data.activeTabId ?? ""}" ${data.activeTabId ? "" : "disabled"}>
        ${t("workspace.closeTab")}
      </button>
    </div>
  `;
}

function createTopbarTitle(data, t) {
  const activeTab = data.tabs.find((tab) => tab.tabId === data.activeTabId) ?? null;
  if (activeTab) {
    return escapeHtml(activeTab.pageTitle || activeTab.currentUrl);
  }
  return t("workspace.proxyTitle");
}

function createTopbarStatus(data, t) {
  const activeTab = data.tabs.find((tab) => tab.tabId === data.activeTabId) ?? null;
  if (activeTab) {
    return escapeHtml(activeTab.currentUrl);
  }
  return escapeHtml(data.statusMessage || t("workspace.noActiveTab"));
}

function createContentStage(layout, data, t, locale) {
  const activeTab = data.tabs.find((tab) => tab.tabId === data.activeTabId) ?? null;
  const fullscreenActive = layout.viewMode === "fullscreen";
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
          <button type="submit" class="primary-button">${activeTab ? t("workspace.navigateActiveTab") : t("workspace.openUrlPrimary")}</button>
        </form>
        <div class="toolbar browser-shell__actions ${fullscreenActive ? "browser-shell__actions--fullscreen" : ""}">
          ${createLocaleSwitcherMarkup(locale)}
          ${fullscreenActive ? "" : `<button type="button" class="ghost-button" data-action="toggle-settings-tray">${data.settingsTrayOpen ? t("workspace.close") : t("workspace.settingsToggle")}</button>`}
          ${fullscreenActive ? "" : `<button type="button" class="ghost-button" data-action="maximize-workspace">${t("workspace.maximizeAction")}</button>`}
          ${fullscreenActive ? "" : `<button type="button" class="ghost-button" data-action="back-to-workspace">${t("workspace.backToWorkspace")}</button>`}
          <button type="button" class="ghost-button" data-action="${fullscreenActive ? "exit-fullscreen" : "enter-fullscreen"}">${fullscreenActive ? t("workspace.exitFullscreen") : t("workspace.fullscreen")}</button>
          ${fullscreenActive ? "" : `<button type="button" class="ghost-button" data-action="sign-out">${t("workspace.signOut")}</button>`}
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
          <div class="content-stage__frame">
            ${hasVisibleBanner ? `<div class="content-stage__inline-message">${data.bannerMarkup}</div>` : ""}
            ${activeTab ? `
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
                  <div class="content-stage__document" data-relay-document>
                    <div class="content-stage__document-loading">${t("workspace.relayLoading")}</div>
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

function createSettingsTray(layout, data, t, locale) {
  if (!data.settingsTrayOpen) {
    return "";
  }

  return `
    <section class="workspace-settings workspace-settings--expanded">
      <div class="workspace-settings__header">
        <div>
          <p class="eyebrow">${t("workspace.settingsEyebrow")}</p>
          <h2>${t("workspace.settingsTitle")}</h2>
        </div>
        <div class="toolbar">
          <button type="button" class="ghost-button" data-action="toggle-settings-tray">${t("workspace.close")}</button>
        </div>
      </div>
      <div class="workspace-settings__grid workspace-settings__grid--drawer">
        ${createSettingsPaneMarkup("left", "expanded", data, t, locale)}
        ${createSettingsPaneMarkup("right", "expanded", data, t, locale)}
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
      <section class="workspace-main ${workspace.settingsTrayOpen ? "workspace-main--settings-open" : ""}">
        ${createSettingsTray(layout, workspace, t, resolvedLocale)}
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
