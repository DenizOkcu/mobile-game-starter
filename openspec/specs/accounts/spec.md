# Accounts Specification

## Purpose
Describe the account and session behavior inherited by games, including recovery across connectivity failures. Implementation contracts live in docs/architecture.md.

## Requirements

### Requirement: Account access and identity
The client SHALL support guest access, email registration/login, and linking an email to a guest without changing its player identity.

#### Scenario: Guest links an email
- **GIVEN** a guest with saved progress
- **WHEN** the guest links an email, logs out, and logs in with that email
- **THEN** the player ID and saved progress remain the same

### Requirement: Recoverable sessions
The client SHALL preserve refresh credentials after a transient refresh failure and SHALL NOT replay an action whose outcome is unknown. A definite access-token rejection MAY be retried once after successful refresh.

#### Scenario: Rejected access token followed by an outage
- **GIVEN** a saved session whose request receives HTTP 401
- **WHEN** refreshing credentials fails because of a connection outage
- **THEN** the client reports the connection error, retains recoverable credentials, and does not replay the action

#### Scenario: Refresh credentials are definitively rejected
- **GIVEN** a saved session
- **WHEN** refresh returns HTTP 401, 403, or 404
- **THEN** the client clears the session and protected player state

### Requirement: Account state boundaries
The client SHALL require a nonempty canonical snapshot before unlocking protected screens and SHALL clear old player state on fresh authentication, account switching, logout and account deletion.

#### Scenario: Authentication succeeds but bootstrap fails
- **GIVEN** authentication returned a session
- **WHEN** the player snapshot cannot be loaded
- **THEN** protected screens remain locked and recovery can load that same account later
