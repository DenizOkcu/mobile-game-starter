# Mobile Game Starter Docs

`index.html` is the landing page and documentation hub. It uses `site.css` and
`site.js` without packages, remote assets, or a build step. You can read the main
guides without JavaScript. JavaScript adds copy buttons, highlights the current
guide in the navigation, and runs the browser example.

Preview from the repository root:

```sh
node tools/serve-docs.mjs
```

Open `http://127.0.0.1:8080`. Opening `index.html` directly also works; if the
browser denies clipboard access, copy buttons select the text for manual copying.

You can serve `docs/` as a static site. Adding these files does not configure
hosting or deployment. The main guides are part of the HTML page; links to
Markdown files open the detailed source documents.

## Keep content aligned with behavior

We maintain the HTML by hand. When behavior changes, update the matching section.

| Section | Source of truth |
| --- | --- |
| Overview and quickstart | `README.md`, `client/game/game.gd` |
| Guided setup | `start-here.md`, `../.agents/skills/` |
| Add your game idea | `new-game-prompt.md`, `../AGENTS.md` |
| Command reference | `../tools/manage.mjs` |
| Nakama API and implementation knowledge | `nakama/README.md`, `nakama/implementation-guide.md`, generated references from `../tools/nakama-reference.mjs` |
| Native Nakama feature selection | `nakama-feature-map.md`, `../.agents/skills/nakama-feature-planning/` |
| Accounts and state | `architecture.md`, `../client/core/backend.gd`, `../server/src/main.ts` |
| Android and iOS | `mobile.md`, `../tools/export.mjs`, `../tools/export_presets.template` |
| Backend deployment | `deployment.md`, `../tools/manage.mjs` |
| Shipping and scope | `README.md`, `verification.md`, `mobile.md` |

The project name leaves room for other engines, but the current client uses Godot.
Make that clear in the docs. Label the browser example as an illustration: it does
not create an account or test the backend.
