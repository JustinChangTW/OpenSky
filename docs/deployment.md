# Deployment

## Frontend

- Build static assets from `apps/web/src` into `apps/web/dist`
- Publish `apps/web/dist` to GitHub Pages

## Backend

- Run `apps/service/src/server.mjs` on Render as a web service
- Configure the service to expose the backend base URL used by the frontend

## Current baseline

- The backend uses in-memory persistence
- Cold start handling must surface `SERVICE_UNAVAILABLE` with actionable guidance
