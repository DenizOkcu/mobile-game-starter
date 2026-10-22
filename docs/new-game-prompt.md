# Mobile Game Starter: Give this to your coding agent

> Read AGENTS.md, README.md and docs/architecture.md. My game idea is: **[idea]**.
>
> Build the smallest playable mobile loop inside client/game. Reuse the existing auth, menu, account, settings and backend. Read docs/setup/visual-assets.md and invoke your imagegen skill for coherent game artwork, UI skins, icons and splash art. Generate and integrate real assets; do not replace game objects or UI art with primitive shapes, procedural drawing, emoji or default-widget-only screens. Keep native controls, live text and invisible collision/hit regions in code. Keep portrait touch controls and make the core interaction work with a mouse in the editor.
>
> Propose and implement only the persistent player fields and validated server intents this loop actually needs. Keep rewards server-authoritative, versioned and replay-safe. Do not add purchases, ads, multiplayer, analytics or other systems unless my idea requires them. Preserve the .env configuration boundary and local/VPS workflow.
>
> If prerequisites are missing, use the repo-local local-development interview skill and ask a few questions at a time. Run check and the relevant integration tests, update the README with controls and changes, and report remaining device/deployment checks. Do not deploy to production unless requested.

For a separate game repository, copy Mobile Game Starter without `.git`, `.env*` (retain `.env.example`), `.godot`, `client/config.json`, `exports`, `backups`, `node_modules`, compiled server modules, or `.setup`; run `git init -b main`, then `node tools/manage.mjs init`. Give it its own COMPOSE_PROJECT_NAME, GAME_TITLE, BUNDLE_ID, ports, VPS path, domain and secrets. Existing game repositories are references, not dependencies.
