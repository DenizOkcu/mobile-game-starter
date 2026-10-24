# Changelog

Framework versions are independent of game app versions and player-state schema versions.

## Unreleased

- Run a headless Godot import during `up` so freshly cloned games can launch directly. Without an editor pass first, the missing `.godot` cache left the vendored SDK's classes unregistered and direct launches failed with a gray screen.
- Drive SDD through LLM chat actions with thin `/sdd` adapters for Claude Code/Cursor and the shared Codex skill. Agents handle installation and verification; document each client’s supported entry point.
- Add a lean repository-local OpenSpec workflow, four behavioral baseline specs, and an exact development-only CLI pin. Normal checks validate specs and archived task completion. Preserve game-owned OpenSpec files through framework updates and exclude them from mobile exports. Older games need the reviewed first-adoption step in the upgrade guide; development tooling now requires Node.js 22.13+ or a newer LTS (24+).

- Retain recoverable credentials when a rejected access token is followed by a refresh outage; expose the refresh error and retry only after successful refresh.
- Isolate Godot checks and smoke tests from developer user data, enforce process deadlines, and clean temporary files after failures. Live tests stop at failed authentication prerequisites and attempt cleanup of their disposable accounts.

- Block framework update completion after failed/interrupted application until every selected path is reviewed and an explicit manual resolution is recorded. Retain the resolution in the report and baseline metadata; validation remains required.
- Preview unreleased/newer template baselines without attempting to downgrade to older tags. Report when no forward compatible release exists.
- Recover refresh-only sessions after offline startup through resume and an explicit Retry connection action, preserving the original account.
- Enforce 48×48 logical-unit native hit targets across viewport/display scaling, including small layouts and confirmation controls. Update the agent and device acceptance guidance accordingly.

No server RPC, player schema, database, env or dependency migration is required. Existing games should adopt the controller/helper changes and review their custom touch regions. Framework update resolutions from older pending state require the explicit manual review step described in the upgrade guide.

## 0.1.1

- Refresh server state on resume without recreating the active game scene or discarding its unsaved run state. Update the player summary and example beacon in place.
- Disable Android's automatic Back-to-quit behavior and route Back through the navigation controller, including the pending-request guard.
- Require a successfully loaded player snapshot before entering the menu, account screen or game. A token alone does not unlock these screens. Fresh authentication, restore, account switching and logout invalidate readiness; same-account token refresh preserves it.
- Preserve disabled and read-only controls when a request finishes or fails.
- Add headless regression coverage for bootstrap failure/recovery, account switching, resume success/failure, overlapping resume notifications and Back navigation.

### Upgrade from 0.1.0

Use the framework update workflow to integrate this patch release. No server RPC, player schema, database or env changes are required. Keep your game's app version and build number independent of this framework release.

The updater preserves `client/game/`, so adapt the example game's `state_changed` handling manually if you still use its beacon, or update your own HUD from `Backend.state_changed`. Review changes to custom navigation in `client/ui/main.gd`: protected entry requires `Backend.state_ready`, and resume refreshes keep the active scene mounted. Device background/resume and Android system Back should still be tested on your target devices.

## 0.1.0

Initial versioned release. The matching `v0.1.0` Git tag identifies the exact baseline available to the updater.

- Godot 4.7.2, Nakama 3.41.0, official Godot SDK 3.4.0, PostgreSQL 17.6, Node.js 22+.
- Guest/email accounts, session management, menus, settings and example gameplay.
- Local configuration, validation, mobile export and SSH deployment tooling.
- GitHub template setup, MIT license, framework baseline tracking and guided updates.

### Upgrade from an unversioned starter

Use the update skill and [upgrade guide](docs/framework-updates.md). Identify the exact original source revision; the updater can match an unchanged template root commit automatically. Explicitly select `--to v0.1.0` when the original revision has no framework version metadata.

No player schema or RPC changes are introduced by the updater. Existing state remains at schema version 1. Keep game-specific fields, rewards, RPCs and stored data. No database migration is required for this tooling change. Review any other changes between your original revision and this release, especially if you started from an earlier snapshot.
