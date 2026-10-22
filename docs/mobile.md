# Mobile Game Starter: Mobile workflow

Start with the [Android interview](../.agents/skills/mobile-android-export/SKILL.md) or [iOS interview](../.agents/skills/mobile-ios-export/SKILL.md). They cover prerequisites, private signing, generated branding and device evidence a few questions at a time.

The client uses a 720×1280 portrait canvas with Compatibility rendering. UI has large controls and scrolls on short displays. Test touch, keyboard avoidance, safe areas, resume and network interruptions on the actual target device. Mouse emulation helps iteration but is not a device test.

Run `configure` after editing GAME_TITLE, BUNDLE_ID, CLIENT_API_URL, NAKAMA_SERVER_KEY, APP_VERSION/APP_BUILD_NUMBER, team or asset fields. Public config is explicitly included by both export presets; server files, env files and tooling are excluded. Do not add server credentials to GDScript.

## Android

Install the export templates matching Godot 4.7.2 and configure Android SDK/JDK paths in Godot Editor Settings. The generated Android preset includes INTERNET permission and ARM64. Use Godot's debug export first; set up the game's release keystore separately before publishing. Do not commit signing credentials.

For the emulator use `http://10.0.2.2:7350`. For a phone use the development computer's LAN IP, set LOCAL_BIND_IP=0.0.0.0, allow that port through its firewall, and run `up`. Development HTTP may need a debug-only cleartext network policy on the target Android setup; use HTTPS for production. Confirm behavior against the exported app, not just the editor.

## iOS

Use macOS, Xcode, matching Godot export templates, an Apple developer team, and a unique BUNDLE_ID. Set `IOS_TEAM_ID` in the selected env file and regenerate. The preset exports project-only by default; Xcode owns the subsequent signing/archive step. Configure signing/provisioning in Xcode for the generated project. Use a valid HTTPS backend; no broad App Transport Security exception is included.

## Before shipping a game

Verify a clean install, guest onboarding, email linking/login on a second installation, logout, account deletion, app background/resume, lost connectivity during a write, settings persistence, portrait layout on small and notched screens, and audio/haptic behavior. Reduced-motion is exposed as `Preferences.reduced_motion`; new animations must honor it. This scaffold does not include store compliance content or promise device validation.

## Env-driven export inputs

Optional fields in `.env.example` are backward compatible with existing local env files. Missing values use documented defaults. `APP_ICON` and `BOOT_SPLASH_IMAGE` set project resources; Android launcher fields, `IOS_TEAM_ID`, iOS launch images and versions configure generated presets. Asset paths must be existing `res://` files inside this repository. `IOS_ICON` optionally specifies the opaque App Store master; `APP_ICON` supplies shared derived-size fallbacks. Generate artwork through the imagegen skill before calling branding complete.

```sh
node tools/export.mjs --env-file .env android-debug
node tools/export.mjs --env-file .env.production android-release
node tools/export.mjs --env-file .env ios-project
```

The helper emits APKs or a project-only Xcode archive, not AAB, signed IPA, or store uploads. Native Android signing overrides are read privately from the selected env file and passed only to Godot's process environment. Existing `.env` files need only the optional keys required by the chosen build. iOS private signing material stays in Keychain. SDK/JDK locations remain machine-local Editor Settings. For AAB/custom signing/entitlements, follow the interview and extend the per-game template with version-matched official settings.
