varying vec2 vUv;
varying float vScale;
varying vec4 vCanvasUV;
attribute float instanceScale;
uniform vec2 dimensions;

void main() {
  vUv = uv;
  vScale = instanceScale;
  vCanvasUV = instanceMatrix * vec4(uv, 1.0, 1.0);
  vCanvasUV.xy = (vCanvasUV.xy + 0.5 * dimensions) / dimensions;
  gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
}