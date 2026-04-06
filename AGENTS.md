# OpenSky Working Agreements

This file is the repo-maintainer runbook for OpenSky.

Read in this order:

1. `docs/specs/opensky-codex-spec-final.md`
2. `AGENTS.md`
3. `CLAUDE.md`
4. `SKILL.md`

## 1. Project Goal

OpenSky is a single-user, allowlist-based external site workspace.

Current architecture:

- Frontend: GitHub Pages static site
- Backend: Render Web Service
- Optional durable store: file-backed JSON or Firestore

Primary UX goal:

- maximize the central content area
- default workspace mode is `maximized`

## 2. Product Boundary

OpenSky is not:

- a general-purpose proxy outside the allowlist-controlled workspace model
- an arbitrary URL browser
- a network restriction bypass tool
- a public multi-user sharing platform

OpenSky is:

- a controlled web access workspace for one owner-admin user
- an allowlist-only external site entry system
- a project-based workspace with persistent state
- a UI that prioritizes central content over peripheral controls

## 2.1 Long-term Stealth Direction

The preferred long-term UX direction is a more "stealth" or "seamless" workspace feel.

In this repo, that must mean:

- allowlist-only backend relay
- managed external site session handling on the backend
- reducing direct browser-to-external-site coupling where feasible

It must not mean:

- turning OpenSky into a general-purpose proxy
- allowing arbitrary URL relay
- bypassing site restrictions outside the allowlist model
- silently masking unsupported site behavior

If implementing work in this area, prefer the phrase:

- `allowlist-only backend relay`

Do not describe it as a generic proxy unless the product boundary is explicitly changed.

Do not implement features that violate this boundary unless the task explicitly redefines the product.

## 3. Repo Reality

Before making changes, verify the current repo state instead of assuming:

- frontend has no built-in dev server
- GitHub Pages deploy is defined in `.github/workflows/pages.yml`
- backend env names come from `apps/service/src/common/service-config.mjs`
- Firestore is an optional backend persistence path, not a frontend Firebase integration
- repo currently has no `render.yaml`
- repo currently has no `firebase.json`
- repo currently has no confirmed import/schema pipeline

## 4. Hard Constraints

These are mandatory:

- allowlist-only navigation
- single-user owner-admin model
- GitHub Pages is frontend-only
- Render owns dynamic behavior
- uploads require preview before approve
- aspect ratio must be preserved
- `maximized` is the default mode
- fullscreen failures must fall back to `maximized`
- unsupported behavior must not fail silently
- no built-in LLM features in MVP

For future relay work:

- only relay allowlisted domains / paths
- prefer project-tab-scoped relay behavior over open-ended relay endpoints
- keep unsupported sites explicit

If LLM features are ever added later, all output must stream.

## 5. Sensitive Areas

Treat these as high-sensitivity zones:

- `packages/contracts/**`
- `packages/policy/**`
- `packages/persistence/src/common/store.mjs`
- `apps/service/src/common/service-config.mjs`
- `.github/workflows/pages.yml`
- any code or docs that describe Firebase scope
- any future import/schema files if they appear

Do not make casual changes in these areas without first reading adjacent tests and docs.

## 6. Discovery Checklist

Before substantial edits, complete these checks:

1. scan repo structure
2. inspect `package.json`
3. inspect `scripts/*`
4. inspect `.github/workflows/*`
5. inspect backend config sources
6. inspect env usage
7. inspect README accuracy
8. inspect current branch and git cleanliness

If repo facts and docs disagree, prefer source code and the latest spec.

## 7. Firebase / Deployment / Env Guidance

### Firebase

- current Firebase use is Firestore-backed persistence
- do not claim Firebase Auth or Storage is active unless code proves it
- do not invent `firebase.json`, rules, or emulator steps if they do not exist in the repo

### GitHub Pages

- static frontend only
- depends on `.github/workflows/pages.yml`
- depends on repo variable `OPEN_SKY_API_BASE`
- must not absorb backend logic

### Render

- backend service only
- manual dashboard configuration is currently expected
- do not document `render.yaml` as present unless it exists

### Env

- do not invent `.env` loading
- if env is shell-only / dashboard-only / Actions-variable-only, say so explicitly

## 8. Change Strategy

- prefer minimal diffs
- preserve contracts unless explicitly redesigning them
- keep frontend/backend boundaries clean
- extend existing patterns before creating new abstractions
- document unknowns rather than guessing

## 9. Allowed / Disallowed Modifications

### Allowed

- documentation improvements that match repo facts
- minimal bug fixes
- deployment doc fixes
- workflow fixes with a concrete reason
- validation improvements

### Disallowed without explicit justification

- broad refactors
- changing auth model
- changing allowlist behavior
- changing persistence formats casually
- changing deployment architecture
- inventing Firebase services not present in the repo
- inventing import/schema systems not present in the repo

## 10. Minimum Validation

### Docs-only changes

- `npm run lint`
- `npm run typecheck`

### Workflow / deployment docs changes

- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`

### Backend or contract changes

- `npm run lint`
- `npm run typecheck`
- `npm run test`

## 11. Version Control Rules

- create a clear branch before editing
- keep commits focused and meaningful
- do not mix unrelated changes
- write PR descriptions that clearly separate confirmed facts from manual follow-up items

Recommended docs branch naming:

- `docs/bootstrap-project-docs`

## 12. PM Reporting

Owner-facing status updates should always include:

- completed
- in progress
- blockers / risks
- next step

Use concise PM-style updates instead of raw technical dumps.

## 13. Final Handoff Format

When finishing, report in this order:

1. Files changed
2. What was implemented
3. Commands run
4. Test results
5. Known risks / unsupported cases

Be explicit about anything that still requires manual confirmation.


