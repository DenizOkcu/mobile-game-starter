# Mobile Game Starter: Image-generation-first visual production

This is a project requirement for future game work, including prototypes. Read and invoke the available **imagegen** skill before creating or replacing character art, world/game objects, inventory art, backgrounds, app icons, splash art, or the visual skin of menus/HUD/buttons/panels. Use its built-in image-generation tool by default. Respect its rules for editing, transparency, output files and fallback authorization.

Do not substitute circles, rectangles, polygons, emoji, procedural `_draw()` art, SVG stand-ins, CSS-style shapes or a default-widget-only screen for the requested visible game art/UI to save effort. Existing starter widgets are infrastructure scaffolding, not a finished art direction. This does not forbid collision shapes, invisible hit regions, layout containers, progress/health indicators, readable live text, accessibility focus rings or real Godot controls. Keep interaction/labels native and accessible; skin controls with generated textures and nine-patch assets. Do not flatten the whole interface into one image with baked-in text.

An explicit user request for vector, geometric, wireframe or primitive-placeholder output takes precedence. If image generation is unavailable, state the missing capability, continue non-art work, and leave the asset milestone pending; do not silently manufacture a shape-based substitute or claim it is finished. Follow the imagegen skill before offering a CLI fallback; do not request an API key for its built-in tool.

## Short art interview

Ask about the game's theme and target audience; visual style/references and palette; required characters/objects/screens; portrait/landscape and camera angle; animation needs and accessibility constraints. Reuse existing approved art direction. Record only the useful decisions in `docs/art-direction.md` when making a game, not as an empty template in every starter.

Create a small asset list before generating. For each asset record use, final dimensions/aspect ratio, transparency, safe padding, anchors/pivot, camera/lighting, and variants/states. Generate one coherent style reference and use it for later assets. Ask for real alpha on sprites/UI foregrounds. Keep interactive text out of art. For animation, explicitly plan frames/directions and check consistency; an attractive still image is not a ready sprite sheet.

Copy selected generated outputs into the repo, e.g. `assets/art/`, `assets/ui/`, `assets/branding/`; never reference a chat attachment or machine-specific generated-image cache from a Godot scene. Record concise generation prompts/provenance and any third-party asset license. Do not fabricate rights to a brand or reference image.

## Export assets

| Asset | Production requirements |
| --- | --- |
| App icon master | Square PNG, 1024×1024 source; recognizable at tiny sizes; keep important art central. iOS normal/App Store master must be opaque; let the OS round corners. |
| Android legacy icon | At least 192×192 PNG, derived from the approved master. |
| Android adaptive icon | Separate 432×432 foreground/background; real alpha on foreground, opaque background; central subject must survive launcher masks. Verify the target SDK's safe zone. Optional monochrome layer is a real monochrome silhouette. |
| Boot splash | Branded artwork plus intentional safe background; inspect the game's actual aspect ratios. Android system launch presentation and Godot boot splash are distinct. |
| iOS launch art | Consistent @2x/@3x images and launch storyboard/background; simple static content suited to launch, not an ad or a fake loading progress bar. |
| Menu/HUD skin | Generated background and button/panel assets with normal/pressed/disabled states as needed; nine-patch safe borders and room for native labels. |

Use the imagegen skill for visual design and edits. Mechanical resize/crop/reformat from an approved source may use ordinary image tooling; don't use that as a back door to draw replacement artwork. Inspect image files for actual size, alpha, edges and crop before wiring them. Run Godot import, preview device-sized screens and verify exported assets; successful image generation alone is not acceptance.

Map approved asset paths through `.env` and `configure`. Blank values keep the starter runnable, but an export interview cannot label branding complete while using missing/default assets.
