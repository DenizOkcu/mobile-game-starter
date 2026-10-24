# Updating a game from the framework

Ask your coding assistant:

> Update this game to the latest compatible framework release. Read .agents/skills/mobile-framework-update/SKILL.md and preserve my game's customizations.

The same workflow is available without an assistant. It needs Git and Node.js; validation also needs the normal local Godot/Docker prerequisites. Updates never deploy or publish the game.

## Preview

From the game repository, run:

```sh
node tools/manage.mjs framework-update
```

This fetches the official framework's main history and release tags into `refs/mobile-framework/`, without changing remotes, local tags, game files, or branches. It reports the exact baseline and target revisions, release notes, selected paths and preserved paths. Preview needs network access; it is read-only with respect to the game files, but downloads Git objects and updates these dedicated refs.

The default selects the highest stable release in the baseline's major version. Before 1.0, it stays in the same minor version. This is a selection rule, not proof of compatibility with your game. Read the release notes. To select another reviewed release, use `--to vX.Y.Z`.

`init` records the initial repository tree offline in `framework.lock.json`. Commit that file with your game. During the first update, the tool matches the initial snapshot against upstream history. After a completed update it records the exact source revision. It works with GitHub template repositories despite their independent Git histories.

For an older game without this command, obtain the updater from a reviewed framework release: copy `tools/framework-update.mjs`, import `frameworkUpdate` in your existing `tools/manage.mjs`, and route `framework-update` before env validation, as shown in that release. Keep your existing tooling changes. An assistant can perform this bootstrap on an update branch and commit it before running the tool. Do not replace your entire tools directory. If `tools/lib.mjs` lacks `ROOT`, adapt that import to the existing repository-root constant.

If the original root snapshot cannot be matched (for example, a ZIP was modified before its first commit), the tool stops. Compare the original game files against upstream history and supply the verified full source commit SHA using `--baseline FULL_SHA`. This is a manual assertion, not automatic detection; never guess. An unversioned baseline also requires an explicit `--to` release. Keep evidence for the selected baseline in the update report.

## Apply on a branch

Commit or stash your work, then run:

```sh
node tools/manage.mjs framework-update --apply
```

Use the same `--to` and `--baseline` options as the reviewed preview when applicable. The tool prints a fresh preview, creates a `codex/framework-...` branch, writes `framework-update-report.md`, and applies a three-way patch using the original framework blobs. It creates no commits. Review the exact target SHA before proceeding if a release has changed since your preview.

Gameplay under `client/game/`, artwork under `assets/`, private env files, signing material, generated configuration, and tracking metadata are preserved automatically. Their upstream changes appear in the report for manual adaptation. Other paths, including menus, auth, server code and project settings, receive a three-way merge. Custom additions are retained where the merge can distinguish them; overlapping edits need review. Game-owned files outside the preserved directories may conflict too. Renames are treated as deletion/addition so a rename cannot bypass the path policy.

A conflict leaves the branch and Git conflict markers available. Resolve them in favor of the intended game behavior, then stage the resolutions. The baseline remains unchanged. A failed patch may also require manually applying missing changes from the reported revision range; inspect the entire diff rather than assuming all non-conflicting hunks were applied.

Review changes to `.env.example` and add required settings through configuration tooling without printing, replacing or regenerating existing secrets. Preserve Compose project names, bundle IDs, app version, domains and deployment paths. Review `tools/export_presets.template`, then regenerate export presets. Retain game-specific server fields and RPCs. Use explicit, version-checked migrations when a release requires them; never reset saves. Test existing mobile-client compatibility before backend deployment.

## Validate and finish

```sh
node tools/manage.mjs framework-update --finish
```

Finish requires the pending branch and resolved conflicts. It runs `check`, `up`, and `smoke` against the game's local `.env`. This builds code, starts/restarts local services and uses disposable test accounts. It does not select production settings and rejects an API URL that is not HTTP loopback on the configured local API port. Confirm `.env` points to a disposable local stack before running it. Never point smoke tests at real player saves.

On failure, fix the issue and rerun `--finish`; the baseline is unchanged. On success, the tool advances `framework.lock.json` and clears the pending state. The lock records paths deliberately preserved from upstream; it means the release was integrated with those exceptions, not that every game file equals the framework. Review and commit all intended changes, including generated tracked settings, the report and lockfile. Test the game's own loop, small-screen layout and affected device exports separately. Deployment requires its own request and backup/recovery plan.

Pending state lives in Git metadata, so it works with worktrees and survives tool restarts. It is not a player save or a packaged asset. To abandon an update, keep any work you want first; the report and pending state contain the pre-update commit. Discard the update branch's changes using your normal Git workflow, switch back to the previous branch, and remove only the pending file located by `git rev-parse --git-path framework-update.pending.json`. The updater never resets your working tree automatically.

## Maintainer release checklist

1. Update `framework.json`, this changelog, and migration/compatibility notes. Never edit a published release tag.
2. Run `check`, `up`, and `smoke`, plus the device/dependency checks affected by the release.
3. Exercise the updater on a customized disposable game, including conflicts and a failed validation. The automated tests cover these boundaries with unrelated Git histories.
4. Commit the release, tag that exact commit `vX.Y.Z` matching `framework.json`, and publish the commit and tag when authorized. The updater does not treat an untagged main branch as a release.

Keep framework versions separate from `APP_VERSION`, mobile build numbers, npm package versions, and `schema_version`. Changes to player schemas need their own explicit migration and recovery guidance. Existing installed apps may require a backward-compatible server rollout. A database migration can prevent rollback by simply reverting code.
