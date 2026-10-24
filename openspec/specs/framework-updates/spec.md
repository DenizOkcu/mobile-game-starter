# Framework Updates Specification

## Purpose
Describe how an independently created game integrates framework releases while retaining its own gameplay, configuration and player data. Operational steps live in docs/framework-updates.md.

## Requirements

### Requirement: Reviewed forward updates
The updater SHALL preview compatible forward releases and preserve game-owned files. It MUST NOT advance the recorded baseline until application is resolved and validation passes.

#### Scenario: Patch application fails without conflict entries
- **GIVEN** a failed or interrupted framework patch
- **WHEN** Git has no remaining conflict entries
- **THEN** finishing still requires explicit recorded resolution and successful validation

#### Scenario: The template baseline is unreleased
- **GIVEN** a game created from a newer template snapshot than published releases
- **WHEN** no compatible forward release exists
- **THEN** preview reports that status without selecting an older release

### Requirement: Game specifications survive upgrades
Framework updates SHALL preserve the game's OpenSpec configuration, current specs and change history. Shared workflow instructions and pinned tooling MAY receive reviewed updates.

#### Scenario: Upstream changes the same spec as the game
- **GIVEN** a game has customized a spec and OpenSpec configuration
- **WHEN** a framework update changes those upstream paths or adds upstream change history
- **THEN** automatic application retains the game's files and reports upstream spec changes for manual review
