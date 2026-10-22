---
name: mobile-ios-export
description: Interview a developer through macOS/Xcode prerequisites, Godot iOS export identity and signing, image-generated icons/launch art, device validation, and TestFlight/App Store preparation. Use for this starter's iOS export; do not treat export as publishing authorization.
---

# iOS export interview

Read `AGENTS.md`, `docs/setup/interview-contract.md`, `docs/setup/visual-assets.md`, `docs/setup/security-variables.md`, and `docs/mobile.md`. Track `.setup/ios.md`. Invoke imagegen for actual visual asset work rather than making icons, splash art or UI skins from primitives.

## Round 1 — establish the destination

Ask: access to macOS with full Xcode; device testing vs TestFlight/App Store; existing Apple developer team and already published bundle identity. Personal/free provisioning can have device/capability restrictions; do not promise distribution without the required membership. If macOS is unavailable, prepare configuration/art and explain the required Mac step without pretending an iOS export ran on Linux/Windows.

## Round 2 — verify the toolchain

Check Godot version and matching iOS export templates; full Xcode, active developer directory (`xcode-select -p`), selected Xcode version, accepted license/first-launch components, required platform SDK and usable disk space. Command Line Tools alone are not full Xcode. Obtain authorization before switching the system-wide Xcode selection if other projects depend on it. Verify device trust, pairing and Developer Mode when required. Choose real-device vs simulator and match its SDK/architecture; a device archive cannot just run in the simulator.

Use version-matched official Godot/Xcode guidance. Avoid spaces in generated Xcode project names where the exporter warns about them. Inspect existing project settings before overwriting per-game export customizations.

## Round 3 — identity, provisioning and backend

Collect public metadata in the selected env:

| Input | Purpose |
| --- | --- |
| `GAME_TITLE`, `BUNDLE_ID` | App name and stable bundle identifier owned by the chosen team. |
| `APP_VERSION`, `APP_BUILD_NUMBER` | Marketing/build versions; raise build number for each upload as required. |
| `IOS_TEAM_ID` | Actual Apple team identifier; not an account password. |
| `CLIENT_API_URL`, `NAKAMA_SERVER_KEY` | Correct environment; valid HTTPS endpoint for device/release. |
| `GODOT_BIN` | Installed exporter executable. |
| `APP_ICON`, optional `IOS_ICON`, `BOOT_SPLASH_IMAGE`, `IOS_LAUNCH_IMAGE_2X/3X` | Approved project resources; see art round. |

Ask whether automatic or manual signing is needed. Configure the Apple account securely in Xcode and keep private signing keys/certificates in the login/system Keychain as appropriate; no Apple ID password, 2FA code, .p12 password or private key belongs in `.env`, chat, Git, or art assets. For manual signing, record non-secret certificate identity, team, registered App ID, profile UUID/specifier, export method and required entitlements; provision the profile securely and map only necessary metadata in the per-game template. Regeneration must not erase those reviewed mappings. Do not invent a provisioning UUID.

A paid distribution setup needs the matching development/distribution credentials and profiles, registered bundle/capabilities and access to the App Store Connect app when distribution is requested. App Store Connect API keys are only needed for an explicitly chosen upload automation; don't request them for local Xcode builds.

Use HTTPS and diagnose the actual certificate/DNS/clock issue; do not bypass TLS validation or add NSAllowsArbitraryLoads for convenience. Select device family, minimum iOS version, orientations and capabilities based on this game, not speculative features. Microphone/camera/photos/location usage strings and entitlements are added only for actual functionality. Review data collected by Nakama accounts and included SDKs before privacy labels/manifests; no fabricated “collects nothing” claim.

## Round 4 — generate icon and launch art

Reuse approved game art direction or ask a short style interview, then invoke imagegen. Produce an opaque 1024×1024 normal icon master with central readable artwork and no baked-in rounded corners, plus static launch art matching the app's first screen. Derive the needed sizes from approved source art; inspect actual alpha and small previews. Optional dark/tinted variants must be designed deliberately if supported by the target exporter.

`APP_ICON` is the shared master/fallback. The helper's optional `IOS_ICON` selects the approved opaque App Store master, with `APP_ICON` providing shared size fallbacks rather than a made-up list of per-size icons. Set `IOS_LAUNCH_IMAGE_2X` and `IOS_LAUNCH_IMAGE_3X` to actual matching images and inspect storyboard/background/scale mode in the generated Xcode project. Do not replace native text/buttons with a flattened generated screenshot; use generated UI skins with native controls. Read the complete acceptance policy in `docs/setup/visual-assets.md`.

## Round 5 — export and run in Xcode

Regenerate with the selected env, review the public iOS preset, and run `check`. Then:

```sh
python3 tools/export.py --env-file .env ios-project
# Or select .env.production once HTTPS production readiness is verified.
```

The helper exports an Xcode project archive with project-only export enabled. It does not sign an IPA, run a device, archive for distribution or upload. Open/extract the generated project; verify team/bundle/version, signing mode, device family, icons/launch storyboard, entitlements, deployment target and HTTPS URL before running on the selected target.

On a real device verify cold launch, icon and static launch screen, notches/safe areas, readable native text, touch/back navigation where relevant, keyboard, app background/resume, guest/email/link/state restore, interruption handling, audio/haptics and account deletion. Distinguish simulator checks from physical device checks. Use an agreed test account and do not destroy personal progress to reinstall.

For distribution, produce and validate an Xcode archive with the correct release profile/export method; inspect privacy manifest and actual SDK declarations, export-compliance questions, screenshots generated from the real app, support/privacy URLs and App Store Connect roles. Research current requirements for the chosen target rather than trusting old constants. A successful Xcode project export is not evidence of a signed archive or store readiness. Upload only with existing explicit authorization or after asking for the missing specific authorization.

Handoff: selected env, project/artifact location, public identity/version, verified build/run evidence and pending signing/distribution tasks. No secrets in notes.

References: [Godot iOS setup](https://docs.godotengine.org/en/stable/tutorials/export/exporting_for_ios.html), [iOS export options](https://docs.godotengine.org/en/stable/classes/class_editorexportplatformios.html), [Apple signing workflow](https://developer.apple.com/help/account/create-certificates/certificates-overview/).
