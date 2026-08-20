#include ../common/surface.glsl;

out vec3 vWorldPosition;
out vec3 vNormal;

void main() {
  vec4 worldPosition = modelMatrix * vec4(position, 1.0);

  worldPosition.y = surfaceHeight(worldPosition.xz);

  float eps = 0.05;
  float hL = surfaceHeight(worldPosition.xz - vec2(eps, 0.0));
  float hR = surfaceHeight(worldPosition.xz + vec2(eps, 0.0));
  float hD = surfaceHeight(worldPosition.xz - vec2(0.0, eps));
  float hU = surfaceHeight(worldPosition.xz + vec2(0.0, eps));

  vNormal = normalize(vec3(hL - hR, 2.0 * eps, hD - hU));
  vWorldPosition = worldPosition.xyz;

  gl_Position = projectionMatrix * viewMatrix * worldPosition;
}
