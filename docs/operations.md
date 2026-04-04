# Operations

## Daily checks

- verify allowlist changes are audited
- verify blocked redirects are logged
- verify fullscreen failures surface `FULLSCREEN_NOT_AVAILABLE`
- verify upload approvals only happen after preview
- verify `/health` reports the expected persistence mode and does not show startup warnings in production

## Runtime expectations

- single owner-admin user
- no arbitrary URL entry
- no plaintext external password storage by default
- demo credentials are `owner-admin` / `opensky-demo`
- workspace/domain state can persist across restart when `OPEN_SKY_PERSIST_PATH` is configured
- owner-admin auth session does not persist across restart and requires a fresh sign-in
- production mode rejects demo credentials and memory-only persistence at startup
