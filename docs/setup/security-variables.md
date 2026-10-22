# Mobile Game Starter: Configuration and key ownership

The setup skills use the Nakama keys in this table; they must not invent additional keys. `init` generates a distinct URL-safe random value for each of the seven backend key and password fields and writes them to a mode-0600 env file.

| Field | Meaning | Required handling |
| --- | --- | --- |
| `POSTGRES_PASSWORD` | Database role credential | Server only; preserve across deployments. Changing an env value does not rotate an existing role. |
| `NAKAMA_SERVER_KEY` | Public API identifier used by SDK authentication | Must match client/server for that environment; ships in the client; never treat it as authorization for trusted operations. |
| `NAKAMA_SESSION_KEY` | Access-token signing/encryption key | Server only; changing it invalidates sessions. |
| `NAKAMA_REFRESH_KEY` | Refresh-token signing/encryption key | Server only; rotation invalidates refresh sessions. |
| `NAKAMA_RUNTIME_KEY` | Non-player HTTP runtime key | Server only; never expose to a client or use to bypass authenticated player RPCs. |
| `NAKAMA_CONSOLE_PASSWORD` | Console admin password (`admin`) | Server only; access console through SSH tunnel. |
| `NAKAMA_CONSOLE_SIGNING_KEY` | Console session signing key | Server only, distinct from game session keys. |

Before deploying, verify that all seven values are present, random, different from one another, and different from development values. Compare them in a local checker and report only pass/fail and key names. Keep hashes and prefixes private too.

The env validator checks minimum format and length and uniqueness within one file. It cannot verify randomness or compare environments. Use independent `init` runs to generate random credentials. If development credentials may already be in production, plan the rotation, any migration, and the effect on sessions before changing keys. Do not silently regenerate them.

Nakama has no separate "development key." Development uses its own seven values and independent debug mobile signing keys. Before production, check TypeScript registration for debug, admin, reset, or economy endpoints. The current runtime registers only `get_state`, `update_profile`, and `complete_tutorial`. Players declare tutorial completion themselves, so that action demonstrates a once-only onboarding reward without proving a game result. Any new developer capabilities must default to off and require trusted server authorization. A client boolean or the public server key cannot authorize them.

The deployment tool serializes only allowlisted server variables. It does not upload Android signing fields, client configuration, or local SDK paths, even when the selected env file contains them. The archive and server env file have private permissions.

SSH private keys, Android keystores, Apple signing private keys, and optional provider or store API tokens are separate credentials. Keep them out of Git, game assets, and deployment bundles. Use scoped provider tokens only for explicitly authorized automation that needs them. A manual DigitalOcean setup does not need an API token in the game repository, and built-in image generation does not need an OpenAI API key.

## Non-secret operational inputs

- Identity: `GAME_TITLE`, `BUNDLE_ID`, `COMPOSE_PROJECT_NAME`; unique per game.
- Local connectivity: `CLIENT_API_URL`, `LOCAL_BIND_IP`, `LOCAL_API_PORT`, `LOCAL_CONSOLE_PORT`, `GODOT_BIN`.
- Images/logging: `NAKAMA_IMAGE`, `POSTGRES_IMAGE`, `CADDY_IMAGE`, `LOG_LEVEL`. Pin tags and review upgrades; avoid DEBUG in production.
- Production routing: `API_DOMAIN`, `TLS_EMAIL`, `SSH_HOST`, `SSH_USER`, `SSH_PORT`, `DEPLOY_PATH`; HTTPS origin must match the domain, API bind stays loopback, SSH user is non-root.
- Public export metadata/assets: see platform skills and `.env.example`. Signing fields are optional until that build type is requested.

Run `smoke` locally by default. It creates and deletes test accounts on the selected server, so agree on a disposable account before verifying production and confirm that it is deleted afterward.
