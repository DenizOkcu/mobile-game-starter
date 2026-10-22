# Mobile Game Starter: Mobile workflow

Use the [Android interview](../.agents/skills/mobile-android-export/SKILL.md) or [iOS interview](../.agents/skills/mobile-ios-export/SKILL.md) for help with prerequisites, private signing, generated branding, and checks on a device. Each asks a few questions at a time.

The client uses a 720×1280 portrait canvas with Compatibility rendering. Controls are large, and screens scroll on short displays. Test touch, keyboard avoidance, safe areas, resume, and network interruptions on the target device. Mouse emulation is useful while developing, but you still need a device test.

Run `configure` after changing GAME_TITLE, BUNDLE_ID, CLIENT_API_URL, NAKAMA_SERVER_KEY, APP_VERSION/APP_BUILD_NUMBER, team, or asset fields. Both export presets include public config and exclude server files, env files, and tooling. Keep server credentials out of GDScript.

## Android

Install the export templates matching Godot 4.7.2 and configure Android SDK/JDK paths in Godot Editor Settings. The generated Android preset includes INTERNET permission and ARM64. Use Godot's debug export first; set up the game's release keystore separately before publishing. Do not commit signing credentials.

For the emulator use `http://10.0.2.2:7350`. For a phone use the development computer's LAN IP, set LOCAL_BIND_IP=0.0.0.0, allow that port through its firewall, and run `up`. Development HTTP may need a debug-only cleartext network policy on the target Android setup; use HTTPS for production. Confirm behavior against the exported app, not just the editor.

## iOS

You need macOS, Xcode, matching Godot export templates, an Apple developer team, and a unique BUNDLE_ID. Set `IOS_TEAM_ID` in the selected env file and regenerate the presets. By default, the preset exports a project only. Configure signing and provisioning in Xcode, then use Xcode to sign and archive the build. Use a valid HTTPS backend; the starter does not include a broad App Transport Security exception.

## Before shipping a game

Test a clean install, guest onboarding, email linking and login on a second installation, logout, and account deletion. Also check background/resume, lost connectivity during a write, saved settings, portrait layout on small and notched screens, audio, and haptics. New animations must honor `Preferences.reduced_motion`. You still need to prepare store compliance content and validate the game on devices.

## Env-driven export inputs

The optional fields in `.env.example` work with existing local env files. Missing values use the documented defaults. `APP_ICON` and `BOOT_SPLASH_IMAGE` set project resources. Android launcher fields, `IOS_TEAM_ID`, iOS launch images, and versions configure the generated presets.

Asset paths must point to existing `res://` files inside this repository. Use `IOS_ICON` to specify an opaque App Store master; otherwise, `APP_ICON` supplies shared fallbacks at the required sizes. Generate artwork with the imagegen skill before marking branding complete.

```sh
node tools/export.mjs --env-file .env android-debug
node tools/export.mjs --env-file .env.production android-release
node tools/export.mjs --env-file .env ios-project
```

The helper produces APKs or an Xcode project archive. It does not produce AABs or signed IPAs, or upload to stores. It reads Android signing overrides privately from the selected env file and passes them only to Godot's process environment. Add only the optional keys your chosen build needs to an existing `.env` file.

Keep private iOS signing material in Keychain and SDK/JDK locations in the machine's Editor Settings. For AABs, custom signing, or entitlements, follow the interview and extend your game's template with official settings that match the Godot version.
