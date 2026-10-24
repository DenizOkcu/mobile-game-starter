# Mobile Game Starter: Architecture and contracts

The client is a Godot project at the repository root. It uses the official Nakama SDK autoload and three application autoloads for public configuration, device preferences, and Nakama requests and sessions. One UI controller handles navigation and disables input during asynchronous actions. The game scene emits player intent without handling network transport. Add another facade only when a game needs one.

The official Nakama Godot SDK handles HTTP transport and REST serialization. `Backend` holds a `NakamaClient` and `NakamaSession` and adapts their results for the UI. Accounts and stored state do not need a socket.

Authentication startup keeps saved refresh credentials after a transient restore failure. The auth screen offers **Retry connection**, and resume attempts recovery even when only a refresh token is available. Recovery refreshes or restores the existing account and loads its snapshot; it never creates a guest to resolve an outage. Invalid credentials still clear the session through the normal refresh failure handling. UI pending guards serialize retry/resume work.

Each request has a 15-second timeout. The wrapper refreshes sessions nearing expiry before sending a request; a definite HTTP 401 can trigger a refresh and one retry. If refresh fails transiently, the wrapper retains credentials and reports the refresh error without replaying the action. Only a definitive refresh rejection (401/403/404), or another 401 after successful refresh, clears the session. SDK automatic refresh and retries are disabled. The wrapper saves every refreshed token and never replays a write whose outcome is uncertain, including after a network failure.

When the app resumes, it fetches the server's current state without remounting the active screen or game scene. The player summary and example beacon observe `Backend.state_changed` to update in place. Menu, account and game entry require a valid session and `Backend.state_ready`, set only after a nonempty canonical snapshot loads. A failed bootstrap keeps these screens locked even when authentication returned a token. Fresh authentication, restore, account switching and session clearing invalidate readiness; same-account token refresh preserves the already loaded snapshot. Android system Back uses the navigation controller with automatic quitting disabled, and is ignored during pending requests. Logout clears player state and the cached refresh token. Device preferences stay in place when players switch accounts.

## Player record

The record uses collection `player`, key `state`, and the authenticated `ctx.userId` as owner. Permissions are read=0/write=0, even for the owner. Clients access it through RPCs.

```json
{
  "schema_version": 2,
  "coins": 0,
  "tutorial_completed": false,
  "created_at": 0,
  "updated_at": 0
}
```

Timestamps use the server's UTC epoch seconds. On the first read, `get_state` creates the record with create-only version `*`. Schema-1 records migrate explicitly to schema 2: `display_name` moves to the native account only if its name is empty, then is removed from progression. Native account names take precedence. A version-checked `multiUpdate` commits the account and storage migration atomically, preserving progress and timestamps. Unsupported versions are rejected.

| RPC | Request JSON | Result |
| --- | --- | --- |
| `get_state` | `{}` | Initialize/read current player's snapshot |
| `update_profile` | `{"display_name":"Pilot"}` | Update native account display name: 1-24 ASCII letters, numbers, spaces, underscores, or hyphens |
| `complete_tutorial` | `{}` | Mark tutorial done and add 10 coins once |

Every successful RPC returns `{"state": {...}, "account": {"display_name": "Pilot"}, "server_time": 123}`. The account projection is read from Nakama `account.user.displayName`, not stored progression. The client caches it separately and clears it on identity invalidation. Empty native names display as "Player" in the summary. [Nakama display names](https://heroiclabs.com/docs/nakama/concepts/user-accounts/) are not unique; only usernames are unique, so duplicate display names are accepted without a taken-name error. The REST RPC body is a JSON-encoded string that itself contains JSON; the response has a string `payload`. The official SDK handles this REST envelope, and `Backend.call_rpc` decodes the payload JSON. Other API calls use ordinary JSON objects.

For each RPC, the server requires an authenticated user and rejects non-object JSON and unknown fields. Progression changes load the private record, check the action's conditions, and save using the version read. Profile updates use native `accountUpdateId` after migration and return the current account name; they do not mutate progression. Native account writes retain Nakama's last-write semantics. Concurrent writes can fail with HTTP 409/code 10. The client must read current state before asking the player to try again. Storage outages return the same write error requiring a refresh. The server never writes unconditionally, and the client never retries mutations automatically.

`complete_tutorial` grants an onboarding bonus when the player acknowledges completion. Repeating it cannot grant another reward. After a response timeout, reading `tutorial_completed` tells the client whether the write succeeded. Do not use this as a template for accepting client-reported wins or scores: validate the actual game conditions on the server. Before supporting retries for transfers or repeatable purchases, save an operation receipt atomically with the mutation.

## Configuration boundary

`.env.example` lists the operational settings. `init` generates independent random secrets. `configure` generates ignored `client/config.json` and updates the title and mobile bundle IDs. Keep separate env files for local development and production.

Compose and client generation use the same selected file. Shell environment variables do not override that file in the command runner. The flat parser rejects duplicate keys, shell expansion, quoted values, and command syntax. Paths may contain spaces, except deployment paths.

Nakama's server key is a public client identifier. Keep session and refresh signing keys, the runtime HTTP key, console signing key and password, and database password on the server. Caddy exposes the production API over automatic HTTPS. The database and console have no public bindings. Always send tokens over HTTPS in production.

## Adding a feature

1. Read the [Nakama feature map](nakama-feature-map.md) and map the requested behavior to a native capability, even when the game uses different names.
2. Implement the smallest playable interaction in `client/game`, reusing the official SDK for native features. A native list, join or read operation does not automatically need a new RPC.
3. Add a TypeScript hook/RPC only for the game's extra rules or custom state transitions. Validate intent, keep one authoritative source, and cover native mutation paths that could bypass a wrapper-only rule.
4. Reconcile canonical state after writes. Use narrow UI adapters for social/multiplayer results rather than cloning Nakama's services into the player snapshot.
5. Add real API tests for native permissions and custom policy, including invalid intent and duplicate/concurrent calls when rewards or progression change.

The implementation follows the official [Nakama Docker Compose](https://heroiclabs.com/docs/nakama/getting-started/install/docker/), [TypeScript runtime](https://heroiclabs.com/docs/nakama/server-framework/typescript-runtime/), [REST API definition](https://github.com/heroiclabs/nakama/blob/master/apigrpc/apigrpc.swagger.json), and [Godot SDK](https://heroiclabs.com/docs/nakama/client-libraries/godot/) references. Image versions use configurable, explicit tags based on the working local Nakama 3.41 setup. Back up the database and run integration checks when upgrading.

## Backend build

`server/src/main.ts` uses strict TypeScript and the official Nakama runtime types. `tsc` targets ES5 without a module loader and emits `server/modules/main.js`. `InitModule` registers the same three RPC IDs. Schema 2 explicitly migrates existing schema-1 records without resetting progress. Release the matching client and runtime together; schema-1-only runtimes cannot read migrated records. Compose mounts only compiled modules, and `--runtime.js_entrypoint main.js` selects the entry point.

`build`, `up`, `check`, and `deploy` run `npm ci --ignore-scripts`, then type-check and compile. `up` also runs a headless Godot import pass so freshly cloned projects can launch without opening the editor first, then restarts Nakama to load module changes. The deployment archive contains the compiled runtime, without npm, node_modules, or TypeScript source. You need Node on your development machine; the VPS does not need it.
