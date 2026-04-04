\# OpenSky Project Skill



\## Purpose

This skill guides implementation work for OpenSky, a single-user, allowlist-based external site workspace.



Use this skill whenever the task involves

\- feature implementation

\- bug fixing

\- refactoring

\- API changes

\- UIlayout changes

\- persistencestate handling

\- test additions

\- deployment-related project changes



This skill is specifically for the OpenSky project architecture



\- Frontend GitHub Pages static site

\- Backend Render Web Service

\- User model one owner-admin only

\- Scope allowlisted sites only

\- UI priority maximize the central website display area



\---



\## Product Summary

OpenSky is not a general-purpose proxy and is not an arbitrary URL browser.



OpenSky is a controlled workspace that lets the single user

\- manage allowlisted external sites

\- open site workspaces inside projects

\- save tabs, bookmarks, notes, layout preferences

\- restore valid external login persistence

\- use a UI where the center content area is the highest priority



\---



\## Non-Goals

Do not implement any of the following unless explicitly requested



\- arbitrary URL browsing

\- unrestricted proxy behavior

\- bypassing network policy or enterprise controls

\- public multi-user sharing

\- anonymous routing features

\- hidden traffic forwarding features

\- “open anything” navigation

\- storing external site plaintext passwords by default

\- built-in LLM assistant features in MVP



If future LLM functionality is added, all outputs must be streamed.



\---



\## Core Architecture

\### Frontend responsibilities

The frontend is a static app and should handle

\- auth UI

\- site registry UI

\- project workspace UI

\- tabs  bookmarks  notes UI

\- layout controls

\- fullscreen  maximized behavior

\- error banners and user-visible status



\### Backend responsibilities

The backend should handle

\- authsession verification

\- allowlist enforcement

\- persistence APIs

\- browseopennavigateclose flows

\- external session persistence

\- file previewuploaddownload flow

\- audit logging



\### Hard boundary

Never move backend-only logic into GitHub Pages frontend.



\---



\## Primary Product Rules

These rules are mandatory.



\### 1. Allowlist-first

All browsingnavigation must be validated against allowlist rules before execution.



\### 2. Single-user model

Assume exactly one owner-admin user unless a future task explicitly changes this.



\### 3. State must persist

The following must be persisted



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



\### 4. CRUD completeness

Every major entity must have createupdatedelete behavior unless clearly system-generated.



\### 5. Uploads require preview

Any upload flow must require preview before final submission.



\### 6. Aspect ratio preservation

Any resize, zoom, preview, or content scaling must preserve aspect ratio.



\### 7. Center content area wins

The central website display area must always be prioritized over peripheral panels.



\### 8. Maximized default

Default workspace view mode should be `maximized`, not a heavy dashboard layout.



\### 9. Fullscreen fallback

If fullscreen cannot be entered, fall back to `maximized` and surface a clear user-facing reason.



\### 10. Explicit unsupported behavior

If a target site interaction is not supported, report it clearly instead of silently failing.



\---



\## Data Model Expectations

These are the primary entities.



\### AllowedSite

Fields

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



Statuses

\- `active`

\- `disabled`

\- `archived`

\- `deleted`



\### WorkspaceProject

Fields

\- `projectId`

\- `name`

\- `description`

\- `defaultSiteId`

\- `status`

\- `lastOpenedAt`

\- `createdAt`

\- `updatedAt`



Statuses

\- `draft`

\- `active`

\- `paused`

\- `archived`

\- `deleted`



\### WorkspaceTab

Fields

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



Statuses

\- `open`

\- `suspended`

\- `closed`

\- `deleted`



\### Bookmark

Fields

\- `bookmarkId`

\- `projectId`

\- `siteId`

\- `url`

\- `title`

\- `note`

\- `status`

\- `createdAt`

\- `updatedAt`



Statuses

\- `active`

\- `archived`

\- `deleted`



\### Note

Fields

\- `noteId`

\- `projectId`

\- `relatedTabId`

\- `title`

\- `content`

\- `status`

\- `createdAt`

\- `updatedAt`



Statuses

\- `active`

\- `archived`

\- `deleted`



\### ExternalSessionVault

Fields

\- `vaultId`

\- `siteId`

\- `projectId`

\- `persistenceScope`

\- `secretType`

\- `rememberUntil`

\- `status`

\- `createdAt`

\- `updatedAt`



Statuses

\- `active`

\- `expired`

\- `revoked`

\- `deleted`



\### FileTransferItem

Fields

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



Statuses

\- `pending`

\- `preview\_ready`

\- `approved`

\- `completed`

\- `failed`

\- `deleted`



\### AuditEvent

Fields

\- `eventId`

\- `actorId`

\- `action`

\- `targetType`

\- `targetId`

\- `result`

\- `occurredAt`

\- `retentionState`



Statuses

\- `active`

\- `redacted`

\- `purged`



\### LayoutPreference

Fields

\- `layoutPreferenceId`

\- `scope`

\- `projectId`

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



\## UI and Layout Rules

\### Default view

The default workspace should open in `maximized` mode.



\### Panels

Left and right side panels must support

\- `expanded`

\- `collapsed`

\- `hidden`



\### Top bar

Must support

\- `expanded`

\- `compact`

\- `autoHide`

\- `hidden`



\### Bottom bar

Must support

\- `expanded`

\- `collapsed`

\- `autoHide`

\- `hidden`



\### View modes

Supported

\- `standard`

\- `maximized`

\- `fullscreen`



\### Focus mode

Supported

\- `on`

\- `off`



\### UI behavior requirements

\- The center content area should consume the majority of available width and height.

\- In maximized mode, side panels should default to hidden.

\- Top and bottom bars should default to auto-hide in maximized mode.

\- Fullscreen failures must gracefully degrade to maximized mode.

\- Layout preferences must persist across reloads and project reopen.



\---



\## API Expectations

These endpoint groups should exist or be preserved unless intentionally redesigned



\### Auth

\- `POST v1authsign-in`

\- `POST v1authsign-out`

\- `GET v1me`



\### Sites

\- `GET v1sites`

\- `POST v1sites`

\- `GET v1sites{siteId}`

\- `PATCH v1sites{siteId}`

\- `DELETE v1sites{siteId}`



\### Projects

\- `GET v1projects`

\- `POST v1projects`

\- `GET v1projects{projectId}`

\- `PATCH v1projects{projectId}`

\- `DELETE v1projects{projectId}`



\### Tabs

\- `GET v1projects{projectId}tabs`

\- `POST v1projects{projectId}tabs`

\- `PATCH v1projects{projectId}tabs{tabId}`

\- `DELETE v1projects{projectId}tabs{tabId}`



\### Bookmarks

\- `GET v1bookmarks`

\- `POST v1bookmarks`

\- `PATCH v1bookmarks{bookmarkId}`

\- `DELETE v1bookmarks{bookmarkId}`



\### Notes

\- `GET v1notes`

\- `POST v1notes`

\- `PATCH v1notes{noteId}`

\- `DELETE v1notes{noteId}`



\### Browse

\- `POST v1browseopen`

\- `POST v1browsenavigate`

\- `POST v1browseclose`



\### Session Vault

\- `GET v1session-vault`

\- `POST v1session-vault`

\- `PATCH v1session-vault{vaultId}`

\- `DELETE v1session-vault{vaultId}`



\### File Transfer

\- `POST v1file-transfer`

\- `POST v1file-transfer{itemId}preview`

\- `POST v1file-transfer{itemId}approve`

\- `POST v1file-transfer{itemId}complete`

\- `DELETE v1file-transfer{itemId}`



\### Audit

\- `GET v1audit`



\### Layout Preferences

\- `GET v1layout-preferences`

\- `POST v1layout-preferences`

\- `PATCH v1layout-preferences{layoutPreferenceId}`

\- `DELETE v1layout-preferences{layoutPreferenceId}`



\---



\## Error Handling Rules

Every user-facing error response must include

\- `code`

\- `message`

\- `userAction`

\- `traceId`



Preferred error codes include

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



Never return opaque “something went wrong” responses when a more actionable error can be surfaced.



\---



\## Working Style

\### Exploration order

Before changing code

1\. Read the target feature files.

2\. Read adjacent tests.

3\. Read related contractstypes.

4\. Search for existing UI or API patterns.

5\. Prefer extending existing abstractions over creating new ones.



\### Change strategy

\- Prefer minimal diffs.

\- Preserve API compatibility unless the task explicitly requires breaking changes.

\- Avoid creating parallel abstractions when a project-standard pattern already exists.

\- Keep frontend and backend contracts synchronized.



\### Persistence strategy

\- Separate business entities from viewlayout preferences.

\- Keep layout preference persistence independent from project core data where possible.

\- Prefer explicit state transitions.



\### UI strategy

\- Default toward center-content-first decisions.

\- Do not add always-visible side panels unless explicitly requested.

\- Do not regress maximized mode behavior.



\---



\## Validation

After meaningful changes, run the relevant subset of



\- install

\- lint

\- typecheck

\- test

\- build



If the repository uses specific commands, follow repository-local scripts first.



\### Minimum validation by change type

\#### UI-only changes

\- lint

\- typecheck

\- relevant UI tests

\- build frontend



\#### APIbackend changes

\- lint

\- typecheck

\- backend tests

\- integration tests if present



\#### Shared contractmodel changes

\- lint

\- typecheck

\- all affected unit tests

\- integration tests covering contract boundaries



\#### Layout changes

Also verify

\- maximized mode

\- fullscreen fallback

\- panel hidecollapse behavior

\- layout preference persistence

\- aspect ratio preservation



\#### File transfer changes

Also verify

\- preview required before upload

\- unsupported file type handling

\- transfer state transitions



\---



\## Tests That Matter Most

Prioritize tests for

\- allowlist blocking

\- project reopen restoration

\- tab state restoration

\- layout preference restoration

\- maximizedfullscreen behavior

\- fullscreen fallback

\- session restore  expiry  revoke

\- upload preview requirement

\- blocked redirects

\- service unavailable  warmup handling



\---



\## Definition of Done

A task is not done unless all of the following are true where applicable



1\. The requested behavior is implemented.

2\. The solution respects allowlist-only constraints.

3\. State persistence is handled correctly.

4\. UI respects center-content-first principles.

5\. CRUDstate transitions are complete for affected entities.

6\. Errors are actionable and structured.

7\. Relevant tests were added or updated.

8\. Validation commands were run.

9\. Remaining risks or unsupported behaviors are documented.



\---



\## Final Handoff Format

When finishing a task, report in this order



1\. Files changed

2\. What was implemented

3\. Commands run

4\. Test results

5\. Known risks  unsupported cases



Be explicit about anything not completed.



\---



\## When Not to Use This Skill

Do not use this skill for

\- unrelated repos

\- general-purpose proxy projects

\- multi-user SaaS architecture unless explicitly requested

\- tasks that intentionally redefine the product into an unrestricted browser



\---



\## Recommended Companion Files

This skill works best alongside

\- `AGENTS.md`

\- `CLAUDE.md`

\- `docsspecsopensky-codex-spec-final.md`



If these files disagree, prefer the most recent product spec unless the task explicitly says otherwise.

