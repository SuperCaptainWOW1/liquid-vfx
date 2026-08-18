uniform float uTime;
uniform float uVelocityCoeffX;
uniform float uVelocityCoeffZ;
uniform float uLevel;

out vec3 vWorldPosition;
out vec3 vNormal;

float waveHeight(vec2 xz, float time, float ampX, float ampZ) {
  float amp = ampX + ampZ;
  float h = 0.0;
  h += sin(xz.x * 4.0 + time) * ampX;
  h += sin(xz.y * 5.0 + time * 0.7) * ampZ;
  h += sin((xz.x + xz.y) * 2.3 + time * 1.3) * amp * 0.25;
  h += sin((xz.x - xz.y) * 3.1 - time * 0.9) * amp * 0.15;
  return h;
}

void main() {
  vec4 worldPosition = modelMatrix * vec4(position, 1.0);

  float h = waveHeight(worldPosition.xz, uTime, uVelocityCoeffX, uVelocityCoeffZ);
  worldPosition.y = uLevel + h;

  float eps = 0.05;
  float hL = waveHeight(worldPosition.xz - vec2(eps, 0.0), uTime, uVelocityCoeffX, uVelocityCoeffZ);
  float hR = waveHeight(worldPosition.xz + vec2(eps, 0.0), uTime, uVelocityCoeffX, uVelocityCoeffZ);
  float hD = waveHeight(worldPosition.xz - vec2(0.0, eps), uTime, uVelocityCoeffX, uVelocityCoeffZ);
  float hU = waveHeight(worldPosition.xz + vec2(0.0, eps), uTime, uVelocityCoeffX, uVelocityCoeffZ);

  vNormal = normalize(vec3(hL - hR, 2.0 * eps, hD - hU));
  vWorldPosition = worldPosition.xyz;

  gl_Position = projectionMatrix * viewMatrix * worldPosition;
}