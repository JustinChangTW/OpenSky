# OpenSky

OpenSky 是一個單一使用者、allowlist-based 的外部網站工作區。

目前專案的固定架構是：

- 前端：GitHub Pages 靜態網站
- 後端：Render Web Service
- 使用者模型：單一 owner-admin
- 產品邊界：allowlist-only 的受控 web access workspace，不是任意網址瀏覽器，也不是通用 proxy

這份 README 的目標不是描述理想架構，而是根據目前 repo 的真實狀態，讓接手者可以：

- 理解專案
- 在本機啟動與測試
- 設定 GitHub Pages
- 設定 Render
- 設定 Firestore persistence
- 知道哪些地方仍需人工確認

## Project Overview

OpenSky 提供受控的外部網站工作區，讓唯一使用者可以：

- 管理 allowlisted sites
- 建立與恢復 projects
- 保存 tabs / bookmarks / notes
- 保存 layout preferences
- 使用 backend 管理 browse / session vault / file transfer / audit

### Long-term Direction: 「無痕」體感

OpenSky 的長期 UX 方向可以描述為：

- 讓使用者感受到更接近 same-origin 的受控外站工作區
- 盡量由 OpenSky backend 接手 allowlisted site 的 relay / session handling
- 讓瀏覽器越少直接碰觸外部 origin 越好

但這個方向有明確邊界：

- 這不代表 OpenSky 會變成任意網址 proxy
- 這不代表會支援 arbitrary browsing
- 這不代表會繞過網站本身的安全限制或瀏覽器政策

正確定義應該是：

- `allowlist-only backend relay`
- `managed external site shell`
- `controlled same-origin feel where feasible`

目前已落地的前置基礎包括：

- frontend 對 backend request 已支援 `credentials: "include"`
- backend auth 已接受 `HttpOnly` session cookie
- backend 已有本機 / Pages 所需的 CORS 與 credential handling

這些是後續實作 allowlisted relay 的基礎，不代表完整 relay 已全部完成。

目前 repo 已具備可驗證的 MVP baseline，並已補上：

- file-backed JSON persistence
- Firestore-backed persistence baseline
- GitHub Pages deployment workflow
- Render backend startup 與 runtime config

## Tech Stack

目前 repo 實際使用的是：

- Node.js ESM monorepo
- npm workspaces
- 原生 HTML / CSS / JavaScript modules
- 原生 Node `http` server
- 自製 router / validation / build scripts
- Node 內建 `node:test`
- Firestore REST persistence path

目前 repo 沒有使用：

- React / Vue / Next / Nuxt / Vite
- Express / Fastify
- Firebase Auth
- Firebase Storage
- Dockerfile
- `render.yaml`
- `firebase.json`

## Repository Structure

```text
.
├─ apps/
│  ├─ web/
│  │  ├─ src/      # GitHub Pages frontend source
│  │  ├─ dist/     # frontend build output
│  │  └─ tests/    # frontend tests
│  └─ service/
│     ├─ src/      # Render backend source
│     ├─ dist/     # backend build output
│     └─ tests/    # backend tests
├─ packages/
│  ├─ contracts/   # shared contracts and parsers
│  ├─ policy/      # allowlist policy
│  ├─ persistence/ # memory / file / Firestore store implementation
│  └─ test-utils/  # shared test helpers
├─ scripts/        # repo-local lint / typecheck / test / build scripts
├─ docs/           # deployment, operations, handoff, spec
└─ .github/workflows/
   ├─ ci.yml
   └─ pages.yml
```

## Local Development

### 5-Minute Demo Flow

如果你只是想確認 OpenSky demo prototype 有正常啟動，先照這個最短流程走：

1. 啟 backend

```powershell
npm run start:service
```

2. 開另一個 terminal 啟 frontend

```powershell
npm run dev:web
```

3. 打開瀏覽器

- `http://localhost:4173`
- `http://localhost:8787/health`
- `http://localhost:8787/v1/info`

4. 用 demo 帳號登入

- username: `owner-admin`
- password: `opensky-demo`

5. 建立一筆最簡單的白名單網站

- `網站名稱`: `Demo`
- `base domain`: `example.com`
- `path rule`: `/`

6. 建立一個 project

- `專案名稱`: `Demo`

7. 點 `開啟` 或 `開啟已選網站`

預期結果：

- backend 持續存活，沒有 crash
- `/health` 與 `/v1/info` 都能回應 JSON
- frontend 不應顯示 `Backend unavailable`
- 可以建立 site / project
- 可以開出受控 tab
- 中央內容區至少會進入 proxy 文件視圖，而不是停在空白初始狀態

如果你只是要驗證「本機流程是否有跑起來」，先完成上面這 7 步，再去測較複雜的網站。

### Verified Built-in Demo Preset

現在系統在開發 / 測試環境下，若資料庫是空的，會自動 seed 一組我已驗證可正常呈現的 preset：

- `site`: `OpenSky Demo`
- `project`: `Demo Workspace`
- `verified entry URL`: `https://demo.opensky.local/`
- `verified secondary URL`: `https://demo.opensky.local/status`

這組 preset 的特性：

- 不依賴外網
- 不依賴第三方網站
- 由 backend 內建 demo origin 提供內容
- 可完整經過目前的 controlled relay 顯示

所以在全新狀態下，你登入後應該可以直接：

1. 看見 `OpenSky Demo`
2. 看見 `Demo Workspace`
3. 直接按 `開啟已選網站`

如果你要先驗證系統本身，而不是驗證外站相容性，請優先用這組 preset。

### Prerequisites

- Git
- Node.js

建議：

- 本機使用 Node 24，以對齊目前 GitHub Actions workflow

目前 repo 沒有外部 npm dependencies，因此一般情況下不需要先跑 `npm install`。

### Available Commands

```powershell
npm run lint
npm run typecheck
npm run test
npm run build
npm run build:web
npm run dev:web
npm run start:web
npm run start:service
```

對應的實際腳本如下：

- `npm run lint` -> `node scripts/lint.mjs`
- `npm run typecheck` -> `node scripts/typecheck.mjs`
- `npm run test` -> `node scripts/test.mjs`
- `npm run build` -> `node scripts/build.mjs`
- `npm run build:web` -> `npm run build --workspace @opensky/web`
- `npm run dev:web` -> `npm run dev --workspace @opensky/web`
- `npm run start:web` -> `npm run start --workspace @opensky/web`
- `npm run start:service` -> `node apps/service/src/server.mjs`

另外，`apps/web` 現在有自己的最小 package 定義：

- `apps/web/package.json`
- `apps/web/dev-server.mjs`

用途如下：

- `apps/web/src`：前端原始碼
- `apps/web/dist`：build 輸出，GitHub Pages 會部署這個目錄
- `apps/web/tests`：frontend 測試
- `apps/web/dev-server.mjs`：本機開發用的靜態 dev server，直接服務 `apps/web/src`
- `apps/web/package.json`：frontend workspace package，提供 `dev / start / build`

### Backend: Local Start

最小可行的本機啟動方式：

```powershell
npm run start:service
```

預設：

- backend URL: `http://localhost:8787`
- auth demo credentials:
  - username: `owner-admin`
  - password: `opensky-demo`

### Frontend: Local Start

frontend 目前已補上最小可用的 dev server，可直接從 repo root 啟動：

```powershell
npm run dev:web
```

預設：

- frontend URL: `http://localhost:4173`
- backend API base: `http://localhost:8787`

可選 env：

```powershell
$env:OPEN_SKY_WEB_PORT="4173"
$env:OPEN_SKY_API_BASE="http://localhost:8787"
npm run dev:web
```

若你只想產出 GitHub Pages 會使用的前端 bundle：

```powershell
npm run build:web
```

這會把 `apps/web/src` 複製到 `apps/web/dist`，不會另外啟靜態伺服器。

### Local Testing on Your Notebook

若你要在筆電上快速驗證，建議順序：

1. 先啟 backend

```powershell
npm run start:service
```

2. 再啟 frontend dev server

```powershell
npm run dev:web
```

3. 視需要補跑驗證

```powershell
npm run lint
npm run typecheck
npm run test
npm run build
```

4. 在瀏覽器開：

- `http://localhost:4173`

5. 再測：

- sign-in
- sites / projects / tabs / bookmarks / notes
- layout preference
- session vault
- file transfer preview -> approve -> complete

### 本機啟動順序

目前最穩定的本機開發順序是：

1. `npm run start:service`
2. `npm run dev:web`
3. 打開 `http://localhost:4173`

不要反過來先依賴 frontend 去猜 backend 是否存在。

若看到：

- `Backend unavailable`
- `Failed to fetch`

先檢查：

1. backend terminal 還在不在
2. `http://localhost:8787/health` 是否打得開
3. frontend terminal 是否顯示 `Backend API configured via OPEN_SKY_API_BASE=http://localhost:8787`

### VSCode Debug: 測試受控 browse flow 是否正常

如果你想在本機用 VSCode debug「proxy 功能是否正常」，請先用產品真實邊界來理解：

- OpenSky 不是通用 proxy
- 這裡要驗證的是 allowlist-only 的受控 browse flow
- 也就是：
  - allowlisted URL 可開啟
  - 非 allowlisted URL 會被擋
  - redirect 到 allowlist 外也會被擋
  - frontend 真的有打到 backend 的 `/v1/browse/*`

建議流程：

1. 開兩個 Terminal
2. Terminal 1 啟 backend

```powershell
npm run start:service
```

3. Terminal 2 啟 frontend

```powershell
npm run dev:web
```

4. 在瀏覽器開：

- `http://localhost:4173`

5. 用 demo credentials 登入：

- username: `owner-admin`
- password: `opensky-demo`

6. 手動測：

- 建立一個 allowlisted site
- 建立 project
- 開 tab 或觸發 browse open
- 測一個 allowlisted URL
- 再測一個不在 allowlist 的 URL

預期結果：

- allowlisted URL 可正常進入
- 非 allowlisted URL 會回明確錯誤，例如 `URL_NOT_ALLOWED`
- 不應出現 arbitrary browsing

### VSCode Backend Breakpoints

真正的 allowlist 驗證與 browse 判斷在 backend，不在 GitHub Pages frontend。

建議優先下斷點的位置：

- `apps/service/src/browse/routes.mjs`
- `apps/service/src/sites/routes.mjs`
- `packages/policy/src/index.mjs`
- `apps/service/src/common/service-helpers.mjs`

你要觀察的重點：

- request 進來的 URL
- 當前 site 的 allowlist 規則
- `isUrlAllowed(...)` 的判斷結果
- 被擋時回傳的錯誤 code 與 payload

### VSCode Launch Example

如果你想用 VSCode 的 `Run and Debug` 啟 backend，可用這類最小設定：

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "OpenSky Service",
      "program": "${workspaceFolder}/apps/service/src/server.mjs",
      "cwd": "${workspaceFolder}",
      "env": {
        "PORT": "8787"
      }
    }
  ]
}
```

這份設定目前沒有自動寫進 repo；如果你要真正建立 `.vscode/launch.json`，可以另外再補。

### 自動驗證

除了手動測，也建議先跑：

```powershell
node scripts/test.mjs
```

目前與 browse flow 最相關的回歸測試會覆蓋：

- allowlist blocking
- blocked redirects
- preview-before-approve
- session / layout restoration

## 白名單網站欄位說明

目前 UI 已把站台建立表單簡化成最小必要欄位，只保留：

1. `網站名稱`
2. `base domain`
3. `path rule`

建立站台時，以下能力目前固定預設為啟用，不需要另外勾選：

- session memory
- upload
- download

### 1. 網站名稱

用途：

- 給你自己辨識這個白名單站台
- 顯示在左側站台清單與工作區狀態列

建議填法：

- `Google`
- `Mega`
- `內部報表`

### 2. base domain

用途：

- 定義這個站台允許的主網域
- allowlist 驗證會以這個 hostname 為基礎判斷

這個欄位現在支援：

- 單一網域
- 多個網域，以逗號分隔

用途：

- 第一個網域會當作主要開站網域
- 其餘網域可用來涵蓋同站台代理時需要的資產網域

這個欄位應該填 hostname；若有多個，就用逗號分隔。

正確：

- `google.com`
- `www.google.com`
- `www.megaholdings.com.tw`
- `google.com, www.google.com`
- `www.megaholdings.com.tw, static.megaholdings.com.tw`

錯誤：

- `https://google.com`
- `https://www.megaholdings.com.tw/`
- `https://www.megaholdings.com.tw/news/list`

補充：

- 現在前端已加防呆，如果你貼了完整 URL，系統會盡量自動抽出 hostname
- 若你需要讓頁面上的 CSS / 圖片 / 字型也更完整顯示，請把資產網域也一起放進同一筆 site 的 `base domain`
- 最穩定的填法仍然是直接填純網域，必要時用逗號分隔多個網域

### 3. path rule

用途：

- 限制這個站台允許開啟的路徑範圍
- `browse/open` 與 `browse/navigate` 都會檢查這個 path 規則

正確：

- `/`
- `/team`
- `/news/list`

說明：

- `/` 代表允許該網域底下的根路徑開始導頁
- `/team` 代表只允許 `/team` 底下的頁面

### Mega 測試範例

如果你要測：

- `https://www.megaholdings.com.tw/`

建議白名單填法：

- `網站名稱`: `Mega`
- `base domain`: `www.megaholdings.com.tw`
- `path rule`: `/`

如果網站會自動導到別的 host，例如：

- `megaholdings.com.tw -> www.megaholdings.com.tw`

那 redirect 後的 host 也必須在 allowlist 內，否則還是會被擋。

更穩妥的填法可以是：

- `base domain`: `megaholdings.com.tw, www.megaholdings.com.tw`

## Environment Variables

### Backend

以下 env name 已由 repo 現況確認：

| Name | Purpose | Required |
|---|---|---|
| `PORT` | backend listen port | no |
| `OPEN_SKY_ENV` | `development` / `test` / `staging` / `production` | no |
| `OPEN_SKY_OWNER_USERNAME` | owner-admin username | no, but required in hardened production |
| `OPEN_SKY_OWNER_PASSWORD` | owner-admin password | no, but required in hardened production |
| `OPEN_SKY_PERSIST_PATH` | file-backed JSON persistence path | no |
| `OPEN_SKY_FIREBASE_PROJECT_ID` | Firestore project id | optional Firestore path |
| `OPEN_SKY_FIREBASE_CLIENT_EMAIL` | service account email | optional Firestore path |
| `OPEN_SKY_FIREBASE_PRIVATE_KEY` | service account private key | optional Firestore path |
| `OPEN_SKY_FIREBASE_DATABASE_ID` | Firestore database id, default `(default)` | no |
| `OPEN_SKY_FIREBASE_TOKEN_URI` | OAuth token URI | no |
| `OPEN_SKY_FORCE_WARMUP` | force warmup simulation | no |

### Frontend / GitHub Pages

目前 repo 已確認的 frontend deploy variable 只有：

| Name | Purpose | Required |
|---|---|---|
| `OPEN_SKY_API_BASE` | injected into GitHub Pages `config.js`, points frontend to Render backend | yes for Pages deploy |
| `OPEN_SKY_WEB_PORT` | local frontend dev server port for `npm run dev:web` | no, local only |

### Production Notes

`OPEN_SKY_ENV=production` 時：

- 不允許 demo credentials
- 不允許 memory-only persistence
- 必須使用：
  - `OPEN_SKY_PERSIST_PATH`
  - 或完整的 `OPEN_SKY_FIREBASE_*`

### Example: File-backed Local Backend

```powershell
$env:OPEN_SKY_PERSIST_PATH="D:\\opensky-data\\state.json"
npm run start:service
```

### Example: Local Frontend Against Local Backend

```powershell
$env:OPEN_SKY_API_BASE="http://localhost:8787"
npm run dev:web
```

### Example: Firestore-backed Local Backend

```powershell
$env:OPEN_SKY_FIREBASE_PROJECT_ID="your-project-id"
$env:OPEN_SKY_FIREBASE_CLIENT_EMAIL="service-account@your-project.iam.gserviceaccount.com"
$env:OPEN_SKY_FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----`n...`n-----END PRIVATE KEY-----"
npm run start:service
```

## Firebase Setup

### What Firebase Is Used For

根據目前 repo 程式碼，Firebase 只用於：

- backend persistence 的 Firestore path

目前 repo 沒有使用：

- Firebase Auth
- Firebase Storage
- Firebase Hosting
- Firestore emulator wiring

### What You Need to Prepare

若你要啟用 Firestore-backed persistence：

1. 建立 Firebase / GCP project
2. 啟用 Firestore
3. 建立可供 backend 使用的 service account
4. 將 service account 資訊放到 backend env

你至少需要：

- `OPEN_SKY_FIREBASE_PROJECT_ID`
- `OPEN_SKY_FIREBASE_CLIENT_EMAIL`
- `OPEN_SKY_FIREBASE_PRIVATE_KEY`

可選：

- `OPEN_SKY_FIREBASE_DATABASE_ID`
- `OPEN_SKY_FIREBASE_TOKEN_URI`

### What This Repo Does Not Provide

目前 repo 沒有這些檔案，因此不要假設它們已經存在：

- `firebase.json`
- `.firebaserc`
- `firestore.rules`
- `storage.rules`
- Firebase initialization scripts
- Firebase emulator scripts

所以目前 README 只能誠實描述：

- Firestore 是 backend 的可選 persistence backend
- Firebase project / service account / rules 需由你在 Firebase / GCP 後台自行建立與管理

### Firestore Rules

目前 repo 內沒有 Firestore rules 檔，無法從版本庫直接套用。

若你要用 Firestore：

- 請在 Firebase console 或你的既有 IaC 流程中管理 rules
- 這份 repo 目前沒有提供可直接部署的 rules baseline

## GitHub Pages Deployment

### Current Workflow

GitHub Pages 目前由：

- `.github/workflows/pages.yml`

負責。

它會：

1. 在 `master` push 時觸發
2. 執行 `node scripts/build.mjs`
3. 生成 `apps/web/dist/config.js`
4. 把 `apps/web/dist` 發佈到 GitHub Pages

### Required GitHub Settings

你需要在 GitHub repo 後台確認：

1. `Settings > Pages`
2. Deployment source 使用 GitHub Actions

另外要在：

`Settings > Secrets and variables > Actions > Variables`

設定：

- `OPEN_SKY_API_BASE`

範例值：

- `https://your-service.onrender.com`

### How the Frontend Finds the Backend

Pages workflow 會把 `OPEN_SKY_API_BASE` 寫進：

- `apps/web/dist/config.js`

前端再從：

- `globalThis.OPEN_SKY_CONFIG.apiBase`

讀取 backend base URL。

如果 `OPEN_SKY_API_BASE` 沒設：

- 前端會對 Pages 自己的網域發 `/v1/*`
- 整個系統看起來會像「前端正常載入，但 API 全壞」

### If Pages Build Succeeds but the Site Is Broken

優先檢查：

1. GitHub Actions 的 `pages` workflow log
2. `config.js` 是否被正確生成
3. 瀏覽器 DevTools Network 是否在打正確的 Render API URL
4. `OPEN_SKY_API_BASE` 是否真的存在於 repo variable
5. Render backend 是否已啟動且可回應

## Render Deployment

### What Render Is Used For

Render 目前負責：

- auth/session verification
- allowlist enforcement
- persistence APIs
- browse / session vault / file transfer / audit

### Current Repo Reality

目前 repo：

- 有 backend entrypoint
- 有 runtime env parsing
- 有 deploy docs

但沒有：

- `render.yaml`
- Dockerfile
- Render IaC

所以目前 Render 部署屬於「手動後台設定」，不是 repo 內完整自動化。

### Recommended Render Service Type

依目前 repo 現況，應使用：

- Render Web Service

### Start Command

由 repo 現況可直接確認的 start command：

```bash
node apps/service/src/server.mjs
```

### Build Command

repo 內可用的 build command 是：

```bash
node scripts/build.mjs
```

這個指令與 CI 一致，也會生成 `apps/web/dist` 與 `apps/service/dist`。

### Required Render Environment Variables

至少應確認：

- `OPEN_SKY_ENV=production`
- `OPEN_SKY_OWNER_USERNAME`
- `OPEN_SKY_OWNER_PASSWORD`
- `OPEN_SKY_PERSIST_PATH`

或改為：

- `OPEN_SKY_FIREBASE_PROJECT_ID`
- `OPEN_SKY_FIREBASE_CLIENT_EMAIL`
- `OPEN_SKY_FIREBASE_PRIVATE_KEY`

### How to Confirm Render Startup

啟動成功後應可檢查：

- Render log 是否出現 `OpenSky service listening`
- `/health` 是否可回應
- `/health` 內容是否包含：
  - `environment`
  - `persistenceMode`
  - `firebaseConfigured`
  - `startupWarnings`

### What Still Needs Manual Confirmation

這份 repo 無法替你確認：

- Render 後台是否真的已建立 service
- Render env 是否已填好
- Render persistent disk 是否已掛載

這些都必須在 Render 後台人工確認。

## Troubleshooting

### 1. Firebase auth 成功但 Firestore 寫入失敗

目前 repo 沒有 Firebase Auth 整合，所以如果你看到這種情況，通常不是 repo 的「Firebase Auth -> Firestore」流程問題，而是：

- backend service account 權限不足
- Firestore 未啟用
- `OPEN_SKY_FIREBASE_*` 不完整

先檢查：

- backend log
- `OPEN_SKY_FIREBASE_PROJECT_ID`
- `OPEN_SKY_FIREBASE_CLIENT_EMAIL`
- `OPEN_SKY_FIREBASE_PRIVATE_KEY`

### 2. GitHub Actions variable 沒吃到

先檢查：

- repo variable 名稱是否真的是 `OPEN_SKY_API_BASE`
- `pages.yml` 是否成功執行
- Pages build artifact 裡的 `config.js` 內容是否正確

### 3. GitHub Pages build 成功但前端無法連 backend

先檢查：

- `OPEN_SKY_API_BASE` 是否指向正確的 Render URL
- 前端 Network request 是否打到 Pages 自己的 `/v1/*`
- Render backend 是否正在回應
- 後端是否有 CORS / routing 問題

### 4. Firestore rules / service account 問題

目前 repo 沒有附 rules 檔，因此若 Firestore 連線失敗：

- 先看 Firebase / GCP 後台權限
- 再看 service account 是否真的有 Firestore 存取權

不要假設 repo 內有可直接套用的 rules baseline。

### 5. 本機 `.env` 沒設導致異常

目前 repo 沒有 `.env.example`，也沒有自動 env loader。

也就是說：

- env 必須由你的 shell 或部署平台提供
- PowerShell 可直接用 `$env:...` 設定

## Development Workflow

建議日常流程：

1. 先讀：
   - `docs/specs/opensky-codex-spec-final.md`
   - `AGENTS.md`
   - `CLAUDE.md`
   - `SKILL.md`
2. 啟動服務：
   - `npm run start:service`
   - `npm run dev:web`
3. 跑：
   - `npm run lint`
   - `npm run typecheck`
   - `npm run test`
   - `npm run build`
4. 修改時遵守：
   - allowlist-only
   - single-user
   - center-content-first
   - `maximized` default
   - 「無痕」方向只能沿著 allowlist-only backend relay 前進，不能演變成通用 proxy
5. 若只想驗證 frontend 輸出：
   - `npm run build:web`

## PR Workflow with GitHub CLI

目前 repo owner 已經安裝 `gh`，但是否已登入需要每台機器自己確認。

### Basic Flow

1. 確認登入狀態

```powershell
gh auth status
```

2. 若未登入，先登入

```powershell
gh auth login
```

3. 建 branch

```powershell
git switch -c docs/bootstrap-project-docs
```

4. 驗證

```powershell
npm run lint
npm run typecheck
npm run test
npm run build
```

5. commit

```powershell
git add <files>
git commit -m "docs: rewrite README for local setup and deployment"
```

6. push

```powershell
git push -u origin <branch-name>
```

7. 建 PR

```powershell
gh pr create --draft
```

### Important Note

如果 `gh auth status` 顯示未登入：

- 這份 repo 無法單靠本地文件替你完成 CLI 開 PR
- 你需要先在當前機器完成 `gh auth login`

## Verified Repo Facts vs Manual Confirmation

### Verified from Repo

- scripts 名稱與入口
- backend entrypoint
- GitHub Pages workflow 存在
- Firestore persistence env 名稱
- Render 角色定位

### Still Needs Manual Confirmation

- GitHub repo Pages 設定是否已啟用
- GitHub repo variable `OPEN_SKY_API_BASE` 是否已設定
- Render Web Service 是否已建立
- Render env vars 是否已填妥
- Firebase project / rules / service account 是否已在雲端正確建立


