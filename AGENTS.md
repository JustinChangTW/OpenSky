\# OpenSky Working Agreements



This repository implements \*\*OpenSky\*\*.



OpenSky is a \*\*single-user, allowlist-based external site workspace\*\* with the following architecture:



\- \*\*Frontend\*\*: GitHub Pages static site

\- \*\*Backend\*\*: Render Web Service

\- \*\*Primary UX goal\*\*: maximize the central website display area

\- \*\*Default workspace mode\*\*: `maximized`



This file defines how work should be performed in this repo.



\---



\## 1. Product Boundary



OpenSky is \*\*not\*\*:

\- a general-purpose proxy

\- an arbitrary URL browser

\- a network restriction bypass tool

\- a public multi-user sharing platform



OpenSky \*\*is\*\*:

\- a controlled workspace for one owner-admin user

\- an allowlist-only external site entry system

\- a project-based workspace with persistent state

\- a UI that prioritizes central content over peripheral controls



Do not implement features that violate this boundary unless the task explicitly redefines the product.



\---



\## 2. Hard Constraints



These rules are mandatory.



\### 2.1 Allowlist-only

All navigation must be validated against the configured allowlist before execution.



Never add:

\- arbitrary URL browsing

\- “open any URL” shortcuts

\- fallback behavior that silently bypasses allowlist rules



\### 2.2 Single-user model

Assume exactly one owner-admin user unless a task explicitly changes the auth model.



\### 2.3 GitHub Pages is frontend-only

Do not move backend responsibilities into the frontend.



Frontend may handle:

\- rendering

\- local UI state

\- layout control

\- user interaction

\- calling backend APIs



Frontend must not be treated as the place for:

\- policy enforcement

\- trusted auth/session logic

\- secure persistence of external site session secrets

\- backend-only browsing logic



\### 2.4 Render backend owns dynamic behavior

Backend owns:

\- auth/session verification

\- allowlist enforcement

\- persistence APIs

\- browse/open/navigate/close flows

\- external session persistence

\- file preview/upload/download flow

\- audit logging



\### 2.5 No plaintext external passwords by default

Do not introduce default plaintext password storage for external sites.



\### 2.6 Uploads require preview

Any upload flow must require preview before final submission.



\### 2.7 Preserve aspect ratio

Any preview, zoom, resize, scaling, or content display change must preserve aspect ratio.



\### 2.8 Center-content-first UI

The center website display area is the primary UI concern.



Do not regress this priority by:

\- adding permanently expanded sidebars by default

\- turning the interface into a dashboard-first layout

\- consuming large portions of width with secondary controls



\### 2.9 Default mode is maximized

New workspace sessions should default to `maximized` unless persisted preferences override it.



\### 2.10 Fullscreen fallback

If fullscreen cannot be entered, the UI must fall back to `maximized` and surface a clear user-facing reason.



\### 2.11 No silent failure

Unsupported site behavior must be surfaced clearly. Never fail silently.



\### 2.12 Future LLM rule

This repo does not include built-in LLM features in MVP.



If LLM functionality is added later, \*\*all outputs must be streamed\*\*.



\---



\## 3. Primary Entities



The following entities are core and should remain explicit in code, contracts, persistence, and tests.



\### AllowedSite

Key responsibilities:

\- site metadata

\- allowlist rules

\- site-level feature flags



Expected fields:

\- `siteId`

\- `displayName`

\- `baseDomains\[]`

\- `pathRules\[]`

\- `defaultRenderMode`

\- `loginPersistenceAllowed`

\- `downloadAllowed`

\- `uploadAllowed`

\- `status`

\- `createdAt`

\- `updatedAt`



Expected statuses:

\- `active`

\- `disabled`

\- `archived`

\- `deleted`



\### WorkspaceProject

Expected fields:

\- `projectId`

\- `name`

\- `description`

\- `defaultSiteId`

\- `status`

\- `lastOpenedAt`

\- `createdAt`

\- `updatedAt`



Expected statuses:

\- `draft`

\- `active`

\- `paused`

\- `archived`

\- `deleted`



\### WorkspaceTab

Expected fields:

\- `tabId`

\- `projectId`

\- `siteId`

\- `entryUrl`

\- `currentUrl`

\- `pageTitle`

\- `renderMode`

\- `scrollPosition`

\- `zoomRatio`

\- `pinned`

\- `status`

\- `lastVisitedAt`



Expected statuses:

\- `open`

\- `suspended`

\- `closed`

\- `deleted`



\### Bookmark

Expected fields:

\- `bookmarkId`

\- `projectId?`

\- `siteId`

\- `url`

\- `title`

\- `note`

\- `status`

\- `createdAt`

\- `updatedAt`



Expected statuses:

\- `active`

\- `archived`

\- `deleted`



\### Note

Expected fields:

\- `noteId`

\- `projectId`

\- `relatedTabId?`

\- `title`

\- `content`

\- `status`

\- `createdAt`

\- `updatedAt`



Expected statuses:

\- `active`

\- `archived`

\- `deleted`



\### ExternalSessionVault

Expected fields:

\- `vaultId`

\- `siteId`

\- `projectId?`

\- `persistenceScope`

\- `secretType`

\- `rememberUntil`

\- `status`

\- `createdAt`

\- `updatedAt`



Expected statuses:

\- `active`

\- `expired`

\- `revoked`

\- `deleted`



\### FileTransferItem

Expected fields:

\- `itemId`

\- `projectId`

\- `siteId`

\- `direction`

\- `originalName`

\- `mimeType`

\- `sizeBytes`

\- `previewStatus`

\- `transferStatus`

\- `createdAt`

\- `updatedAt`



Expected statuses:

\- `pending`

\- `preview\_ready`

\- `approved`

\- `completed`

\- `failed`

\- `deleted`



\### AuditEvent

Expected fields:

\- `eventId`

\- `actorId`

\- `action`

\- `targetType`

\- `targetId`

\- `result`

\- `occurredAt`

\- `retentionState`



Expected statuses:

\- `active`

\- `redacted`

\- `purged`



\### LayoutPreference

Expected fields:

\- `layoutPreferenceId`

\- `scope`

\- `projectId?`

\- `leftPanelState`

\- `rightPanelState`

\- `topBarState`

\- `bottomBarState`

\- `viewMode`

\- `focusMode`

\- `contentZoomRatio`

\- `createdAt`

\- `updatedAt`



\---



\## 4. State and Persistence Rules



The following state must persist correctly:



\- project state

\- tabs state

\- bookmarks

\- notes

\- current URL

\- page title

\- scroll position

\- zoom ratio

\- left panel state

\- right panel state

\- top bar state

\- bottom bar state

\- view mode

\- focus mode

\- valid external session persistence



Preference precedence:

1\. project-scoped preference

2\. global preference

3\. system default



Do not store layout state only in ephemeral in-memory UI state if the product expects restoration.



\---



\## 5. UI Rules



\### 5.1 View modes

Supported view modes:

\- `standard`

\- `maximized`

\- `fullscreen`



\### 5.2 Panels

Left and right panels must support:

\- `expanded`

\- `collapsed`

\- `hidden`



Top bar must support:

\- `expanded`

\- `compact`

\- `autoHide`

\- `hidden`



Bottom bar must support:

\- `expanded`

\- `collapsed`

\- `autoHide`

\- `hidden`



\### 5.3 Default UX

\- `maximized` should be the default workspace mode

\- side panels should default toward minimal visibility

\- top and bottom bars should not permanently reduce content area without good reason



\### 5.4 Fullscreen behavior

\- fullscreen should be user-triggered

\- if fullscreen fails, fallback to `maximized`

\- show a user-facing reason with actionable guidance if possible



\### 5.5 Focus mode

If focus mode exists, it should reduce distractions and preserve content-area priority.



\### 5.6 Layout regression rule

Any UI change that reduces central content area must be treated as a possible regression unless explicitly requested.



\---



\## 6. API Expectations



Preserve these endpoint groups unless a task explicitly redesigns contracts.



\### Auth

\- `POST /v1/auth/sign-in`

\- `POST /v1/auth/sign-out`

\- `GET /v1/me`



\### Sites

\- `GET /v1/sites`

\- `POST /v1/sites`

\- `GET /v1/sites/{siteId}`

\- `PATCH /v1/sites/{siteId}`

\- `DELETE /v1/sites/{siteId}`



\### Projects

\- `GET /v1/projects`

\- `POST /v1/projects`

\- `GET /v1/projects/{projectId}`

\- `PATCH /v1/projects/{projectId}`

\- `DELETE /v1/projects/{projectId}`



\### Tabs

\- `GET /v1/projects/{projectId}/tabs`

\- `POST /v1/projects/{projectId}/tabs`

\- `PATCH /v1/projects/{projectId}/tabs/{tabId}`

\- `DELETE /v1/projects/{projectId}/tabs/{tabId}`



\### Bookmarks

\- `GET /v1/bookmarks`

\- `POST /v1/bookmarks`

\- `PATCH /v1/bookmarks/{bookmarkId}`

\- `DELETE /v1/bookmarks/{bookmarkId}`



\### Notes

\- `GET /v1/notes`

\- `POST /v1/notes`

\- `PATCH /v1/notes/{noteId}`

\- `DELETE /v1/notes/{noteId}`



\### Browse

\- `POST /v1/browse/open`

\- `POST /v1/browse/navigate`

\- `POST /v1/browse/close`



\### Session Vault

\- `GET /v1/session-vault`

\- `POST /v1/session-vault`

\- `PATCH /v1/session-vault/{vaultId}`

\- `DELETE /v1/session-vault/{vaultId}`



\### File Transfer

\- `POST /v1/file-transfer`

\- `POST /v1/file-transfer/{itemId}/preview`

\- `POST /v1/file-transfer/{itemId}/approve`

\- `POST /v1/file-transfer/{itemId}/complete`

\- `DELETE /v1/file-transfer/{itemId}`



\### Audit

\- `GET /v1/audit`



\### Layout Preferences

\- `GET /v1/layout-preferences`

\- `POST /v1/layout-preferences`

\- `PATCH /v1/layout-preferences/{layoutPreferenceId}`

\- `DELETE /v1/layout-preferences/{layoutPreferenceId}`



\---



\## 7. Error Handling Rules



Every user-facing error must include:

\- `code`

\- `message`

\- `userAction`

\- `traceId`



Preferred error codes include:

\- `AUTH\_REQUIRED`

\- `FORBIDDEN`

\- `SITE\_NOT\_FOUND`

\- `SITE\_DISABLED`

\- `URL\_NOT\_ALLOWED`

\- `PROJECT\_NOT\_FOUND`

\- `TAB\_NOT\_FOUND`

\- `BOOKMARK\_NOT\_FOUND`

\- `NOTE\_NOT\_FOUND`

\- `SESSION\_VAULT\_NOT\_FOUND`

\- `SESSION\_EXPIRED`

\- `LOGIN\_PERSISTENCE\_DISABLED`

\- `UPLOAD\_PREVIEW\_REQUIRED`

\- `FILE\_TYPE\_NOT\_ALLOWED`

\- `DOWNLOAD\_DISABLED`

\- `UPLOAD\_DISABLED`

\- `CONFLICT\_RETRY`

\- `SERVICE\_UNAVAILABLE`

\- `INVALID\_INPUT`

\- `FULLSCREEN\_NOT\_AVAILABLE`



Never replace a specific actionable error with a generic opaque one.



\---



\## 8. Change Strategy



\### 8.1 Prefer minimal diffs

Make the smallest change that fully solves the task.



\### 8.2 Preserve contracts

Avoid unnecessary breaking changes to:

\- shared types

\- API contracts

\- persistence formats

\- layout preference semantics



\### 8.3 Reuse existing patterns

Before introducing a new abstraction:

1\. read the target feature

2\. read adjacent tests

3\. read related contracts

4\. search for project-standard patterns



Prefer extension over duplication.



\### 8.4 Keep boundaries clean

Do not mix:

\- layout preference logic into unrelated domain models

\- allowlist policy into random UI utilities

\- backend-only logic into frontend convenience helpers



\### 8.5 Explicit unsupported cases

If a site interaction cannot be supported, report it explicitly in code comments, tests, and handoff.



\---



\## 9. Validation Requirements



Run the relevant subset of the repository’s commands after meaningful changes.



Typical validation includes:

\- install

\- lint

\- typecheck

\- test

\- build



Prefer repository-local scripts.



\### Minimum validation by change type



\#### UI-only changes

Run:

\- lint

\- typecheck

\- relevant UI tests

\- frontend build



Also verify:

\- maximized mode

\- panel toggle behavior

\- layout persistence

\- aspect ratio preservation



\#### Backend/API changes

Run:

\- lint

\- typecheck

\- backend tests

\- integration tests if present



\#### Contract/model changes

Run:

\- lint

\- typecheck

\- all affected unit tests

\- integration tests at contract boundaries



\#### File transfer changes

Also verify:

\- preview required before upload

\- unsupported file type handling

\- transfer state transitions



\#### Layout/fullscreen changes

Also verify:

\- default maximized state

\- fullscreen fallback

\- panel hide/collapse behavior

\- preference restoration

\- no layout breakage on reload



\---



\## 10. Tests That Matter Most



Prioritize tests for:

\- allowlist blocking

\- blocked redirects

\- project reopen restoration

\- tab restoration

\- layout preference restoration

\- maximized mode defaults

\- fullscreen fallback

\- session restore / expiry / revoke

\- preview-required uploads

\- service unavailable / warmup handling

\- aspect ratio preservation



\---



\## 11. Definition of Done



A task is not done unless, where applicable:



1\. The requested behavior is implemented.

2\. Allowlist-only constraints are preserved.

3\. Persistence rules are respected.

4\. UI still prioritizes central content.

5\. CRUD/state transitions are complete for affected entities.

6\. Errors are structured and actionable.

7\. Relevant tests were added or updated.

8\. Validation commands were run.

9\. Remaining risks or unsupported behavior are reported.



\---



\## 12. Final Handoff Format



When finishing work, report in this order:



1\. \*\*Files changed\*\*

2\. \*\*What was implemented\*\*

3\. \*\*Commands run\*\*

4\. \*\*Test results\*\*

5\. \*\*Known risks / unsupported cases\*\*



Be explicit about incomplete work.



\---



\## 13. Repo Navigation Guidance



When working in this repository, prefer this exploration order:



1\. `docs/specs/opensky-codex-spec-final.md`

2\. `AGENTS.md`

3\. `CLAUDE.md` if present

4\. shared contracts

5\. persistence models

6\. feature implementation

7\. related tests



If instructions conflict:

1\. direct task requirements

2\. latest product spec

3\. AGENTS.md

4\. other helper files



\---



\## 14. Do Not Introduce These Regressions



Do not introduce:

\- default expanded multi-panel layout that shrinks the content area

\- hidden allowlist bypasses

\- unstructured error responses

\- upload without preview

\- layout state loss on refresh/project reopen

\- fullscreen failures that leave the UI broken

\- plaintext password persistence by default

\- silent unsupported-site behavior



\---



\## 15. Recommended Companion Files



This file should work alongside:

\- `docs/specs/opensky-codex-spec-final.md`

\- `SKILL.md`

\- `CLAUDE.md`



If these files disagree, prefer the newest product spec unless the task explicitly says otherwise.

