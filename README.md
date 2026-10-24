# Mobile Game Starter

The [website and documentation](docs/index.html) cover setup, game development, mobile exports, and backend deployment. To preview the website locally, see [docs/README.md](docs/README.md).

Mobile Game Starter is a kit for building mobile game prototypes, on your own or with a coding assistant. It uses Godot 4.7.2, typed GDScript, Nakama TypeScript, PostgreSQL, and Docker Compose. Node.js tooling has no extra dependencies, and a Bash script handles deployment. The official Nakama Godot SDK is pinned, and TypeScript compiles the backend directly without a bundler.

The kit includes guest access, email registration and login, guest-to-email linking, session restore using refresh tokens, logout, and account deletion. It also has a main menu, account and profile screen, device settings for volume, haptics, and reduced motion, and a game scene you can replace. The tutorial grants a reward once per account: the client sends an action, the server updates the player record, and the client receives the saved state.

## Create your game repository

On [Mobile Game Starter](https://github.com/DenizOkcu/mobile-game-starter), select **Use this template → Create a new repository**. Clone your new repository and run the commands below from its root. GitHub creates an independent history; keep the new repository's `.git` directory and do not run `git init` again. The default branch is enough.

Each game keeps the repository-local setup skills and `.env.example`. Run `init` in the new clone to generate fresh secrets; never copy another game's private env files or setup notes. Template updates do not automatically update games created from it. For an existing game, ask your assistant to use `mobile-framework-update`, or run `node tools/manage.mjs framework-update` for a preview. See the [upgrade guide](docs/framework-updates.md).

## Guided setup with an LLM

Start with [the setup guide](docs/start-here.md). Say "Help me get started locally" and the assistant will ask a few questions, check your tools, and help you run the game. The repository also includes skills for secure VPS deployment and Android/iOS exports, including signing, generated icons, and splash art.

The [visual asset policy](docs/setup/visual-assets.md) requires the imagegen skill for game art and UI skins. The default widgets are there to get setup working, not to define your game's art style.

## Start locally

Prerequisites: Godot 4.7.2, Node.js 22+ with npm, Bash, Docker with Compose v2 supporting `up --wait`, and OpenSSH/tar for VPS deployment. On Windows, use a consistent WSL2 setup or a verified Git Bash toolchain.

```sh
node tools/manage.mjs init
# Edit .env to set your game identity and available local ports.
node tools/manage.mjs up
```

Open `project.godot` in Godot and press F5. Click **Play as guest**, then **Play**, then activate the beacon. The server grants 10 coins once. Restart the game to restore the same player. Link an email under Account to use the same progress on another installation.

`init` creates a private `.env` with independent random secrets and generates public client config. It refuses to overwrite an existing file. If you prefer to copy `.env.example` manually, replace **every** `change_me` value with a different random URL-safe string of at least 32 characters before running `configure`.

Before the first `up`, edit `.env`: set `GAME_TITLE`, a stable reverse-domain `BUNDLE_ID`, and a unique `COMPOSE_PROJECT_NAME`. Choose unused `LOCAL_API_PORT` and `LOCAL_CONSOLE_PORT` values if another game is running, and keep the port in `CLIENT_API_URL` aligned with `LOCAL_API_PORT`. `init` generates secrets but retains example identity and port values. `up` regenerates public config and export metadata; after later env changes, run `configure` before opening or exporting in Godot. For production, initialize a separate `.env.production` and select the game's own domain and dedicated deployment path.

| Command | Purpose |
| --- | --- |
| `node tools/manage.mjs framework-update` | Preview compatible framework releases; add `--apply` for an update branch, then `--finish` to validate |
| `node tools/manage.mjs configure` | Regenerate public client JSON, title and export presets after env changes |
| `node tools/manage.mjs build` | Install locked npm dependencies, type-check and compile TypeScript |
| `node tools/manage.mjs up` | Build backend, configure client and start/reload PostgreSQL/Nakama; wait for health |
| `node tools/manage.mjs down` | Stop services; keep player data |
| `node tools/manage.mjs logs` | Follow recent service logs |
| `node tools/manage.mjs status` | Show services |
| `node tools/manage.mjs check` | TypeScript build, tool tests, both Compose configs, Godot import/navigation |
| `node tools/manage.mjs smoke` | Real API and official Godot SDK tests; temporary accounts are deleted |
| `node tools/manage.mjs backup` | Write local PostgreSQL dump under ignored `backups/` |
| `node tools/manage.mjs --env-file .env.production deploy` | Validate and deploy backend over SSH |

Local API: <http://127.0.0.1:7350>. Console: <http://127.0.0.1:7351>, username `admin`, password from `.env`. No services use global container names. Give each game its own `COMPOSE_PROJECT_NAME` and local ports when running multiple games.

For a physical Android device, set `LOCAL_BIND_IP=0.0.0.0` and `CLIENT_API_URL=http://YOUR_COMPUTER_LAN_IP:7350`, then run `up`. The device needs the same LAN and firewall access. Android emulator can use `http://10.0.2.2:7350`. Plain HTTP is for development; iOS should use a valid HTTPS endpoint. See [mobile setup](docs/mobile.md).

For help with mobile exports, use the [Android](.agents/skills/mobile-android-export/SKILL.md) or [iOS](.agents/skills/mobile-ios-export/SKILL.md) skill. Optional fields in `.env.example` set the app version, team, and asset paths. Signing passwords stay out of generated presets. With the SDK and templates installed, `node tools/export.mjs --env-file .env android-debug` produces a debug APK. On macOS, `ios-project` exports an Xcode project. The helper does not publish or upload builds.

## Add a game idea

Before designing backend features, the assistant follows the [Nakama feature map](docs/nakama-feature-map.md) and [feature-planning skill](.agents/skills/nakama-feature-planning/SKILL.md). It maps behavior rather than names: a persistent clan, guild or fellowship reuses Groups, while temporary teams may use Parties. Only game-specific rules are added.

Give your coding assistant [AGENTS.md](AGENTS.md) and your idea using [the starter prompt](docs/new-game-prompt.md). Build your loop in `client/game/game.tscn` and `game.gd`, keeping the accounts and menus. Add a specific server action to `server/src/main.ts` when gameplay needs saved state. The included `complete_tutorial` action shows one state change; it is not a general API for submitting scores or claiming rewards.

The official Godot SDK 3.4.0 is vendored under `addons/com.heroiclabs.nakama/` with its license; see [dependency provenance](docs/dependencies.md). The npm lockfile pins the compiler and official runtime types. Nothing is installed on the VPS beyond the compiled module and existing Docker stack.

Read [architecture and RPC contracts](docs/architecture.md), [deployment](docs/deployment.md), and the [project survey](docs/project-survey.md).

## Scope and release requirements

The game needs a working server connection to authenticate and load player state before play. The client cannot set its own coin balance. The kit does not include an offline queue, realtime socket, generic service framework, analytics, purchases, ads, push notifications, social login, email verification, or password-reset email delivery. Add these as your game needs them. Players declare tutorial completion themselves, so its one-time bonus does not prove a game result. Display names are player labels, separate from Nakama usernames.

The refresh token lives in Godot's app-private `user://session.cfg`; the client never saves passwords. If your shipped game needs stronger protection for tokens on the device, use the platform Keychain or Keystore. Logout clears local credentials even when a network failure prevents remote revocation. Guest access uses a random installation ID. Players can lose access after uninstalling unless they have linked an email.

Settings stay on the device. Master volume controls Godot's Master bus, and the haptics setting controls the example vibration. The starter has no animations; honor the reduced-motion preference when you add them. Each game still needs iOS and Android signing, store provisioning, and checks on physical devices.

## License

The starter's original code and documentation use the [MIT License](LICENSE), allowing reuse in commercial and private games. Preserve the license notice. Third-party components retain their own licenses, including the vendored Nakama Godot SDK's Apache-2.0 license; see [dependency provenance](docs/dependencies.md).
