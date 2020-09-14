varying vec2 vUv;
varying float vScale;
attribute float instanceScale;

void main() {
  vUv = uv;
  vScale = instanceScale;
  gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.);
}