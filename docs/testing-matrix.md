# OpenSky Testing Matrix

## Required validations

- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`

## Current automated coverage

- service health and auth/session flow
- service unavailable / warmup handling
- production runtime diagnostics for memory vs file-backed persistence
- allowlist matcher and blocked redirect handling
- sites, projects, tabs, bookmarks, notes, layout preferences
- browse open/navigate/close
- restart restoration for projects, tabs, and layout preferences when file-backed persistence is enabled
- restart restoration for projects, tabs, and layout preferences when Firestore-backed persistence is enabled
- auth session stays ephemeral across backend restart
- session vault revoke and expiry handling
- file transfer preview-before-approve
- fullscreen fallback and layout state transitions

## Priority coverage

- auth protection
- allowlist blocking
- blocked redirect handling
- project reopen restoration
- tab restoration
- layout preference restoration
- zoom and aspect-ratio preservation
- session restore / expire / revoke
- preview required before approve
- fullscreen fallback
- service unavailable / warmup handling
- durable store coverage for both file-backed and Firestore-backed persistence paths
