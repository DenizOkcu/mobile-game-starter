# Working in Mobile Game Starter

## Goal
Turn a game idea into a small playable mobile prototype. Preserve the working account, menu, settings, environment, and deployment foundation. Use KISS, DRY and YAGNI: use the official Nakama Godot SDK and TypeScript runtime. Avoid speculative abstractions, extra packages, generic event buses, or service layers.

## Setup interviews and visual requirements

Start onboarding at `docs/start-here.md`. Use the repo-local skill for the requested workflow; read its SKILL.md directly if skill discovery has not refreshed:

- `.agents/skills/mobile-local-setup/SKILL.md`: first local run and prerequisites.
- `.agents/skills/mobile-production-setup/SKILL.md`: secure VPS/SSH/production readiness.
- `.agents/skills/mobile-android-export/SKILL.md`: Android tools, signing, assets and export.
- `.agents/skills/mobile-ios-export/SKILL.md`: Xcode, provisioning, assets and export.

Interview a few questions at a time, reuse existing answers, verify prerequisites, and keep redacted resumable notes under ignored `.setup/`. Read `docs/setup/interview-contract.md` for shared behavior. Do not turn an onboarding request into authorization to buy resources, change remote access, deploy or publish. Reuse explicit authorization already given.

For every new visible game-art or UI-art task, read and invoke the available **imagegen** skill and follow `docs/setup/visual-assets.md`. Generate actual characters/objects/backgrounds, UI skins, icons and splash artwork; do not substitute primitive shapes, procedural drawing, emoji or default-widget-only visuals for the game's art direction. Native layout/controls, readable live text, collision shapes and hit regions remain code. Explicit user requests for geometric/vector/wireframe output override this rule. If imagegen is unavailable, continue non-art work and report the asset milestone blocked; do not silently draw a substitute. Copy selected assets into the repo before referencing them.

## Updating games from the template

For framework updates, use `.agents/skills/mobile-framework-update/SKILL.md` and `docs/framework-updates.md`. Preview before applying; preserve game identity, private config, custom gameplay and player state. Record the exact framework baseline only after validation. Updating source does not authorize deployment or publishing.

## Prefer native Nakama features

Before designing or implementing a backend feature, read `docs/nakama-feature-map.md` and `docs/nakama/README.md` and use `.agents/skills/nakama-feature-planning/SKILL.md`. Interpret behavior, not just the developer's label: a durable fellowship/guild/coven is usually a Nakama Group; a temporary expedition crew may be a Party; an NPC roster is game state. Ask only about ambiguities that affect the design.

Map the request to native capabilities before adding custom tables, services or RPCs. Reuse the official SDK and native permissions/IDs; add only the game's policy and state. Keep one authoritative membership/balance/score source and guard all native entry paths when imposing custom rules. Verify API support in the pinned server, SDK and runtime types using the generated references and implementation links under `docs/nakama/`. Read only the relevant sections; check `api-gaps.md` for source/type differences. Recheck official releases when asked about current support; do not assume a type or online example proves runtime availability. Do not implement every capability just because it appears in the guide.

## Read first
- `README.md` for commands and scope.
- `docs/nakama-feature-map.md` before planning backend/social/economy/multiplayer features.
- `docs/architecture.md` before changing player state or RPCs.
- `docs/mobile.md` before exporting.
- `docs/deployment.md` before deploying.
- `docs/project-survey.md` explains the source-project decisions.

## Entry points
- `project.godot` → `client/ui/main.tscn` / `main.gd`: auth/menu/settings/account/navigation.
- `client/game/game.tscn` / `game.gd`: replace with the new game loop.
- `client/core/backend.gd`: official SDK client, authentication, sessions and RPCs.
- `client/core/preferences.gd`: device settings, Master audio, haptic preference.
- `server/src/main.ts`: authenticated, validated, versioned server state transitions.
- `addons/com.heroiclabs.nakama/`: pinned official Godot SDK; keep upstream code unmodified.
- `tools/export.mjs`: Android APK / iOS project export with private signing environment.
- `infra/deploy-remote.sh`: Bash deployment steps executed over verified SSH.
- `tools/lib.mjs`: shared env parsing, validation, safe subprocesses and configuration.
- `tools/manage.mjs`: config generation, local services, validation and SSH deployment.

## Rules
- Runtime TypeScript targets ES5 and runs inside Nakama, not Node.js. Use the official `nkruntime` types; no Node APIs or runtime imports. Register named RPC adapters in `InitModule`.
- SDK auto-retry and auto-refresh stay disabled: the wrapper refreshes/persists sessions explicitly and never replays unknown writes.
- Autoload scripts extend Node and have no `class_name`.
- Use typed GDScript and minimum 24px UI text at the 720px design width. Interactive hit areas must remain at least 48×48 logical units (Android dp / iOS points) after viewport and display scaling. Use `client/core/touch_targets.gd` for native controls and test 320-, 360- and 430-wide layouts; 96 design units is only the 360-wide baseline, not a density-independent guarantee.
- Keep gameplay in `client/game`; extract a helper only when it has a real second use or independent domain responsibility.
- UI emits player intent; server computes persistent rewards and timestamps. Never accept a client balance, score reward, or arbitrary state blob as authority.
- Read stored versions and use optimistic concurrency on every mutation. Creation uses `version="*"`. Storage is private and server-write-only.
- RPCs reject unknown fields and invalid types. Return a complete canonical snapshot after commit. Do not retry uncertain writes; reconcile by reading. Repeated rewards need an idempotent domain condition or durable receipt.
- If changing schema version, add an explicit migration; never reset existing players silently.
- All deployment/config values originate in the selected `.env` file. Only `api_url`, public `server_key`, and `game_title` enter `client/config.json`. Never package secrets or source `.env` as shell code.
- `configure` owns public title/icon/splash and export metadata; edit `tools/export_presets.template`, not just generated presets.
- Never print secrets or ask for them in chat; read them only inside the required validation/export/deploy tooling. Do not inspect unrelated secrets, change other game repositories, or touch real player saves for tests. Godot tests must run through the isolated, bounded tooling runner; never run their scripts directly against developer user data. Live tests use disposable accounts and attempt cleanup after failed prerequisites.
- Never use `docker compose down -v` without an explicit request to delete data.

## Validate
Run `node tools/manage.mjs check`. For backend, authentication, or deployment changes, start the local stack with `up`, then run `smoke`. Use `node tools/manage.mjs build` for TypeScript type-check/build. `up` installs locked npm dependencies, builds and restarts Nakama to load the compiled module; `check` and `deploy` also build. Edit `server/src`, not generated `server/modules/main.js`. Check timeout/error handling, resume refresh, account switching and small-screen layout. Keep tests tied to behavior. Report which checks could not run. Device exports and a VPS deploy are separate from local tests.
