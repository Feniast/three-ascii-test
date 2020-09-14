import React, {
  useState,
  useRef,
  useEffect,
  useLayoutEffect,
  Suspense,
  useMemo,
  useCallback,
} from 'react';
import {
  Canvas,
  useFrame,
  useThree,
  extend,
  useUpdate,
} from 'react-three-fiber';
import * as THREE from 'three';
import { OrbitControls, shaderMaterial, useTextureLoader } from 'drei';
import vertex from './shader/vertex.glsl';
import fragment from './shader/fragment.glsl';
import * as dat from 'dat.gui';
import { useDeepMemo, useDeepCompareEffect } from './useDeep';
import charsMap from 'url:./assets/chars.png';
import myVideo from 'url:./assets/leonardo.mp4';
import { PlaneBufferGeometry, BufferAttribute } from 'three';

const AsciiMaterial = shaderMaterial(
  {
    chars: null,
    time: 0,
  },
  vertex,
  fragment,
  () => null
);

const TestMaterial = shaderMaterial(
  {
    chars: null,
  },
  `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);
  }
`,
  `
varying vec2 vUv;
uniform sampler2D chars;

void main() {
  float size = 66.0;
  gl_FragColor = texture2D(chars, vUv);
  // gl_FragColor = vec4(vUv, 0.0, 1.);
}
  `,
  () => null
);

extend({
  AsciiMaterial,
  TestMaterial,
});

interface DatGuiSetting {
  value: string | number | undefined;
  type?: 'color' | undefined;
  min?: number;
  max?: number;
  step?: number;
}

const useDatGui = <T extends Record<string, DatGuiSetting>>(settings: T) => {
  const obj = useDeepMemo<Record<keyof T, DatGuiSetting['value']>>(() => {
    const o = {} as Record<keyof T, DatGuiSetting['value']>;
    Object.keys(settings).forEach((key) => {
      const setting = settings[key];
      const { value } = setting;
      o[key as keyof T] = value;
    });
    return o;
  }, [settings]);

  useDeepCompareEffect(() => {
    const inst = new dat.GUI();
    Object.keys(settings).forEach((key) => {
      const setting = settings[key];
      const { type, min, max, step } = setting;
      if (type === 'color') {
        inst.addColor(obj, key);
      } else {
        inst.add(obj, key, min, max, step);
      }
    });
    return () => {
      inst.destroy();
    };
  }, [obj]);

  return obj;
};

const size = 50;
const cellSize = 1;

const grayscale = (r: number, g: number, b: number) =>
  0.299 * r + 0.587 * g + 0.114 * b;

interface useCaptureFrameOptions {
  width?: number;
  height?: number;
  loop?: boolean;
}

const useCaptureFrame = (
  videoSrc: string,
  options: useCaptureFrameOptions = {}
) => {
  const video = useMemo(() => document.createElement('video'), []);
  const canvas = useMemo(() => document.createElement('canvas'), []);
  const dimensionsSet = useRef(false);
  const ready = useRef(false);
  const { width, height, loop = true } = options;
  useLayoutEffect(() => {
    video.loop = true;
  }, [loop]);
  useLayoutEffect(() => {
    video.src = videoSrc;
    ready.current = false;
    const onCanPlay = () => {
      if (!dimensionsSet.current) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        dimensionsSet.current = true;
      }
      ready.current = true;
      video.play();
    };
    video.addEventListener('canplaythrough', onCanPlay);

    return () => {
      video.removeEventListener('canplaythrough', onCanPlay);
    };
  }, [videoSrc]);

  useLayoutEffect(() => {
    let w = width,
      h = height;
    if (!w && !h) return;
    if (w && !h) {
      h = w;
    }
    if (h && !w) {
      w = h;
    }
    if (canvas.width !== w) {
      canvas.width = w;
    }
    if (canvas.height !== h) {
      canvas.height = h;
    }
    dimensionsSet.current = true;
  }, [width, height]);

  return useCallback((onCapture: (data: ImageData) => void) => {
    if (!ready.current) return;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    onCapture(imageData);
  }, []);
};

const Test = () => {
  const { clock } = useThree();
  const capture = useCaptureFrame(myVideo, {
    width: size,
    height: size,
  });
  const chars = useTextureLoader(charsMap) as THREE.Texture;
  const mesh = useUpdate<THREE.InstancedMesh>(() => {
    if (!mesh.current) return;
    const dummy = new THREE.Object3D();
    const scales = new Float32Array(size ** 2);
    let count = 0;
    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        dummy.position.set(
          cellSize * j - cellSize * size * 0.5,
          -(cellSize * i - cellSize * size * 0.5),
          0
        );
        dummy.updateMatrix();
        scales.set([Math.random()], count);
        mesh.current.setMatrixAt(count++, dummy.matrix);
      }
    }
    (mesh.current.geometry as PlaneBufferGeometry).setAttribute(
      'instanceScale',
      new THREE.InstancedBufferAttribute(scales, 1)
    );
    mesh.current.instanceMatrix.needsUpdate = true;
  }, []);

  useFrame(() => {
    (mesh.current.material as THREE.ShaderMaterial).uniforms.time.value =
      clock.elapsedTime;
    capture((frame) => {
      const scales = new Float32Array(size ** 2);
      for (let i = 0; i < frame.data.length; i += 4) {
        const d = grayscale(
          frame.data[i],
          frame.data[i + 1],
          frame.data[i + 2]
        );
        scales.set([d / 255], i / 4);
      }
      ((mesh.current.geometry as PlaneBufferGeometry).attributes
        .instanceScale as BufferAttribute).array = scales;
      (mesh.current
        .geometry as PlaneBufferGeometry).attributes.instanceScale.needsUpdate = true;
    });
  });
  return (
    <>
      <instancedMesh
        position={[0, 0, 0]}
        ref={mesh}
        args={[null, null, size ** 2]}
      >
        <planeBufferGeometry attach="geometry" args={[cellSize, cellSize]} />
        {/* @ts-ignore */}
        <asciiMaterial
          transparent
          attach="material"
          side={THREE.DoubleSide}
          chars={chars}
        />
      </instancedMesh>
      {/* <mesh scale={[100, 100, 100]}>
        <planeBufferGeometry
          attach="geometry"
          args={[1, 1]}
        ></planeBufferGeometry>
        <testMaterial
          transparent
          attach="material"
          side={THREE.DoubleSide}
          chars={chars}
        />
      </mesh> */}
    </>
  );
};

const frustumSize = 800;

const CameraSet = () => {
  const { aspect, setDefaultCamera } = useThree();
  useEffect(() => {
    const camera = new THREE.OrthographicCamera(
      (frustumSize * aspect) / -2,
      (frustumSize * aspect) / 2,
      frustumSize / 2,
      frustumSize / -2,
      -1000,
      1000
    );
    camera.zoom = 4;
    camera.position.set(0, 0, 2);
    setDefaultCamera(camera);
  }, [aspect]);
  return null;
};

const App = () => {
  return (
    <Canvas
      colorManagement
      onCreated={(ctx) => {
        ctx.gl.setClearColor(0xffffff);
      }}
    >
      <CameraSet />
      <OrbitControls />
      <Suspense fallback={null}>
        <Test />
      </Suspense>
    </Canvas>
  );
};

export default App;
