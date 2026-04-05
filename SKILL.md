# OpenSky Maintenance Skill

## Purpose

這份 skill 用來維護 OpenSky repo，尤其適用於：

- 日常維護
- 文件更新
- Firebase / Firestore persistence 調整
- GitHub Pages / Render 部署維護
- layout / persistence / allowlist 相關修正
- 題庫匯入 / import schema 類型任務的前置盤點

## Use This Skill When

任務涉及：

- `README.md`
- `AGENTS.md`
- `CLAUDE.md`
- `SKILL.md`
- deployment workflows
- env wiring
- persistence behavior
- docs-to-repo consistency

## Project Summary

OpenSky 是一個：

- single-user
- allowlist-only
- center-content-first
- GitHub Pages frontend + Render backend

它不是：

- arbitrary URL browser
- general proxy
- multi-user SaaS

## Read Order

開始前依序讀：

1. `docs/specs/opensky-codex-spec-final.md`
2. `AGENTS.md`
3. `CLAUDE.md`
4. `README.md`
5. 相關 source / tests / workflow files

## Actual Repo Facts

### Frontend

- source: `apps/web/src`
- build output: `apps/web/dist`
- no built-in dev server
- GitHub Pages deploy through `.github/workflows/pages.yml`
- API base comes from `config.js` / `OPEN_SKY_API_BASE`

### Backend

- source: `apps/service/src`
- entrypoint: `apps/service/src/server.mjs`
- no Express / Fastify
- no `render.yaml`

### Persistence

- memory mode
- file-backed JSON mode
- Firestore-backed mode

### Firebase

目前只確認 Firestore persistence path。

目前沒有證據顯示 repo 使用：

- Firebase Auth
- Firebase Storage
- Firebase Hosting
- Firebase emulator setup
- rules files in repo

## Maintenance Rules

### Minimal change principle

- 先做最小改動
- 不順手重構整個 repo
- 不更換技術棧

### Deployment truthfulness

文件必須只寫 repo 真實具備的能力。

若 repo 沒有：

- `render.yaml`
- `.env.example`
- Firebase rules
- import schema files

就要明確寫「目前不存在」。

### Allowlist and UI rules

任何修改都不能破壞：

- allowlist-only
- single-user
- center-content-first
- `maximized` default
- fullscreen fallback
- preview-before-approve

## Firebase / Firestore Adjustments

若任務涉及 Firebase：

1. 先確認是不是 Firestore persistence 類型修改
2. 檢查 `apps/service/src/common/service-config.mjs`
3. 檢查 `apps/service/src/common/service-context.mjs`
4. 檢查 `packages/persistence/src/common/store.mjs`
5. 確認 README / deployment docs 是否需要同步

不要假設 Firebase console / rules / hosting 配置已在 repo 內。

## GitHub Pages / Render Deployment Maintenance

### GitHub Pages

優先檢查：

- `.github/workflows/pages.yml`
- `apps/web/src/config.js`
- `apps/web/src/features/auth/session.js`
- `OPEN_SKY_API_BASE` 是否被正確描述

### Render

優先檢查：

- `apps/service/src/server.mjs`
- `apps/service/src/common/service-config.mjs`
- README / deployment docs 對 env 的描述

不要寫死不存在於 repo 的 Render UI 細節。

## Import / Schema Work

目前 repo 沒看到明確的題庫匯入 pipeline 或 import schema 檔。

因此，若任務提到：

- 題庫匯入
- schema 驗證
- import pipeline

先做 discovery，再決定是否需要修改。

最低要求：

1. 找出實際檔案
2. 找出 schema source of truth
3. 找出 validation path
4. 若 repo 根本沒有，必須明確回報，不可編造流程

## Validation

修改後至少跑：

```powershell
npm run lint
npm run typecheck
npm run test
npm run build
```

若是 docs 任務，還要人工核對：

- scripts 名稱是否存在
- env 名稱是否真的在程式裡出現
- workflow 是否真的存在

## Final Handoff

完成時依序回報：

1. Files changed
2. What was implemented
3. Commands run
4. Test results
5. Known risks / unsupported cases
