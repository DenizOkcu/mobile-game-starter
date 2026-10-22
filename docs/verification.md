# Verification — 22 October 2026

Completed on macOS with Godot 4.7.2 and the real Nakama 3.41.0 / PostgreSQL 17 Docker stack:

- Environment parser/generation tests: random independent secrets, private permissions, overwrite refusal, production origin/bind validation, duplicate/shell-expression rejection.
- Local and production Compose configurations render successfully; the pinned Caddy container validates its configuration.
- Local PostgreSQL backup command writes a private SQL dump. These infrastructure checks remain valid after switching the runtime to TypeScript.
- Android resource-pack export succeeds and includes public client config while excluding env, server, tools and tests. This is a resource-pack check, not an APK build.
- Strict TypeScript type-check and ES5 compilation pass.
- Godot headless import and auth/menu/settings/game navigation pass without script errors.
- Rendered desktop login and settings screens inspected at the 360×640 window size.
- Real REST checks: guest auth, lazy player initialization, validated profile, rejection of arrays/extra intent fields, unauthenticated denial, distinct player isolation, private storage-write denial, eight concurrent tutorial requests, once-only reward, guest email linking, existing-account login, refresh and logout revocation, temporary account deletion.
- Actual official Godot SDK transport: email creation/bootstrap, RPC encoding/decoding, canonical reward, duplicate completion, persisted refresh-token restore, guest SDK authentication, email linking preserving user ID, logout/login, and account deletion. The test restores any pre-existing starter session file afterward.

The local backend is running with Compose project name `mobile-starter`. Stop it with `python3 tools/manage.py down`; this preserves data.

Not completed: Android/iOS export or device run, store signing, external VPS deployment, DNS/TLS issuance on a real domain. Godot reported that Android build-tools are not configured on this machine. Follow docs/mobile.md for the device prerequisites and docs/deployment.md for the VPS workflow. A successful local check does not imply these platform checks have passed.

## Guided setup additions

Four repo-local skills pass the skill-creator validator, and all local documentation links resolve. A read-only independent forward-test exercised an existing shared-ingress Droplet with only root access; its resulting lockout, ingress and environment-separation gates were reviewed and corrected.

Eight Python tests now cover configuration and export boundaries, including backward-compatible optional inputs, icon path confinement, generated metadata, private signing allowlists/redaction, server-only deployment env serialization and rejection of root production SSH users. The TypeScript/Godot check, real local API/SDK smoke tests and Android resource-pack export pass after these additions. The resource pack contains the SDK and public config; setup notes, skill files, backend code and secrets stay out.

`tools/export.py` is checked with a mocked exporter for process/credential boundaries. No real APK, signed release, Xcode device build or VPS hardening/deployment was performed as part of creating the guidance. Existing Android SDK build-tools and per-game Apple signing prerequisites still need the interviews; the helper does not claim to bypass them.
