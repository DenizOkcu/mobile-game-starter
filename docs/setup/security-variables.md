# Configuration and key ownership

The setup skills use this table rather than inventing additional Nakama keys. `init` generates distinct URL-safe random values for all seven backend key/password fields, in a mode-0600 env file.

| Field | Meaning | Required handling |
| --- | --- | --- |
| `POSTGRES_PASSWORD` | Database role credential | Server only; preserve across deployments. Changing an env value does not rotate an existing role. |
| `NAKAMA_SERVER_KEY` | Public API identifier used by SDK authentication | Must match client/server for that environment; ships in the client; never treat it as authorization for trusted operations. |
| `NAKAMA_SESSION_KEY` | Access-token signing/encryption key | Server only; changing it invalidates sessions. |
| `NAKAMA_REFRESH_KEY` | Refresh-token signing/encryption key | Server only; rotation invalidates refresh sessions. |
| `NAKAMA_RUNTIME_KEY` | Non-player HTTP runtime key | Server only; never expose to a client or use to bypass authenticated player RPCs. |
| `NAKAMA_CONSOLE_PASSWORD` | Console admin password (`admin`) | Server only; access console through SSH tunnel. |
| `NAKAMA_CONSOLE_SIGNING_KEY` | Console session signing key | Server only, distinct from game session keys. |

For production verify all seven are present, random, different from one another, and different from development values. Compare inside a local checker and report only pass/fail/key names. Never paste hashes or prefixes as a substitute for keeping a secret private. The env validator verifies minimum format/length and within-file uniqueness; it does **not** establish randomness or compare environments. Independent `init` runs are the normal provenance for randomness. If dev credentials may have reached production, prepare a rotation/migration and session-impact plan instead of silently regenerating keys.

There is no separate magic Nakama “development key.” Development uses its own seven values plus independent debug mobile signing keys. Audit TypeScript registration for debug/admin/reset/economy endpoints before production. The current runtime registers only `get_state`, `update_profile`, and `complete_tutorial`; the last is a player-declared once-only onboarding example, not proof of game results. New developer capabilities must default off, use trusted server-side authorization, and never rely on a client boolean or the public server key.

The deployment tool serializes only a server-variable allowlist; Android signing fields, client configuration and local SDK paths are never uploaded even if present in the selected env file. The archive and server env use private permissions.

SSH private keys, Android keystores, Apple signing private keys, and optional provider/store API tokens are separate credentials. Keep them out of Git, game assets and deployment bundles. Use scoped provider tokens only if an explicitly authorized automation actually needs them; a manual DigitalOcean setup needs no API token in this game repo. Built-in image generation needs no OpenAI API key.

## Non-secret operational inputs

- Identity: `GAME_TITLE`, `BUNDLE_ID`, `COMPOSE_PROJECT_NAME`; unique per game.
- Local connectivity: `CLIENT_API_URL`, `LOCAL_BIND_IP`, `LOCAL_API_PORT`, `LOCAL_CONSOLE_PORT`, `GODOT_BIN`.
- Images/logging: `NAKAMA_IMAGE`, `POSTGRES_IMAGE`, `CADDY_IMAGE`, `LOG_LEVEL`. Pin tags and review upgrades; avoid DEBUG in production.
- Production routing: `API_DOMAIN`, `TLS_EMAIL`, `SSH_HOST`, `SSH_USER`, `SSH_PORT`, `DEPLOY_PATH`; HTTPS origin must match the domain, API bind stays loopback, SSH user is non-root.
- Public export metadata/assets: see platform skills and `.env.example`. Signing fields are optional until that build type is requested.

Do not run production `smoke` casually: it creates/deletes test accounts on the selected server. Local smoke is the default. Production verification should use a deliberately agreed disposable account and check its deletion.
