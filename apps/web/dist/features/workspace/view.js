import { escapeHtml } from "../../components/ui.js";

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
    lastTransfer: input?.lastTransfer ?? null,
    statusMessage: input?.statusMessage ?? "",
    bottomMessage: input?.bottomMessage ?? ""
  };
}

function renderSiteList(data) {
  const items = data.sites.length ? data.sites.map((site) => `
    <li class="data-list__item ${data.activeSiteId === site.siteId ? "is-active" : ""}">
      <div>
        <strong>${escapeHtml(site.displayName)}</strong>
        <span>${escapeHtml((site.baseDomains ?? []).join(", "))}</span>
      </div>
      <div class="stack-actions">
        <button type="button" class="ghost-button" data-action="select-site" data-site-id="${site.siteId}">Select</button>
        <button type="button" class="ghost-button" data-action="open-site" data-site-id="${site.siteId}">Open</button>
      </div>
    </li>
  `).join("") : '<li class="empty-state">No allowlisted sites yet.</li>';

  return `
    <section class="panel-section">
      <p class="eyebrow">Allowlisted sites</p>
      <ul class="data-list">${items}</ul>
      <form class="mini-form" data-form="create-site">
        <input name="displayName" type="text" placeholder="Site name" required />
        <input name="baseDomain" type="text" placeholder="example.com" required />
        <input name="pathRule" type="text" placeholder="/team" required />
        <label><input name="loginPersistenceAllowed" type="checkbox" checked /> session</label>
        <label><input name="uploadAllowed" type="checkbox" checked /> upload</label>
        <label><input name="downloadAllowed" type="checkbox" checked /> download</label>
        <button type="submit" class="primary-button">Add site</button>
      </form>
    </section>
  `;
}

function renderProjectList(data) {
  const items = data.projects.length ? data.projects.map((project) => `
    <li class="data-list__item ${data.activeProjectId === project.projectId ? "is-active" : ""}">
      <div>
        <strong>${escapeHtml(project.name)}</strong>
        <span>${escapeHtml(project.status)}</span>
      </div>
      <button type="button" class="ghost-button" data-action="select-project" data-project-id="${project.projectId}">Use</button>
    </li>
  `).join("") : '<li class="empty-state">No projects yet.</li>';

  return `
    <section class="panel-section">
      <p class="eyebrow">Projects</p>
      <ul class="data-list">${items}</ul>
      <form class="mini-form" data-form="create-project">
        <input name="name" type="text" placeholder="Project name" required />
        <input name="description" type="text" placeholder="Description" />
        <button type="submit" class="primary-button">Create project</button>
      </form>
    </section>
  `;
}

function createPanelMarkup(side, state, data) {
  const inner = side === "left"
    ? `${renderSiteList(data)}${renderProjectList(data)}`
    : `
      <section class="panel-section">
        <p class="eyebrow">Bookmarks</p>
        <ul class="data-list">
          ${data.bookmarks.length ? data.bookmarks.map((bookmark) => `
            <li class="data-list__item">
              <div>
                <strong>${escapeHtml(bookmark.title)}</strong>
                <span>${escapeHtml(bookmark.url)}</span>
              </div>
            </li>
          `).join("") : '<li class="empty-state">No bookmarks for this project.</li>'}
        </ul>
        <form class="mini-form" data-form="create-bookmark">
          <input name="title" type="text" placeholder="Bookmark title" required />
          <input name="url" type="url" placeholder="https://example.com/team/page" required />
          <textarea name="note" placeholder="Optional note"></textarea>
          <button type="submit" class="primary-button">Save bookmark</button>
        </form>
      </section>
      <section class="panel-section">
        <p class="eyebrow">Notes</p>
        <ul class="data-list">
          ${data.notes.length ? data.notes.map((note) => `
            <li class="data-list__item">
              <div>
                <strong>${escapeHtml(note.title)}</strong>
                <span>${escapeHtml(note.content)}</span>
              </div>
            </li>
          `).join("") : '<li class="empty-state">No notes for this project.</li>'}
        </ul>
        <form class="mini-form" data-form="create-note">
          <input name="title" type="text" placeholder="Note title" required />
          <textarea name="content" placeholder="Capture context or TODOs"></textarea>
          <button type="submit" class="primary-button">Save note</button>
        </form>
      </section>
      <section class="panel-section">
        <p class="eyebrow">Session vault</p>
        <ul class="data-list">
          ${data.sessionVault.length ? data.sessionVault.map((vault) => `
            <li class="data-list__item">
              <div>
                <strong>${escapeHtml(vault.secretType)}</strong>
                <span>${escapeHtml(vault.status)}</span>
              </div>
              <button type="button" class="ghost-button" data-action="revoke-vault" data-vault-id="${vault.vaultId}">Revoke</button>
            </li>
          `).join("") : '<li class="empty-state">No persisted sessions.</li>'}
        </ul>
        <button type="button" class="ghost-button" data-action="create-vault">Remember selected site</button>
      </section>
      <section class="panel-section">
        <p class="eyebrow">File transfer</p>
        <form class="mini-form" data-form="create-transfer">
          <input name="originalName" type="text" placeholder="memo.txt" required />
          <input name="mimeType" type="text" placeholder="text/plain" required />
          <textarea name="previewContent" placeholder="Preview content"></textarea>
          <button type="submit" class="primary-button">Create transfer</button>
        </form>
        ${data.lastTransfer ? `
          <div class="stack-actions">
            <button type="button" class="ghost-button" data-action="preview-transfer" data-item-id="${data.lastTransfer.itemId}">Preview</button>
            <button type="button" class="ghost-button" data-action="approve-transfer" data-item-id="${data.lastTransfer.itemId}">Approve</button>
            <button type="button" class="ghost-button" data-action="complete-transfer" data-item-id="${data.lastTransfer.itemId}">Complete</button>
          </div>
          <p class="panel-meta">${escapeHtml(data.lastTransfer.originalName)} - ${escapeHtml(data.lastTransfer.transferStatus ?? "pending")}</p>
        ` : '<p class="empty-state">Create a transfer to begin preview and approval.</p>'}
      </section>
      <section class="panel-section">
        <p class="eyebrow">Audit</p>
        <ul class="data-list data-list--compact">
          ${data.audit.length ? data.audit.slice(0, 8).map((event) => `
            <li class="data-list__item">
              <div>
                <strong>${escapeHtml(event.action)}</strong>
                <span>${escapeHtml(event.result)}</span>
              </div>
            </li>
          `).join("") : '<li class="empty-state">No audit events yet.</li>'}
        </ul>
      </section>
    `;

  return `
    <aside class="workspace-panel workspace-panel--${side} workspace-panel--${state}">
      <div class="workspace-panel__inner">${inner}</div>
    </aside>
  `;
}

function renderTabs(data) {
  if (!data.tabs.length) {
    return '<p class="empty-state">Open a site to start a controlled tab session.</p>';
  }

  return `
    <div class="tab-strip">
      ${data.tabs.map((tab) => `
        <button type="button" class="tab-chip ${data.activeTabId === tab.tabId ? "is-active" : ""}" data-action="select-tab" data-tab-id="${tab.tabId}">
          <span>${escapeHtml(tab.pageTitle || tab.currentUrl)}</span>
        </button>
      `).join("")}
      ${data.activeTabId ? `<button type="button" class="ghost-button" data-action="close-tab" data-tab-id="${data.activeTabId}">Close tab</button>` : ""}
    </div>
  `;
}

function createContentStage(layout, data) {
  const activeTab = data.tabs.find((tab) => tab.tabId === data.activeTabId) ?? null;
  const urlValue = data.currentUrl || activeTab?.currentUrl || "";
  const activeTabTitle = activeTab?.pageTitle || activeTab?.currentUrl || "Allowlisted site viewport";
  const activeSiteDomain = data.activeSite?.baseDomains?.[0] ?? "selected allowlisted domain";

  return `
    <section class="workspace-content">
      <header class="workspace-topbar workspace-topbar--${layout.topBarState}">
        <div>
          <p class="eyebrow">Workspace</p>
          <h2>Center-content-first shell</h2>
          <p class="workspace-status">${escapeHtml(data.statusMessage)}</p>
        </div>
        <div class="toolbar">
          <button type="button" class="ghost-button" data-action="set-view-mode" data-view-mode="standard">Standard</button>
          <button type="button" class="ghost-button" data-action="set-view-mode" data-view-mode="maximized">Maximized</button>
          <button type="button" class="ghost-button" data-action="enter-fullscreen">Fullscreen</button>
          <button type="button" class="ghost-button" data-action="toggle-focus">Focus</button>
          <button type="button" class="ghost-button" data-action="toggle-top-bar">Top bar</button>
          <button type="button" class="ghost-button" data-action="sign-out">Sign out</button>
        </div>
      </header>
      <section class="content-controls">
        <div class="panel-meta-group">
          <span>Project: ${escapeHtml(data.activeProject?.name ?? "none")}</span>
          <span>Site: ${escapeHtml(data.activeSite?.displayName ?? "none")}</span>
          <span>View: ${escapeHtml(layout.viewMode)}</span>
          <span>Focus: ${escapeHtml(layout.focusMode)}</span>
          <span>Top bar: ${escapeHtml(layout.topBarState)}</span>
          <span>Bottom bar: ${escapeHtml(layout.bottomBarState)}</span>
        </div>
        <div class="stack-actions">
          ${data.activeSite && data.activeProject ? `<button type="button" class="primary-button" data-action="open-site" data-site-id="${data.activeSite.siteId}">Open selected site</button>` : ""}
          ${data.activeProject ? `<button type="button" class="ghost-button" data-action="refresh-workspace">Refresh workspace</button>` : ""}
        </div>
      </section>
      ${renderTabs(data)}
      <section class="workspace-urlbar">
        <div class="workspace-urlbar__header">
          <p class="eyebrow">Active tab navigation</p>
          <p class="workspace-urlbar__note">Open a site from the allowlisted site list first. This field only updates the current tab and still requires an allowlisted URL on ${escapeHtml(activeSiteDomain)}.</p>
        </div>
        <label class="workspace-urlbar__field">
          <span class="workspace-urlbar__label">Current allowlisted URL</span>
          <input data-url-input type="url" value="${escapeHtml(urlValue)}" placeholder="https://${escapeHtml(activeSiteDomain)}/team/path" ${activeTab ? "" : "disabled"} />
        </label>
        <div class="stack-actions">
          <button type="button" class="primary-button" data-action="browse-navigate" ${activeTab ? "" : "disabled"}>Navigate active tab</button>
        </div>
      </section>
      <div class="content-stage-wrap ${layout.focusMode === "on" ? "content-stage-wrap--focus" : ""}">
        <article id="content-stage" class="content-stage">
          <div class="content-stage__header">
            <div>
              <p class="eyebrow">Central content area</p>
              <h3>${escapeHtml(activeTabTitle)}</h3>
            </div>
            <div class="content-stage__meta">
              <span>${escapeHtml(activeTab?.currentUrl ?? "No active tab")}</span>
            </div>
          </div>
          <div class="content-stage__frame">
            ${activeTab ? `
              <iframe
                class="content-stage__iframe"
                title="${escapeHtml(activeTabTitle)}"
                src="${escapeHtml(activeTab.currentUrl)}"
                sandbox="allow-forms allow-popups allow-scripts allow-same-origin"
                referrerpolicy="strict-origin-when-cross-origin"
              ></iframe>
            ` : `
              <div class="content-stage__mock-site">
                <p>This area is ready for a controlled allowlisted site tab.</p>
                <p>Choose a site and project, then open it inside the workspace.</p>
              </div>
            `}
          </div>
        </article>
      </div>
      <footer class="workspace-bottombar workspace-bottombar--${layout.bottomBarState}">
        <div class="workspace-bottombar__content">
          <span>${escapeHtml(data.bottomMessage)}</span>
          <button type="button" class="ghost-button" data-action="toggle-bottom-bar">Bottom bar</button>
        </div>
      </footer>
    </section>
  `;
}

export function createWorkspaceShellMarkup({ layout, session, statusMessage, bannerMarkup, workspace: workspaceData, data }) {
  const workspace = normalizeWorkspaceData(workspaceData ?? data);

  return `
    <main class="workspace-shell workspace-shell--${layout.viewMode} ${layout.focusMode === "on" ? "workspace-shell--focus" : ""}">
      ${createPanelMarkup("left", layout.leftPanelState, workspace)}
      <section class="workspace-main">
        <header class="workspace-header">
          <div>
            <p class="eyebrow">Owner session</p>
            <h1>${escapeHtml(session.displayName)}</h1>
          </div>
          <div class="workspace-header__actions">
            <button type="button" class="ghost-button" data-action="toggle-left-panel">Left panel</button>
            <button type="button" class="ghost-button" data-action="toggle-right-panel">Right panel</button>
          </div>
        </header>
        ${bannerMarkup}
        ${createContentStage(layout, {
          ...workspace,
          statusMessage,
          bottomMessage: workspace.lastTransfer
            ? `Transfer ${workspace.lastTransfer.originalName} is ${workspace.lastTransfer.transferStatus}.`
            : "Workspace status, transfer alerts, and fullscreen fallback notices render here."
        })}
      </section>
      ${createPanelMarkup("right", layout.rightPanelState, workspace)}
    </main>
  `;
}
