# OpenSky Claude Notes

## Scope

- Single-user owner-admin workspace
- Allowlist-only external sites
- GitHub Pages frontend
- Render backend

## Working Style

- Read `docs/specs/opensky-codex-spec-final.md` first
- Then read `AGENTS.md`
- Prefer minimal diffs
- Verify repo facts before editing docs or code
- Do not present guesses as confirmed setup

## Sensitive Areas

- `apps/service/src/common/service-config.mjs`
- `packages/persistence/src/common/store.mjs`
- `.github/workflows/pages.yml`
- `apps/web/src/features/auth/session.js`

## Rules

- Preserve allowlist-only, single-user, center-content-first, and `maximized` default behavior
- Do not move backend-only policy or session logic into the frontend
- Do not assume Firebase Auth / Storage exist; current Firebase usage is Firestore persistence only
- Do not assume `render.yaml`, Firebase rules, or a frontend dev server exist
- If the user asks for a more "stealth" browsing feel, interpret that as `allowlist-only backend relay`, not generic proxy behavior
- Any relay-style work must stay scoped to allowlisted sites and explicit unsupported cases
- If future LLM features are added, outputs must stream

## Current Repo Facts

- Demo credentials are currently `owner-admin` / `opensky-demo`
- Backend persistence supports memory, file-backed JSON, and Firestore
- GitHub Pages deploy depends on `OPEN_SKY_API_BASE`
- `gh` may be installed locally, but PR creation still depends on authenticated CLI or working GitHub integration

## Response Format

- Use concise PM-style progress updates while working
- Final handoff order:
  1. Files changed
  2. What was implemented
  3. Commands run
  4. Test results
  5. Known risks / unsupported cases
