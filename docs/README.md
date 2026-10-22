# Mobile Game Starter Docs

`index.html` is the buildless landing page and documentation hub. It shares
`site.css` and `site.js`; there are no packages, remote assets, or build steps.
The main guides remain readable without JavaScript. JavaScript adds copy buttons,
guide navigation highlighting, and an explicitly illustrative browser demo.

Preview from the repository root:

```sh
node tools/serve-docs.mjs
```

Open `http://127.0.0.1:8080`. Opening `index.html` directly also works; if the
browser denies clipboard access, copy buttons select the text for manual copying.

The `docs/` directory can be served as static files. No hosting or deployment is
configured by adding these files. Markdown source references are linked as files;
the main guides are included directly in the HTML for browser reading.

## Keep content aligned with behavior

The HTML is hand-maintained. Update the relevant section alongside source changes.

| Section | Source of truth |
| --- | --- |
| Overview and quickstart | `README.md`, `client/game/game.gd` |
| Guided setup | `start-here.md`, `../.agents/skills/` |
| Add your game idea | `new-game-prompt.md`, `../AGENTS.md` |
| Command reference | `../tools/manage.mjs` |
| Accounts and state | `architecture.md`, `../client/core/backend.gd`, `../server/src/main.ts` |
| Android and iOS | `mobile.md`, `../tools/export.mjs`, `../tools/export_presets.template` |
| Backend deployment | `deployment.md`, `../tools/manage.mjs` |
| Shipping and scope | `README.md`, `verification.md`, `mobile.md` |

The project name is engine-independent. Document the current Godot implementation
explicitly; do not imply that other engine integrations already exist. Keep the
browser demo labeled as an illustration rather than a real account or backend test.
