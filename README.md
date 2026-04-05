# OpenSky

OpenSky 是一個單一使用者、allowlist-based 的外部網站工作區。

目前專案的固定架構是：

- 前端：GitHub Pages 靜態網站
- 後端：Render Web Service
- 使用者模型：單一 owner-admin
- 產品邊界：allowlist-only，不是任意網址瀏覽器，也不是通用 proxy

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
npm run start:service
```

對應的實際腳本如下：

- `npm run lint` -> `node scripts/lint.mjs`
- `npm run typecheck` -> `node scripts/typecheck.mjs`
- `npm run test` -> `node scripts/test.mjs`
- `npm run build` -> `node scripts/build.mjs`
- `npm run start:service` -> `node apps/service/src/server.mjs`

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

### Frontend: Local Browser Testing

這個 repo 目前沒有內建前端 dev server，也沒有 `npm run dev`。

目前可行的前端本機流程是：

1. 先 build

```powershell
npm run build
```

2. 讓 `apps/web/dist` 透過你機器上現有的靜態檔案伺服器提供

重要：

- repo 沒有附帶 static server script
- 不建議直接用 `file://` 開 `apps/web/dist/index.html`
- 如果要在瀏覽器驗證 UI，你需要自己提供靜態伺服器

例如，如果你的電腦已有 Python 3，可用：

```powershell
python -m http.server 4173 --directory apps/web/dist
```

然後在瀏覽器開：

- `http://localhost:4173`

若你不想起靜態伺服器，至少應先跑：

```powershell
npm run test
npm run build
```

### Local Testing on Your Notebook

若你要在筆電上快速驗證，建議順序：

1. 跑 repo 驗證

```powershell
npm run lint
npm run typecheck
npm run test
npm run build
```

2. 啟 backend

```powershell
npm run start:service
```

3. 用靜態伺服器提供 `apps/web/dist`

4. 在瀏覽器測：

- sign-in
- sites / projects / tabs / bookmarks / notes
- layout preference
- session vault
- file transfer preview -> approve -> complete

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

### 6. 匯入 schema 驗證失敗

目前 repo 中沒有明確的題庫匯入 pipeline 或 import schema 檔案。

若你遇到所謂的 import/schema 問題，請先重新確認：

- 相關功能是否真的已存在於這個版本
- 是否是外部資料或後續需求，尚未進 repo

不要直接假設 repo 內已有一套題庫匯入系統。

## Development Workflow

建議日常流程：

1. 先讀：
   - `docs/specs/opensky-codex-spec-final.md`
   - `AGENTS.md`
   - `CLAUDE.md`
   - `SKILL.md`
2. 跑：
   - `npm run lint`
   - `npm run typecheck`
   - `npm run test`
3. 修改時遵守：
   - allowlist-only
   - single-user
   - center-content-first
   - `maximized` default
4. 修改後再跑：
   - `npm run build`

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
