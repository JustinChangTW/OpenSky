const ERROR_TRANSLATIONS = {
  zh: {
    AUTH_REQUIRED: {
      message: "你必須先登入才能繼續。",
      userAction: "請先以 owner-admin 帳號登入。"
    },
    FORBIDDEN: {
      message: "你沒有執行這個動作的權限。",
      userAction: "請確認目前登入的是 owner-admin。"
    },
    SITE_NOT_FOUND: {
      message: "找不到這個白名單網站。",
      userAction: "請重新整理後選擇仍存在的網站。"
    },
    SITE_DISABLED: {
      message: "這個白名單網站目前未啟用。",
      userAction: "請改用啟用中的白名單網站。"
    },
    SITE_EMBED_BLOCKED: {
      message: "這個網站拒絕直接嵌入或顯示。",
      userAction: "請改用後端 relay 模式，或將此網站標示為部分支援。"
    },
    RESOURCE_DOMAIN_NOT_ALLOWED: {
      message: "此頁面需要額外資產網域，但那些網域尚未加入白名單。",
      userAction: "請把需要的資產網域加入白名單，或接受此網站目前只能部分顯示。"
    },
    URL_NOT_ALLOWED: {
      message: "這個網址不在目前網站允許的白名單範圍內。",
      userAction: "請確認你選的是正確的網站，並且網址符合允許的網域與路徑規則。"
    },
    PROJECT_NOT_FOUND: {
      message: "找不到這個專案。",
      userAction: "請重新整理後選擇仍存在的專案。"
    },
    TAB_NOT_FOUND: {
      message: "找不到這個分頁。",
      userAction: "請重新整理後選擇仍存在的分頁。"
    },
    BOOKMARK_NOT_FOUND: {
      message: "找不到這個書籤。",
      userAction: "請重新整理後選擇仍存在的書籤。"
    },
    NOTE_NOT_FOUND: {
      message: "找不到這則筆記。",
      userAction: "請重新整理後選擇仍存在的筆記。"
    },
    SESSION_VAULT_NOT_FOUND: {
      message: "找不到這筆工作階段保險庫資料。",
      userAction: "請重新整理後選擇仍存在的工作階段資料。"
    },
    SESSION_EXPIRED: {
      message: "這筆工作階段已過期。",
      userAction: "請重新登入或重新建立工作階段。"
    },
    LOGIN_PERSISTENCE_DISABLED: {
      message: "這個網站不允許保存登入狀態。",
      userAction: "請改用允許保存登入狀態的網站，或不要啟用記住登入。"
    },
    UPLOAD_PREVIEW_REQUIRED: {
      message: "上傳前必須先完成預覽。",
      userAction: "請先執行預覽，再進行核准與完成。"
    },
    FILE_TYPE_NOT_ALLOWED: {
      message: "這個檔案類型目前不允許。",
      userAction: "請改用支援的檔案類型，或更新網站設定。"
    },
    DOWNLOAD_DISABLED: {
      message: "這個網站不允許下載。",
      userAction: "請改用允許下載的網站。"
    },
    UPLOAD_DISABLED: {
      message: "這個網站不允許上傳。",
      userAction: "請改用允許上傳的網站。"
    },
    CONFLICT_RETRY: {
      message: "資料目前有衝突，無法直接完成。",
      userAction: "請重新整理後再試一次。"
    },
    SERVICE_UNAVAILABLE: {
      message: "OpenSky 服務目前暫時無法完成這個請求。",
      userAction: "請稍後再試；如果持續失敗，請查看後端 log。"
    },
    INVALID_INPUT: {
      message: "輸入資料格式不正確。",
      userAction: "請修正輸入內容後再試一次。"
    },
    FULLSCREEN_NOT_AVAILABLE: {
      message: "目前環境無法進入全螢幕。",
      userAction: "請改用最大化模式，或檢查瀏覽器的全螢幕權限。"
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
