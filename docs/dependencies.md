# Pinned dependencies

## Official Nakama Godot SDK

- Upstream: https://github.com/heroiclabs/nakama-godot
- Release: **v3.4.0**, official Godot 4 SDK release.
- Archive: https://github.com/heroiclabs/nakama-godot/releases/download/v3.4.0/nakama-3.4.0.zip
- Archive SHA-256: `540c7ff3556ef114188b93750626fe93cd5e5d151c5850061eb7a163ba7c6f3e`
- Vendored path: `addons/com.heroiclabs.nakama/`.
- License: Apache-2.0; the upstream LICENSE and CHANGELOG are kept with the addon.

The addon code is unmodified. Its Nakama singleton is registered explicitly in project.godot; Satori and realtime sockets are included upstream capabilities but are not initialized by this starter. The upstream archive also has a README and license at its root; only the addon and its license/changelog are kept here.

To update, download an explicit official release, verify and record its checksum, replace the addon directory, keep its license, and rerun `check`, `up`, `smoke` and mobile resource-pack verification. Do not edit vendored SDK code to implement game features.

## TypeScript backend

`server/package.json` and `package-lock.json` pin TypeScript **5.9.3** and the official `nakama-runtime` type definitions from heroiclabs/nakama-common commit `92cea75d05e5593decaeba37d5c3fca6802705b7`. The types have no runtime dependency; they describe Nakama's embedded JavaScript API. The lockfile records downloaded package integrity.

Use `npm --prefix server ci --ignore-scripts` for reproducible installs. `server/.npmrc` allows only direct remote dependencies, needed by npm 12 for the explicitly pinned official types tarball, and disables install scripts. No npm dependencies ship in the runtime container or the game export.
