---
name: nakama-feature-planning
description: Plan and implement Mobile Game Starter backend features using the pinned Nakama server and Godot SDK, with capability mapping, exact API/source lookup and compatibility checks. Use for auth, storage, social, economy, multiplayer and other Nakama feature work; not routine host setup.
---

# Mobile Game Starter: Native Nakama feature planning and implementation

Read `AGENTS.md`, `docs/nakama-feature-map.md`, `docs/nakama/README.md`, and the relevant part of `docs/architecture.md` from the repository root. The [feature map](../../../docs/nakama-feature-map.md) is the shared reference; do not duplicate a second capability catalog here.

## Interpret the concept

Translate the requested behavior into identity, lifetime, authority, persistence and communication needs. Keep the developer's names in the product. Do not treat unfamiliar nouns, synonyms or another language as evidence that a custom subsystem is needed.

- A persistent fellowship/coven with members and officers suggests **Groups**.
- An expedition crew that disappears when everyone leaves suggests **Parties**.
- A saved party of NPC heroes suggests **Storage**, not multiplayer Parties.

These are inferences, not keyword rules. If the brief specifies the behavior, proceed. Ask a short question only when ambiguity changes the design: persistence between sessions, connected vs offline play, or player vs NPC membership, for example.

## Choose before coding

1. Match the behavior against the feature map. Prefer native entities, IDs, roles, permissions, storage, wallet, ranking, validation or transport where they fit. Compose several capabilities when needed; “lobby” or “season” need not be a single service.
2. Follow the [knowledge entry point](../../../docs/nakama/README.md) to the relevant capability row in the implementation guide. Search the generated SDK/runtime inventories, then read exact signatures, response types and linked implementations. Check `api-gaps.md`: the pinned server, runtime declarations and SDK wrappers differ in some names and coverage. Read only needed sections; do not preload the full catalog. Verify the official concept/API documentation, rechecking official release pages when asked about current support. A newer online example or compiling declaration is not evidence that the pinned method exists at runtime. Do not upgrade silently.
3. Record a compact mapping in the existing plan/PR: developer term → required behavior → native capability → custom rule/state → verified APIs. If replacing a fitting native service, explain the actual gap and why extension is insufficient.
4. Use the official SDK for ordinary native operations. Add a focused hook/RPC only where game rules need it; do not make a second auth, membership, chat, scoreboard, queue, receipt-validation or generic persistence service.
5. Make the authoritative source explicit. Cached group IDs/member displays are not authorization; notification content is not an entitlement; a leaderboard does not validate a client-reported win. Check every available mutation route, including native APIs, to avoid bypassing a rule imposed only by a wrapper RPC.
6. Implement only requested functionality, keep custom state versioned, and test native permissions plus the custom policy. Introduce sockets only when the feature needs realtime behavior. Preserve the starter's account/bootstrap and unknown-write reconciliation contracts.

## Implement with evidence

Use the implementation guide for HTTP wrappers vs player-snapshot RPCs, native-entry hooks, sockets/reconnect, authoritative match callbacks, transactions and the Godot multiplayer bridge. The server index links immutable function implementations; follow core calls when checking validation, atomicity or callback behavior. Types and generated inventories are retrieval tools, not tests of the whole integration.

A missing Godot wrapper, a missing TypeScript declaration, a declaration/server spelling mismatch and a separately licensed product are different gaps. Report the exact gap and choose the smallest supported integration within the user's scope. Do not fabricate methods, widen the runtime to `any`, patch the vendor SDK, or claim Go-only examples are TypeScript APIs. Request-specific type corrections need source evidence and behavior tests.

Keep helpers focused in the existing backend wrapper. `Backend.call_rpc` consumes canonical player snapshots; native list/search/social results must not overwrite player state or falsely unlock bootstrap. Introduce the official socket only for requested realtime behavior and own reconnect/rejoin/reconciliation explicitly. Prefer the documented Storage Search composition for offline matchmaking over a new matchmaking service.

When SDK/types change, regenerate the API references. When the default server changes, refresh its source index explicitly. Normal `check` verifies freshness offline; a stale-reference failure calls for regeneration and review, not removing the check. Current-release claims are dated observations and must be refreshed from official sources.

## Boundaries

Nakama supplies infrastructure primitives, not every game's inventory, crafting, quest, simulation or reward system. Combine those primitives with the smallest validated game rules. Distinguish persistent Groups from temporary Parties, finding players from running matches, notifications from OS push, and Nakama OSS from separate Heroic products. Do not assume cross-service calls are one transaction or that a client flag is a permission.

This is a planning/implementation guide, not authorization to enable purchases, add paid services, deploy, publish or migrate existing player data. Existing explicit task scope still governs those actions.

## Finish

Explain the selected native capability in the user's vocabulary, the few rules being added, tests and any verified API gaps. The developer should understand “your fellowship uses Nakama Groups,” without having to rename the fellowship in the game.
