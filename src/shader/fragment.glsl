varying vec2 vUv;
varying float vScale;
uniform float time;
uniform sampler2D chars;

void main() {
  float size = 66.0;
  vec2 uv = vec2(vUv.x / size + floor(vScale * size) / size, vUv.y);
  gl_FragColor = texture2D(chars, uv);
}