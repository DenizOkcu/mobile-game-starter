# Source project survey — 22 October 2026

The development tree was searched for Godot projects, Unity manifests, Swift packages/Xcode projects, mobile exports, and Nakama/Compose manifests. Generated dependency trees, engine source, vendored addons, build caches and duplicate agent worktrees were excluded from the relevant project review. This is a survey of the game projects and their infrastructure, not a claim that every file in every unrelated development repository was read.

Paths below are relative to `/Users/deniz.okcu/development`. Existing projects were read as references and were not modified.

| Project | Evidence and relevant lessons |
| --- | --- |
| `games/solarpunk` / Eco Farm Quest | Most mature reference. Godot portrait mobile, Nakama TypeScript, email/guest/link/refresh flows, authoritative farming state, versioned storage and bootstrap, config ownership, local services and SSH deployment. Read project settings, AGENTS, authentication autoload, storage write/get-state services, server authority contract, Compose, env example and deploy script. Preserve authority, OCC, explicit auth and canonical reconciliation. Avoid copying the farming domain, many autoloads, shared ingress dependencies, fixed container names, hardcoded VPS/IP or duplicated client configuration. |
| `games/flipfront` | Godot portrait card battler, authoritative Nakama, session store, account hub, local Compose and real API tests. Reinforces explicit account access and requiring bootstrap before hub/play. |
| `games/fridge-panic` | Godot portrait kitchen roguelite, Nakama SDK and TypeScript, three principal auth/network autoloads, local Compose. Confirms reusable menu/auth/backend separation; reuse the official SDK and a minimal TypeScript build in this scaffold. |
| `games/blastball` | Godot portrait offline football/action prototype, Compatibility renderer, menu/settings, local progression and meaningful UI tests. Reuse touch sizing, explicit settings and testable navigation. Accounts, ads and purchases are deliberately absent there. |
| `games/null-vein` | Godot portrait offline action RPG with touch input and Compatibility renderer. Useful mobile baseline without backend coupling. |
| `games/slay` | Godot iPhone portrait ARPG; main-menu entry and GameData/SaveManager/World autoloads. Preserve a clear game entry point without importing its gameplay globals. |
| `games/blockwatch` and `games/blockwatch/game` | Two Godot project files in one repository. The nested game is a portrait offline vertical slice with Compatibility renderer, title/briefing/play/results and iOS export. Do not count it as two distinct games. |
| `games/stadt-land-chill` | Godot city builder, Compatibility renderer and mobile landscape support, local saves. Mobile is not always portrait; this starter's orientation is a configurable project choice. |
| `games/tiny-forge` | Unity portrait mobile puzzle roguelite with Nakama TypeScript, shared schemas and local backend bootstrap. Same authority/config principles; no Unity runtime code is needed here. |
| `games/card-clash` | Unity/C# project (PixelSkateTrickster assembly), Assets/ProjectSettings and project instructions. Engine-specific gameplay rather than a Godot infrastructure source. |
| `games/ai-ttrpg` / KnaveRPG | SwiftUI/SwiftData mobile RPG, local models and pure deterministic rules. Its rule that an LLM proposes while deterministic code owns truth supports narrow validated intents. |
| `games/living-chronicle` | iOS-first Swift package/Xcode RPG, deterministic engine, SQLite event log and validated LLM proposals. Useful separation of presentation and state authority; no need to import event sourcing. |
| `games/ai-rpg/GemmaChat` | Native SwiftUI RPG/journey prototype with model, settings and journey stores. On-device model stack is unrelated to this Godot/Nakama starter. |

Other entries such as gallery/design tooling, LiteRT-LM runtime sources, and game specification folders are not additional Godot/Nakama applications. Non-game mobile projects and test fixture apps elsewhere under development were excluded from the framework's source scope.

## Decisions

- Godot 4.7.2 is installed and matches several current prototypes. Compatibility rendering keeps the empty foundation broadly portable.
- Nakama 3.41.0 follows Solarpunk's locally available image. PostgreSQL 17 has a straightforward stable volume layout for a new database. Versions are explicit env values rather than moving `latest` tags.
- Following the requested stack, use the official Nakama Godot SDK and strict TypeScript runtime, as in the mature reference projects. A direct ES5 `tsc` build and lockfile keep this setup small without adding a bundler.
- One env source generates public client config. Secrets stay in backend runtime environment. Separate local/production env files prevent accidental endpoint changes from being hardcoded in GDScript.
- Standalone Caddy supplies ordinary automatic HTTPS on a clean VPS, without requiring Solarpunk's existing shared Caddy/Cloudflare networks and certificates.
