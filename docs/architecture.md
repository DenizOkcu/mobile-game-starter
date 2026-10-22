# Mobile Game Starter: Architecture and contracts

The client is a Godot project at the repo root. The official Nakama SDK autoload plus three application autoloads cover public configuration, device preferences, and Nakama transport/session state. One UI controller owns navigation and disables input during async actions. The game scene emits intents without knowing transport details. Avoid adding another facade until a game needs one.

The official Nakama Godot SDK owns HTTP transport and REST serialization. `Backend` holds a `NakamaClient` and `NakamaSession`, and adapts SDK results to the existing UI. No socket is needed for accounts and stored state. Each request has a 15-second timeout; sessions nearing expiry refresh before a request; a definite HTTP 401 can trigger refresh followed by one retry. SDK automatic refresh and automatic retries are disabled, so the wrapper persists every refreshed token and never silently replays uncertain writes. Network failures do not replay mutations. Resume fetches canonical state. Menu entry requires a valid session and successful `get_state`. Account logout clears player state and the cached refresh token. Preferences are per device and survive account changes.

## Player record

Collection `player`, key `state`, owner authenticated `ctx.userId`; permissions read=0/write=0, including for the owner. Clients use RPCs rather than direct storage access.

```json
{
  "schema_version": 1,
  "display_name": "Player",
  "coins": 0,
  "tutorial_completed": false,
  "created_at": 0,
  "updated_at": 0
}
```

Times are server UTC epoch seconds. `get_state` lazily initializes with create-only `*`. Existing records must have schema version 1; unsupported versions fail explicitly. To extend a released game, migrate old fields in `load` before using them and keep version checks for migration commits.

| RPC | Request JSON | Result |
| --- | --- | --- |
| `get_state` | `{}` | Initialize/read current player's snapshot |
| `update_profile` | `{"display_name":"Pilot"}` | Validate 1–24 ASCII letters/numbers/spaces/underscore/hyphen; save label |
| `complete_tutorial` | `{}` | Mark tutorial done and add 10 coins once |

Every success returns `{"state": {...}, "server_time": 123}`. The REST RPC body is a JSON-encoded **string containing JSON**; its response has a string `payload`. The official SDK handles the REST envelope; `Backend.call_rpc` decodes the resulting payload JSON. API calls other than RPC use ordinary JSON objects.

The server requires authenticated user context, rejects non-object JSON and unknown fields, loads a private record, checks domain conditions, and saves with its loaded version. Concurrent writes can fail with HTTP 409/code 10; the client must read current state before asking the player to repeat an intent. Storage outages use the same refresh-required write error. No unconditional writes or automatic mutation retry.

`complete_tutorial` grants an onboarding bonus for an explicit player acknowledgement. It is naturally replay-safe, including after a response timeout: reading `tutorial_completed` reveals the result. It is not a template for accepting client-reported wins or scores. For real rewards, validate the actual game conditions on the server. For transfers or repeatable purchases, persist an operation receipt atomically with the mutation before adding retry support.

## Configuration boundary

`.env.example` lists all operational values. `init` fills independent random secrets; `configure` generates ignored `client/config.json` and updates the title and mobile bundle IDs. Keep local and production env files separate. Compose and client generation use the same selected file; ambient shell variables do not override it in the command runner. The flat parser rejects duplicate keys, shell expansion, quoted values and command syntax; paths may contain spaces, but deployment paths intentionally cannot.

Nakama's server key is a public client identifier. Session/refresh signing keys, runtime HTTP key, console signing key/password, and database password remain server-only. Caddy exposes the production API with automatic HTTPS; database and console have no public bindings. Tokens must travel over HTTPS in production.

## Adding a feature

1. Implement the smallest playable local interaction in `client/game`.
2. Define an intent with bounded IDs/choices, not computed rewards.
3. Add a validated TypeScript RPC using the existing load/save functions.
4. Replace client state only with a successful canonical snapshot.
5. Add a real API test, including invalid intent and duplicate/concurrent calls when money or progression changes.

Official references consulted: [Nakama Docker Compose](https://heroiclabs.com/docs/nakama/getting-started/install/docker/), [TypeScript runtime](https://heroiclabs.com/docs/nakama/server-framework/typescript-runtime/), [REST API definition](https://github.com/heroiclabs/nakama/blob/master/apigrpc/apigrpc.swagger.json), and [official Godot SDK](https://heroiclabs.com/docs/nakama/client-libraries/godot/). Image versions follow the locally working Nakama 3.41 setup and are configurable, explicit tags. Upgrade with integration checks and a database backup.

## Backend build

`server/src/main.ts` is strict TypeScript using the official Nakama runtime types. `tsc` targets ES5 with no module loader and emits `server/modules/main.js`. `InitModule` registers the same three RPC IDs and the state schema is unchanged, preserving existing players. The Compose mount exposes only compiled modules; `--runtime.js_entrypoint main.js` selects the entry point.

`build`, `up`, `check` and `deploy` run `npm ci --ignore-scripts`, type-check and compile before proceeding. `up` restarts Nakama so module edits are loaded. The deployment archive contains only the compiled runtime, not npm/node_modules or TypeScript source; Node is needed on the development machine, not the VPS.
