# Liquid simulation

How a pointer drag becomes liquid motion. Everything lives in [Bottle.ts](../src/Bottle.ts) and the two shader pairs under [src/shaders](../src/shaders).

## Geometry

| | value | where |
|---|---|---|
| body | cylinder r = 0.5, height = 3 (`halfHeight` 1.5), 32 radial segments | `Bottle.init` |
| surface | plane 4 × 4, 32 × 32 segments, rotated `-π/2` about X | `Bottle.init` |
| max level | `maxLevel = 0.6` (world Y of the surface when upright) | `Bottle.maxLevel` |
| drag radius | bounding-sphere radius × 1.3 | `Bottle.dragRadius` |
| ground | 100 × 100 plane at y = −1.7 | `World.init` |

The body mesh rotates; nothing else does. The surface plane stays axis-aligned in world space and is *clipped* to the rotated bottle in the fragment shader.

## Per-frame pipeline

`Bottle.onRenderUpdate(delta)` runs after all rotation for the frame:

1. `updateTargetLevel()` — tilt → target level.
2. `updateWaves(delta)` — angular velocity → wave amplitudes.
3. `updateLevel(delta)` — spring toward the target level.
4. `uTime += delta * 5` (wave animation clock).
5. Refresh `uBottleWorldInverse` from `liquidBody.matrixWorld`.

### Tilt → target level

The bottle's local up is rotated into world space and compared to `WORLD_UP`; the angle is clamped to π/2 and mapped linearly:

```
targetLevel = (1 − min(tilt, π/2) / (π/2)) · maxLevel
```

Upright → full `maxLevel`; horizontal or beyond → 0. This is a visual approximation of liquid spilling out of view, not volume conservation.

### Level spring

A damped spring integrated with explicit Euler, `stiffness = 45`, `damping = 9` (underdamped — it overshoots and settles, which is the point). `delta` is clamped to `0.05` in the render loop so the integrator stays stable.

### Angular velocity → waves

The delicate part, and the reason for the comments in `updateWaves`:

- The frame's world-space rotation is `Δ = q · qPrev⁻¹`. Euler-angle deltas were tried and spike by ~π whenever `rotation.y` crosses ±π/2.
- `q` and `−q` are the same rotation, so `w` is forced non-negative or the velocity sign flips.
- Angular velocity = rotation vector (axis × angle) / delta, with `angle / sinHalf → 2` handled explicitly as `sinHalf → 0`.
- `angle > 1e-5` is the "is moving" test.

The X and Z components are scaled by `sensitivity = 0.04`, clamped to `±0.3`, and smoothed asymmetrically with `damp`: `attack = 15` while moving, `decay = 2.5` while still — waves build fast and settle slowly. The result lands in `uVelocityCoeffX` / `uVelocityCoeffZ`.

### Return to upright

`returnToUpright` slerps toward the identity quaternion with `1 − exp(−4·delta)` — frame-rate independent. Called only when `Controls.isDragging` is false.

## Shaders

`waveHeight(xz, time, ampX, ampZ)` — four summed sines (two axis-aligned, two diagonal) — is **duplicated verbatim** in `liquid/fragment.glsl` and `liquid-surface/vertex.glsl` and must stay byte-identical between them.

**Body** (`shaders/liquid`): the vertex shader only forwards world position. The fragment shader recomputes the wave surface at that world XZ and `discard`s anything above it, so the visible top of the liquid is a fragment-level cut, not geometry. Below the cut it mixes a shallow green into a deep green by depth / 2.

**Surface** (`shaders/liquid-surface`): the vertex shader lifts each plane vertex to `uLevel + waveHeight(...)` and derives a normal by central differences with `eps = 0.05` (`vNormal` is exported but the fragment shader currently ignores it — flat color `vec3(0.35, 1.0, 0.45)`; that's where lighting would go). The fragment shader transforms the world position by `uBottleWorldInverse` and discards anything outside the cylinder (`length(xz) > uRadius`) or outside its height (`abs(y) > uHalfHeight`). Material is `DoubleSide` so the surface is visible from below.

Both wave evaluations use **world** XZ, so the wave pattern is fixed in world space and the bottle rotates through it.

## Known simplifications

- Level is a function of tilt only; there is no volume conservation and no sloshing along the tilt axis.
- Waves ignore the vertical (Y) component of angular velocity.
- The surface is unlit and the body has no refraction, fresnel, or glass shell — there is no bottle mesh yet, only the liquid.
