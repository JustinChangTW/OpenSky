const ERROR_TRANSLATIONS = {
  zh: {
    AUTH_REQUIRED: {
      message: "你必須先登入才能繼續。",
      userAction: "請以 owner-admin 身分登入。"
    },
    FORBIDDEN: {
      message: "目前操作未被允許。",
      userAction: "請確認使用的是已設定的 owner-admin 憑證。"
    },
    SITE_NOT_FOUND: {
      message: "找不到指定網站。",
      userAction: "請重新整理頁面後再選擇既有網站。"
    },
    SITE_DISABLED: {
      message: "此網站目前未啟用。",
      userAction: "請選擇已啟用的白名單網站。"
    },
    SITE_EMBED_BLOCKED: {
      message: "此白名單網站拒絕被嵌入工作區視窗。",
      userAction: "請改用支援嵌入的白名單網站，或改走後端 relay 路線。"
    },
    URL_NOT_ALLOWED: {
      message: "此網址不在允許的白名單範圍內。",
      userAction: "請改用目前網站允許的白名單網址。"
    },
    PROJECT_NOT_FOUND: {
      message: "找不到指定專案。",
      userAction: "請重新整理頁面後再選擇既有專案。"
    },
    TAB_NOT_FOUND: {
      message: "找不到指定分頁。",
      userAction: "請重新整理工作區後再選擇既有分頁。"
    },
    BOOKMARK_NOT_FOUND: {
      message: "找不到指定書籤。",
      userAction: "請重新整理頁面後再選擇既有書籤。"
    },
    NOTE_NOT_FOUND: {
      message: "找不到指定筆記。",
      userAction: "請重新整理頁面後再選擇既有筆記。"
    },
    SESSION_VAULT_NOT_FOUND: {
      message: "找不到指定的工作階段保險庫。",
      userAction: "請重新整理清單後再選擇既有項目。"
    },
    SESSION_EXPIRED: {
      message: "此工作階段已過期。",
      userAction: "請重新登入或重新建立工作階段。"
    },
    LOGIN_PERSISTENCE_DISABLED: {
      message: "此網站不允許登入資訊持久化。",
      userAction: "請選擇允許保存登入資訊的網站。"
    },
    UPLOAD_PREVIEW_REQUIRED: {
      message: "上傳前必須先完成預覽。",
      userAction: "請先執行預覽步驟，再進行核准。"
    },
    FILE_TYPE_NOT_ALLOWED: {
      message: "此檔案類型不支援預覽。",
      userAction: "請改用可預覽的檔案類型後再核准上傳。"
    },
    DOWNLOAD_DISABLED: {
      message: "此網站不允許下載。",
      userAction: "請選擇允許下載的網站。"
    },
    UPLOAD_DISABLED: {
      message: "此網站不允許上傳。",
      userAction: "請選擇允許上傳的網站。"
    },
    CONFLICT_RETRY: {
      message: "目前狀態無法完成這個操作。",
      userAction: "請重新整理目前資料後再試一次。"
    },
    SERVICE_UNAVAILABLE: {
      message: "OpenSky 服務目前暫時無法完成這個請求。",
      userAction: "請稍後再試；若持續失敗，請檢查伺服器紀錄。"
    },
    INVALID_INPUT: {
      message: "輸入內容無效。",
      userAction: "請檢查輸入內容後再重試。"
    },
    FULLSCREEN_NOT_AVAILABLE: {
      message: "目前無法進入全螢幕模式。",
      userAction: "請改用 maximized 模式，或確認瀏覽器是否允許全螢幕。"
    }
  }
};

export function resolveLocaleFromRequest(request) {
  const acceptLanguage = request?.headers?.get?.("accept-language") ?? "";
  return String(acceptLanguage).toLowerCase().startsWith("zh") ? "zh" : "en";
}

export function localizeStructuredError(error, request) {
  const locale = resolveLocaleFromRequest(request);
  const translations = ERROR_TRANSLATIONS[locale];

  if (!translations || !error?.code || !translations[error.code]) {
    return error;
  }

  return {
    ...error,
    message: translations[error.code].message,
    userAction: translations[error.code].userAction
  };
}
