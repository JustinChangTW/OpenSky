# OpenSky Working Agreements

## Project Goal

OpenSky 是一個單一使用者、allowlist-based 的外部網站工作區。

固定架構：

- Frontend: GitHub Pages static site
- Backend: Render Web Service

固定產品邊界：

- allowlist-only
- single-user owner-admin
- center-content-first UI
- default workspace mode = `maximized`

本 repo 的工作原則是：

- 先讀 spec 與現況
- 先確認事實
- 最小改動
- 不把猜測寫成事實
- 不把 backend 邏輯塞進 frontend

## Read First

開始任何修改前，依序閱讀：

1. `docs/specs/opensky-codex-spec-final.md`
2. `AGENTS.md`
3. `CLAUDE.md`
4. `SKILL.md`
5. 相關 feature 的 source / tests / contracts

## Product Boundary

OpenSky 不是：

- general-purpose proxy
- arbitrary URL browser
- network restriction bypass tool
- public multi-user platform

OpenSky 是：

- controlled workspace for one owner-admin user
- allowlist-only external site entry system
- project-based persistent workspace
- UI that prioritizes the central content area

## Hard Constraints

### Allowlist-only

所有 navigation 都必須先過 allowlist 驗證。

不要加入：

- arbitrary URL browsing
- hidden allowlist bypass
- open-anything shortcuts

### Single-user

除非任務明確改 auth model，否則只假設一位 owner-admin。

### GitHub Pages is frontend-only

Frontend 只能負責：

- static rendering
- local UI state
- layout controls
- backend API calls

Frontend 不應負責：

- trusted auth/session logic
- allowlist enforcement
- secure persistence of external site secrets
- browse gateway logic

### Render owns dynamic behavior

Backend 目前負責：

- auth/session verification
- allowlist enforcement
- persistence APIs
- browse / session vault / file transfer / audit
- warmup / service-unavailable behavior

### UI constraints

必須維持：

- center-content-first
- `maximized` default
- fullscreen failure -> fallback to `maximized`
- uploads require preview before approve
- zoom / resize / preview preserve aspect ratio
- unsupported behavior must be explicit, never silent

### Future LLM rule

目前 MVP 不包含內建 LLM 功能。

若未來新增 LLM：

- all outputs must stream

## Actual Repo Facts You Must Respect

### Tech stack

目前 repo 實際使用：

- Node.js ESM monorepo
- npm workspaces
- native HTML / CSS / JS modules
- native Node `http` backend
- repo-local scripts for lint / typecheck / test / build
- Node `node:test`

目前 repo 沒有：

- frontend dev server script
- React / Vue / Next / Vite
- Express / Fastify
- `render.yaml`
- `firebase.json`
- `firestore.rules`
- `storage.rules`

### Deployment reality

- GitHub Pages workflow: `.github/workflows/pages.yml`
- CI workflow: `.github/workflows/ci.yml`
- frontend deploy depends on `OPEN_SKY_API_BASE`
- backend entrypoint: `apps/service/src/server.mjs`
- backend env parsing: `apps/service/src/common/service-config.mjs`
- persistence implementation: `packages/persistence/src/common/store.mjs`

### Firebase reality

目前 repo 只使用 Firebase / GCP 的 Firestore persistence path。

不要假設有：

- Firebase Auth
- Firebase Storage
- emulator wiring
- rules files in repo

## Allowed Modification Areas

一般任務可修改：

- `README.md`
- `AGENTS.md`
- `CLAUDE.md`
- `SKILL.md`
- `docs/**`
- `apps/web/**`
- `apps/service/**`
- `packages/**`
- `.github/workflows/**`
- `scripts/**`

但必須遵守本文件的敏感區域規則。

## Sensitive Areas

以下區域需要特別小心，不能無理由亂動：

### Backend runtime and env

- `apps/service/src/common/service-config.mjs`
- `apps/service/src/common/service-context.mjs`
- `apps/service/src/server.mjs`

風險：

- deployment failure
- invalid env assumptions
- production boot regression

### Persistence and Firebase path

- `packages/persistence/src/common/store.mjs`

風險：

- data loss
- Firestore auth breakage
- file-backed persistence regression

### GitHub Pages API base wiring

- `.github/workflows/pages.yml`
- `apps/web/src/config.js`
- `apps/web/src/features/auth/session.js`

風險：

- frontend deploy succeeds but all API calls fail
- Pages origin accidentally calling relative `/v1/*`

### Import / schema work

目前 repo 沒找到明確的題庫匯入 pipeline 或 import schema 檔。

因此：

- 不要假設已有 import system
- 不要捏造 schema
- 若任務提到匯入 / schema，先重新 discovery，確認實際檔案與流程

## Change Strategy

### Prefer minimal diffs

先做最小改動，不要為了文件整理而順便重構整個 repo。

### Preserve contracts

除非任務明確要求，避免無故改動：

- `/v1/*` API contracts
- shared contracts
- persistence semantics
- layout preference semantics

### Reuse existing patterns

改任何東西前，先讀：

1. target file
2. adjacent tests
3. related contracts
4. related docs

### Do not invent missing infrastructure

如果 repo 沒有：

- `render.yaml`
- Firebase rules
- `.env.example`
- frontend dev server

就要明寫「目前不存在」，不要在 README 或其他文件假裝它們已經存在。

## Minimum Validation

### Docs-only changes

至少跑：

- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`

另外要人工核對：

- README 指令是否真的對應 `package.json`
- env 名稱是否真的在程式裡出現
- GitHub Pages / Render / Firebase 描述是否忠於 repo 現況

### Frontend changes

另外要確認：

- `maximized` default
- fullscreen fallback
- layout persistence
- API base wiring

### Backend / env / persistence changes

另外要確認：

- production gating
- file-backed persistence
- Firestore path
- `/health` diagnostics

## Progress Reporting

主線或 subagent 在重要節點要回報：

- 已完成
- 進行中
- 阻塞 / 風險
- 下一步

回報應該像 PM update，不要只是貼一串原始輸出。

## Final Handoff Format

完成工作時，依序輸出：

1. Files changed
2. What was implemented
3. Commands run
4. Test results
5. Known risks / unsupported cases

若有未確認事項，必須明寫。
