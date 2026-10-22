# Mobile Game Starter: Start here with your coding assistant

Open this repository in your coding assistant and say:

> Help me get Mobile Game Starter running locally. Use the mobile-local-setup skill, interview me a few questions at a time, check existing tools first, and guide me until the Godot game talks to local Nakama.

The four skills live in `.agents/skills/` so they travel with every new game. An assistant that discovers repo skills can invoke `$mobile-local-setup`, `$mobile-production-setup`, `$mobile-android-export`, or `$mobile-ios-export`. If your assistant has not refreshed skill discovery, tell it to read the corresponding `SKILL.md` directly; the workflow is identical. No global installation or absolute user-specific path is required.

| You want to… | Entry point |
| --- | --- |
| Run the starter on your computer | [Local development interview](../.agents/skills/mobile-local-setup/SKILL.md) |
| Prepare a secure VPS and deploy Nakama | [Production interview](../.agents/skills/mobile-production-setup/SKILL.md) |
| Build/install Android | [Android export interview](../.agents/skills/mobile-android-export/SKILL.md) |
| Build/run iOS in Xcode | [iOS export interview](../.agents/skills/mobile-ios-export/SKILL.md) |
| Turn an idea into a prototype | [Game prompt](new-game-prompt.md), after local setup works |

The assistant asks a few questions, checks evidence, and saves redacted progress under ignored `.setup/`. Tell it “resume local setup” or “resume the Android interview” to continue. Never paste private keys, passwords, account tokens or keystores into chat. The assistant guides you to set them locally.

Typical first questions are your operating system, whether this is a new game or an existing clone, and whether you will test in the editor, Android emulator, or on a phone. Docker Desktop or Docker Engine with Compose v2 must be running; having the command installed is not enough. Installation and account prerequisites are guided steps, not assumptions.

For production, the assistant first prepares a concrete host/access/firewall/secrets/backup plan. It does not buy a Droplet, harden an existing server, deploy, or publish an app just because you opened the interview. Existing explicit authorization is reused. Public deployment readiness is verified separately from a healthy local Docker stack.

For game visuals, the assistant must use the imagegen skill and integrate real generated image assets. Native controls, text, layout and collision geometry remain code. See the [visual production policy](setup/visual-assets.md).
