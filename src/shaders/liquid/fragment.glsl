uniform float uTime;
uniform float uVelocityCoeffX;
uniform float uVelocityCoeffZ;
uniform float uLevel;

in vec3 vWorldPosition;

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
  float surface =
    uLevel +
    waveHeight(vWorldPosition.xz, uTime, uVelocityCoeffX, uVelocityCoeffZ);

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
  // gl_FragColor = vec4(0.0, 1.0, 0.0, 1.0);
}