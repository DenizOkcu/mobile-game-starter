# Mobile Game Starter: Game art and UI assets

Use the **imagegen** skill for game artwork, including prototypes. Read and invoke it before creating or replacing characters, world and game objects, inventory art, backgrounds, app icons, splash art, or the visual skin of menus, HUDs, buttons, and panels. Use its built-in image-generation tool by default, and follow its rules for editing, transparency, output files, and permission to use a fallback.

Do not replace requested game art or UI artwork with circles, rectangles, polygons, emoji, procedural `_draw()` art, SVG stand-ins, CSS-style shapes, or default widgets to save effort. The starter widgets exist to make setup usable; they do not define the finished art style.

Keep collision shapes, invisible hit regions, layout containers, progress and health indicators, live text, focus rings, and real Godot controls in code. Use native, accessible controls and labels, with generated textures and nine-patch assets for their appearance. Do not bake the whole interface and its text into one image.

An explicit user request for vector, geometric, wireframe, or primitive-placeholder output takes precedence. If image generation is unavailable, explain what is missing and continue work that does not need art. Leave the assets pending rather than drawing substitutes or claiming they are finished. Follow the imagegen skill before offering a CLI fallback. Do not ask for an API key for the built-in tool.

## Short art interview

Ask about the theme, audience, visual references, palette, and required characters, objects, and screens. Check orientation, camera angle, animation needs, and accessibility constraints. Reuse any approved art direction. When making a game, record useful decisions in `docs/art-direction.md`; do not add an empty template to every starter.

Before generating, list the assets you need. For each, record its use, dimensions and aspect ratio, transparency, safe padding, anchors and pivot, camera and lighting, and variants or states. Generate a style reference first and use it for later assets. Request real alpha transparency for sprites and UI foregrounds, and keep interactive text out of the art. Plan animation frames and directions, then check them for consistency. A still image is not a ready sprite sheet.

Copy the selected outputs into the repository, for example `assets/art/`, `assets/ui/`, or `assets/branding/`. Godot scenes must not reference chat attachments or a generated-image cache tied to one machine. Record short generation prompts, where each asset came from, and any third-party license. Do not claim rights to a brand or reference image without evidence.

## Export assets

| Asset | Production requirements |
| --- | --- |
| App icon master | Square PNG, 1024×1024 source; recognizable at tiny sizes; keep important art central. iOS normal/App Store master must be opaque; let the OS round corners. |
| Android legacy icon | At least 192×192 PNG, derived from the approved master. |
| Android adaptive icon | Separate 432×432 foreground/background; real alpha on foreground, opaque background; central subject must survive launcher masks. Verify the target SDK's safe zone. Optional monochrome layer is a real monochrome silhouette. |
| Boot splash | Branded artwork plus intentional safe background; inspect the game's actual aspect ratios. Android system launch presentation and Godot boot splash are distinct. |
| iOS launch art | Consistent @2x/@3x images and launch storyboard/background; simple static content suited to launch, not an ad or a fake loading progress bar. |
| Menu/HUD skin | Generated background and button/panel assets with normal/pressed/disabled states as needed; nine-patch safe borders and room for native labels. |

Use the imagegen skill for visual design and edits. Ordinary image tools can resize, crop, or reformat an approved source, but must not draw replacement artwork. Before integration, inspect the actual dimensions, alpha, edges, and crop. Run Godot import, preview screens at device sizes, and check the exported assets. Generating an image does not verify that it works in the game.

Set approved asset paths through `.env` and `configure`. Blank values let the starter run, but branding is not complete while required assets are missing or still use defaults.
