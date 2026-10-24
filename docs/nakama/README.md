# Nakama knowledge entry point

This is the repository's maintained retrieval guide for an assistant building game features. Read this page and the [behavior map](../nakama-feature-map.md), then load the relevant API sections and implementation steps. Do not preload the entire generated reference or upstream documentation into every task.

## Version evidence

Reviewed **24 October 2026**. The official [Nakama latest release](https://github.com/heroiclabs/nakama/releases/latest) resolved to **3.41.0** and [Godot SDK latest release](https://github.com/heroiclabs/nakama-godot/releases/latest) to **3.4.0**, matching this repository's defaults. This is a dated observation, not a permanent claim about the latest version. Recheck these links when asked about current capabilities or before upgrading dependencies.

| Layer | Pinned evidence | What it establishes |
| --- | --- | --- |
| Server default | `.env.example`: Nakama 3.41.0; immutable commit in [server index](server-surface.json) | The default server's actual JavaScript exports and implementation locations |
| Server types | `nakama-runtime` 1.48.0 at `92cea75d05e5593decaeba37d5c3fca6802705b7`, locked in `server/package-lock.json` | Compile-time contracts; these contain known gaps and naming discrepancies |
| Godot SDK | Vendored 3.4.0 under `addons/com.heroiclabs.nakama/` | The methods, signals, models and behavior actually available to this client |
| Starter integration | `client/core/backend.gd` and `server/src/main.ts` | Guest/email access, linking, sessions, canonical snapshots and tutorial RPCs already wired and tested |

The configured game can select another server image through its env file. Verify that selected image and running server through tooling without printing secrets; the default API snapshot does not prove compatibility with another image. Do not silently upgrade packages, patch the vendored SDK or treat a green TypeScript build as a runtime compatibility test.

## Retrieve the smallest useful evidence

| Need | Read/search |
| --- | --- |
| Decide whether a native service fits the game's vocabulary | [Behavior map](../nakama-feature-map.md) |
| Find which surface owns a feature and how to implement it here | [Implementation guide](implementation-guide.md) |
| Exact Godot HTTP/socket/session/helper APIs, signal names and model classes | [SDK reference](sdk-reference.md) |
| Exact server methods, registration hooks, match callbacks, dispatcher and data types | [Runtime reference](runtime-reference.md) |
| APIs that differ between server code and installed types | [API gaps](api-gaps.md) |
| Server function body / validation / atomicity | Follow its immutable implementation link; read called core functions as needed |
| SDK serialization, argument order or return shape | Follow its local source link; inspect its generated model and underlying request |
| Discover current documentation without loading the whole site | [Official AI documentation index](https://heroiclabs.com/docs/llms.txt); select only relevant `/docs/nakama/` pages |
| Current concept semantics / setup requirements | [Official concepts](https://heroiclabs.com/docs/nakama/concepts/), [Godot guide](https://heroiclabs.com/docs/nakama/client-libraries/godot/), [TypeScript reference](https://heroiclabs.com/docs/nakama/server-framework/typescript-runtime/function-reference/) |

Useful commands from the repository root:

```sh
# Install the pinned compiler/types when node_modules is absent.
node tools/manage.mjs build
# Search names first; read only the matching sections and linked definitions.
rg -n 'groupUsers|group_user|join_group|received_party' docs/nakama
rg -n 'registerBeforeJoinGroup|interface Group|interface StorageWriteRequest' server/node_modules/nakama-runtime/index.d.ts
rg -n 'func join_matched_async|signal received_matchmaker_matched' addons/com.heroiclabs.nakama/socket/NakamaSocket.gd
```

Heroic Labs also publishes individual pages as `.../llm.md`, linked from its AI index. Prefer the relevant Markdown page when the reading tool supports it; fall back to the ordinary HTML page if Markdown content is unsupported. Keep Nakama pages separate from Hiro/Satori/Cloud entries in that shared index, and reconcile live documentation with the pinned source before coding.

Local source links use GitHub-style `#L` anchors. A coding assistant should read those paths and line numbers directly; Markdown viewers may not navigate line anchors in local files. Runtime types are ignored dependencies: install them with the locked build command. They can also be read at the [immutable upstream declaration](https://github.com/heroiclabs/nakama-common/blob/92cea75d05e5593decaeba37d5c3fca6802705b7/index.d.ts).

## Completeness and limits

The generated inventory includes the Nakama factory, HTTP client, socket methods and signals, session/error/result helpers, adapters, Godot multiplayer bridge/peer, generated model class locators, all named runtime declarations, every declared `Nakama`/`Initializer` member, match callback signatures and dispatcher functions. The server index independently covers exported JavaScript runtime and initializer registrations, including names missing from the declarations. Private SDK helpers, generated serializer/transport method internals and inherited Godot APIs are located through their source files rather than duplicated. Other-language SDKs are discoverable through [official client libraries](https://heroiclabs.com/docs/nakama/client-libraries/); do not translate their names into GDScript by guesswork.

A catalogued API is not an enabled starter feature or a guarantee of a complete game system. Only the existing account/state flows are integrated. Platforms, provider credentials, store plugins, feature policy, server authorization, migrations, reconnect behavior and feature tests remain part of implementation. Keep this repository's ES5, native SDK, private-storage, bootstrap and uncertain-write contracts.

Satori entries are explicitly separated because the vendored addon and runtime types contain them; this stack does not run Satori. Hiro, Enterprise, fleet management, dedicated-server hosting and Heroic Cloud have separate availability/integration requirements. Read current product and runtime support before proposing them. Nakama primitives do not automatically supply finished inventory, quests, battle passes, ads, OS push or transactional prize fulfillment.

## Keep the knowledge current

```sh
# Regenerate after reviewing a local SDK/type change; offline, deterministic.
node tools/nakama-reference.mjs
# Included in the normal check command; fails when inputs or output drift.
node tools/nakama-reference.mjs --check
# Explicit network refresh after changing the default Nakama version.
node tools/nakama-reference.mjs --refresh-server
```

The refresh resolves the official release tag to an immutable commit, reads its runtime/initializer/dispatcher implementations, and records their hashes and symbol locations. It does not install or upgrade anything. Review `api-gaps.md` and the capability guide after regeneration: generation checks inventory freshness, not semantic correctness. Recheck official releases/concepts for current claims, reconcile changed signatures, and add behavior tests for whichever feature is actually implemented.
