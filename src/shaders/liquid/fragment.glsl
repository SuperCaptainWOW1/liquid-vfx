#include ../common/surface.glsl;

in vec3 vWorldPosition;

void main() {
  float surface = surfaceHeight(vWorldPosition.xz);

  if (vWorldPosition.y > surface) discard;

  float depth = clamp(
    (surface - vWorldPosition.y) / 2.0,
    0.0,
    1.0
  );

  vec3 shallowColor = vec3(0.1, 1.0, 0.25);
  vec3 deepColor = vec3(0.0, 0.25, 0.05);

  vec3 color = mix(shallowColor, deepColor, depth);

  gl_FragColor = vec4(color, 1.0);
}
