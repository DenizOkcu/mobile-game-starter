---
name: mobile-framework-update
description: Update a game created from an older Mobile Game Starter template release, preserving custom gameplay, configuration and player data. Use for framework upgrades, not deploying or publishing a game.
---

# Update a game's framework

Read `AGENTS.md`, `docs/framework-updates.md`, `docs/architecture.md` and the target release notes. Work in the game repository, not the source template. Reuse setup answers and record non-secret progress in `.setup/framework-update.md`.

Start with `node tools/manage.mjs framework-update`. It fetches official release metadata and previews changes without editing game files. Default selection stays in the current major version (same minor before 1.0); assess compatibility with this game rather than treating that selection as proof. If the baseline comes from unreleased main and has no forward compatible tag, report that status and stop update work without changing the baseline or selecting an older release. Honor a user-selected forward release. If the game predates the updater, follow the guide's minimal bootstrap and commit it before applying updates.

Use the recorded baseline or exact root-tree match. If detection fails, compare the original game snapshot against upstream history. Supply `--baseline FULL_SHA` only with evidence; ask the developer when it cannot be established. Never infer a baseline from the current app version or the newest release. Legacy unversioned baselines require `--to vX.Y.Z`.

Summarize the target release, affected systems, preserved paths and migrations. An explicit request to update authorizes the local branch and routine conflict resolution; do not stop just to repeat approval for those actions. With a clean checkout, run the reviewed options with `--apply`. Resolve mechanical conflicts and stage resolutions. A failed/interrupted patch is blocked independently of the Git conflict list: inspect every selected path, integrate missing changes or identify intentionally retained paths, then record the concrete explanation with `framework-update --resolve REASON`. Never treat an empty conflict list as proof of application or edit the pending JSON to clear the failure. `--finish` still runs validation, and the resolution remains in the report/lockfile. Ask only when conflicting behavior requires a product decision. Keep the exact target SHA and any baseline evidence in `framework-update-report.md`.

The patch preserves gameplay, assets, secrets and generated files automatically; review their skipped changes for required interface adaptations. Three-way merges also need semantic review, especially account/session handling and `server/src/main.ts`. Retain game-specific fields, RPCs and rewards. Never replace game state with the starter schema. Migrations use explicit schema transitions and optimistic concurrency; preserve compatibility with installed clients or plan the rollout. Do not test against real player saves.

Merge new env keys through tooling without printing or regenerating existing secrets. Preserve identity, Compose project and data volumes, bundle ID, app version, signing material, domains and deployment paths. Make export changes in the template and regenerate public config from the game's local env. Preserve upstream dependency provenance and licenses.

Before `--finish`, confirm the selected `.env` describes a disposable local stack; the command runs check/up/smoke and restarts local services. Handle missing tools through the local setup interview, reusing answers. Do not bypass validation by editing the lockfile. Add behavior tests for affected custom game contracts and migrations; check small-screen navigation, session refresh and account switching when touched. Report device tests separately. If validation is blocked, leave the update branch and pending state resumable with the baseline unchanged.

Finish records the integrated revision and preserved paths but makes no commit. Review the complete diff and game loop; commit if requested, otherwise leave a concrete reviewable result. Explain remaining device checks and any recovery limits. Source updates never authorize production deployment, remote access changes or store publication. See the guide for safe abandonment; do not reset or delete work automatically.
