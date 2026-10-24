---
name: mobile-android-export
description: Interview a developer through Godot Android SDK/JDK prerequisites, device or emulator testing, env-driven identity/signing, image-generated icons/splash, and APK/AAB release preparation. Use for Mobile Game Starter's Android exports, not iOS or publishing without authorization.
---

# Mobile Game Starter: Android export interview

Read `AGENTS.md`, `docs/setup/interview-contract.md`, `docs/setup/visual-assets.md`, `docs/setup/security-variables.md`, and `docs/mobile.md`. Keep notes in `.setup/android.md`. Use the imagegen skill for the actual branding/UI artwork; this workflow is not satisfied by geometric placeholder icons.

## Round 1 — select a build target

Ask: development OS and Godot version; physical device or emulator (and architecture); debug install, signed APK testing, or Google Play AAB distribution. Ask whether this bundle ID has already been published before touching signing. Reuse any local-setup findings. Store accounts are not required for the first debug APK.

## Round 2 — tools and connection

Inspect matching Godot export templates, JDK, Android SDK location/packages, adb, connected authorized device or emulator, and Godot's configured Java/SDK Editor Settings. Follow the official docs for the installed Godot version rather than hardcoding a moving SDK/API/NDK requirement. Verify Java compatibility, installed platform/build-tools/platform-tools/licenses and enough disk space; don't reinstall the SDK blindly. Include Gradle/custom build templates only when AAB/plugins or the selected export mode require them.

On a physical device guide developer options, USB debugging and fingerprint authorization; choose a specific adb device if several are connected. On an emulator verify its ABI against export architectures; the starter defaults to ARM64, so an x86_64 emulator needs a compatible preset or ARM emulator. Do not claim “adb found” means the device authorized a debug connection.

Choose the selected env and API route. Emulator uses 10.0.2.2 for the development host; phone uses a reachable LAN address or valid HTTPS. Device localhost is not the workstation. Keep console private and use LAN bind only when needed. Do not ship a broad cleartext network-security policy; an approved development-only exception must be isolated from release.

## Round 3 — identity and signing

Collect non-secret values in `.env`/`.env.production`:

| Input | Handling |
| --- | --- |
| `GAME_TITLE`, `BUNDLE_ID` | App name and unique stable package ID. Preserve an existing published identity. |
| `APP_VERSION`, `APP_BUILD_NUMBER` | Human version and positive monotonically increasing release version code. |
| `CLIENT_API_URL`, `NAKAMA_SERVER_KEY` | Match the chosen backend; release uses verified production HTTPS. |
| `GODOT_BIN` | Actual executable; use argument arrays for paths with spaces. |
| `GODOT_ANDROID_KEYSTORE_DEBUG_PATH/USER/PASSWORD` | Optional custom debug key; otherwise configure Godot's debug-keystore settings locally. Never reuse a release key for convenience. |
| `GODOT_ANDROID_KEYSTORE_RELEASE_PATH/USER/PASSWORD` | Existing or newly agreed upload/release keystore, alias and password; set privately, never in chat/presets. |

For a new release key, explain storage/backups and Play App Signing vs upload-key roles before creation. Use interactive local keytool password entry, never command-line password literals. Back up the key securely outside the repo and verify the alias. For an already published app, locate its correct signing/upload key and certificate; do not regenerate. A differing installed debug/release certificate can cause install failure; uninstalling deletes local guest identity, so preserve/link progress and obtain deletion authorization first.

The export runner passes signing values to native Godot environment variables. It does not write them to tracked presets. Keep `.godot`, keystores and exports out of Git. Never ask for Play service-account JSON just to build an APK.

## Round 4 — generate and inspect visual assets

Interview theme/style/reference and icon subject if not already known. Invoke imagegen; generate a coherent icon master, adaptive foreground/background, optional monochrome variant and splash art. Follow `docs/setup/visual-assets.md` for dimensions, alpha, safe padding and native-control UI skins. Keep source art and derived files in `assets/branding/` with concise provenance.

Set `APP_ICON`, `BOOT_SPLASH_IMAGE`, `ANDROID_ICON`, `ANDROID_ADAPTIVE_FOREGROUND`, `ANDROID_ADAPTIVE_BACKGROUND`, and optionally `ANDROID_ADAPTIVE_MONOCHROME` to actual `res://` files. Blank/default art is still pending branding. Inspect launcher masks, small-size readability, transparency and the distinction between Android's system launch screen and Godot's boot splash.

## Round 5 — configure, build, test

Run `configure`, review the public generated Android preset and run `check`. Then:

```sh
node tools/export.mjs --env-file .env android-debug
# After production/signing readiness:
node tools/export.mjs --env-file .env.production android-release
```

The helper emits APKs, not an AAB or a store upload. For Google Play, configure the version-matched Gradle/AAB export path in the template, keep identities/signing in the selected env, regenerate and verify the resulting bundle; use current official Godot/Play requirements. Do not rename an APK to .aab or claim the helper publishes. Play target API, billing/ads plugins and policy forms must match the actual game; do not invent permission/data disclosures.

Verify installed app identity/version/signature, launcher icon and cold launch/splash, readable UI/safe areas, touch/back button, keyboard/focus, online guest/login/link/state persistence, background/resume, interrupted write reconciliation, volume and haptics. Check logs for tokens before sharing. Use an approved disposable account where appropriate. Release must have no development backend, debug-only cleartext config or server secrets. A resource pack alone is not a successful Android device build.

Finish with artifact location, exact build type, signing certificate identity (public fingerprint only), device evidence and remaining release/store tasks. Obtain store-upload authorization only if it is actually requested and still missing.

References: [Godot Android setup](https://docs.godotengine.org/en/stable/tutorials/export/exporting_for_android.html), [Android export options](https://docs.godotengine.org/en/stable/classes/class_editorexportplatformandroid.html), [Play signing](https://developer.android.com/studio/publish/app-signing).

## Mobile recovery and touch acceptance

Use `client/core/touch_targets.gd` for native controls and apply it after dynamic UI construction. Require at least 48×48 logical units after viewport and OS display scaling; a 72px canvas target is insufficient at the 720px design width. Check 320-, 360- and 430-wide previews, then verify on the selected device. Preserve existing artwork; invisible hit regions and native controls remain code.

Test offline startup followed by Retry connection/resume, confirming the same account and saved progress return without creating a replacement guest. Report physical-device, signed-build and distribution evidence separately from `check`, `smoke`, resource packs and simulator/project export. Follow the device acceptance section of `docs/mobile.md` and mark missing prerequisites pending rather than claiming release readiness.
