# Mobile Game Starter

Mobile Game Starter is a small starting point for mobile prototypes and LLM-assisted development. Godot 4.7.2, typed GDScript, Nakama TypeScript, PostgreSQL, Docker Compose, and a stdlib-only Python command runner. Uses the pinned official Nakama Godot SDK. The backend compiles with TypeScript directly, without a bundler.

Includes explicit guest access, email registration/login, guest-to-email linking, refresh-token restore, logout, account deletion, a main menu, account/profile screen, persistent volume/haptics/reduced-motion settings, and a replaceable game scene. A server-owned player record and once-only tutorial reward demonstrate the complete client → intent → database → canonical snapshot loop.

## Guided setup with an LLM

Start at **[the setup entry point](docs/start-here.md)**. Say “Help me get started locally” and the assistant will interview you, check your tools, and guide the first playable run. Repo-local skills also cover secure VPS production deployment and Android/iOS exports, including signing and generated icons/splash art.

The [visual asset policy](docs/setup/visual-assets.md) requires the imagegen skill for game art and UI skins; the existing default widgets are setup scaffolding.

## Start locally

Prerequisites: Godot 4.7.2, Node.js 22+ with npm, Python 3.9+, Docker with Compose v2 supporting `up --wait`.

```sh
python3 tools/manage.py init
python3 tools/manage.py up
```

Open `project.godot` in Godot and press F5. Click **Play as guest**, then **Play**, then activate the beacon. The server grants 10 coins once. Restart the game to restore the same player. Link an email under Account to use the same progress on another installation.

`init` creates a private `.env` with independent random secrets and generates public client config. It refuses to overwrite an existing file. If you prefer to copy `.env.example` manually, replace **every** `change_me` value with a different random URL-safe string of at least 32 characters before running `configure`.

| Command | Purpose |
| --- | --- |
| `python3 tools/manage.py configure` | Regenerate public client JSON, title and export presets after env changes |
| `python3 tools/manage.py build` | Install locked npm dependencies, type-check and compile TypeScript |
| `python3 tools/manage.py up` | Build backend, configure client and start/reload PostgreSQL/Nakama; wait for health |
| `python3 tools/manage.py down` | Stop services; keep player data |
| `python3 tools/manage.py logs` | Follow recent service logs |
| `python3 tools/manage.py status` | Show services |
| `python3 tools/manage.py check` | TypeScript build, tool tests, both Compose configs, Godot import/navigation |
| `python3 tools/manage.py smoke` | Real API and official Godot SDK tests; temporary accounts are deleted |
| `python3 tools/manage.py backup` | Write local PostgreSQL dump under ignored `backups/` |
| `python3 tools/manage.py --env-file .env.production deploy` | Validate and deploy backend over SSH |

Local API: <http://127.0.0.1:7350>. Console: <http://127.0.0.1:7351>, username `admin`, password from `.env`. No services use global container names. Give each game its own `COMPOSE_PROJECT_NAME` and local ports when running multiple games.

For a physical Android device, set `LOCAL_BIND_IP=0.0.0.0` and `CLIENT_API_URL=http://YOUR_COMPUTER_LAN_IP:7350`, then run `up`. The device needs the same LAN and firewall access. Android emulator can use `http://10.0.2.2:7350`. Plain HTTP is for development; iOS should use a valid HTTPS endpoint. See [mobile setup](docs/mobile.md).

For interview-guided mobile exports, use the [Android](.agents/skills/mobile-android-export/SKILL.md) or [iOS](.agents/skills/mobile-ios-export/SKILL.md) skill. Optional `.env.example` fields configure versions, team and real asset paths; signing passwords never enter generated presets. `python3 tools/export.py --env-file .env android-debug` produces a debug APK when SDK/templates are installed; `ios-project` exports an Xcode project on macOS. The helper does not publish or upload.

## Add a game idea

Give an LLM [AGENTS.md](AGENTS.md) and your idea using [the starter prompt](docs/new-game-prompt.md). Replace `client/game/game.tscn` and `game.gd`; retain the account/menu infrastructure. Add narrow server intents to `server/src/main.ts` only when gameplay needs persistence. `complete_tutorial` is an example transition, not a reusable reward/score submission API.

The official Godot SDK 3.4.0 is vendored under `addons/com.heroiclabs.nakama/` with its license; see [dependency provenance](docs/dependencies.md). The npm lockfile pins the compiler and official runtime types. Nothing is installed on the VPS beyond the compiled module and existing Docker stack.

Read [architecture and RPC contracts](docs/architecture.md), [deployment](docs/deployment.md), and the [project survey](docs/project-survey.md).

## Deliberate limits

This is an online prototype foundation. Gameplay is gated on a successful server bootstrap. There is no offline queue, client authority over coins, realtime socket, generic service framework, analytics, purchases, ads, push notifications, social login, email verification, or password-reset email delivery. Add these when an actual game requires them. The tutorial completion is player-declared and grants a one-time onboarding bonus; it does not prove a game result. Display names are player labels separate from Nakama usernames.

The refresh token lives in Godot's app-private `user://session.cfg`; passwords are never saved. For a shipped game with a stronger local-token threat model, replace this persistence with platform Keychain/Keystore integration. Logout clears local credentials even if the network prevents remote revocation. Guest access is tied to a random installation ID and can be lost on uninstall unless email is linked.

Settings persist on the device. Master volume controls Godot's Master bus, haptics controls the example vibration, and reduced motion is a preference for new gameplay animations; the starter has no animations. iOS and Android signing, store provisioning, and physical-device checks remain per-game setup.
