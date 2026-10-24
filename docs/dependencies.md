# Mobile Game Starter: Pinned dependencies

## Official Nakama Godot SDK

- Upstream: https://github.com/heroiclabs/nakama-godot
- Release: **v3.4.0**, official Godot 4 SDK release.
- Archive: https://github.com/heroiclabs/nakama-godot/releases/download/v3.4.0/nakama-3.4.0.zip
- Archive SHA-256: `540c7ff3556ef114188b93750626fe93cd5e5d151c5850061eb7a163ba7c6f3e`
- Vendored path: `addons/com.heroiclabs.nakama/`.
- License: Apache-2.0; the upstream LICENSE and CHANGELOG are kept with the addon.

The addon code is unmodified. The project registers its Nakama singleton in project.godot. Upstream also includes Satori and realtime sockets, which the starter does not initialize. The downloaded archive has a README and license at its root; this repository keeps only the addon and its license and changelog.

To update, choose an official release, download it, and verify and record its checksum. Replace the addon directory, keep its license, then rerun `check`, `up`, `smoke`, and mobile resource-pack verification. Keep game features out of the vendored SDK code.

## TypeScript backend

`server/package.json` and `package-lock.json` pin TypeScript **5.9.3** and the official `nakama-runtime` type definitions from heroiclabs/nakama-common commit `92cea75d05e5593decaeba37d5c3fca6802705b7`. These types describe Nakama's embedded JavaScript API without adding a runtime dependency. The lockfile records package integrity information.

Use `npm --prefix server ci --ignore-scripts` for reproducible installs. `server/.npmrc` disables install scripts and allows only direct remote dependencies, which npm 12 needs for the pinned official types tarball. Neither the runtime container nor the game export includes npm dependencies.

## API knowledge and upstream checks

The [knowledge entry point](nakama/README.md) records the dated upstream release check, source hierarchy, generated SDK/runtime inventories and known compatibility gaps. Server implementation links use an immutable commit resolved from the default release tag; TypeScript types stay pinned to the commit above. Neither a matching release number nor a compiling method proves end-to-end support across all layers.

After a dependency change, run `node tools/nakama-reference.mjs` and review the generated diff. If the default server version changes, explicitly refresh its implementation index with `node tools/nakama-reference.mjs --refresh-server`. The standard `check` command verifies these references offline after installing the locked compiler/types. Read the gap report before using an API whose declarations and implementation differ. No SDK/server upgrade is performed by reference generation.
