# Mobile Game Starter: Setup with your coding assistant

Open this repository in your coding assistant and say:

> Help me get Mobile Game Starter running locally. Use the mobile-local-setup skill, interview me a few questions at a time, check existing tools first, and guide me until the Godot game talks to local Nakama.

The four setup skills live in `.agents/skills/`, so they stay with each new game. If your assistant discovers repository skills, you can ask for `$mobile-local-setup`, `$mobile-production-setup`, `$mobile-android-export`, or `$mobile-ios-export`. Otherwise, tell it to read the matching `SKILL.md` directly. Both methods use the same instructions, without a global install or a path tied to your machine.

| You want to… | Entry point |
| --- | --- |
| Run the starter on your computer | [Local development interview](../.agents/skills/mobile-local-setup/SKILL.md) |
| Prepare a secure VPS and deploy Nakama | [Production interview](../.agents/skills/mobile-production-setup/SKILL.md) |
| Build/install Android | [Android export interview](../.agents/skills/mobile-android-export/SKILL.md) |
| Build/run iOS in Xcode | [iOS export interview](../.agents/skills/mobile-ios-export/SKILL.md) |
| Choose native Nakama features for your game | [Feature-planning skill](../.agents/skills/nakama-feature-planning/SKILL.md) and [concept map](nakama-feature-map.md) |
| Turn an idea into a prototype | [Game prompt](new-game-prompt.md), after local setup works |

The assistant asks a few questions at a time, checks what is installed, and saves progress without secrets under ignored `.setup/`. Say "resume local setup" or "resume the Android interview" to continue. Keep private keys, passwords, account tokens, and keystores out of chat. The assistant will help you set them on your machine.

Expect questions about your operating system, whether you are starting a new game or using an existing clone, and where you want to test: the editor, an Android emulator, or a phone. Docker Desktop or Docker Engine with Compose v2 must be running. The assistant checks installation and account requirements rather than assuming they are ready.

For production, the assistant first plans the host, access, firewall, secrets, and backups. Starting the interview does not authorize it to buy a Droplet, harden an existing server, deploy, or publish an app. It uses permission you have already given and asks only for actions you have not authorized. It also checks the public deployment separately; a healthy local Docker stack does not prove that the public service works.

For game visuals, the assistant must use the imagegen skill and integrate real generated image assets. Native controls, text, layout and collision geometry remain code. See the [visual production policy](setup/visual-assets.md).
