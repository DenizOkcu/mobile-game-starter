# Mobile workflow

The client uses a 720×1280 portrait canvas with Compatibility rendering. UI has large controls and scrolls on short displays. Test touch, keyboard avoidance, safe areas, resume and network interruptions on the actual target device. Mouse emulation helps iteration but is not a device test.

Run `configure` after editing GAME_TITLE, BUNDLE_ID, CLIENT_API_URL or NAKAMA_SERVER_KEY. Public config is explicitly included by both export presets; server files, env files and tooling are excluded. Do not add server credentials to GDScript.

## Android

Install the export templates matching Godot 4.7.2 and configure Android SDK/JDK paths in Godot Editor Settings. The generated Android preset includes INTERNET permission and ARM64. Use Godot's debug export first; set up the game's release keystore separately before publishing. Do not commit signing credentials.

For the emulator use `http://10.0.2.2:7350`. For a phone use the development computer's LAN IP, set LOCAL_BIND_IP=0.0.0.0, allow that port through its firewall, and run `up`. Development HTTP may need a debug-only cleartext network policy on the target Android setup; use HTTPS for production. Confirm behavior against the exported app, not just the editor.

## iOS

Use macOS, Xcode, matching Godot export templates, an Apple developer team, and a unique BUNDLE_ID. Set `application/app_store_team_id` in the preset template before regenerating or use a per-game export customization. Configure signing/provisioning in Xcode for the generated project. Use a valid HTTPS backend; no broad App Transport Security exception is included.

## Before shipping a game

Verify a clean install, guest onboarding, email linking/login on a second installation, logout, account deletion, app background/resume, lost connectivity during a write, settings persistence, portrait layout on small and notched screens, and audio/haptic behavior. Reduced-motion is exposed as `Preferences.reduced_motion`; new animations must honor it. This scaffold does not include store compliance content or promise device validation.
