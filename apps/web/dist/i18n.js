const LOCALE_STORAGE_KEY = "opensky.locale";

const UI_STRINGS = {
  en: {
    "locale.label": "Language",
    "locale.en": "English",
    "locale.zh": "中文",
    "app.name": "OpenSky",
    "auth.eyebrow": "Single-user allowlisted workspace",
    "auth.lede": "Sign in to restore your projects, tabs, notes, and layout preferences.",
    "auth.username": "Username",
    "auth.password": "Password",
    "auth.usernamePlaceholder": "owner-admin",
    "auth.passwordPlaceholder": "Owner password",
    "auth.signIn": "Sign in",
    "auth.checkingSession": "Checking session...",
    "status.checkingSession": "Checking current session.",
    "status.signInToOpen": "Sign in to open your allowlisted workspace.",
    "status.workspaceRestored": "Workspace restored.",
    "status.backendUnavailable": "Backend is warming up or unavailable.",
    "status.signingIn": "Signing in.",
    "status.signedIn": "Signed in.",
    "status.signInToContinue": "Sign in to continue.",
    "status.signedOut": "Signed out.",
    "status.controlledTabOpened": "Controlled tab opened.",
    "status.tabNavigated": "Tab navigated.",
    "status.controlledTabClosed": "Controlled tab closed.",
    "status.transferCreated": "Transfer created.",
    "status.previewCompleted": "Preview completed.",
    "status.transferApproved": "Transfer approved.",
    "status.transferCompleted": "Transfer completed.",
    "banner.dismiss": "Dismiss",
    "banner.backendUnavailableTitle": "Backend unavailable",
    "banner.signInFailedTitle": "Sign-in failed",
    "banner.missingWorkspaceContext": "Missing workspace context",
    "banner.missingProjectAndSite": "Choose a project and a site before opening a controlled tab.",
    "banner.missingProjectSiteUrl": "Choose a project, a site, and an allowlisted URL first.",
    "banner.requestFailed": "Request failed",
    "banner.networkErrorTitle": "Network request failed",
    "banner.networkErrorMessage": "Could not reach the backend service. Check that the backend is running and OPEN_SKY_API_BASE points to the correct URL.",
    "workspace.ownerSession": "Owner session",
    "workspace.leftPanel": "Left panel",
    "workspace.rightPanel": "Right panel",
    "workspace.allowlistedSites": "Allowlisted sites",
    "workspace.noSites": "No allowlisted sites yet.",
    "workspace.select": "Select",
    "workspace.open": "Open",
    "workspace.siteName": "Site name",
    "workspace.sessionShort": "session",
    "workspace.uploadShort": "upload",
    "workspace.downloadShort": "download",
    "workspace.addSite": "Add site",
    "workspace.projects": "Projects",
    "workspace.noProjects": "No projects yet.",
    "workspace.useProject": "Use",
    "workspace.projectName": "Project name",
    "workspace.description": "Description",
    "workspace.createProject": "Create project",
    "workspace.bookmarks": "Bookmarks",
    "workspace.noBookmarks": "No bookmarks for this project.",
    "workspace.bookmarkTitle": "Bookmark title",
    "workspace.optionalNote": "Optional note",
    "workspace.saveBookmark": "Save bookmark",
    "workspace.notes": "Notes",
    "workspace.noNotes": "No notes for this project.",
    "workspace.noteTitle": "Note title",
    "workspace.noteContent": "Capture context or TODOs",
    "workspace.saveNote": "Save note",
    "workspace.sessionVault": "Session vault",
    "workspace.noSessions": "No persisted sessions.",
    "workspace.revoke": "Revoke",
    "workspace.rememberSelectedSite": "Remember selected site",
    "workspace.fileTransfer": "File transfer",
    "workspace.previewContent": "Preview content",
    "workspace.createTransfer": "Create transfer",
    "workspace.preview": "Preview",
    "workspace.approve": "Approve",
    "workspace.complete": "Complete",
    "workspace.createTransferPrompt": "Create a transfer to begin preview and approval.",
    "workspace.audit": "Audit",
    "workspace.noAudit": "No audit events yet.",
    "workspace.openSiteToStart": "Open a site to start a controlled tab session.",
    "workspace.closeTab": "Close tab",
    "workspace.topbarEyebrow": "Workspace",
    "workspace.topbarTitle": "Center-content-first shell",
    "workspace.standard": "Standard",
    "workspace.maximized": "Maximized",
    "workspace.fullscreen": "Fullscreen",
    "workspace.exitFullscreen": "Exit fullscreen",
    "workspace.focus": "Focus",
    "workspace.topBar": "Top bar",
    "workspace.bottomBar": "Bottom bar",
    "workspace.settingsEyebrow": "Settings",
    "workspace.settingsTitle": "Workspace configuration",
    "workspace.settingsToggle": "Settings",
    "workspace.primarySettings": "Primary settings",
    "workspace.secondarySettings": "Secondary settings",
    "workspace.signOut": "Sign out",
    "workspace.projectLabel": "Project",
    "workspace.siteLabel": "Site",
    "workspace.viewLabel": "View",
    "workspace.focusLabel": "Focus",
    "workspace.topBarLabel": "Top bar",
    "workspace.bottomBarLabel": "Bottom bar",
    "workspace.none": "none",
    "workspace.openSelectedSite": "Open selected site",
    "workspace.refreshWorkspace": "Refresh workspace",
    "workspace.activeTabNavigation": "Active tab navigation",
    "workspace.activeTabNote": "Open a site from the allowlisted site list first. This field only updates the current tab and still requires an allowlisted URL on {domain}.",
    "workspace.currentAllowlistedUrl": "Current allowlisted URL",
    "workspace.navigateActiveTab": "Navigate active tab",
    "workspace.centralContentArea": "Central content area",
    "workspace.noActiveTab": "No active tab",
    "workspace.allowlistedViewport": "Allowlisted site viewport",
    "workspace.mockTitle": "This area is ready for a controlled allowlisted site tab.",
    "workspace.mockSubtitle": "Choose a site and project, then open it inside the workspace.",
    "workspace.relayLoading": "Loading relayed document...",
    "workspace.proxyPhase1Label": "Allowlist proxy phase 1",
    "workspace.proxyResourceMode": "Phase 1 now proxies the page document plus same-domain styles, images, and fonts through the backend.",
    "workspace.proxyScriptsDisabled": "This page depends on interactive scripts. Phase 1 keeps scripts disabled, so highly dynamic websites may only render partially.",
    "workspace.bottomMessageDefault": "Workspace status, transfer alerts, and fullscreen fallback notices render here.",
    "workspace.bottomMessageTransfer": "Transfer {name} is {status}.",
    "error.FULLSCREEN_NOT_AVAILABLE.title": "Fullscreen unavailable",
    "error.FULLSCREEN_NOT_AVAILABLE.message": "Fullscreen is not available in this environment.",
    "error.SITE_EMBED_BLOCKED.title": "Site embedding blocked",
    "enum.active": "active",
    "enum.disabled": "disabled",
    "enum.archived": "archived",
    "enum.deleted": "deleted",
    "enum.draft": "draft",
    "enum.paused": "paused",
    "enum.open": "open",
    "enum.suspended": "suspended",
    "enum.closed": "closed",
    "enum.pending": "pending",
    "enum.preview_ready": "preview ready",
    "enum.approved": "approved",
    "enum.completed": "completed",
    "enum.failed": "failed",
    "enum.expired": "expired",
    "enum.revoked": "revoked",
    "enum.hidden": "hidden",
    "enum.collapsed": "collapsed",
    "enum.expanded": "expanded",
    "enum.compact": "compact",
    "enum.autoHide": "auto-hide",
    "enum.standard": "standard",
    "enum.maximized": "maximized",
    "enum.fullscreen": "fullscreen",
    "enum.on": "on",
    "enum.off": "off",
    "enum.success": "success"
  },
  zh: {
    "locale.label": "語言",
    "locale.en": "English",
    "locale.zh": "中文",
    "app.name": "OpenSky",
    "auth.eyebrow": "單一使用者白名單工作區",
    "auth.lede": "登入後可恢復你的專案、分頁、筆記與版面偏好設定。",
    "auth.username": "使用者名稱",
    "auth.password": "密碼",
    "auth.usernamePlaceholder": "owner-admin",
    "auth.passwordPlaceholder": "Owner password",
    "auth.signIn": "登入",
    "auth.checkingSession": "正在檢查工作階段...",
    "status.checkingSession": "正在檢查目前工作階段。",
    "status.signInToOpen": "請登入以開啟你的白名單工作區。",
    "status.workspaceRestored": "工作區已恢復。",
    "status.backendUnavailable": "後端正在暖機或暫時無法使用。",
    "status.signingIn": "登入中。",
    "status.signedIn": "已登入。",
    "status.signInToContinue": "請先登入以繼續。",
    "status.signedOut": "已登出。",
    "status.controlledTabOpened": "受控分頁已開啟。",
    "status.tabNavigated": "分頁已導向新位置。",
    "status.controlledTabClosed": "受控分頁已關閉。",
    "status.transferCreated": "已建立檔案傳輸。",
    "status.previewCompleted": "預覽已完成。",
    "status.transferApproved": "傳輸已核准。",
    "status.transferCompleted": "傳輸已完成。",
    "banner.dismiss": "關閉",
    "banner.backendUnavailableTitle": "後端無法使用",
    "banner.signInFailedTitle": "登入失敗",
    "banner.missingWorkspaceContext": "缺少工作區內容",
    "banner.missingProjectAndSite": "請先選擇專案與網站，再開啟受控分頁。",
    "banner.missingProjectSiteUrl": "請先選擇專案、網站與白名單網址。",
    "banner.requestFailed": "請求失敗",
    "banner.networkErrorTitle": "無法連線到後端",
    "banner.networkErrorMessage": "目前無法連到後端服務。請確認 backend 已啟動，且 OPEN_SKY_API_BASE 指向正確網址。",
    "workspace.ownerSession": "擁有者工作階段",
    "workspace.leftPanel": "左側欄",
    "workspace.rightPanel": "右側欄",
    "workspace.allowlistedSites": "白名單網站",
    "workspace.noSites": "目前還沒有白名單網站。",
    "workspace.select": "選取",
    "workspace.open": "開啟",
    "workspace.siteName": "網站名稱",
    "workspace.sessionShort": "工作階段",
    "workspace.uploadShort": "上傳",
    "workspace.downloadShort": "下載",
    "workspace.addSite": "新增網站",
    "workspace.projects": "專案",
    "workspace.noProjects": "目前還沒有專案。",
    "workspace.useProject": "使用",
    "workspace.projectName": "專案名稱",
    "workspace.description": "描述",
    "workspace.createProject": "建立專案",
    "workspace.bookmarks": "書籤",
    "workspace.noBookmarks": "此專案目前沒有書籤。",
    "workspace.bookmarkTitle": "書籤標題",
    "workspace.optionalNote": "附註（可選）",
    "workspace.saveBookmark": "儲存書籤",
    "workspace.notes": "筆記",
    "workspace.noNotes": "此專案目前沒有筆記。",
    "workspace.noteTitle": "筆記標題",
    "workspace.noteContent": "記錄上下文或待辦事項",
    "workspace.saveNote": "儲存筆記",
    "workspace.sessionVault": "工作階段保險庫",
    "workspace.noSessions": "目前沒有已保存的工作階段。",
    "workspace.revoke": "撤銷",
    "workspace.rememberSelectedSite": "記住目前網站",
    "workspace.fileTransfer": "檔案傳輸",
    "workspace.previewContent": "預覽內容",
    "workspace.createTransfer": "建立傳輸",
    "workspace.preview": "預覽",
    "workspace.approve": "核准",
    "workspace.complete": "完成",
    "workspace.createTransferPrompt": "先建立傳輸，才能進行預覽與核准。",
    "workspace.audit": "稽核紀錄",
    "workspace.noAudit": "目前沒有稽核事件。",
    "workspace.openSiteToStart": "開啟網站後即可開始受控分頁工作階段。",
    "workspace.closeTab": "關閉分頁",
    "workspace.topbarEyebrow": "工作區",
    "workspace.topbarTitle": "中央內容優先工作殼層",
    "workspace.standard": "標準",
    "workspace.maximized": "最大化",
    "workspace.fullscreen": "全螢幕",
    "workspace.exitFullscreen": "退出全螢幕",
    "workspace.focus": "專注模式",
    "workspace.topBar": "上方列",
    "workspace.signOut": "登出",
    "workspace.projectLabel": "專案",
    "workspace.siteLabel": "網站",
    "workspace.viewLabel": "檢視模式",
    "workspace.focusLabel": "專注模式",
    "workspace.topBarLabel": "上方列",
    "workspace.bottomBarLabel": "下方列",
    "workspace.none": "無",
    "workspace.openSelectedSite": "開啟已選網站",
    "workspace.refreshWorkspace": "重新整理工作區",
    "workspace.activeTabNavigation": "目前分頁導覽",
    "workspace.activeTabNote": "請先從白名單網站清單開啟網站。這個欄位只會更新目前分頁，且網址仍必須屬於 {domain} 的白名單範圍。",
    "workspace.currentAllowlistedUrl": "目前白名單網址",
    "workspace.navigateActiveTab": "導向目前分頁",
    "workspace.centralContentArea": "中央內容區",
    "workspace.noActiveTab": "目前沒有作用中的分頁",
    "workspace.allowlistedViewport": "白名單網站視窗",
    "workspace.mockTitle": "這個區域已準備好顯示受控白名單網站分頁。",
    "workspace.mockSubtitle": "請先選擇網站與專案，再從工作區中開啟。",
    "workspace.relayLoading": "正在載入後端 relay 文件...",
    "workspace.bottomMessageDefault": "工作區狀態、傳輸提醒與全螢幕 fallback 訊息會顯示在這裡。",
    "workspace.bottomMessageTransfer": "檔案 {name} 目前狀態為 {status}。",
    "error.FULLSCREEN_NOT_AVAILABLE.title": "無法進入全螢幕",
    "error.FULLSCREEN_NOT_AVAILABLE.message": "此環境目前不支援全螢幕。",
    "error.SITE_EMBED_BLOCKED.title": "網站拒絕嵌入",
    "enum.active": "啟用",
    "enum.disabled": "停用",
    "enum.archived": "封存",
    "enum.deleted": "刪除",
    "enum.draft": "草稿",
    "enum.paused": "暫停",
    "enum.open": "開啟",
    "enum.suspended": "暫停中",
    "enum.closed": "關閉",
    "enum.pending": "待處理",
    "enum.preview_ready": "可預覽",
    "enum.approved": "已核准",
    "enum.completed": "已完成",
    "enum.failed": "失敗",
    "enum.expired": "已過期",
    "enum.revoked": "已撤銷",
    "enum.hidden": "隱藏",
    "enum.collapsed": "收合",
    "enum.expanded": "展開",
    "enum.compact": "精簡",
    "enum.autoHide": "自動隱藏",
    "enum.standard": "標準",
    "enum.maximized": "最大化",
    "enum.fullscreen": "全螢幕",
    "enum.on": "開啟",
    "enum.off": "關閉",
    "enum.success": "成功"
  }
};

export function normalizeLocale(value) {
  const source = String(value ?? "").trim().toLowerCase();
  return source.startsWith("zh") ? "zh" : "en";
}

export function loadLocale(storageRef = globalThis.localStorage, navigatorRef = globalThis.navigator) {
  try {
    const stored = storageRef?.getItem?.(LOCALE_STORAGE_KEY);
    if (stored) {
      return normalizeLocale(stored);
    }
  } catch {
    // Ignore storage access errors.
  }

  return normalizeLocale(navigatorRef?.language ?? "en");
}

export function saveLocale(locale, storageRef = globalThis.localStorage) {
  const normalized = normalizeLocale(locale);
  try {
    storageRef?.setItem?.(LOCALE_STORAGE_KEY, normalized);
  } catch {
    // Ignore storage access errors.
  }
  return normalized;
}

function interpolate(template, params = {}) {
  return String(template).replace(/\{(\w+)\}/gu, (_, key) => String(params[key] ?? ""));
}

export function createTranslator(locale) {
  const normalized = normalizeLocale(locale);
  const messages = UI_STRINGS[normalized];
  const fallbackMessages = UI_STRINGS.en;

  return (key, params = {}) => {
    const template = messages[key] ?? fallbackMessages[key] ?? key;
    return interpolate(template, params);
  };
}

export function translateEnumValue(value, locale) {
  const normalizedValue = String(value ?? "");
  return createTranslator(locale)(`enum.${normalizedValue}`);
}

export function createLocaleSwitcherMarkup(locale) {
  const t = createTranslator(locale);

  return `
    <div class="stack-actions" data-locale-switcher>
      <span class="panel-meta">${t("locale.label")}</span>
      <button type="button" class="ghost-button" data-action="set-locale" data-locale="zh" ${locale === "zh" ? "disabled" : ""}>${t("locale.zh")}</button>
      <button type="button" class="ghost-button" data-action="set-locale" data-locale="en" ${locale === "en" ? "disabled" : ""}>${t("locale.en")}</button>
    </div>
  `;
}

export function describeUiError(error, locale) {
  const t = createTranslator(locale);
  const code = error?.payload?.code ?? null;

  if (error?.message === "Failed to fetch" || error instanceof TypeError) {
    return {
      title: t("banner.networkErrorTitle"),
      message: t("banner.networkErrorMessage")
    };
  }

  if (code === "FULLSCREEN_NOT_AVAILABLE") {
    return {
      title: t("error.FULLSCREEN_NOT_AVAILABLE.title"),
      message: error?.payload?.message ?? error?.message ?? t("error.FULLSCREEN_NOT_AVAILABLE.message")
    };
  }

  if (code === "SITE_EMBED_BLOCKED") {
    return {
      title: t("error.SITE_EMBED_BLOCKED.title"),
      message: error?.payload?.message ?? error?.message ?? t("banner.networkErrorMessage")
    };
  }

  return {
    title: code ?? t("banner.requestFailed"),
    message: error?.payload?.message ?? error?.message ?? t("banner.networkErrorMessage")
  };
}
