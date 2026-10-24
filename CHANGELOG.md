# Changelog

Framework versions are independent of game app versions and player-state schema versions.

## 0.1.0

Initial versioned release. The matching `v0.1.0` Git tag identifies the exact baseline available to the updater.

- Godot 4.7.2, Nakama 3.41.0, official Godot SDK 3.4.0, PostgreSQL 17.6, Node.js 22+.
- Guest/email accounts, session management, menus, settings and example gameplay.
- Local configuration, validation, mobile export and SSH deployment tooling.
- GitHub template setup, MIT license, framework baseline tracking and guided updates.

### Upgrade from an unversioned starter

Use the update skill and [upgrade guide](docs/framework-updates.md). Identify the exact original source revision; the updater can match an unchanged template root commit automatically. Explicitly select `--to v0.1.0` when the original revision has no framework version metadata.

No player schema or RPC changes are introduced by the updater. Existing state remains at schema version 1. Keep game-specific fields, rewards, RPCs and stored data. No database migration is required for this tooling change. Review any other changes between your original revision and this release, especially if you started from an earlier snapshot.
