# Mobile Lifecycle Specification

## Purpose
Describe the starter's mobile navigation and native control behavior. Headless checks establish code behavior; physical device delivery and signed exports need separate evidence.

## Requirements

### Requirement: Resume preserves the active game
Resume SHALL recover the existing account and load canonical state without recreating the active game scene or discarding its unsaved run state. Pending requests MUST prevent overlapping resume or navigation actions.

#### Scenario: A game resumes successfully
- **GIVEN** an active game with unsaved run state
- **WHEN** resume loads the current player snapshot
- **THEN** the summary updates in place and the game instance and run state remain intact

#### Scenario: Resume occurs during a pending request
- **GIVEN** a request is in progress
- **WHEN** another resume or Back event arrives
- **THEN** the controller prevents overlapping work and preserves the active screen

### Requirement: Scale-aware native controls
Native interactive hit areas MUST remain at least 48 by 48 logical units after viewport/display scaling, including at 320-, 360- and 430-wide layouts. UI text MUST be at least 24 design pixels at the 720-wide design size.

#### Scenario: Small-screen controls are laid out
- **GIVEN** an authentication, settings, game or confirmation screen
- **WHEN** it is laid out at a supported small width
- **THEN** native interactive regions retain their minimum logical hit area
