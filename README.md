# OpenSky

OpenSky is a single-user, allowlist-based external site workspace.

This workspace is organized as a greenfield monorepo:

- `apps/web`: GitHub Pages static frontend
- `apps/service`: Render backend service
- `packages/contracts`: shared contracts, enums, and error shapes
- `packages/policy`: allowlist policy and URL matcher
- `packages/persistence`: in-memory persistence interfaces and helpers
- `packages/test-utils`: shared test helpers

## Current implementation status

The repository now includes the MVP baseline:

- canonical product spec under `docs/specs/opensky-codex-spec-final.md`
- shared contracts and structured error envelope
- allowlist matcher package
- static frontend shell with maximized-first workspace controls
- backend service routes for auth, sites, projects, tabs, bookmarks, notes, browse, session vault, file transfer, audit, and layout preferences
- optional file-backed persistence via `OPEN_SKY_PERSIST_PATH`
- root validation scripts with zero external dependencies

## Demo credentials

- Username: `owner-admin`
- Password: `opensky-demo`

## Commands

```powershell
npm run lint
npm run typecheck
npm run test
npm run build
npm run start:service
```

## Notes

- This repo currently avoids external npm dependencies so the workspace remains runnable in a restricted environment.
- The backend defaults to in-memory persistence, but can persist workspace data to a JSON file by setting `OPEN_SKY_PERSIST_PATH`.
- Auth session tokens are not persisted across backend restart; the owner-admin user must sign in again.
- In `OPEN_SKY_ENV=production`, the service now refuses to boot with demo credentials or memory-only persistence.
- Unsupported site behavior must always be surfaced explicitly; no silent fallbacks are allowed.
