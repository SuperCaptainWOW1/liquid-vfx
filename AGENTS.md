# AGENTS.md

Guidance for AI agents working in this repository. Keep it current when the architecture or the conventions change.

## Project

`bottle-shader` — a Three.js + TypeScript toy: a cylindrical "bottle" of liquid rendered with custom GLSL. The user grabs the bottle with the pointer (arcball drag), the liquid level tilts, waves react to angular velocity, and the bottle springs back upright on release. No framework, no router, no state library — plain DOM + Vite.

## Commands

```bash
npm run dev
```

```bash
npm run build
```

`build` = `tsc && vite build`. There are **no tests and no linter** — `npx tsc --noEmit` is the only automated check, so run it after any TypeScript change.

To see the app, use the Browser pane (`preview_start` with the name `bottle-shader` from [.claude/launch.json](.claude/launch.json), port 5173). Never start the dev server through Bash.

## Layout

```
index.html            canvas + .drag-ring, loads src/main.ts
src/main.ts           finds the DOM nodes, constructs Game
src/Game.ts           composition root + render loop
src/Graphics.ts       renderer / scene / camera + resize handling
src/World.ts          scene contents (bottle meshes, ground plane)
src/Bottle.ts         liquid meshes, uniforms, level & wave simulation
src/CameraController.ts  OrbitControls
src/RaycastController.ts pointer → hit test against the liquid body
src/Controls.ts       arcball drag of the bottle + drag-ring HUD
src/GrabHighlighter.ts   cursor state (auto / grab / grabbing)
src/shaders/liquid/          body: cylinder, fragment-side surface cut
src/shaders/liquid-surface/  top surface: displaced plane, clipped to the bottle
src/style.css         reset + .drag-ring
```

[docs/liquid-simulation.md](docs/liquid-simulation.md) explains the physics/shader math in detail — read it before touching [Bottle.ts](src/Bottle.ts) or the shaders.

## Architecture

Ownership is a one-way tree built once in [Game.ts](src/Game.ts); nothing is global and nothing is looked up by name.

```
Game
├── Graphics            → renderer, scene, camera
├── CameraController    → cameraControls (OrbitControls)
├── World               → bottle
├── RaycastController   (canvas, camera, bottle)      → currentHit
├── Controls            (…, raycastController, dragRing) → isDragging
└── GrabHighlighter     (canvas, raycastController, controls)
```

Per-frame order in `Game.initRenderLoop` matters:

1. `timer.update()`, `delta` clamped to `0.05` so a backgrounded tab cannot explode the spring.
2. `cameraControls.update(delta)`.
3. `bottle.returnToUpright(delta)` — only while `!controls.isDragging`.
4. `bottle.onRenderUpdate(delta)` — **after** all rotation, so wave velocity sees this frame's delta rotation.
5. `renderer.render`.

Input flows through pointer events on the canvas, not through the loop: `RaycastController` updates `currentHit` on every `pointermove`; `Controls` reads it on `pointerdown` to decide whether a drag starts; `GrabHighlighter` reads both to pick the cursor.

## Conventions

Follow the existing style rather than introducing new patterns.

- **Class per file, `export default`, file named after the class.**
- **Constructor pattern**: the constructor calls a `private init(...)` that returns an object literal; the constructor destructures it into `readonly` fields. Fields declared without type annotations — inference from `init` is intentional.
- **Dependencies** come in as constructor parameter properties (`private canvas: HTMLCanvasElement`) when they are used later, plain parameters when they are only used at construction time.
- **No `public`** modifiers; `readonly` on everything that is not reassigned.
- **Comments**: English, terse, at most two lines, only where the code cannot say it — the *why* behind non-obvious math (see the quaternion notes in [Bottle.ts](src/Bottle.ts)). Do not add narration.
- **Allocation**: nothing is allocated per frame. Reused scratch objects (`reuseVector3`, `reuseDirection`, `deltaQuaternion`, …) are private fields. Keep it that way in any hot path; `Controls.worldToScreenPx` allocates only on pointer events, which is fine.
- **Formatting**: Prettier defaults — double quotes, 2-space indent, semicolons, trailing commas. TS is strict-ish via [tsconfig.json](tsconfig.json) (`noUnusedLocals`, `noUnusedParameters`, `verbatimModuleSyntax` — so type-only imports need `import type`).
- **Shaders** are imported as strings via `vite-plugin-glsl`. Three injects the standard uniforms/attributes (`modelMatrix`, `viewMatrix`, `projectionMatrix`, `position`), so shader files declare only their own uniforms and varyings, with `in`/`out` (GLSL3-style syntax that Three's WebGL2 preprocessing accepts) rather than `varying`.

## Gotchas

- **Uniforms are shared by reference.** `Bottle.init` spreads `liquidUniforms` into the surface material, so both materials read the same `Uniform` objects — writing `uTime`/`uLevel`/`uVelocityCoeff*` through `liquidBody.material.uniforms` updates both. Do not replace a `Uniform` instance, mutate `.value`.
- **`waveHeight` is duplicated** verbatim in `liquid/fragment.glsl` and `liquid-surface/vertex.glsl` and the two must stay identical, or the surface plane and the body's fragment cut disagree and the liquid tears. `vite-plugin-glsl` supports `#include`, so factoring it into a shared chunk is the right fix if you touch it.
- **Geometry is never scaled or moved**; the bottle is driven purely through `liquidBody.quaternion`. `uBottleWorldInverse` is refreshed each frame from `liquidBody.matrixWorld` and is what clips the surface plane to the bottle's interior.
- **The surface plane is 4×4** and much larger than the bottle on purpose — it is clipped in the fragment shader by `discard`, so it can hold waves that overhang the cylinder.
- **The drag ring is a DOM element**, positioned in viewport pixels by `Controls.showDragRing`; its geometry (`Bottle.dragRadius`) comes from the geometry bounding sphere × 1.3.
- **Arcball drags accumulate per-move deltas**, never start→current, or the rotation caps at 180°. Leaving the ball (`lenSq > 1`) ends the drag.
- `Graphics` clamps `devicePixelRatio` to 2 on init and on resize.

## Working agreements

- Do not add dependencies, build steps, or config files without being asked; the toolchain is deliberately minimal.
- `dist/` is a stale local build output and is gitignored — never edit it, regenerate with `npm run build`.
- Verify visual changes in the Browser pane and share a screenshot; do not ask the user to check by hand.
