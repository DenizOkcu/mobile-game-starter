# Design

## Context
See proposal.md and docs/architecture.md. The existing update_profile RPC validates names; retain that policy and RPC ID rather than inventing a naming service.

## Goals / Non-Goals
Use native identity without resetting players. No unique-name registry, username edits, new artwork or deployment.

## Decisions
- Display name → persistent account identity → Nakama User.displayName → existing ASCII/24-character RPC policy. Official user-account documentation (https://heroiclabs.com/docs/nakama/concepts/user-accounts/, checked 2026-10-24) marks username unique, not display_name. Duplicate display names are valid; no taken-name error applies.
- Verified pinned 3.41.0 runtime accountGetId, accountUpdateId and multiUpdate in docs/nakama/runtime-reference.md and linked server implementation; UserUpdateAccount uses displayName. No API gap applies.
- Schema 2 removes display_name. Schema 1 migrates with an optimistic storage version and native account update in one multiUpdate transaction, using the old name only if the native name is empty. Preserve all other progression fields/timestamps.
- Snapshots return a separate account.display_name projection from accountGetId, never a stored progression copy. Backend caches that projection and clears it wherever state is invalidated; UI reads it. Empty native names render as Player without persisting a fake name.
- update_profile loads/migrates before accountUpdateId, then returns a canonical snapshot. Native account operations remain permitted; account refresh reads their latest value. Progression writes still use optimistic concurrency; names follow native account last-write semantics.

## Risks / Trade-offs
- Snapshot contract changes → update server/client/tests together; deploy a coordinated release, not an old client against the new contract.
- Concurrent native rename during the one-time migration uses native last-write semantics; migration storage conflicts roll back the entire multiUpdate. Never replay an uncertain mutation automatically.

## Migration Plan
On authorized rollout, back up the database and deploy matching client/server. Migration occurs on first load. Rollback requires a compatible schema-2 runtime or explicit reverse migration; do not revert to schema-1-only code. No deployment is part of this task.
