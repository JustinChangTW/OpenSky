# OpenSky Handoff

## 已完成

- greenfield workspace skeleton is in place across `apps/web`, `apps/service`, and shared packages
- frontend shell enforces a center-content-first, `maximized`-default workspace with fullscreen fallback messaging
- backend route groups exist for auth, sites, projects, tabs, bookmarks, notes, browse, session vault, file transfer, audit, and layout preferences
- allowlist-only browsing is enforced on browse open and navigate
- structured error responses include `code`, `message`, `userAction`, and `traceId`
- upload flow enforces preview before approve
- layout preference persistence and precedence are implemented
- optional file-backed persistence is available via `OPEN_SKY_PERSIST_PATH`
- startup hardening now rejects production boot with demo credentials or memory-only persistence
- `/health` exposes runtime diagnostics for environment, persistence mode, startup warnings, and process start time
- automated validation covers auth, allowlist, browse, transfer preview gating, warmup handling, layout/fullscreen behavior, production config gating, and restart restoration

## 未完成

- persistence is still JSON-file based and single-instance only; there is no shared durable database
- owner-admin auth is still demo-grade and does not provide durable credential/session management
- frontend does not yet include browser-level end-to-end coverage for iframe compatibility failures from external sites
- external site embedding/download/upload behavior is still constrained by target-site capabilities and browser policy
- deployment hardening for production observability, backups, and secrets rotation is still incomplete

## 下一波建議

1. Replace JSON-file persistence with a proper backend data store that supports durable records, backups, and migration control.
2. Harden auth with non-demo credentials, explicit session lifecycle controls, and operational rotation procedures.
3. Add browser-level integration coverage for blocked iframe cases, fullscreen fallback UX, and persisted workspace restoration through the UI.
4. Add admin-safe deployment defaults for Render, including persistent disk guidance, environment validation, and startup health diagnostics.
