# Working in this starter

## Goal
Turn a game idea into a small playable mobile prototype. Preserve the working account, menu, settings, environment, and deployment foundation. Use KISS, DRY and YAGNI: use the official Nakama Godot SDK and TypeScript runtime. Avoid speculative abstractions, extra packages, generic event buses, or service layers.

## Read first
- `README.md` for commands and scope.
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
- `tools/manage.py`: config generation, local services, validation and SSH deployment.

## Rules
- Runtime TypeScript targets ES5 and runs inside Nakama, not Node.js. Use the official `nkruntime` types; no Node APIs or runtime imports. Register named RPC adapters in `InitModule`.
- SDK auto-retry and auto-refresh stay disabled: the wrapper refreshes/persists sessions explicitly and never replays unknown writes.
- Autoload scripts extend Node and have no `class_name`.
- Use typed GDScript, minimum 24px UI text and 72px touch controls at the 720px design width.
- Keep gameplay in `client/game`; extract a helper only when it has a real second use or independent domain responsibility.
- UI emits player intent; server computes persistent rewards and timestamps. Never accept a client balance, score reward, or arbitrary state blob as authority.
- Read stored versions and use optimistic concurrency on every mutation. Creation uses `version="*"`. Storage is private and server-write-only.
- RPCs reject unknown fields and invalid types. Return a complete canonical snapshot after commit. Do not retry uncertain writes; reconcile by reading. Repeated rewards need an idempotent domain condition or durable receipt.
- If changing schema version, add an explicit migration; never reset existing players silently.
- All deployment/config values originate in the selected `.env` file. Only `api_url`, public `server_key`, and `game_title` enter `client/config.json`. Never package secrets or source `.env` as shell code.
- `configure` owns title and export presets; edit `tools/export_presets.template`, not just generated presets.
- Do not read secrets, change other game repositories, or touch real player saves for tests. Live tests use disposable accounts and restore their temporary session file.
- Never use `docker compose down -v` without an explicit request to delete data.

## Validate
Run `python3 tools/manage.py check`. For backend, authentication, or deployment changes, start the local stack with `up`, then run `smoke`. Use `python3 tools/manage.py build` for TypeScript type-check/build. `up` installs locked npm dependencies, builds and restarts Nakama to load the compiled module; `check` and `deploy` also build. Edit `server/src`, not generated `server/modules/main.js`. Check timeout/error handling, resume refresh, account switching and small-screen layout. Keep tests tied to behavior. Report which checks could not run. Device exports and a VPS deploy are separate from local tests.
