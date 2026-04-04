# Known Issues

- The initial baseline favors explicit unsupported-state messaging over silent emulation of unsupported external-site behavior.
- Full external-site compatibility is not guaranteed and is intentionally out of scope for MVP.
- The file-backed persistence option is local-disk only and does not solve multi-instance coordination or secure credential storage.
- `/health` diagnostics improve observability, but there is still no external metrics or alerting pipeline in this repo.
