import { useThree } from "@react-three/fiber";
import { ThreeCanvas } from "@remotion/three";
import { useEffect, useMemo, useState } from "react";
import { staticFile, useDelayRender, useVideoConfig } from "remotion";
import * as THREE from "three";
import { HDRLoader } from "three/examples/jsm/loaders/HDRLoader.js";
import { clamp01, lerp, useGlobalTime } from "../lib/time";
import { buildKettle } from "./buildKettle";
import { GOURD_SCALE, kettlePose } from "./pose";
import { CAMERA_DIST, CAMERA_FOV, PROFILE } from "./profile";

// Studio lighting: a real photo-studio HDRI (Poly Haven "studio_small_03", CC0) gives the
// matte black steel and the brushed-steel knob their reflections. Its umbrella softbox is
// turned to sit front-left of the kettle, like the key light in the brochure photo.
const ENV_URL = staticFile("hdri/studio_small_03_1k.hdr");
const ENV_ROTATION = -1.7;

const StudioEnvironment: React.FC<{ onReady: () => void }> = ({ onReady }) => {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  useEffect(() => {
    let env: THREE.Texture | null = null;
    const pmrem = new THREE.PMREMGenerator(gl);
    new HDRLoader().loadAsync(ENV_URL).then((hdr) => {
      hdr.mapping = THREE.EquirectangularReflectionMapping;
      env = pmrem.fromEquirectangular(hdr).texture;
      hdr.dispose();
      scene.environment = env;
      scene.environmentIntensity = 0.5;
      scene.environmentRotation.set(0, ENV_ROTATION, 0);
      gl.toneMapping = THREE.ACESFilmicToneMapping;
      gl.toneMappingExposure = 1.0;
      onReady();
    });
    return () => {
      env?.dispose();
      pmrem.dispose();
    };
  }, [gl, scene, onReady]);
  return null;
};

// Renders the 3D frame again once the environment and the logo texture have loaded.
const RenderWhenReady: React.FC<{ ready: boolean; onDone: () => void }> = ({ ready, onDone }) => {
  const advance = useThree((s) => s.advance);
  useEffect(() => {
    if (ready) {
      advance(performance.now());
      onDone();
    }
  }, [ready, advance, onDone]);
  return null;
};

export const KettleStage: React.FC<{ start: number }> = ({ start }) => {
  const t = useGlobalTime(start);
  const { width, height } = useVideoConfig();
  const kit = useMemo(() => buildKettle(), []);
  const { delayRender, continueRender } = useDelayRender();
  const [handle] = useState(() => delayRender("Loading the studio HDRI and kettle textures"));
  const [envReady, setEnvReady] = useState(false);
  const [texReady, setTexReady] = useState(false);

  useEffect(() => {
    kit.texturesReady.then(() => setTexReady(true));
  }, [kit]);
  const onEnvReady = useMemo(() => () => setEnvReady(true), []);
  const onDone = useMemo(() => () => continueRender(handle), [continueRender, handle]);

  const p = kettlePose(t);
  kit.dial.rotation.y = p.dialRy;
  kit.wetMat.opacity = p.wet;
  kit.powerMat.emissive.setRGB(0.25 * p.press, 0.7 * p.press, 0.3 * p.press);
  kit.footAoMat.opacity = 1 - clamp01((p.liftY - PROFILE.pivot[1]) / 30);
  kit.setLed(p.led, p.ledOn);

  // bottom-to-top reveal of the 3D render
  const top = p.reveal >= 1 ? 0 : lerp(69, 36, p.reveal);
  const clipPath = p.reveal <= 0 ? "inset(100% 0 0 0)" : `inset(${top}% 0 0 0)`;

  return (
    <ThreeCanvas
      width={width}
      height={height}
      shadows
      camera={{ fov: CAMERA_FOV, near: 100, far: CAMERA_DIST * 3, position: [0, 0, CAMERA_DIST] }}
      style={{ position: "absolute", inset: 0, clipPath }}
    >
      <StudioEnvironment onReady={onEnvReady} />
      <RenderWhenReady ready={envReady && texReady} onDone={onDone} />
      {/* key light (casts the floor shadow), warm like the brochure photo */}
      <directionalLight
        position={[-1100, 1500, 1300]}
        intensity={1.25}
        color="#fff1df"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-1000}
        shadow-camera-right={1000}
        shadow-camera-top={1000}
        shadow-camera-bottom={-1000}
        shadow-camera-near={10}
        shadow-camera-far={6000}
        shadow-bias={-0.0004}
        shadow-normalBias={1.5}
      />
      {/* cool rim light from behind-right to separate the black kettle from the paper */}
      <directionalLight position={[1300, 900, -1100]} intensity={0.9} color="#eef3ff" />
      <group position={[p.rig.x, p.rig.y, 0]} rotation={[p.rig.rx, p.rig.ry, 0]} scale={p.rig.s}>
        <primitive object={kit.base} />
        <primitive object={kit.floor} />
        <group position={[PROFILE.pivot[0], p.liftY, 0]} rotation={[0, 0, p.tilt]}>
          <primitive object={kit.pot} />
        </group>
        <group
          position={[-440, -PROFILE.base.h, 90]}
          rotation={[0, (1 - p.gourd) * 2, 0]}
          scale={GOURD_SCALE * Math.max(0.0001, p.gourd)}
          visible={p.gourd > 0.001}
        >
          <primitive object={kit.gourd} />
        </group>
      </group>
    </ThreeCanvas>
  );
};
