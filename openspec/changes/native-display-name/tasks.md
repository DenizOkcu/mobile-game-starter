# Tasks

## 1. Native identity slice
- [x] 1.1 Implement schema-2 migration and native profile updates; verify focused runtime tests for preservation, conflicts, duplicates and canonical reads.
- [x] 1.2 Separate account display data in backend/UI and document the contract; verify isolated Godot account boundaries and name display tests.

## 2. Framework parity
- [x] 2.1 Apply equivalent changes, tests, documentation and change record to mobile-framework while preserving unrelated differences; verify its focused tests.

## 3. Integration
- [x] 3.1 Run strict spec validation and manage check in both repositories; record results.
- [x] 3.2 Run manage up and smoke in both repositories with disposable accounts; verify native account persistence and duplicate names.

## Evidence (2026-10-24)
- Both repositories: `node tools/manage.mjs check` passed, including five runtime regression tests and isolated Godot navigation/lifecycle tests. Godot exercises the account editor Save name interaction, separate account cache, account switching, session clearing, resume summary updates and small-screen controls.
- Runtime regression tests cover schema-1 migration, preservation of progression/timestamps, existing native name precedence, conflict rollback/reconciliation, idempotence and unsupported schema rejection using an in-memory runtime fixture. Migration was not executed against real player saves.
- Both repositories: `node tools/manage.mjs up` followed by `node tools/manage.mjs smoke` passed. Disposable-account API tests verify native display-name persistence, unchanged usernames, duplicate display names, native updates reflected by refresh, account restore, progression isolation and reward replay. Official Godot SDK live transport tests passed.
- Both repositories: `node tools/spec.mjs validate --all --strict --no-interactive` and `git diff --check` passed.
- The first cyber-runner check exposed an incorrect test field lookup; fixed it and reran the same full check successfully. Framework import emitted an Android build-tools warning but completed successfully; no Android export was attempted.

No browser runner was available; UI interaction coverage uses isolated headless Godot, not a browser or physical device. No deployment, signed exports or physical-device validation requested. Leave change unarchived pending an explicit finish request.
