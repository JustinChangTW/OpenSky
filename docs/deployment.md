# Deployment

## Frontend

- Build static assets from `apps/web/src` into `apps/web/dist`
- Publish `apps/web/dist` to GitHub Pages
- The frontend remains static-only and consumes the Render backend API

## Backend

- Run `apps/service/src/server.mjs` on Render as a web service
- Configure the service to expose the backend base URL used by the frontend
- Set `OPEN_SKY_PERSIST_PATH` to a writable JSON file path if you want workspace state to survive service restart
- Keep auth credentials in `OPEN_SKY_OWNER_USERNAME` and `OPEN_SKY_OWNER_PASSWORD` for non-demo environments
- Set `OPEN_SKY_ENV=production` in hardened environments; production mode requires non-demo credentials and file-backed persistence
- Use a persistent disk path for `OPEN_SKY_PERSIST_PATH` on Render rather than ephemeral container storage

## Current baseline

- The backend defaults to in-memory persistence and can optionally use a file-backed JSON store
- Demo credentials are `owner-admin` / `opensky-demo`
- Cold start handling must surface `SERVICE_UNAVAILABLE` with actionable guidance
- If file-backed persistence is enabled, plan for Render instance-local storage semantics rather than multi-instance shared storage
- `/health` now exposes runtime diagnostics for environment, persistence mode, startup warnings, and process start time
