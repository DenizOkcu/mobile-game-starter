# Player State Specification

## Purpose
Describe the starter's persistent player behavior and authority boundaries so a game can extend progression without losing existing players. See docs/architecture.md for RPC and schema details.

## Requirements

### Requirement: Server-authoritative private state
The server SHALL validate player intent and own persistent rewards and timestamps. Stored player state MUST be private and server-write-only, and every mutation MUST use optimistic concurrency. Existing players MUST receive explicit migrations when the schema changes.

#### Scenario: A client submits an unauthorized state mutation
- **GIVEN** an authenticated player
- **WHEN** the player writes directly to private storage or submits unknown RPC fields
- **THEN** the server rejects the request without accepting client-authoritative rewards

### Requirement: Once-only tutorial reward
Completing the tutorial SHALL grant ten coins once per account and return the complete canonical player snapshot after commit.

#### Scenario: Completion is repeated
- **GIVEN** an account whose tutorial is already complete
- **WHEN** tutorial completion is requested again
- **THEN** the saved reward is not granted a second time

#### Scenario: A write response is lost
- **GIVEN** a tutorial request whose response timed out
- **WHEN** the client reads current state
- **THEN** the saved tutorial condition and balance determine whether the reward committed
