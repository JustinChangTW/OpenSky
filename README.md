# OpenSky

OpenSky 是一個單一使用者、allowlist-based 的外部網站工作區。

目前專案採用 greenfield monorepo 結構：

- `apps/web`：GitHub Pages 靜態前端
- `apps/service`：Render backend service
- `packages/contracts`：共用 contracts、enums 與錯誤結構
- `packages/policy`：allowlist policy 與 URL matcher
- `packages/persistence`：持久化介面與 store helpers
- `packages/test-utils`：共用測試工具

## 目前實作狀態

目前 repo 已經具備 MVP baseline：

- canonical product spec：`docs/specs/opensky-codex-spec-final.md`
- shared contracts 與 structured error envelope
- allowlist matcher package
- 以 `maximized` 為優先的靜態 frontend shell
- backend service routes：auth、sites、projects、tabs、bookmarks、notes、browse、session vault、file transfer、audit、layout preferences
- 可選的 file-backed persistence，透過 `OPEN_SKY_PERSIST_PATH` 啟用
- 不依賴外部 npm 套件的 root validation scripts

## Demo 帳號

- Username：`owner-admin`
- Password：`opensky-demo`

## 系統需求

- Node.js 18 以上
- Git
- 可使用 PowerShell、macOS Terminal 或 Linux shell

目前 repo 刻意避免外部 npm dependencies，因此現階段不需要另外執行 `npm install`。

## 如何建置

### 1. 取得原始碼

```powershell
git clone https://github.com/JustinChangTW/OpenSky.git
cd OpenSky
```

### 2. 執行靜態檢查與測試

```powershell
npm run lint
npm run typecheck
npm run test
```

### 3. 產生建置輸出

```powershell
npm run build
```

建置完成後：

- 前端輸出位於 `apps/web/dist`
- 後端輸出位於 `apps/service/dist`

## 如何在本機啟動

### 啟動 backend service

```powershell
npm run start:service
```

預設服務位址：

- `http://localhost:8787`

### 常用環境變數

- `PORT`：backend port，預設 `8787`
- `OPEN_SKY_OWNER_USERNAME`：owner-admin 使用者名稱
- `OPEN_SKY_OWNER_PASSWORD`：owner-admin 密碼
- `OPEN_SKY_PERSIST_PATH`：若設定，workspace/domain state 會寫入指定 JSON 檔
- `OPEN_SKY_ENV`：可設為 `development`、`test`、`staging`、`production`

### 本機 file-backed persistence 範例

```powershell
$env:OPEN_SKY_PERSIST_PATH="D:\\opensky-data\\state.json"
npm run start:service
```

### production mode 範例

```powershell
$env:OPEN_SKY_ENV="production"
$env:OPEN_SKY_OWNER_USERNAME="your-admin"
$env:OPEN_SKY_OWNER_PASSWORD="replace-this-password"
$env:OPEN_SKY_PERSIST_PATH="D:\\opensky-data\\state.json"
npm run start:service
```

注意：

- `OPEN_SKY_ENV=production` 時，不允許使用 demo credentials
- `OPEN_SKY_ENV=production` 時，不允許使用 memory-only persistence

## 部署重點

### Frontend

- 原始碼：`apps/web/src`
- 建置輸出：`apps/web/dist`
- 部署目標：GitHub Pages
- GitHub Pages workflow：`.github/workflows/pages.yml`
- 需要在 GitHub repository variables 設定 `OPEN_SKY_API_BASE` 指向 Render backend，例如 `https://your-service.onrender.com`

### Backend

- 原始碼：`apps/service/src`
- 建置輸出：`apps/service/dist`
- 部署目標：Render Web Service

建議 deployment 設定：

- 設定 `OPEN_SKY_ENV=production`
- 將 `OPEN_SKY_PERSIST_PATH` 指到可持久化磁碟路徑
- 將 `OPEN_SKY_OWNER_USERNAME` / `OPEN_SKY_OWNER_PASSWORD` 改為非 demo 值
- 在 GitHub repo 的 `Settings > Secrets and variables > Actions > Variables` 建立 `OPEN_SKY_API_BASE`

## 常用指令

```powershell
npm run lint
npm run typecheck
npm run test
npm run build
npm run start:service
```

## 補充說明

- 目前 repo 刻意避免外部 npm dependencies，讓 workspace 在受限環境下也能執行。
- backend 預設使用 in-memory persistence；若要讓 workspace/domain state 在服務重啟後保留，可設定 `OPEN_SKY_PERSIST_PATH` 寫入 JSON 檔。
- 若提供 `OPEN_SKY_FIREBASE_PROJECT_ID`、`OPEN_SKY_FIREBASE_CLIENT_EMAIL`、`OPEN_SKY_FIREBASE_PRIVATE_KEY`，backend 會改走 Firestore 作為 durable store；Render 仍保留 auth/session、allowlist 與 runtime 行為的執行責任。
- auth session token 不會在 backend 重啟後保留；owner-admin 需要重新登入。
- 當 `OPEN_SKY_ENV=production` 時，service 不允許使用 demo credentials，也不允許 memory-only persistence。
- 外部網站若有不支援的行為，必須明確對使用者顯示；不能 silent failure。
