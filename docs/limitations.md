# Limitations

- The current baseline defaults to in-memory persistence; file-backed JSON persistence is single-instance and not a shared multi-node data layer.
- Demo credentials are fixed until auth is reworked.
- External sites may block iframe embedding; this must be surfaced clearly in the UI as unsupported behavior.
- GitHub Pages remains static-only; backend behavior must stay on the Render service.
- Production hardening currently validates startup config and runtime diagnostics, but still does not provide database migrations, HA coordination, or secret rotation workflows.
