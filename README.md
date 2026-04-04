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

The repository now includes the foundational Wave 0 bootstrap:

- canonical product spec under `docs/specs/opensky-codex-spec-final.md`
- shared contracts and error envelope
- allowlist matcher package
- in-memory persistence store
- static frontend skeleton
- backend service skeleton
- root validation scripts with zero external dependencies

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
- The backend uses in-memory persistence as the initial implementation baseline.
- Unsupported site behavior must always be surfaced explicitly; no silent fallbacks are allowed.
