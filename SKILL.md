# OpenSky Maintenance Skill

## Purpose

Use this skill when maintaining OpenSky as a real repo, not as an imagined architecture.

This skill is for:

- repo maintenance
- documentation refresh
- Firebase-related persistence updates
- GitHub Pages deployment maintenance
- Render deployment maintenance
- small feature or bug-fix work that must preserve the controlled web access product boundaries

## Long-term Product Memory

When this repo evolves toward a more "stealth" browsing experience, the intended direction is:

- allowlist-only backend relay
- backend-managed external session handling
- reducing direct browser exposure to external origins where feasible

This does not authorize:

- generic proxy behavior
- arbitrary URL relay
- bypass-oriented browsing features

Always frame that direction as a controlled relay inside the existing allowlist-only workspace model.

## Repo Facts To Respect

- Frontend is a static app under `apps/web`
- Backend is a Node service under `apps/service`
- Shared contracts and allowlist logic live in `packages/*`
- Validation commands come from `package.json` and `scripts/*`
- GitHub Pages deploy is driven by `.github/workflows/pages.yml`
- Backend env names are defined in `apps/service/src/common/service-config.mjs`

## Current Firebase Reality

- Firebase is currently used as a Firestore-backed persistence option
- OpenSky does not currently use Firebase Auth as its primary auth model
- OpenSky does not currently expose a Firebase emulator workflow in-repo
- OpenSky does not currently include `firebase.json` or Firestore rules files

When asked to adjust Firebase, first determine whether the task is about:

1. backend Firestore env and persistence
2. deployment documentation
3. future Firebase functionality that does not yet exist in this repo

Do not write documentation that implies client-side Firebase usage unless code proves it.

## Current Deployment Reality

### GitHub Pages

- deploys static frontend only
- depends on `.github/workflows/pages.yml`
- expects repo variable `OPEN_SKY_API_BASE`
- must not absorb backend logic

### Render

- hosts the backend service
- has no `render.yaml` in the repo right now
- depends on manual dashboard configuration
- uses `node apps/service/src/server.mjs` as the service start entry

## Maintenance Workflow

1. Start with discovery
   - scan repo structure
   - verify scripts
   - verify env names
   - verify deployment workflows
2. Draft the smallest useful change
3. Validate documentation against source
4. Run the relevant repository-local checks
5. Report remaining unknowns explicitly

Any change must preserve:

- allowlist-only
- single-user
- center-content-first
- `maximized` default
- fullscreen fallback
- preview-before-approve
- and any "stealth" improvement must remain allowlist-only

## Firebase / Firestore Adjustments

If a task involves Firebase:

1. inspect `apps/service/src/common/service-config.mjs`
2. inspect `apps/service/src/common/service-context.mjs`
3. inspect `packages/persistence/src/common/store.mjs`
4. confirm whether README / deployment docs must also change

Do not assume Firebase console, Firestore rules, or Hosting setup exist in the repo.

## GitHub Pages / Render Deployment Maintenance

### GitHub Pages

Check these first:

- `.github/workflows/pages.yml`
- `apps/web/src/config.js`
- `apps/web/src/features/auth/session.js`
- the documented `OPEN_SKY_API_BASE` flow

### Render

Check these first:

- `apps/service/src/server.mjs`
- `apps/service/src/common/service-config.mjs`
- README and deployment docs for env consistency

Do not write deployment instructions that depend on repo files that do not exist.

## Sensitive Areas

- `packages/contracts/**`
- `packages/policy/**`
- `packages/persistence/src/common/store.mjs`
- `apps/service/src/common/service-config.mjs`
- `.github/workflows/pages.yml`
- any future import/schema code if it appears

## Do Not Do

- do not invent env names
- do not invent Firebase services that the repo does not use
- do not turn GitHub Pages into a backend
- do not weaken allowlist-only constraints
- do not rewrite large areas when a docs or minimal maintenance change is enough

## Validation Expectations

### Docs-only updates

- `npm run lint`
- `npm run typecheck`

### Deployment or workflow updates

- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`

### Backend env or persistence updates

- `npm run lint`
- `npm run typecheck`
- `npm run test`

## Final Handoff

1. Files changed
2. What was implemented
3. Commands run
4. Test results
5. Known risks / unsupported cases


