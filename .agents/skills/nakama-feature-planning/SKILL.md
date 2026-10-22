---
name: nakama-feature-planning
description: Plan Mobile Game Starter backend features by mapping game vocabulary and behavior to native Nakama capabilities before inventing services. Use for social, progression, economy or multiplayer requirements even when called fellowships, covens, crews, standings or inboxes; not routine host setup.
---

# Mobile Game Starter: Native Nakama feature planning

Read `AGENTS.md`, `docs/nakama-feature-map.md`, and the relevant part of `docs/architecture.md` from the repository root. The [feature map](../../../docs/nakama-feature-map.md) is the shared reference; do not duplicate a second capability catalog here.

## Interpret the concept

Translate the requested behavior into identity, lifetime, authority, persistence and communication needs. Keep the developer's names in the product. Do not treat unfamiliar nouns, synonyms or another language as evidence that a custom subsystem is needed.

- A persistent fellowship/coven with members and officers suggests **Groups**.
- An expedition crew that disappears when everyone leaves suggests **Parties**.
- A saved party of NPC heroes suggests **Storage**, not multiplayer Parties.

These are inferences, not keyword rules. If the brief specifies the behavior, proceed. Ask a short question only when ambiguity changes the design: persistence between sessions, connected vs offline play, or player vs NPC membership, for example.

## Choose before coding

1. Match the behavior against the feature map. Prefer native entities, IDs, roles, permissions, storage, wallet, ranking, validation or transport where they fit. Compose several capabilities when needed; “lobby” or “season” need not be a single service.
2. Verify the relevant official concept/API documentation against this repository's pinned server, vendored official Godot SDK and runtime types. A newer online example is not evidence that the pinned method exists. Do not upgrade silently.
3. Record a compact mapping in the existing plan/PR: developer term → required behavior → native capability → custom rule/state → verified APIs. If replacing a fitting native service, explain the actual gap and why extension is insufficient.
4. Use the official SDK for ordinary native operations. Add a focused hook/RPC only where game rules need it; do not make a second auth, membership, chat, scoreboard, queue, receipt-validation or generic persistence service.
5. Make the authoritative source explicit. Cached group IDs/member displays are not authorization; notification content is not an entitlement; a leaderboard does not validate a client-reported win. Check every available mutation route, including native APIs, to avoid bypassing a rule imposed only by a wrapper RPC.
6. Implement only requested functionality, keep custom state versioned, and test native permissions plus the custom policy. Introduce sockets only when the feature needs realtime behavior. Preserve the starter's account/bootstrap and unknown-write reconciliation contracts.

## Boundaries

Nakama supplies infrastructure primitives, not every game's inventory, crafting, quest, simulation or reward system. Combine those primitives with the smallest validated game rules. Distinguish persistent Groups from temporary Parties, finding players from running matches, notifications from OS push, and Nakama OSS from separate Heroic products. Do not assume cross-service calls are one transaction or that a client flag is a permission.

This is a planning/implementation guide, not authorization to enable purchases, add paid services, deploy, publish or migrate existing player data. Existing explicit task scope still governs those actions.

## Finish

Explain the selected native capability in the user's vocabulary, the few rules being added, tests and any verified API gaps. The developer should understand “your fellowship uses Nakama Groups,” without having to rename the fellowship in the game.
