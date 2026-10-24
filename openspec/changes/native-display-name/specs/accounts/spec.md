# Accounts Delta

## ADDED Requirements

### Requirement: Native account display names
The system SHALL use the native account display name as the sole name authority, separate from private progression. Display names SHALL allow duplicates without changing the unique username. The client SHALL clear cached account information when identity is invalidated.

#### Scenario: Save and restore a name
- **WHEN** a player saves a valid display name and later restores the account
- **THEN** the account API and game show the saved name and progression contains no display name

#### Scenario: Another player uses the same display name
- **WHEN** two players save the same valid display name
- **THEN** both saves succeed and their distinct usernames remain unchanged

#### Scenario: Native account name changes
- **WHEN** a native account name is updated and the game refreshes
- **THEN** the game displays the current native name rather than a progression copy

#### Scenario: Existing progression migrates
- **GIVEN** schema-1 progression with a saved name
- **WHEN** the player loads the game
- **THEN** the name moves to an empty native account name, an existing native name takes precedence, and progress is preserved

#### Scenario: Migration fails
- **WHEN** a migration encounters a version conflict or storage failure
- **THEN** it does not partially commit the name and progression migration and the player can reconcile by reading

#### Scenario: Account changes
- **WHEN** a player switches accounts, logs out or deletes the account
- **THEN** the prior account name is cleared alongside protected progression
