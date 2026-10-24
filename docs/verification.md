# Mobile Game Starter: Verification (22 October 2026)

These checks ran on macOS with Godot 4.7.2 and the Nakama 3.41.0 / PostgreSQL 17 Docker stack:

- Environment tests covered random independent secrets, private permissions, refusal to overwrite files, production origin and bind validation, and rejection of duplicate keys and shell expressions.
- Local and production Compose configurations render successfully; the pinned Caddy container validates its configuration.
- The local PostgreSQL backup command wrote a private SQL dump. These infrastructure checks still apply after the switch to TypeScript.
- Android resource-pack export succeeds and includes public client config while excluding env, server, tools and tests. This is a resource-pack check, not an APK build.
- Strict TypeScript type-check and ES5 compilation pass.
- Godot headless import and navigation through authentication, menus, settings, and the game passed without script errors.
- The desktop login and settings screens were inspected at a 360×640 window size.
- REST tests covered guest authentication, player initialization on first read, profile validation, rejection of arrays and extra intent fields, denial of unauthenticated requests, player isolation, and denial of direct writes to private storage. They also checked eight concurrent tutorial requests, the once-only reward, guest email linking, login to an existing account, refresh and logout revocation, and deletion of temporary accounts.
- Tests through the official Godot SDK covered email account creation and bootstrap, RPC encoding and decoding, the server's reward snapshot, duplicate tutorial completion, restoration from a saved refresh token, guest authentication, email linking without changing the user ID, logout and login, and account deletion. The current runner uses an isolated temporary project and user-data directory.

At the time of verification, the local backend was running under Compose project name `mobile-starter`. Use `node tools/manage.mjs down` to stop it while keeping data.

These checks did not cover Android/iOS exports or device runs, store signing, an external VPS deployment, or DNS and TLS issuance on a real domain. Godot reported that Android build-tools were not configured on this machine. See docs/mobile.md for device prerequisites and docs/deployment.md for VPS setup. Passing local checks does not verify those steps.

## Guided setup additions

The four repository skills passed the skill-creator validator, and all local documentation links resolved. An independent read-only test of the guidance used an existing Droplet with shared ingress and only root access. The review found and corrected gaps in the conditions for avoiding lockout, handling ingress, and separating environments.

Twelve tests using Node.js built-ins cover configuration and export boundaries: optional inputs that work with older env files, icon paths confined to the repository, generated metadata, signing allowlists and redaction, serialization of server-only deployment variables, and rejection of root production SSH users. After these additions, the TypeScript/Godot check, local API/SDK smoke tests, and Android resource-pack export passed. The resource pack includes the SDK and public config while excluding setup notes, skill files, backend code, and secrets.

Tests of `tools/export.mjs` use a mocked exporter to check process and credential boundaries. Creating the guidance did not include building a real APK, signing a release, building for an Xcode device, or hardening or deploying a VPS. The Android SDK build-tools and each game's Apple signing setup still need attention in the interviews; the helper cannot bypass them.

## Node.js and Bash tooling migration

The project tooling, API smoke checks, and unit tests now use Node.js built-ins without extra runtime packages. Remote deployment runs `infra/deploy-remote.sh` over SSH with strict host-key checking. It reads the env file as data and never sources it. The 12 tooling checks cover parser and credential boundaries, export safety, literal subprocess arguments, Bash deployment behavior, and the local docs preview server. TypeScript compilation, Compose validation, Godot navigation, and API/SDK integration checks passed. Signed mobile builds and production VPS deployment still need separate verification.

## Framework update workflow (24 October 2026)

`check` passed with 19 tests, TypeScript compilation, Compose validation, and Godot import/navigation. Seven update tests use disposable local repositories with unrelated histories to cover baseline detection, compatible release selection, read-only previews, preservation of game changes and credentials, overlapping conflicts, failed-validation recovery, sequential updates, downgrade rejection, binary files and rename boundaries. Finish also rejects remote API endpoints before running its local checks. The new update skill passed the skill validator, and its guide links resolved.

After starting Docker Desktop, `up` and both API/Godot SDK `smoke` checks passed. The local stack remains running; `down` preserves its data. An Android resource-pack export and inspection confirmed that the MIT and SDK licenses and public config are included while framework metadata, tooling and private env files are excluded. The sandboxed export emitted macOS certificate/editor-settings permission diagnostics; pack generation and content checks succeeded. This did not verify an APK, signed build, physical device or production deployment. Android build-tools remain unconfigured.

Release handling was tested against local fixture tags. The initial framework release is version 0.1.0; its matching `v0.1.0` tag identifies the source baseline. Future releases follow the maintainer checklist in `docs/framework-updates.md`.

## 0.1.1 lifecycle and bootstrap fixes (24 October 2026)

`check`, `up`, and API/Godot SDK `smoke` passed. In addition to the 19 Node tooling tests, headless Godot regressions cover failed authentication bootstrap and recovery, empty-snapshot rejection, account switching, same-account token refresh, protected navigation, system Back while idle/pending, successful and failed resume refreshes, duplicate resume notifications, in-place player-summary updates, preservation of the active game instance/run state, and preservation of disabled controls. The transport fixtures use in-memory sessions; the backend fixture suppresses session persistence. Live checks use disposable accounts in an isolated temporary project and user-data directory.

A disposable repository generated from the actual `v0.1.0` snapshot successfully applied the prepared `0.1.1` patch and passed the upgraded `check` command while retaining its original `client/game/game.gd`. No server RPC, player schema, database or env migration was needed. Custom games should integrate their own `Backend.state_changed` HUD handling as described in the changelog.

These headless tests verify the navigation and lifecycle code paths, not OS delivery on physical devices. Android/iOS device background/resume, Android system Back gestures/buttons, and signed exports remain separate checks. Godot still reports that Android build-tools are unconfigured on this machine.

## Nakama knowledge and source reference (24 October 2026)

Official latest-release lookups resolved to the default Nakama 3.41.0 and Godot SDK 3.4.0 pins. The knowledge entry point links the live official AI documentation index and concept guides, while generated references index local SDK signatures/signals/models and installed runtime declarations. A separate immutable server-source snapshot covers 175 exported runtime functions, 187 initializer entries and four match-dispatcher methods. It explicitly reports source/type naming and availability gaps rather than treating the declaration file as proof of server support.

The API reference freshness check runs offline in the standard `check` command. Three regression tests verify multiline SDK signatures, callback/generic/overload declaration extraction, stale-output rejection, regeneration and rejection of an unrefreshed server-version change. The feature-planning skill passed its validator, and the generated local source links and line ranges resolved. No runtime dependency upgrade, new backend feature, player migration or deployment was performed. The generated inventory establishes discoverability and source provenance, not behavioral verification of every Nakama feature.

## Agent-first mobile review fixes (24 October 2026)

`check`, `up`, and API/Godot SDK `smoke` passed after the review fixes. The Node suite now has 27 passing tests. New updater cases cover a fatal patch error with no Git conflict entries, staged conflict resolution, interrupted/legacy pending state, baseline preservation through failed validation, recorded manual exceptions, unreleased template snapshots, missing tags and later forward releases. Failed application cannot advance the baseline through a clean conflict list alone; manual resolution is audited and validation still runs.

Godot regressions use in-memory transport/session fixtures to verify refresh-only retry after a timeout, successful recovery of the same account, explicit Retry connection, and serialized resume attempts without touching saved credentials. Existing bootstrap, account-switching and run-preservation checks also pass. Touch-target checks cover native auth/settings/game controls and confirmation controls at 320-, 360- and 430-wide layouts, plus 2x/3x display-scale conversions. The shared helper preserves native controls and adjusts their canvas minimum size to retain a 48×48 logical-unit hit area. Auth/settings screenshots were rendered and inspected at 360×640 without clipping.

The local/update/Android/iOS skills passed their validators and now require scale-aware hit regions, restore-recovery checks and separate device/build evidence. No server RPC, player schema, database, env or dependency migration was introduced. Physical Android/iOS runs, signed artifacts, store validation and production deployment remain unverified; Android build-tools are still unconfigured. These results do not claim device release readiness.

## Refresh failure and test isolation fixes (24 October 2026)

The auth regressions cover an access-token 401 followed by a refresh outage, proactive refresh outages, recovery without recreating the account, definitive refresh rejection, and exactly one retry after successful refresh. A transient refresh failure retains credentials and exposes the connection error.

Godot checks and smoke tests run from a temporary project with a unique project name and separate `user://` directory. A marker and expected-directory guard reject direct script runs against developer data. Each import/script process has a 120-second deadline and is killed on timeout; the Node runner removes its own temporary project and user data in `finally`. Regression tests cover normal completion, script failure, a real hung subprocess, diagnostic redaction, and preservation of a developer-session sentinel.

Live SDK checks stop at failed prerequisites and attempt disposable-account cleanup even when bootstrap or linked login fails. Fixture tests verify these paths, including reacquiring revoked cleanup credentials with `create=false` and checking identity before deletion. An unexpected script crash or process deadline can still prevent remote account cleanup; a failed cleanup is reported. Local player saves remain isolated regardless. Physical devices, signed exports and production deployment remain separate checks.

`node tools/manage.mjs check` passed with 30 Node tests, the offline Nakama reference check, TypeScript compilation, Compose/Bash validation, isolated Godot import, and client regressions. `up` and both API/official SDK `smoke` checks passed against the local stack. The initial sandboxed check was blocked from binding its temporary localhost test server; the rerun with local permissions passed. No server RPC, player schema, env or dependency migration was introduced.
