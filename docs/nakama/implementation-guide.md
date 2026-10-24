# Implementing Nakama features in this starter

Start with the [entry guide](README.md) and [behavior map](../nakama-feature-map.md). Identify the game's behavior, find the native service, check the exact signature and source, then add only missing game policy. The generated references are exhaustive retrieval indexes for the pinned surfaces; this page explains how to use them without adding every capability to the game.

## Capability routing

Names below are search terms verified in the pinned client or runtime. A row does not imply every native operation exists on both sides. Read signatures and [known gaps](api-gaps.md) before coding.

| Capability | Godot entry points | Runtime / implementation route | Game-specific work |
| --- | --- | --- | --- |
| Built-in identity providers | `authenticate_*_async`, `link_*_async`, `unlink_*_async` | `authenticate*`, `link*`, `unlink*`, before/after hooks | Provider setup, linking UX, trust validation; custom/device IDs are not verified external identity |
| Registered auth providers | No generic provider wrapper in this SDK | `authenticate`, provider registration and generic auth hooks have source/type naming gaps | Review native endpoint/provider support and a typed integration before adding an auth method; never expose the runtime HTTP key |
| Sessions | `NakamaSession`, refresh/logout, retry controls | `sessionLogout`, `sessionDisconnect`, authentication hooks | Persist refreshed tokens, invalidate bootstrap on identity change, never replay uncertain writes |
| Accounts/profiles/privacy | Account get/update/delete, `get_users_async` | Account export/import, moderation, metadata, ban/unban | Public vs private fields, deletion/recovery UX; public metadata is not secret state |
| Friends/blocks/import | Friend add/list/delete/block and platform imports | `friends*`, friends-of-friends, `friendMetadataUpdate` | Invite/accept semantics, block policy and native-entry guards; newer discovery methods lack SDK wrappers |
| Groups/roles/community | Group create/update/join/leave/member promotion/listing | `group*`, `userGroupsList`, hooks | Native group IDs and membership are authoritative; custom gates must cover every entry path |
| Temporary parties | Party socket operations and `received_party*` signals | `partyList`, realtime hooks | Leadership, readiness and reconnect policies; party membership is not durable guild membership |
| Chat/history | Socket join/write/update/remove; HTTP `list_channel_messages_async` | `channelIdBuild`, `channelMessage*`, channel history | Channel type/permissions, moderation, pagination and missed-history reads |
| Presence/status | Socket follow/unfollow/status and presence signals | `statusFollow`, `statusUnfollow`, stream presence APIs | Per-connection vs per-user aggregation, invisible presence and reconnect |
| Storage/CAS | Storage helpers exist, but starter private state uses RPCs | `storageRead/Write/Delete/List`, `storageWriteRetry`, `multiUpdate` | Private owner/version checks, migrations, idempotent intents and one authority |
| Search/offline matchmaking | Thin authorized RPC over indexed storage when needed | `registerStorageIndex`, filter hook, `storageIndexList` | Bounded discovery, canonical rereads, authorization and persisted opponent snapshots |
| Active matchmaking | Socket matchmaker add/remove, matched signal | `registerMatchmakerMatched`, match creation | Query/size/count-multiple constraints, trustworthy ratings and join eligibility |
| Match browser | HTTP `list_matches_async`; socket match join | `matchList`, `matchGet`, labels and join-attempt callback | Label filtering, admission and privacy; listing is not matchmaking |
| Relayed multiplayer | Socket create/join/leave and match-data send/receive | Relayed transport/realtime hooks | Client trust and peer-hosted rules; relaying does not validate a win |
| Authoritative multiplayer | Socket transport and match presence/data | `registerMatch`, all seven `MatchHandler` callbacks, dispatcher, `matchSignal` | Server simulation, validation, persistence, reconnect snapshots and terminal rewards |
| Godot high-level multiplayer | `NakamaMultiplayerBridge`, `NakamaMultiplayerPeer` | Read bridge/peer implementation | Peer mapping and host lifecycle; bridge networking does not turn client RPCs into Nakama-authoritative logic |
| External dedicated servers | Match/auth integration with external allocation | [Session-based multiplayer](https://heroiclabs.com/docs/nakama/concepts/multiplayer/session-based/) and pinned Go/runtime support | Simulation hosting/allocation is additional infrastructure; do not promise TypeScript fleet-manager APIs from Go examples |
| Leaderboards | Record list/around-owner/write/delete | Authoritative leaderboard creation, resets, records/rank APIs | Result validation, time units, reset/cohort policy and durable prize claims |
| Tournaments | List/join/record methods | Tournament scheduling, attempt limits, end/reset hooks | Brackets and prize fulfillment when required; check rank-disable naming gap |
| Wallets/ledger | Account wallet reads | `walletUpdate`, `walletsUpdate`, ledger, `multiUpdate` | Server pricing and idempotent fulfillment; migrate `state.coins` if adopting wallets |
| Notifications/inbox | HTTP list/delete, socket notification signal | Send/list/update/delete APIs | Claims/attachments have separate durable state; notification is not OS push or an entitlement |
| Purchases/subscriptions | Apple/Google validation and subscription list/get; Huawei purchase validation | Store validation, transaction records and notification hooks | Native checkout, provider configuration, product mapping, fulfillment and refund handling; Samsung/Facebook support differs by layer |
| Events/telemetry | `event_async` | `event`, before/after event hooks, metrics/logger | Untrusted client events cannot grant rewards; asynchronous event processors are not TypeScript initializer methods |
| Streams | Socket stream state/presence receive signals | `stream*` controls | Advanced server-managed communication; prefer existing chat/party/match services first |
| Utilities/integration | HTTP adapter/error/result helpers | HTTP, crypto, UUID, binary conversion, CRON calculations, files, local cache, SQL escape hatch | Runtime constraints, credentials, bounded calls; local cache is node-local/non-durable and CRON helpers do not schedule jobs |
| Satori / other products | Separate indexed Satori client/model surface | `getSatori` and separate runtime interface | Requires its own service/configuration; not included by having an SDK class |

## Follow the existing integration boundaries

### HTTP native reads and actions

Inspect `client/core/backend.gd`: the official client is created once; `_authorized` refreshes sessions explicitly; `_check` handles exceptions. Add focused wrapper methods for requested native APIs and return their native result/model to the UI. Do not route a native list through a new server RPC just to rename it.

`Backend.call_rpc` is deliberately for game RPCs returning a canonical player snapshot. It replaces `Backend.state`, marks `state_ready`, and emits `state_changed`. Do not reuse it unchanged for an RPC returning group lists, search hits or arbitrary native results. Give those responses a focused adapter without falsely marking player bootstrap complete. Never let a client choose an account ID as authority for a private server mutation.

### Runtime policy and hooks

Use the installed `nkruntime` signatures, named callbacks registered by the existing `InitModule`, and the server function body where semantics matter. HTTP before/after hooks, realtime envelope hooks and match join-attempt callbacks are different entry points. A before hook can validate/refuse a native operation; an after hook cannot make an already committed operation disappear. Inspect the implementation when determining whether server-initiated calls invoke the same hooks; never assume they do.

If a rule spans membership and resources, cover native create/join/add routes and server paths, and design concurrent behavior. A wrapper-only restriction is bypassable if the native SDK route remains permitted. Hooks are not a substitute for authorization inside custom RPCs or runtime functions.

### Realtime transport

Create an official socket from the existing client only when the requested feature needs it. Authenticate it with the current session, bind the exact socket signals before joining, handle exceptions on every async result, and keep HTTP account/state access functional if the socket fails. Read `NakamaSocket.gd` for WS/WSS selection and connection/close behavior.

This SDK distinguishes `join_matched_async(matched)` from `join_match_async(match_id, metadata)`. Also inspect `send_party_data_async`, `promote_party_member` and the actual `list_friends_async(session, state, limit, cursor)` argument order. Do not copy method names or argument order from another SDK or assume every current online example matches these wrappers.

Own the reconnect lifecycle: refresh credentials, reconnect, reconcile party/match/channel membership, fetch missed persistent chat/notifications and the authoritative game snapshot, and resume input only after reconciliation. Presence events are incremental and connection-scoped. A successful send/ack is not proof that a persistent reward committed. Never replay unknown-outcome writes on reconnect.

### Authoritative matches and the Godot bridge

Read `MatchHandler`, the seven callback interfaces and `MatchDispatcher` in the runtime reference. Implement init, join-attempt, join, leave, loop, terminate and signal according to their exact return contracts; null terminates where the contract permits it. Register the handler, create the match on the server, then join from the socket. Matchmaker completion and match join are separate steps.

The server validates sender identity, opcode, payload shape, limits and timing before changing state; clients send intent. Keep loop work bounded, distinguish ephemeral simulation from persisted progression, and make reward completion restart/retry safe. Inspect `broadcastMessage` vs deferred broadcast and the join-attempt callback when reasoning about recipients/admission.

The Godot bridge maps Nakama transport into engine peers. Read its reserved opcodes and host-election behavior before using it with engine RPCs. It is an optional networking integration, not a replacement for the Nakama authoritative match handler.

### Transactions and repeated work

Storage batches and `multiUpdate` cover specific supported operations, not arbitrary sequences across services. Inspect the actual function body before claiming atomicity. Use one canonical balance/membership/score source, private version-checked writes, and a durable domain condition/receipt for repeatable rewards. An external receipt, notification or leaderboard reset callback is not automatically once-only fulfillment.

The server's `storageWriteRetry` is distinct from replaying a client's uncertain write: its update callback may execute repeatedly after CAS contention. Use it only when the transformation is safe to rerun and has no duplicated side effects such as charges, HTTP requests, notifications or rewards outside the transaction.

## Known compatibility decisions

The generated [gap report](api-gaps.md) compares the actual server registry with the runtime declarations. At the reviewed pins it exposes, among others, provider registration/hook names, session-refresh/subscription hooks, `subscriptionsList`, and a tournament-rank-disable spelling discrepancy. It also identifies duplicate `purchasesList` declarations. Follow the linked implementation and inspect argument/return validation before introducing a narrowly scoped, documented type correction for a requested feature. Do not fix mismatches by making the whole runtime `any` or by altering vendored code.

The current auth-provider concept page emphasizes Go, while the pinned JavaScript implementation also exports provider registration. Conversely, event processing registration documented for Go is absent from this TypeScript initializer surface. Use concrete source/version evidence when documentation and types disagree; availability of a function still does not verify an end-to-end integration. A missing convenience wrapper in Godot is another distinct gap, even if the server exports the feature.

## Evidence required before calling a feature done

Record the behavior → native service → custom policy → exact SDK/runtime/server versions in the existing plan or PR. Verify signatures by compiling/importing; then test actual permissions and behavior with disposable accounts. Depending on the feature, cover pending/banned membership, spoofed identity, duplicate/concurrent claims, opaque pagination cursors, timeout/reconciliation, disconnect/rejoin, stale state, and already-installed-client compatibility. Do not expand a small feature into implementing the whole catalog.
