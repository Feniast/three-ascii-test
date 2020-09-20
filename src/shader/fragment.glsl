varying vec2 vUv;
varying float vScale;
varying vec4 vCanvasUV;
uniform float time;
uniform sampler2D chars;
uniform sampler2D canvas;

void main() {
  float size = 66.0;
  vec2 uv = vec2(vUv.x / size + floor(vScale * size) / size, vUv.y);
  if (vCanvasUV.x < 0.5) {
    gl_FragColor = texture2D(chars, uv);
  } else {
    // gl_FragColor = vec4(vCanvasUV.xy, 0., 1.);
    gl_FragColor = texture2D(canvas, vCanvasUV.xy);
  }
}