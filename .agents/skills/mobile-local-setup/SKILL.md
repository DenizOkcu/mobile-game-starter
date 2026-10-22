---
name: mobile-local-setup
description: Interview a developer through prerequisites, env setup, Docker Compose, and the first playable local Godot/Nakama run in Mobile Game Starter. Use for first-run or resumed local onboarding, not VPS deployment or store export.
---

# Mobile Game Starter: Local development interview

Read `AGENTS.md`, `docs/setup/interview-contract.md`, and `docs/setup/security-variables.md` from the repository root. Keep interview state in `.setup/local.md`. Read `docs/setup/visual-assets.md` when the user moves from infrastructure to game/branding work.

## Round 1 — identify the target

Start with up to three questions:

1. Which development OS are you using: macOS, Windows, or Linux?
2. Is this a fresh game copied from the starter, this existing starter, or an existing game with data to keep?
3. Where should the first run happen: editor first (recommended), Android emulator, or physical Android/iOS device?

Use existing answers/evidence. Inspect repo status, the configured Godot version, and command availability. If creating a new game, follow `docs/new-game-prompt.md`; preserve `.agents/skills` and `.env.example`, exclude existing `.git`, private env files, `.godot`, `node_modules`, compiled modules, exports, backups and `.setup`. Do not reset the user's repository to create a starter.

## Round 2 — verify tools before installing

Check the Godot executable/version, matching export templates only if exporting, Node 22+ and npm, Bash, Git, Docker daemon, and Compose v2 with `up --wait` support. Useful read-only checks:

```sh
node --version
npm --version
bash --version
git --version
docker version
docker compose version
docker compose up --help
```

Run the selected Godot executable with `--version` using a safely constructed argument array. On Windows choose a consistent WSL2 environment (recommended) or a tested Git Bash setup for Bash/SSH/tar; do not mix Windows and Linux executable paths. Do not hardcode this starter author's macOS paths. Use `GODOT_BIN` in `.env`.

If Docker is missing, guide the OS-appropriate supported Docker Desktop or Engine + Compose installation from official docs; ask about Windows WSL2 vs native shell before mixing paths. Distinguish daemon stopped, daemon permission failure, missing Compose, and unsupported version. Do not casually chmod the Docker socket or add broad privileges. Explain Linux Docker-group root equivalence before changing group membership. Recheck after installation/startup; do not claim Docker works from CLI availability alone.

## Round 3 — configure the game

Ask for a working title, stable reverse-domain bundle ID, and whether other local games already use ports 7350/7351. Recommend a unique Compose project name and free ports. Keep portrait as the default unless the idea requires otherwise.

- If `.env` is absent, run `node tools/manage.mjs init`.
- If it exists, validate through tooling; do not overwrite or print it.
- Set `GAME_TITLE`, `BUNDLE_ID`, `COMPOSE_PROJECT_NAME`, `GODOT_BIN`, and local ports. Preserve existing secrets and player data.
- All seven Nakama/database fields must be independently generated even locally; no default `localadmin`/`defaultkey` credentials. There is no extra developer bypass key to invent.
- Default `CLIENT_API_URL` is loopback with LOCAL_API_PORT; LOCAL_BIND_IP remains 127.0.0.1 for editor-only work.

For Android emulator, explain 10.0.2.2 vs host loopback. For a physical phone ask LAN IP, network/firewall and trust requirements before switching LOCAL_BIND_IP to 0.0.0.0. Expose only the local API needed by that phone; keep console loopback. Revert broad binding after the session. iOS should use valid HTTPS rather than adding a broad ATS exception. For detailed platform provisioning route to the platform skill.

## Round 4 — prove the vertical slice

```sh
node tools/manage.mjs up
node tools/manage.mjs check
node tools/manage.mjs smoke
```

`up` installs locked npm dependencies, type-checks/builds TypeScript, creates the isolated PostgreSQL/Nakama stack, and waits for health. Official SDK is vendored; do not replace it with hand-written REST requests. Resolve failure at its actual layer before retrying. Inspect redacted diagnostics, not raw env dumps. Do not use `down -v` to cure a startup problem.

Open `project.godot`, press F5, explicitly choose guest access, enter Play, and activate the beacon. Verify +10 coins once, restart session restore, account name change, persistent settings and guest email-linking when the user is ready. Tests establish transport contracts; the user/editor run establishes the actual UI. Leave email passwords out of notes.

## Handoff

Local readiness means daemon/Compose verified, env validated, services healthy, check/smoke passed, and an editor/device run observed or explicitly marked pending. Give `up`, `logs`, `status`, `down` commands and explain that `down` preserves data. Then ask for the game idea or route to export/production. New visible game/UI assets must use the imagegen skill under `docs/setup/visual-assets.md`; the starter's default controls are scaffolding.

Sources: [Docker installation](https://docs.docker.com/get-started/get-docker/), [Nakama Docker setup](https://heroiclabs.com/docs/nakama/getting-started/install/docker/), and the repo's README/architecture.
