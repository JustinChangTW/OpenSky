# 規格整理 v 1.2.2

> 專案名稱：**OpenSky**  
> 文件用途：**給 Codex 直接使用的最終版規格文件**  
> 架構前提：**GitHub Pages 前端 + Render 後端**  
> 使用對象：**單一使用者（同時也是唯一管理者）**

---

## 0. 文件定位

這份文件是 OpenSky 的 **Spec-first 最終版**，目的是讓 Codex 能在不反覆追問脈絡的情況下，依規格分階段完成開發。

本文件同時包含：

1. 技術規格文件（專業版）
2. 非技術規格文件（白話版）
3. Codex 分階段開發計畫
4. Claude Code 分階段開發計畫
5. 驗收條件、測試重點、風險與回滾方式

---

## 1. 背景

OpenSky 是一個 **合規、白名單制、單人使用的受管理外部網站入口**。

目標不是做任意網址的通用代理，也不是規避網路限制工具；而是讓唯一使用者可以透過純 Web 介面，進入少數已允許的外部網站，並且：

- 保存工作區與專案
- 保存分頁、收藏、筆記
- 恢復上次瀏覽位置與畫面配置
- 對已允許站點恢復有效的登入續用狀態
- 以「中央內容最大化」為核心 UI 原則

---

## 2. 明確目標

### 2.1 產品目標
1. 提供白名單制外部網站入口。
2. 支援專案形式開啟並繼續編輯。
3. 支援收藏、筆記、分頁與畫面偏好保存。
4. 支援少量目標站點的受控導航。
5. 以中央網站顯示區最大化為 UI 第一優先。

### 2.2 成功標準
1. 非白名單網址一律阻擋。
2. 專案可完整恢復工作區狀態。
3. 收藏、筆記、分頁均可完整 CRUD。
4. 已允許站點可恢復仍有效的登入續用狀態。
5. 進入滿版模式後，中央網站區成為主要畫面區域。
6. 代表性目標站點的核心任務完成率達到可驗收標準。

---

## 3. 範圍 / 不做什麼

### 3.1 In Scope
- 單一使用者登入
- 白名單網站 CRUD
- 專案 CRUD
- 分頁 CRUD
- 收藏 CRUD
- 筆記 CRUD
- 畫面版面偏好保存
- 受控導航
- 登入續用資料保存與撤銷
- 檔案預覽與傳輸流程
- 稽核記錄

### 3.2 Out of Scope
- 任意網址代理
- 多使用者權限系統
- 公開分享
- 匿名化或規避公司政策能力
- 保證所有網站完整相容
- 本期內建 LLM 助手

### 3.3 明確不做
1. 不允許輸入任意網址直接開啟。
2. 不在 GitHub Pages 上承載動態處理邏輯。
3. 不預設保存外部網站明文密碼。
4. 不承諾所有網站完全還原原站體驗。

---

## 4. Persona

### Owner-Admin
- 唯一使用者
- 唯一管理者
- 希望用瀏覽器集中管理少數外站入口
- 需要把工作上下文保存成專案
- 不希望大量維護基礎設施

---

## 5. 技術架構

### 5.1 架構選型
- 前端：**GitHub Pages**
- 後端：**Render Web Service**
- 前端職責：
  - 靜態網站 UI
  - 專案頁、站點管理頁、工作區頁
  - 面板開關、滿版模式、全螢幕模式
- 後端職責：
  - 登入
  - 白名單策略檢查
  - 專案持久化
  - 分頁 / 收藏 / 筆記 / 版面偏好保存
  - 受控導航 API
  - 續用狀態保存
  - 檔案預覽與傳輸
  - 稽核事件

### 5.2 能力邊界
- GitHub Pages 只能承載靜態前端。
- Render 承擔所有動態能力。
- 若使用 Render 免費方案，須接受閒置後 spin down 與冷啟動延遲風險。

### 5.3 系統模組
前端：
- Auth UI
- Site Registry UI
- Project Workspace UI
- Tab / Bookmark / Note UI
- Layout Controls
- Error / Activity Banner

後端：
- Auth Service
- Policy / Allowlist Service
- Project Persistence Service
- Session Vault Service
- Browse Gateway Service
- File Transfer Service
- Audit Service

---

## 6. SVG：前後端模組架構圖

```svg
<svg width="980" height="560" viewBox="0 0 980 560" xmlns="http://www.w3.org/2000/svg">
  <rect width="980" height="560" fill="#F8FAFC"/>
  <text x="40" y="40" font-size="24" font-family="Arial" fill="#0F172A">OpenSky 架構圖（GitHub Pages + Render）</text>

  <rect x="40" y="80" width="260" height="380" rx="16" fill="#E0F2FE" stroke="#7DD3FC"/>
  <text x="60" y="115" font-size="20" font-family="Arial" fill="#0C4A6E">前端：GitHub Pages</text>
  <rect x="60" y="145" width="220" height="40" rx="10" fill="#FFFFFF" stroke="#93C5FD"/>
  <text x="78" y="170" font-size="14" font-family="Arial" fill="#1E3A8A">Auth UI</text>
  <rect x="60" y="195" width="220" height="40" rx="10" fill="#FFFFFF" stroke="#93C5FD"/>
  <text x="78" y="220" font-size="14" font-family="Arial" fill="#1E3A8A">Site Registry UI</text>
  <rect x="60" y="245" width="220" height="40" rx="10" fill="#FFFFFF" stroke="#93C5FD"/>
  <text x="78" y="270" font-size="14" font-family="Arial" fill="#1E3A8A">Project Workspace UI</text>
  <rect x="60" y="295" width="220" height="40" rx="10" fill="#FFFFFF" stroke="#93C5FD"/>
  <text x="78" y="320" font-size="14" font-family="Arial" fill="#1E3A8A">Tabs / Bookmarks / Notes</text>
  <rect x="60" y="345" width="220" height="40" rx="10" fill="#FFFFFF" stroke="#93C5FD"/>
  <text x="78" y="370" font-size="14" font-family="Arial" fill="#1E3A8A">Layout / Error / Activity</text>

  <rect x="360" y="80" width="300" height="380" rx="16" fill="#DCFCE7" stroke="#86EFAC"/>
  <text x="380" y="115" font-size="20" font-family="Arial" fill="#14532D">後端：Render Web Service</text>
  <rect x="380" y="145" width="260" height="40" rx="10" fill="#FFFFFF" stroke="#4ADE80"/>
  <text x="398" y="170" font-size="14" font-family="Arial" fill="#166534">Auth Service</text>
  <rect x="380" y="195" width="260" height="40" rx="10" fill="#FFFFFF" stroke="#4ADE80"/>
  <text x="398" y="220" font-size="14" font-family="Arial" fill="#166534">Policy / Allowlist Service</text>
  <rect x="380" y="245" width="260" height="40" rx="10" fill="#FFFFFF" stroke="#4ADE80"/>
  <text x="398" y="270" font-size="14" font-family="Arial" fill="#166534">Project Persistence / Session Vault</text>
  <rect x="380" y="295" width="260" height="40" rx="10" fill="#FFFFFF" stroke="#4ADE80"/>
  <text x="398" y="320" font-size="14" font-family="Arial" fill="#166534">Browse Gateway / File Transfer</text>
  <rect x="380" y="345" width="260" height="40" rx="10" fill="#FFFFFF" stroke="#4ADE80"/>
  <text x="398" y="370" font-size="14" font-family="Arial" fill="#166534">Audit Service</text>

  <rect x="720" y="80" width="220" height="380" rx="16" fill="#FDE68A" stroke="#F59E0B"/>
  <text x="740" y="115" font-size="20" font-family="Arial" fill="#78350F">外部網站</text>
  <rect x="740" y="145" width="180" height="40" rx="10" fill="#FFFFFF" stroke="#FBBF24"/>
  <text x="760" y="170" font-size="14" font-family="Arial" fill="#92400E">Allowlisted Site A</text>
  <rect x="740" y="195" width="180" height="40" rx="10" fill="#FFFFFF" stroke="#FBBF24"/>
  <text x="760" y="220" font-size="14" font-family="Arial" fill="#92400E">Allowlisted Site B</text>
  <rect x="740" y="245" width="180" height="40" rx="10" fill="#FFFFFF" stroke="#FBBF24"/>
  <text x="760" y="270" font-size="14" font-family="Arial" fill="#92400E">Allowlisted Site C</text>

  <line x1="300" y1="270" x2="360" y2="270" stroke="#334155" stroke-width="3"/>
  <polygon points="360,270 350,264 350,276" fill="#334155"/>
  <line x1="660" y1="270" x2="720" y2="270" stroke="#334155" stroke-width="3"/>
  <polygon points="720,270 710,264 710,276" fill="#334155"/>
</svg>
```

---

## 7. 使用流程

### 7.1 主流程
1. 開啟 OpenSky 前端。
2. 使用者登入。
3. 建立新專案或開啟既有專案。
4. 系統恢復該專案的：
   - 最近分頁
   - 收藏
   - 筆記
   - 版面偏好
   - 有效續用狀態
5. 使用者從白名單網站中選擇站點。
6. 前端呼叫受控導航 API。
7. 後端檢查是否為白名單、是否啟用、是否允許續用/傳輸能力。
8. 中央內容區顯示站點內容。
9. 使用者可切換滿版模式或全螢幕模式。
10. 系統即時保存狀態。

### 7.2 異常流程
- 非白名單網址：阻擋並顯示原因
- 停用站點：不可開啟新導航
- 續用狀態過期：提示重新登入
- 上傳未預覽：阻擋提交
- Render 服務喚醒中：顯示明確提示

---

## 8. 功能清單（含 CRUD 與狀態）

### 8.1 AllowedSite
#### 功能
- Create
- Read
- Update
- Delete（軟刪除）

#### 欄位
- siteId
- displayName
- baseDomains[]
- pathRules[]
- defaultRenderMode
- loginPersistenceAllowed
- downloadAllowed
- uploadAllowed
- status
- createdAt
- updatedAt

#### 狀態
- active
- disabled
- archived
- deleted

---

### 8.2 WorkspaceProject
#### 功能
- Create
- Read
- Update
- Delete（軟刪除）

#### 欄位
- projectId
- name
- description
- defaultSiteId
- status
- lastOpenedAt
- createdAt
- updatedAt

#### 狀態
- draft
- active
- paused
- archived
- deleted

---

### 8.3 WorkspaceTab
#### 功能
- Create
- Read
- Update
- Delete

#### 欄位
- tabId
- projectId
- siteId
- entryUrl
- currentUrl
- pageTitle
- renderMode
- scrollPosition
- zoomRatio
- pinned
- status
- lastVisitedAt

#### 狀態
- open
- suspended
- closed
- deleted

---

### 8.4 Bookmark
#### 功能
- Create
- Read
- Update
- Delete

#### 欄位
- bookmarkId
- projectId?
- siteId
- url
- title
- note
- status
- createdAt
- updatedAt

#### 狀態
- active
- archived
- deleted

---

### 8.5 Note
#### 功能
- Create
- Read
- Update
- Delete

#### 欄位
- noteId
- projectId
- relatedTabId?
- title
- content
- status
- createdAt
- updatedAt

#### 狀態
- active
- archived
- deleted

---

### 8.6 ExternalSessionVault
#### 功能
- Create
- Read
- Update
- Delete

#### 欄位
- vaultId
- siteId
- projectId?
- persistenceScope
- secretType
- rememberUntil
- status
- createdAt
- updatedAt

#### 狀態
- active
- expired
- revoked
- deleted

---

### 8.7 FileTransferItem
#### 功能
- Create
- Read
- Update
- Delete

#### 欄位
- itemId
- projectId
- siteId
- direction
- originalName
- mimeType
- sizeBytes
- previewStatus
- transferStatus
- createdAt
- updatedAt

#### 狀態
- pending
- preview_ready
- approved
- completed
- failed
- deleted

#### 規則
- 上傳前必須先預覽
- 不支援預覽的檔案必須明確提示

---

### 8.8 AuditEvent
#### 功能
- Read
- Update（redact）
- Delete（purge）

#### 欄位
- eventId
- actorId
- action
- targetType
- targetId
- result
- occurredAt
- retentionState

#### 狀態
- active
- redacted
- purged

---

### 8.9 LayoutPreference
#### 功能
- Create
- Read
- Update
- Delete（重設）

#### 欄位
- layoutPreferenceId
- scope = global | project
- projectId?
- leftPanelState
- rightPanelState
- topBarState
- bottomBarState
- viewMode
- focusMode
- contentZoomRatio
- createdAt
- updatedAt

---

## 9. 狀態與持久化（強制）

### 必須持久化的 state
- 專案狀態
- 分頁狀態
- 收藏
- 筆記
- 最近導航位置
- 滾動位置
- 縮放比例
- 左欄狀態
- 右欄狀態
- 頂部列狀態
- 底部列狀態
- viewMode
- focusMode
- 有效續用狀態

### 優先順序
1. 專案級偏好
2. 全域偏好
3. 系統預設值

---

## 10. G3M

### Goal
建立單人、白名單制、可保存工作區的外站入口。

### Gaps
1. 目標站點相容性不同。
2. 免費 Render 方案有冷啟動延遲。
3. GitHub Pages 只承擔靜態前端。

### Metrics
- 非白名單阻擋率：100%
- 專案恢復成功率：>= 95%
- 代表性站點核心任務成功率：>= 80%
- 上傳預覽覆蓋率：100%
- 稽核覆蓋率：100%

---

## 11. UI 設計（最終版）

### 11.1 設計原則
**中央網站顯示區必須盡可能大。**

### 11.2 版面規則
1. 左側欄可：
   - expanded
   - collapsed
   - hidden

2. 右側欄可：
   - expanded
   - collapsed
   - hidden

3. 頂部列可：
   - expanded
   - compact
   - autoHide
   - hidden

4. 底部列可：
   - expanded
   - collapsed
   - autoHide
   - hidden

5. 視圖模式：
   - standard
   - maximized
   - fullscreen

6. focusMode：
   - on
   - off

### 11.3 顯示模式定義
#### standard
- 一般工作模式
- 可見精簡頂部列
- 左右欄可展開或收起

#### maximized
- 預設建議模式
- 左右欄預設 hidden
- 頂部列 autoHide
- 底部列 autoHide
- 中央網站區占主要空間

#### fullscreen
- 在 maximized 基礎上
- 嘗試進入瀏覽器全螢幕
- 失敗時退回 maximized

### 11.4 視覺規範
- 背景：#F8FAFC
- 卡片：#FFFFFF
- 主色：#0EA5E9
- 成功：#22C55E
- 警示：#F59E0B
- 錯誤：#EF4444
- 文字：#0F172A
- 邊框：#CBD5E1
- 預設模式：**淺色模式**

### 11.5 版面驗收規則
1. maximized 模式下，中央網站區應佔主畫面可用空間的 95% 以上。
2. fullscreen 模式下，若瀏覽器允許，中央網站區應接近整個螢幕。
3. 所有面板切換都不得破壞內容縮放比例。

---

## 12. SVG：主要畫面 UI layout（滿版最終版）

```svg
<svg width="1080" height="620" viewBox="0 0 1080 620" xmlns="http://www.w3.org/2000/svg">
  <rect width="1080" height="620" fill="#F8FAFC"/>
  <text x="24" y="32" font-size="24" font-family="Arial" fill="#0F172A">OpenSky 主畫面示意（滿版最終版）</text>

  <rect x="20" y="50" width="1040" height="42" rx="12" fill="#FFFFFF" stroke="#CBD5E1"/>
  <text x="38" y="76" font-size="13" font-family="Arial" fill="#334155">精簡頂部列：專案 / 站點 / 狀態 / 展開控制</text>

  <rect x="20" y="108" width="44" height="460" rx="12" fill="#FFFFFF" stroke="#CBD5E1"/>
  <text x="31" y="160" font-size="12" font-family="Arial" fill="#475569" transform="rotate(90 31,160)">左欄</text>

  <rect x="78" y="108" width="860" height="460" rx="14" fill="#FFFFFF" stroke="#CBD5E1"/>
  <text x="100" y="140" font-size="16" font-family="Arial" fill="#0F172A">中央網站顯示區（最大化）</text>
  <rect x="100" y="160" width="816" height="372" rx="10" fill="#F8FAFC" stroke="#CBD5E1"/>
  <text x="420" y="350" font-size="20" font-family="Arial" fill="#64748B">網站內容主要顯示在這裡</text>
  <text x="230" y="555" font-size="12" font-family="Arial" fill="#64748B">左右欄可滑出；maximized / fullscreen 以內容區最大化為優先</text>

  <rect x="952" y="108" width="44" height="460" rx="12" fill="#FFFFFF" stroke="#CBD5E1"/>
  <text x="963" y="160" font-size="12" font-family="Arial" fill="#475569" transform="rotate(90 963,160)">右欄</text>

  <rect x="20" y="582" width="1040" height="18" rx="8" fill="#E2E8F0" stroke="#CBD5E1"/>
  <text x="36" y="595" font-size="11" font-family="Arial" fill="#64748B">底部提示列預設收起；有錯誤、傳輸或警告時才展開</text>
</svg>
```

---

## 13. API 規格

### Auth
- POST /v1/auth/sign-in
- POST /v1/auth/sign-out
- GET /v1/me

### Sites
- GET /v1/sites
- POST /v1/sites
- GET /v1/sites/{siteId}
- PATCH /v1/sites/{siteId}
- DELETE /v1/sites/{siteId}

### Projects
- GET /v1/projects
- POST /v1/projects
- GET /v1/projects/{projectId}
- PATCH /v1/projects/{projectId}
- DELETE /v1/projects/{projectId}

### Tabs
- GET /v1/projects/{projectId}/tabs
- POST /v1/projects/{projectId}/tabs
- PATCH /v1/projects/{projectId}/tabs/{tabId}
- DELETE /v1/projects/{projectId}/tabs/{tabId}

### Bookmarks
- GET /v1/bookmarks
- POST /v1/bookmarks
- PATCH /v1/bookmarks/{bookmarkId}
- DELETE /v1/bookmarks/{bookmarkId}

### Notes
- GET /v1/notes
- POST /v1/notes
- PATCH /v1/notes/{noteId}
- DELETE /v1/notes/{noteId}

### Browse
- POST /v1/browse/open
- POST /v1/browse/navigate
- POST /v1/browse/close

### Session Vault
- GET /v1/session-vault
- POST /v1/session-vault
- PATCH /v1/session-vault/{vaultId}
- DELETE /v1/session-vault/{vaultId}

### File Transfer
- POST /v1/file-transfer
- POST /v1/file-transfer/{itemId}/preview
- POST /v1/file-transfer/{itemId}/approve
- POST /v1/file-transfer/{itemId}/complete
- DELETE /v1/file-transfer/{itemId}

### Audit
- GET /v1/audit

### Layout Preference
- GET /v1/layout-preferences
- POST /v1/layout-preferences
- PATCH /v1/layout-preferences/{layoutPreferenceId}
- DELETE /v1/layout-preferences/{layoutPreferenceId}

---

## 14. 錯誤碼

- AUTH_REQUIRED
- FORBIDDEN
- SITE_NOT_FOUND
- SITE_DISABLED
- URL_NOT_ALLOWED
- PROJECT_NOT_FOUND
- TAB_NOT_FOUND
- BOOKMARK_NOT_FOUND
- NOTE_NOT_FOUND
- SESSION_VAULT_NOT_FOUND
- SESSION_EXPIRED
- LOGIN_PERSISTENCE_DISABLED
- UPLOAD_PREVIEW_REQUIRED
- FILE_TYPE_NOT_ALLOWED
- DOWNLOAD_DISABLED
- UPLOAD_DISABLED
- CONFLICT_RETRY
- SERVICE_UNAVAILABLE
- INVALID_INPUT
- FULLSCREEN_NOT_AVAILABLE

### 錯誤回應格式
每個錯誤都必須包含：
- code
- message
- userAction
- traceId

---

## 15. 狀態機

### 15.1 Project
- draft -> active
- active -> paused
- paused -> active
- active -> archived
- paused -> archived
- draft/active/paused/archived -> deleted

### 15.2 Tab
- open <-> suspended
- open -> closed
- suspended -> closed
- closed -> open
- open/suspended/closed -> deleted

### 15.3 SessionVault
- active -> expired
- active -> revoked
- expired -> deleted
- revoked -> deleted
- active -> deleted

### 15.4 FileTransfer
- pending -> preview_ready -> approved -> completed
- pending -> failed
- preview_ready -> failed
- approved -> failed
- completed -> deleted
- failed -> deleted

---

## 16. 非功能需求

### 效能
- 前端殼層載入：P95 <= 2.5 秒
- 專案恢復：P95 <= 3 秒（不含外站回應）
- 服務冷啟動需有前端明確提示

### 安全
- 必須登入
- 只能開白名單
- 外站明文密碼不預設保存
- 稽核事件要可查

### 可用性
- 錯誤提示要可執行
- 滿版與全螢幕切換不能讓畫面錯亂
- 所有縮放保持比例

### 可維護性
- 前後端契約獨立
- 儲存層抽象
- 最小差異原則
- 優先保留向下相容

---

## 17. 驗收條件

1. 可完整 CRUD 站點。
2. 可完整 CRUD 專案、分頁、收藏、筆記。
3. 非白名單網址一律被阻擋。
4. 專案重新開啟時可恢復工作區。
5. 可保存與恢復有效續用狀態。
6. 上傳前必須先預覽。
7. 左右欄可展開 / 收起 / 隱藏。
8. 可切換 maximized 模式。
9. 可切換 fullscreen 模式；若失敗要退回 maximized 並提示原因。
10. 重新進入專案時可恢復版面偏好。
11. 任一縮放行為都不得破壞原始寬高比。
12. Render 後端可獨立部署，GitHub Pages 前端可獨立發布。

---

## 18. Edge / Abuse cases

### Edge cases
1. 外站重導向到非白名單網域  
   - 阻擋並提示
2. 續用狀態過期  
   - 清除失效資料，要求重登
3. 檔案類型不支援預覽  
   - 阻擋或標記 unsupported
4. fullscreen 無法啟用  
   - 回退 maximized，顯示 FULLSCREEN_NOT_AVAILABLE
5. Render 冷啟動中  
   - 顯示服務喚醒中狀態，不顯示為硬錯誤

### Abuse cases
1. 試圖輸入任意網址  
   - 阻擋、記錄稽核
2. 重複送出表單或檔案  
   - 去重鍵或提交鎖
3. 利用外站跳轉繞過白名單  
   - 每次導航都重驗證
4. 用失效續用資料嘗試進入  
   - 返回 SESSION_EXPIRED

---

# 19. 非技術規格文件（白話版）

## 19.1 這個系統是什麼
OpenSky 是你自己用的網站入口。  
你可以把常用的外部網站收進來，之後從同一個地方進入、做筆記、收藏，並保存工作進度。

## 19.2 能做什麼
- 管理允許網站
- 建立專案
- 保存常用頁面
- 記住上次看到哪裡
- 保存筆記與收藏
- 讓中間網站內容盡量放大
- 在需要時進入滿版或全螢幕

## 19.3 不能做什麼
- 不能打開任何網址
- 不能保證所有網站都完全一樣
- 不是任意網站通行工具

## 19.4 你怎麼用
1. 打開 OpenSky
2. 登入
3. 選專案
4. 選一個允許網站
5. 中間大畫面看內容
6. 不需要的工具欄都可以收起
7. 下次回來會恢復你上次的狀態

## 19.5 畫面會長怎樣
- 中間：最大內容區
- 左右：需要時才打開的工具欄
- 上面：精簡列，可自動隱藏
- 下面：平常收起，有訊息才展開

## 19.6 你會看到的提示語
- 這個網站不在允許清單中，已停止開啟
- 先前的登入狀態已失效，請重新登入
- 這份檔案需要先預覽才能送出
- 服務喚醒中，請稍後再試
- 無法進入全螢幕，已切回滿版模式

---

# 20. Codex 分階段開發計畫

> 切分原則：以可交付、可測試、可回滾的垂直切片為單位。

## Stage 0：建立專案骨架與規範
### 目標
建立 monorepo、前後端骨架、共用契約、測試框架與部署基礎。

### 前置條件
無

### Codex Instructions
```text
建議貼用方式：
- 直接貼給 Codex
- 將長期規則同步到 AGENTS.md

任務範圍：
- 建立 OpenSky monorepo
- 建立 apps/web (GitHub Pages) 與 apps/service (Render)
- 建立 contracts / policy / persistence / test-utils
- 不做實際業務功能

需修改/新增的檔案清單：
- package.json
- workspace 設定
- AGENTS.md
- README.md
- apps/web/*
- apps/service/*
- packages/contracts/*
- packages/policy/*
- packages/persistence/*
- packages/test-utils/*
- docs/specs/opensky-spec.md

具體步驟：
1. 初始化 workspace
2. 建立 web 與 service 啟動程式
3. 建立共用型別與錯誤碼
4. 建立 policy matcher 骨架
5. 建立 persistence 介面與假實作
6. 補 lint / typecheck / test / build
7. 補 GitHub Pages 與 Render 的 deploy README

輸出格式要求：
- files changed
- commands run
- placeholders remaining

測試要求：
- install
- lint
- typecheck
- test

驗收標準（DoD）：
- web 可建置為靜態網站
- service 可本地啟動
- contracts / policy / persistence 邊界清楚
- 本 stage 無 LLM；若未來加入，必須 Streaming
```

### 風險與回滾方式
- 風險：目錄命名日後大量重構
- 回滾：固定 contracts / policy / persistence 邊界，只調整工具與目錄

---

## Stage 1：實作登入與主畫面殼層
### 目標
完成單一使用者登入、主畫面殼層、全域錯誤提示。

### 前置條件
Stage 0

### Codex Instructions
```text
建議貼用方式：
- 直接貼給 Codex
- auth/session 規則補進 AGENTS.md

任務範圍：
- 實作 owner-only auth
- 實作主畫面 shell
- 實作 layout control 的基礎結構
- 不做站點 CRUD 與瀏覽功能

需修改/新增的檔案清單：
- apps/web/src/features/auth/*
- apps/web/src/features/layout/*
- apps/service/src/auth/*
- packages/contracts/src/auth/*

具體步驟：
1. 定義 auth contracts
2. 實作 sign-in / sign-out / me
3. 做 protected routes
4. 做 top bar / left rail / right rail / bottom banner 的可收起式骨架
5. 建立 maximized 為預設 viewMode

輸出格式要求：
- files changed
- commands run
- test results

測試要求：
- auth unit/integration
- route protection
- error banner rendering
- layout shell rendering

驗收標準（DoD）：
- 未登入不可進入主畫面
- 已登入可見主畫面殼層
- maximized 為預設模式
- sign-out 生效
```

### 風險與回滾方式
- 風險：layout state 與 auth state 混雜
- 回滾：保留獨立 layout store，僅回退 UI 呈現

---

## Stage 2：實作白名單網站管理與策略檢查
### 目標
完成 AllowedSite CRUD 與 URL allowlist matcher。

### 前置條件
Stage 1

### Codex Instructions
```text
建議貼用方式：
- 直接貼給 Codex

任務範圍：
- 做站點管理 CRUD
- 做白名單規則驗證
- 不做內容轉送

需修改/新增的檔案清單：
- apps/web/src/features/sites/*
- apps/service/src/sites/*
- packages/contracts/src/sites/*
- packages/policy/src/*
- packages/persistence/src/sites/*

具體步驟：
1. 定義 AllowedSite model
2. 做 list/create/get/update/delete
3. 做 baseDomains/pathRules matcher
4. 在 browse guard 前掛 matcher

輸出格式要求：
- changed files
- validation summary
- tests

測試要求：
- matcher unit tests
- CRUD integration tests
- blocked URL tests

驗收標準（DoD）：
- 可完整 CRUD
- 非白名單網址一律被擋
```

### 風險與回滾方式
- 風險：pathRules 過於複雜
- 回滾：先保留 baseDomains + prefix pathRules 最小集合

---

## Stage 3：實作專案、分頁、收藏、筆記與版面偏好
### 目標
滿足「以專案形式開啟並繼續編輯」，並保存版面狀態。

### 前置條件
Stage 2

### Codex Instructions
```text
建議貼用方式：
- 直接貼給 Codex

任務範圍：
- 做 Project / Tab / Bookmark / Note / LayoutPreference 的完整 CRUD
- 保存 scrollPosition / zoomRatio / viewMode / panel states
- 不做外站續用

需修改/新增的檔案清單：
- apps/web/src/features/projects/*
- apps/web/src/features/tabs/*
- apps/web/src/features/bookmarks/*
- apps/web/src/features/notes/*
- apps/web/src/features/layout-preferences/*
- apps/service/src/projects/*
- apps/service/src/tabs/*
- apps/service/src/bookmarks/*
- apps/service/src/notes/*
- apps/service/src/layout-preferences/*
- packages/persistence/src/*

具體步驟：
1. 定義五類實體
2. 做 CRUD
3. 做工作區保存與恢復
4. 做 maximized / fullscreen / focusMode 狀態保存
5. 補狀態機與恢復測試

輸出格式要求：
- changed files
- persistence summary
- tests

測試要求：
- CRUD
- project reopen
- tab restore
- zoom persistence
- layout preference restore

驗收標準（DoD）：
- 專案可保存與續編
- 重新進入專案可恢復版面偏好
- 所有縮放保持比例
```

### 風險與回滾方式
- 風險：project state 與 layout state 耦合過深
- 回滾：保持 LayoutPreference 為獨立實體

---

## Stage 4：實作受控導航與外站入口
### 目標
完成 browse API，讓白名單站點可被受控開啟與導航。

### 前置條件
Stage 2、3

### Codex Instructions
```text
建議貼用方式：
- 直接貼給 Codex

任務範圍：
- 做 browse open / navigate / close
- 每次導航都做 allowlist 檢查
- 同步 currentUrl/pageTitle 到 tab
- 不承諾所有網站完整相容

需修改/新增的檔案清單：
- apps/web/src/features/browse/*
- apps/service/src/browse/*
- packages/contracts/src/browse/*

具體步驟：
1. 定義 browse contracts
2. 實作 open/navigate/close
3. 導向前做 allowlist 驗證
4. 更新 tab 狀態與頁面資訊
5. 補 blocked redirect tests

輸出格式要求：
- changed files
- supported interactions
- unsupported interactions
- tests

測試要求：
- open/navigate/close integration
- blocked redirect
- tab sync

驗收標準（DoD）：
- 白名單站點可受控開啟
- 非白名單導向被阻擋
```

### 風險與回滾方式
- 風險：高互動網站支援不足
- 回滾：明確列出 unsupported interactions，不做隱性失敗

---

## Stage 5：實作登入續用、檔案預覽、稽核與滿版/全螢幕互動
### 目標
完成 SessionVault、檔案預覽流程、稽核查詢、maximized/fullscreen/focusMode 的完整互動。

### 前置條件
Stage 4

### Codex Instructions
```text
建議貼用方式：
- 直接貼給 Codex

任務範圍：
- 做 SessionVault CRUD
- 做 file transfer preview -> approve -> complete
- 做 audit list
- 做 maximized / fullscreen / focusMode 互動
- 顯示 Render 服務喚醒中的狀態

需修改/新增的檔案清單：
- apps/web/src/features/session-vault/*
- apps/web/src/features/file-transfer/*
- apps/web/src/features/audit/*
- apps/web/src/features/layout/*
- apps/service/src/session-vault/*
- apps/service/src/file-transfer/*
- apps/service/src/audit/*
- packages/contracts/src/session-vault/*
- packages/contracts/src/file-transfer/*
- packages/contracts/src/audit/*

具體步驟：
1. 定義 SessionVault / FileTransfer / Audit model
2. 做 CRUD 與狀態流
3. 上傳前強制 preview
4. 做 audit list
5. 做 fullscreen failure fallback -> maximized
6. 補 service unavailable / warmup UI

輸出格式要求：
- changed files
- flow summary
- tests
- risks

測試要求：
- session restore / expire / revoke
- preview required
- audit coverage
- fullscreen fallback
- service unavailable handling

驗收標準（DoD）：
- 續用狀態可保存與撤銷
- 上傳必先預覽
- 稽核可查
- fullscreen 失敗可退回 maximized
- 前端可明確處理 Render 喚醒延遲
```

### 風險與回滾方式
- 風險：瀏覽器全螢幕 API 行為差異
- 回滾：保留 maximized 作為穩定主模式

---

## Stage 6：整合測試 / 回歸測試 / 邊界測試補齊
### 目標
補齊整合、回歸與高風險邊界測試，形成可交付基線。

### 前置條件
Stage 0~5

### Codex Instructions
```text
建議貼用方式：
- 直接貼給 Codex

任務範圍：
- 補整合測試與邊界測試
- 不新增功能，只修必要問題

需修改/新增的檔案清單：
- apps/web/tests/*
- apps/service/tests/*
- packages/test-utils/*
- docs/testing-matrix.md

具體步驟：
1. 建 test matrix
2. 補 integration/regression tests
3. 補 boundary tests：blocked redirect、expired session、preview required、fullscreen fallback、warmup handling
4. 僅做必要修正

輸出格式要求：
- changed files
- commands run
- pass/fail summary
- fixed defects
- remaining gaps

測試要求：
- full suite
- lint
- typecheck
- build

驗收標準（DoD）：
- 核心流程與高風險邊界有自動化測試
- 測試結果可追溯
```

### 風險與回滾方式
- 風險：測試補齊時暴露架構缺口
- 回滾：限制修正範圍，優先保持契約穩定

---

## Stage 7：文件化與交付
### 目標
完成部署、操作、限制、已知問題與交付文件。

### 前置條件
Stage 0~6

### Codex Instructions
```text
建議貼用方式：
- 直接貼給 Codex
- 長期規則同步更新 AGENTS.md

任務範圍：
- 完成 README、部署說明、操作手冊、限制、已知問題
- 不新增功能

需修改/新增的檔案清單：
- README.md
- docs/deployment.md
- docs/operations.md
- docs/limitations.md
- docs/known-issues.md
- docs/testing-matrix.md
- AGENTS.md

具體步驟：
1. 撰寫啟動、建置、測試、部署說明
2. 撰寫站點管理、專案、續用、滿版與全螢幕操作說明
3. 列出限制與已知問題
4. 更新 AGENTS.md

輸出格式要求：
- changed files
- docs added/updated
- commands run
- final handoff summary
- known issues

測試要求：
- build
- README smoke run
- deploy dry run

驗收標準（DoD）：
- 新成員可依 README 啟動專案
- 有完整部署與操作說明
- 限制與已知問題透明
```

### 風險與回滾方式
- 風險：文件與實作不一致
- 回滾：以通過測試的行為為準修正文檔

---

# 21. Claude Code 分階段開發計畫

## Stage 0：建立專案骨架與規範
```text
建議貼用方式：
- 直接貼給 Claude Code
- 將持續規則寫入 CLAUDE.md

任務範圍：
- 建立 OpenSky 骨架與規範
- 不做業務功能

需修改/新增的檔案清單：
- web/service/contracts/policy/persistence/test-utils
- README.md
- CLAUDE.md

具體步驟：
1. 初始化 monorepo
2. 建立 web/service 基礎
3. 補 contracts / policy / persistence
4. 補 lint/test/build

輸出格式要求：
- changed files
- commands run
- risks

測試要求：
- lint
- typecheck
- test

驗收標準（DoD）：
- 專案可安裝、可啟動、可建置
- 本 stage 無 LLM；若未來加入，必須 Streaming
```

## Stage 1：登入與主畫面殼層
```text
建議貼用方式：
- 直接貼給 Claude Code

任務範圍：
- 做 owner-only auth 與主畫面殼層
- maximized 為預設 viewMode

需修改/新增的檔案清單：
- auth UI/service/contracts
- layout UI

具體步驟：
1. 做 auth API
2. 做 protected routes
3. 做主畫面殼層
4. 做 error banner
5. 做可收起式 layout 骨架

輸出格式要求：
- changed files
- commands run
- risks

測試要求：
- auth tests
- route protection
- layout rendering

驗收標準（DoD）：
- owner 可登入登出
- 殼層可用
- maximized 為預設
```

## Stage 2：站點管理與白名單檢查
```text
建議貼用方式：
- 直接貼給 Claude Code

任務範圍：
- 做站點 CRUD 與白名單檢查

需修改/新增的檔案清單：
- sites UI/service/contracts/policy

具體步驟：
1. 定義 model
2. 做 CRUD
3. 做 matcher
4. 補阻擋測試

輸出格式要求：
- changed files
- commands run
- tests

測試要求：
- CRUD
- matcher
- blocked URL

驗收標準（DoD）：
- 站點可管理
- 非白名單會被阻擋
```

## Stage 3：專案、分頁、收藏、筆記、版面偏好
```text
建議貼用方式：
- 直接貼給 Claude Code

任務範圍：
- 做專案、分頁、收藏、筆記、版面偏好 CRUD 與恢復

需修改/新增的檔案清單：
- project/tab/bookmark/note/layout-preference UI + service + persistence

具體步驟：
1. 定義實體
2. 做 CRUD
3. 做 reopen restore
4. 補測試

輸出格式要求：
- changed files
- commands run
- tests

測試要求：
- CRUD
- project reopen
- layout restore

驗收標準（DoD）：
- 工作區可保存與恢復
- 版面偏好可恢復
```

## Stage 4：受控導航與外站入口
```text
建議貼用方式：
- 直接貼給 Claude Code

任務範圍：
- 做受控導航 API 與前端整合

需修改/新增的檔案清單：
- browse UI/service/contracts

具體步驟：
1. 定義 API
2. 做 open/navigate/close
3. 做 blocked redirect
4. 同步 tab state

輸出格式要求：
- changed files
- commands run
- tests

測試要求：
- browse integration
- blocked redirect
- tab sync

驗收標準（DoD）：
- 站點可開啟
- 非白名單會被擋
```

## Stage 5：續用、檔案預覽、稽核、滿版/全螢幕
```text
建議貼用方式：
- 直接貼給 Claude Code

任務範圍：
- 做續用、檔案預覽、稽核與服務喚醒提示
- 做 maximized / fullscreen / focusMode

需修改/新增的檔案清單：
- session-vault/file-transfer/audit/layout UI + service

具體步驟：
1. 做 SessionVault
2. 做 file preview flow
3. 做 audit list
4. 做 fullscreen fallback
5. 補 warmup / unavailable UI

輸出格式要求：
- changed files
- commands run
- tests

測試要求：
- session restore
- preview required
- audit coverage
- fullscreen fallback
- warmup handling

驗收標準（DoD）：
- 續用與檔案流程完整
- 稽核可見
- fullscreen 失敗可退回 maximized
```

## Stage 6：測試、部署、文件化
```text
建議貼用方式：
- 直接貼給 Claude Code

任務範圍：
- 補測試、部署、文件化
- 不新增功能

需修改/新增的檔案清單：
- tests
- GitHub workflow
- README / deployment docs
- CLAUDE.md

具體步驟：
1. 補 test matrix
2. 補 integration/regression tests
3. 補 GitHub Pages + Render deploy docs
4. 補 known issues
5. 更新 CLAUDE.md

輸出格式要求：
- changed files
- commands run
- pass/fail
- unresolved gaps

測試要求：
- full suite
- build
- deploy dry run

驗收標準（DoD）：
- 可依文件部署
- 測試與限制說明完整
```

---

## 22. 一致性檢查

本文件已滿足以下規則：

- 每個主要物件都定義 Create / Update / Delete 與狀態
- 已定義 state 管理與持久化
- 支援以專案形式開啟並續編
- 上傳需先預覽
- 所有縮放維持原始寬高比
- UI 以中央內容最大化為優先
- 滿版與全螢幕為正式規格的一部分
- 本期無 LLM；若未來加入，一律 Streaming

---

## 23. 建議 repo 內檔名

建議將本文件存放為：

`docs/specs/opensky-codex-spec-final.md`

建議另建立：

- `AGENTS.md`
- `CLAUDE.md`

並把本文件中的分階段 instructions 分別整理進兩者。
---

## 24. Long-term Stealth Direction Addendum

OpenSky may evolve toward a more seamless or "stealth-feel" browsing experience, but this direction remains constrained by the core product boundary.

The intended meaning is:

- allowlist-only backend relay
- backend-managed external site session handling
- reducing direct browser-to-external-origin coupling where feasible
- preserving the existing single-user workspace model

This addendum does not authorize:

- generic proxy behavior
- arbitrary URL relay
- network restriction bypass behavior
- silent masking of unsupported sites

If future implementation follows this direction, it must:

- relay only allowlisted domains and allowed paths
- remain project/tab scoped rather than open-ended
- preserve explicit unsupported-site signaling
- keep GitHub Pages as frontend-only and Render as the dynamic enforcement layer
