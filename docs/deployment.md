# Deployment

## Frontend

- Build static assets from `apps/web/src` into `apps/web/dist`
- Publish `apps/web/dist` to GitHub Pages
- The frontend remains static-only and consumes the Render backend API
- Use `.github/workflows/pages.yml` to deploy the `apps/web/dist` artifact to GitHub Pages
- Set the GitHub Actions repository variable `OPEN_SKY_API_BASE` so `config.js` points the frontend at the Render backend

## Backend

- Run `apps/service/src/server.mjs` on Render as a web service
- Configure the service to expose the backend base URL used by the frontend
- Set `OPEN_SKY_PERSIST_PATH` to a writable JSON file path if you want workspace state to survive service restart
- Or configure `OPEN_SKY_FIREBASE_PROJECT_ID`, `OPEN_SKY_FIREBASE_CLIENT_EMAIL`, and `OPEN_SKY_FIREBASE_PRIVATE_KEY` to use Firestore as the durable store
- Keep auth credentials in `OPEN_SKY_OWNER_USERNAME` and `OPEN_SKY_OWNER_PASSWORD` for non-demo environments
- Set `OPEN_SKY_ENV=production` in hardened environments; production mode requires non-demo credentials and either Firestore or file-backed persistence
- Use a persistent disk path for `OPEN_SKY_PERSIST_PATH` on Render rather than ephemeral container storage
- Firestore is now supported as the durable-store path. Render remains the owner of auth/session verification, allowlist enforcement, browse, file transfer, and audit behavior.

## Current baseline

- The backend defaults to in-memory persistence and can optionally use either a file-backed JSON store or Firestore
- Demo credentials are `owner-admin` / `opensky-demo`
- Cold start handling must surface `SERVICE_UNAVAILABLE` with actionable guidance
- If file-backed persistence is enabled, plan for Render instance-local storage semantics rather than multi-instance shared storage
- `/health` now exposes runtime diagnostics for environment, persistence mode, `firebaseConfigured`, startup warnings, and process start time
- Firestore use should keep the existing `/v1/*` contracts stable and remain a durable data store only, not a proxy layer
- The frontend Pages deploy now depends on `config.js`; if `OPEN_SKY_API_BASE` is empty, the static frontend will incorrectly call relative `/v1/*` paths on the Pages origin
