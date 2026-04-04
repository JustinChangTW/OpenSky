# OpenSky Final Handoff

## Current status

- The greenfield workspace skeleton is in place across `apps/web`, `apps/service`, and the shared packages.
- The frontend shell preserves a center-content-first layout, defaults to `maximized`, and falls back from fullscreen with a user-facing message.
- Backend route groups exist for auth, sites, projects, tabs, bookmarks, notes, browse, session vault, file transfer, audit, and layout preferences.
- Allowlist-only navigation is enforced on browse open and navigate flows.
- Structured errors include `code`, `message`, `userAction`, and `traceId`.
- Upload flows enforce preview before approve.
- Layout preference persistence and precedence are implemented.
- Optional file-backed persistence is available through `OPEN_SKY_PERSIST_PATH`.
- Optional Firestore-backed persistence is available through the `OPEN_SKY_FIREBASE_*` settings.
- Production startup hardening rejects demo credentials or memory-only persistence when `OPEN_SKY_ENV=production`.
- `/health` exposes runtime diagnostics for environment, persistence mode, `firebaseConfigured`, startup warnings, and process start time.
- Automated validation covers auth, allowlist, browse blocking, transfer preview gating, warmup handling, layout/fullscreen behavior, production config gating, and restart restoration.

## Remaining gaps

- Persistence is now available through file-backed JSON or Firestore, but the JSON path remains single-instance only and Firestore still lacks full operational hardening.
- Owner-admin auth is still demo-grade and does not provide durable credential or session management.
- Frontend coverage does not yet include browser-level end-to-end validation for iframe compatibility failures from external sites.
- External site embedding, download, and upload behavior remains constrained by target-site browser policies.
- Deployment hardening for production observability, backups, and secret rotation is still incomplete.

## Recommended next steps

1. Harden the Firestore persistence path with operational safeguards such as backups, secret rotation, and environment bootstrap checks.
2. Harden auth with non-demo credentials, explicit session lifecycle controls, and operational rotation procedures.
3. Add browser-level integration coverage for blocked iframe cases, fullscreen fallback UX, and persisted workspace restoration.
4. Expand Render deployment guidance for persistent storage, environment validation, health diagnostics, and incident response.
