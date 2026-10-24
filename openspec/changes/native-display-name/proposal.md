# Proposal

## Why
Display names currently duplicate a native Nakama account field in private progression storage. Use the native field so account APIs and the game show the same identity.

## What Changes
- Store and read names through Nakama `user.display_name`, not player progression.
- Explicitly migrate schema-1 names to schema 2 without losing progress or replacing an existing native name.
- Return account display information separately in canonical snapshots and clear it on account changes.
- Allow duplicate display names: Nakama usernames, not display names, are unique.
- **BREAKING**: snapshots no longer include `state.display_name`; clients use `account.display_name`.

## Capabilities

### New Capabilities
None.

### Modified Capabilities
- `accounts`: native account display-name authority and duplicate-name behavior.

## Impact
Both cyber-runner and mobile-framework: runtime, backend wrapper, account/menu UI, regression tests and architecture documentation. No dependency changes, username changes, deployment or publishing.
