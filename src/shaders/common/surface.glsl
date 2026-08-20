uniform float uTime;
uniform float uLevel;
uniform float uVelocityCoeffX;
uniform float uVelocityCoeffZ;
uniform vec2 uTilt;

float waveHeight(vec2 xz) {
  float ampX = uVelocityCoeffX;
  float ampZ = uVelocityCoeffZ;
  float amp = ampX + ampZ;

  float h = 0.0;
  h += sin(xz.x * 4.0 + uTime) * ampX;
  h += sin(xz.y * 5.0 + uTime * 0.7) * ampZ;
  h += sin((xz.x + xz.y) * 2.3 + uTime * 1.3) * amp * 0.25;
  h += sin((xz.x - xz.y) * 3.1 - uTime * 0.9) * amp * 0.15;

  return h;
}

// World-space height of the liquid plane: level, first sloshing mode, then ripples.
// Shared so the body clip and the surface mesh can never drift apart.
float surfaceHeight(vec2 xz) {
  return uLevel + dot(uTilt, xz) + waveHeight(xz);
}
