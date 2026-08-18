uniform mat4 uBottleWorldInverse;
uniform float uRadius;
uniform float uHalfHeight;

in vec3 vWorldPosition;

void main() {
  vec3 bottlePosition = (uBottleWorldInverse * vec4(vWorldPosition, 1.0)).xyz;

  if (length(bottlePosition.xz) > uRadius) discard;
  if (abs(bottlePosition.y) > uHalfHeight) discard;

  gl_FragColor = vec4(0.35, 1.0, 0.45, 1.0);
}