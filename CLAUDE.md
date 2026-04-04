# OpenSky Claude Notes

- Follow `docs/specs/opensky-codex-spec-final.md` first, then `AGENTS.md`.
- Preserve allowlist-only, single-user, center-content-first, and `maximized` default behavior.
- Do not move backend-only policy or session logic into the frontend.
- Current demo credentials are `owner-admin` / `opensky-demo`.
- The current backend baseline uses in-memory persistence only.
- If future LLM functionality is added, all output must stream. Do not add LLM features in MVP.
