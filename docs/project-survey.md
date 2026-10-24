# Mobile Game Starter: Design decisions

The starter draws on patterns from mobile prototypes using Godot, Unity, and native iOS tooling. Those projects were references during development; they are not dependencies or required checkouts. This document records the reusable lessons without relying on a particular development machine.

## Lessons retained

- Godot/Nakama prototypes showed the value of explicit guest and email authentication, session refresh, account linking, and a successful state bootstrap before entering gameplay.
- Persistent game state belongs on the server. Use narrow validated intents, optimistic concurrency, and reconciliation after uncertain writes.
- Offline mobile prototypes informed touch sizing, settings, simple navigation, and Compatibility rendering. Keep orientation configurable as each game requires.
- Native mobile projects reinforced the separation between presentation and authoritative rules. A small prototype does not need event sourcing or a generic service layer.
- Keep gameplay separate from account, settings, and deployment infrastructure so each new game can replace the core loop without rebuilding the foundation.

## Stack and configuration

- Godot 4.7.2 and Compatibility rendering provide the client baseline.
- Nakama 3.41.0 and PostgreSQL 17 provide the backend baseline. Env files specify explicit image versions rather than moving `latest` tags.
- The official Nakama Godot SDK and strict TypeScript runtime keep integration close to upstream APIs. A direct ES5 `tsc` build and lockfile avoid a bundler.
- Public client config comes from the selected env file; secrets stay in the backend runtime environment. Separate local and production files keep credentials independent.
- Standalone Caddy provides automatic HTTPS on a dedicated VPS without depending on another game's ingress networks or certificates.
- Each generated game owns its Compose project, app identity, available ports, production domain, and deployment path. No external game repository or machine-specific path is required.
