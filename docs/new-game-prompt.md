# Mobile Game Starter: Give this to your coding agent

> Read AGENTS.md, README.md, docs/nakama-feature-map.md and docs/architecture.md. My game idea is: **[idea]**.
>
> Use the mobile-spec-workflow skill for meaningful behavior changes. Explore uncertain mechanics first, keep specs and design concise, and record verification with tasks. This request authorizes implementation after the necessary planning; ask only about material missing decisions.
>
> Build the smallest playable mobile loop inside client/game. Reuse the existing auth, menu, account, settings and backend. Read docs/setup/visual-assets.md and invoke your imagegen skill for coherent game artwork, UI skins, icons and splash art. Generate and integrate real assets; do not replace game objects or UI art with primitive shapes, procedural drawing, emoji or default-widget-only screens. Keep native controls, live text and invisible collision/hit regions in code. Keep portrait touch controls and make the core interaction work with a mouse in the editor.
>
> Before designing backend features, use the nakama-feature-planning skill. Map my vocabulary to behavior and native Nakama capabilities: a persistent clan, guild or fellowship should use Groups; a temporary connected team may use Parties; an NPC roster should use game state. Reuse native services and add only missing game rules.
>
> Propose and implement only the persistent player fields and validated server intents this loop actually needs. Keep rewards server-authoritative, versioned and replay-safe. Do not add purchases, ads, multiplayer, analytics or other systems unless my idea requires them. Preserve the .env configuration boundary and local/VPS workflow.
>
> If prerequisites are missing, use the repo-local local-development interview skill and ask a few questions at a time. Run check and the relevant integration tests, update the README with controls and changes, and report remaining device/deployment checks. Do not deploy to production unless requested.

To start a separate game repository, select **Use this template → Create a new repository** on [Mobile Game Starter](https://github.com/DenizOkcu/mobile-game-starter), then clone your new repository. Use the default branch. Keep its `.git` directory, `.agents/skills/`, and `.env.example`; do not run `git init` again. Run `node tools/manage.mjs init` for fresh secrets. Never copy private env files, generated client config, signing credentials, build outputs, or `.setup` notes from another game.

Before the first `up`, edit `.env` for the new game's identity and available local ports, keeping `CLIENT_API_URL` aligned with `LOCAL_API_PORT`. `init` retains the example identity and ports. `up` regenerates public config and export metadata; use `configure` after later env edits before opening or exporting in Godot.

Give each game its own COMPOSE_PROJECT_NAME, GAME_TITLE, BUNDLE_ID, ports, VPS path, domain, and secrets. Games created from the template are independent; later starter updates are not applied automatically.
