# Mobile Game Starter: Choose Nakama features by behavior

Read this **before designing any backend feature**. Prefer a fitting Nakama capability, then add only the game's rules around it. Keep the developer's vocabulary in the UI and domain code. “Fellowship” can be the product name of a Nakama Group; it does not justify a second membership database.

These are design recommendations based on the linked official documentation, reviewed on 22 October 2026. They describe capabilities to reuse **when requested**, not extra features already implemented in this starter. Current integration is accounts, sessions and private player-state RPCs. Check the pinned server, runtime types and vendored Godot SDK before using newer APIs.

## Translate requirements before picking an API

Classify the actual behavior, not a noun in isolation:

- **Identity:** a human account, an NPC, a persistent social community, a temporary connected team, or a running game instance?
- **Lifetime:** device-only, one connection, one match, or durable across logins?
- **Authority:** who can join/read/change it; who validates results, permissions and rewards?
- **Interaction:** fetch/update on demand, live communication, active-player matching, or turns that survive hours offline?
- **Scope:** which part already exists in Nakama, and which rule is unique to this game?

Infer clear intent from the brief. Ask only about ambiguities that change the design. “Does the fellowship survive logout, or is it a team for one expedition?” is useful; asking whether the user wants to call it a “Nakama Group” is not. Unfamiliar or translated names follow the same analysis; this is not a keyword whitelist.

For an implemented feature, record a short mapping in the existing design note or PR description:

| Developer term | Required behavior | Nakama capability | Custom rules/state | Verified API/version |
| --- | --- | --- | --- | --- |
| Fellowship | Persistent members, officers, private chat | Groups + group chat | Entry level, emblem, treasury policy | Check SDK/runtime signatures |
| Expedition crew | Connected temporary team | Parties | Ready state and expedition selection | Check socket APIs |

Do not create a new spec document for every small edit. Explain any custom replacement of an existing Nakama capability with a concrete unmet requirement and evidence.

## Reuse map

| The developer might ask for… | Prefer… | What remains game-specific |
| --- | --- | --- |
| Guest passport, player identity, sign-in, recovering the same account on another device | [Authentication](https://heroiclabs.com/docs/nakama/concepts/authentication/), account linking and [sessions](https://heroiclabs.com/docs/nakama/concepts/session/) | Onboarding, provider configuration and recovery UX; no custom password/JWT service |
| Gamer tag, public profile, portrait URL | [User accounts](https://heroiclabs.com/docs/nakama/concepts/user-accounts/) | Extra RPG stats and private progression; native account ID stays canonical |
| Clan, guild, fellowship, alliance, coven, club, persistent crew | [Groups](https://heroiclabs.com/docs/nakama/concepts/groups/) | Membership rules beyond native roles, clan progression and shared resources |
| Friends, comrades, buddies, player contacts, invitations, blocked players | [Friends/social graph](https://heroiclabs.com/docs/nakama/concepts/friends/) | Game-specific recommendation UX and additional interaction policies |
| Raid squad, expedition team, temporary co-op crew | [Parties](https://heroiclabs.com/docs/nakama/concepts/parties/) | Ready checks/loadout selection; a party is not a durable clan |
| Tavern chat, whisper, fellowship channel, world chat | [Chat channels](https://heroiclabs.com/docs/nakama/concepts/chat/) | Moderation policy and UI; choose room, group, or direct channel |
| Green online dot, “in battle”, live friend activity | [Status/presence](https://heroiclabs.com/docs/nakama/concepts/status/) | Display semantics; durable history is a separate requirement |
| Find an opponent, queue for a raid, quick play | [Matchmaker](https://heroiclabs.com/docs/nakama/concepts/multiplayer/matchmaker/) | Criteria, team composition and validated match creation |
| Room browser, join an existing battle, public game list | [Match listing](https://heroiclabs.com/docs/nakama/concepts/multiplayer/match-listing/) | Labels and join rules; this is different from matching a new set of players |
| Shared live battle, authoritative duel, co-op simulation | [Authoritative matches](https://heroiclabs.com/docs/nakama/concepts/multiplayer/authoritative/) | Actual game rules and simulation; Nakama is not the Godot physics engine |
| Casual peer-hosted session with accepted client trust | [Relayed matches](https://heroiclabs.com/docs/nakama/concepts/multiplayer/relayed/) | Peer-hosted game logic; relaying does not validate results |
| Cloud save, farm, bag, loadout, quests, unlocks, offline turn record | [Storage collections](https://heroiclabs.com/docs/nakama/concepts/storage/collections/) + validated runtime transitions | Schema, migrations, validation and the actual game systems |
| Find player-created challenges or eligible opponents across stored data | [Storage Search](https://heroiclabs.com/docs/nakama/concepts/storage/search/) | Explicit indexes/filters and authoritative candidate rechecks |
| High scores, fastest lap, prestige ranking, weekly standings | [Leaderboards](https://heroiclabs.com/docs/nakama/concepts/leaderboards/) | Trustworthy scoring, reset policy and reward rules |
| Timed contest, daily cup, limited-attempt challenge | [Tournaments](https://heroiclabs.com/docs/nakama/concepts/tournaments/) | Prize fulfillment, brackets/cohorts if needed; not every “event” is a tournament |
| Gold, gems, credits, spendable numeric resources | [Virtual wallets](https://heroiclabs.com/docs/nakama/concepts/user-accounts/#virtual-wallet) and optional ledger | Price, earning/spending rules, caps and idempotent fulfillment |
| In-game inbox, royal dispatch, invite notice, announcement | [In-app notifications](https://heroiclabs.com/docs/nakama/concepts/notifications/) | Persistent claim state and attachments; notification delivery does not grant a prize |
| Buy gems, validate a store purchase, restore paid entitlement | [IAP validation](https://heroiclabs.com/docs/nakama/concepts/iap-validation/) | Native store checkout, product mapping and idempotent entitlement fulfillment |
| Level-gated creation/joining, validation before a built-in action | [Runtime hooks](https://heroiclabs.com/docs/nakama/server-framework/introduction/hooks/) | Narrow policies using native operations; do not replace the whole service |

## Persistent fellowship vs temporary party

Use Groups for durable communities and their native membership/role operations. Display roles as “founder”, “elder” or “captain” if appropriate, while checking the actual Nakama membership state on the server. A pending join request is not a member. Do not create parallel `fellowship_members` tables or trust `member_ids` in a player save as the source of truth. [Groups](https://heroiclabs.com/docs/nakama/concepts/groups/)

An emblem or progression extension can reference the native group ID. Sensitive shared state needs runtime authorization: group membership does not automatically create group-only Storage permissions. Use a valid system/user owner and a key referencing the group, not a group ID pretending to be a user owner. A shared treasury needs a designed shared-state model; user wallets are account-scoped. Public metadata is not a secret store. [Storage access controls](https://heroiclabs.com/docs/nakama/concepts/storage/permissions/), [user wallets](https://heroiclabs.com/docs/nakama/concepts/user-accounts/#virtual-wallet)

“Only one clan per player” is an extra rule, not permission to duplicate the membership service. Audit every permitted entry path, including direct SDK operations, hooks and runtime calls. Adding a restriction only to a custom `join_fellowship` RPC leaves a bypass if the native join/add/create routes remain available. Design concurrent membership/resource changes and partial failure explicitly. [Hooks](https://heroiclabs.com/docs/nakama/server-framework/introduction/hooks/)

Parties are connection-oriented teams, removed when everyone leaves. Keep a persistent fellowship and a temporary expedition party as separate native identities if both are required. Conversely, “my party of five heroes” may mean a saved single-player NPC roster: use game state, not multiplayer Parties. [Parties](https://heroiclabs.com/docs/nakama/concepts/parties/)

## Pick the right multiplayer pieces

“Lobby” might mean a temporary party, a browser of active matches, a chat room, or a ready phase inside an authoritative match. Map those behaviors separately. Matchmaking finds compatible players; it is not the simulation or permission to join any game. Active matchmaking needs a socket; disconnected, asynchronous-opponent use cases need an explicitly designed persistent flow instead. [Matchmaker](https://heroiclabs.com/docs/nakama/concepts/multiplayer/matchmaker/), [match listing](https://heroiclabs.com/docs/nakama/concepts/multiplayer/match-listing/)

Use authoritative match handlers when live shared rules/results need server validation; implement the game's transitions there. Do not introduce a second WebSocket server merely because the match is called a “dungeon”. Relayed matches only forward data and are not anti-cheat validation. Turns submitted hours apart can use versioned Storage + RPCs without keeping an empty live match running. [Authoritative multiplayer](https://heroiclabs.com/docs/nakama/concepts/multiplayer/authoritative/), [relayed multiplayer](https://heroiclabs.com/docs/nakama/concepts/multiplayer/relayed/)

Nakama's documented **session-based multiplayer** means integration with external dedicated game-server instances, not simply a login session or an offline turn. A headless Godot simulation, allocation and lifecycle hosting are additional infrastructure only when the actual simulation requires them. Do not claim this starter's Compose stack already supplies them. [Session-based multiplayer](https://heroiclabs.com/docs/nakama/concepts/multiplayer/session-based/)

Chat carries communication; match messages carry gameplay protocol; notifications carry notices. None is the persistent authority for inventory, trades or prize claims. Online status is per connection and disappears on disconnect, so it cannot substitute for durable social membership or progression. [Chat](https://heroiclabs.com/docs/nakama/concepts/chat/), [notifications](https://heroiclabs.com/docs/nakama/concepts/notifications/), [status](https://heroiclabs.com/docs/nakama/concepts/status/)

## Persistence, economy and competition

Use Storage instead of new SQL tables or a separate CRUD backend for ordinary game data. Keep version checks, ownership, private permissions, schema migrations and server validation. Use native listing/pagination for complete owned records. Search indexes are bounded and eventually consistent: use them for discovery and reread canonical records before decisions. They are not an authorization oracle or an exhaustive inventory query. [Storage](https://heroiclabs.com/docs/nakama/concepts/storage/), [collections](https://heroiclabs.com/docs/nakama/concepts/storage/collections/), [search](https://heroiclabs.com/docs/nakama/concepts/storage/search/)

Prefer native wallets for a currency subsystem needing balances and a ledger; currency arithmetic still belongs on the server. Enable ledger recording explicitly when required. Use inventory Storage for item instances, equipment, recipes and other domain state. Do not maintain independently writable wallet and `player.coins` balances. This starter currently has a simple `state.coins` example: a future wallet adoption needs an explicit migration and one authority, not an extra balance written beside it. [Accounts/wallets](https://heroiclabs.com/docs/nakama/concepts/user-accounts/#virtual-wallet), [economy composition](https://heroiclabs.com/docs/nakama/guides/concepts/economy/)

Use a transactional storage batch or the pinned runtime's `multiUpdate` for supported account/storage/wallet combinations. Do not assume groups, leaderboard writes, notifications or external purchases participate in that transaction. Plan durable receipts/reconciliation for multi-step side effects. A ledger, a validated receipt, or a server restart is not by itself an idempotency protocol for every custom reward. [Collections](https://heroiclabs.com/docs/nakama/concepts/storage/collections/), [TypeScript function reference](https://heroiclabs.com/docs/nakama/server-framework/typescript-runtime/function-reference/#multiupdate)

Use explicitly authoritative leaderboard/tournament configurations for trusted competitive progression and validate the result before submitting it from runtime code. A server RPC accepting an arbitrary score is still client-reported scoring. A seasonal ladder can reuse leaderboard resets plus custom tier/promotion logic; tournament scheduling/attempt limits do not implement an elimination bracket or distribute a game's prizes automatically. [Leaderboards](https://heroiclabs.com/docs/nakama/concepts/leaderboards/), [tournaments](https://heroiclabs.com/docs/nakama/concepts/tournaments/)

Reuse store receipt validation and native purchase records. Add the game's product/entitlement mapping, once-only fulfillment and refund/revocation handling. The mobile store SDK and its export credentials still need setup. Do not create a home-grown receipt verifier or trust a client “purchase succeeded” flag. [IAP validation](https://heroiclabs.com/docs/nakama/concepts/iap-validation/)

## Native primitives are not every finished game system

Quests, crafting, energy regeneration, NPC inventories, battle passes, world simulation, trade rules and prize claims still need actual game logic, composed over the primitives above. In-app notifications are not APNs/FCM push or email delivery. Email verification/password-reset delivery still needs the appropriate trusted flow and email integration; do not promise it from email login alone. Ads and store checkout are not supplied by adding a wallet. Storage metadata/URLs are not an asset CDN. Avoid pretending a provider integration exists because the game uses similar words.

Heroic Labs also documents Hiro, Satori, Enterprise and hosted products alongside Nakama. Check product availability, licensing, server version and SDK support before proposing them. Do not assume every feature in that navigation is part of this self-hosted starter, or add a paid product without a concrete requirement and authorization. [Heroic product documentation](https://heroiclabs.com/docs/hiro/)

## Implementation contract for this repository

1. Read this mapping and the relevant official concept page, then inspect the local SDK and runtime types for supported signatures. Do not silently upgrade dependencies or patch the vendored addon when a newer API is absent.
2. Use the existing official SDK for permitted native operations; add focused methods to the existing backend wrapper as needed. A native list/join/read action does not automatically need a new custom RPC or REST service.
3. Add synchronous TypeScript hooks/RPCs only for missing policy/transitions. The target is Nakama's embedded ES5-compatible runtime, not a Node web server. Guard native entry paths where the rule must apply; server runtime calls require their own authorization checks.
4. Introduce an official SDK socket only for requested realtime features, preserving HTTP authentication/state access when the socket fails. Handle reconnect, rejoin, missed-history reads and canonical refresh. Never replay uncertain writes on reconnect.
5. Tests cover the native capability and the added rule: permission denial, pending/banned/removed membership where relevant, concurrent changes, opaque pagination cursors, repeat claims and reconnect/timeout outcomes. Use disposable accounts, not developer/player saves.

Native reuse must reduce duplicate authority without expanding scope. Implement only the requested feature; this guide is not a backlog.
