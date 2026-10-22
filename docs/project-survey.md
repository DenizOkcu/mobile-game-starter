# Mobile Game Starter: Source project survey (22 October 2026)

The survey searched the development tree for Godot projects, Unity manifests, Swift packages and Xcode projects, mobile exports, and Nakama/Compose manifests. It excluded generated dependencies, engine source, vendored addons, build caches, and duplicate agent worktrees. The review covered game projects and their infrastructure; it did not read every file in unrelated repositories.

Paths below are relative to `/Users/deniz.okcu/development`. The projects were read as references without changing them.

| Project | Evidence and relevant lessons |
| --- | --- |
| `games/solarpunk` / Eco Farm Quest | The most mature reference: a portrait Godot mobile game with Nakama TypeScript, email and guest authentication, linking, refresh, server-owned farming state, versioned storage, bootstrap, configuration, local services, and SSH deployment. The review covered project settings, AGENTS, the authentication autoload, storage write/get-state services, server authority contract, Compose, env example, and deploy script. Keep server authority, optimistic concurrency, explicit authentication, and reconciliation with server state. Leave out the farming logic, large autoload structure, shared ingress dependencies, fixed container names, hardcoded VPS/IP, and duplicated client config. |
| `games/flipfront` | A portrait Godot card battler with server authority in Nakama, a session store, account hub, local Compose, and real API tests. It supports requiring explicit account access and a successful bootstrap before entering the hub or game. |
| `games/fridge-panic` | A portrait Godot kitchen roguelite using the Nakama SDK, TypeScript, three main authentication/network autoloads, and local Compose. Its menu, authentication, and backend separation supports using the official SDK and a small TypeScript build in this starter. |
| `games/blastball` | A portrait offline Godot football/action prototype with Compatibility rendering, menus, settings, local progression, and UI tests. Reuse its touch sizing, explicit settings, and testable navigation. It deliberately omits accounts, ads, and purchases. |
| `games/null-vein` | A portrait offline Godot action RPG with touch input and Compatibility rendering. It provides a mobile baseline without a backend dependency. |
| `games/slay` | A portrait Godot iPhone ARPG with a main-menu entry point and GameData/SaveManager/World autoloads. Keep a clear game entry point without importing its gameplay globals. |
| `games/blockwatch` and `games/blockwatch/game` | One repository with two Godot project files, not two distinct games. The nested game is a portrait offline vertical slice with Compatibility rendering, title, briefing, play, and results screens, and iOS export. |
| `games/stadt-land-chill` | A Godot city builder with Compatibility rendering, mobile landscape support, and local saves. It is a reminder to keep orientation configurable rather than assuming every mobile game uses portrait. |
| `games/tiny-forge` | A portrait Unity mobile puzzle roguelite with Nakama TypeScript, shared schemas, and local backend bootstrap. The same authority and configuration rules apply here without importing Unity runtime code. |
| `games/card-clash` | A Unity/C# project with the PixelSkateTrickster assembly, Assets/ProjectSettings, and project instructions. It contributes engine-specific gameplay examples rather than Godot infrastructure. |
| `games/ai-ttrpg` / KnaveRPG | A SwiftUI/SwiftData mobile RPG with local models and deterministic rules. Its separation of LLM proposals from authoritative deterministic code supports using narrow, validated intents. |
| `games/living-chronicle` | An iOS-first Swift package/Xcode RPG with a deterministic engine, SQLite event log, and validated LLM proposals. It separates presentation from state authority without making event sourcing necessary for this starter. |
| `games/ai-rpg/GemmaChat` | A native SwiftUI RPG/journey prototype with model, settings, and journey stores. Its on-device model stack is outside the scope of this Godot/Nakama starter. |

Gallery and design tooling, LiteRT-LM runtime sources, and game specification folders are not additional Godot/Nakama applications. The review also excluded non-game mobile projects and test fixture apps elsewhere in the development tree.

## Decisions

- Godot 4.7.2 is installed and matches several existing prototypes. Compatibility rendering provides a portable starting point.
- Nakama 3.41.0 uses the image already available locally for Solarpunk. PostgreSQL 17 provides a stable volume layout for a new database. Env files specify image versions rather than using moving `latest` tags.
- The official Nakama Godot SDK and strict TypeScript runtime match the requested stack and the more mature reference projects. A direct ES5 `tsc` build and lockfile avoid the need for a bundler.
- Public client config comes from one env file, while secrets stay in the backend runtime environment. Separate local and production files keep endpoint settings out of GDScript and reduce accidental changes.
- Standalone Caddy provides automatic HTTPS on a clean VPS without depending on Solarpunk's shared Caddy/Cloudflare networks or certificates.
