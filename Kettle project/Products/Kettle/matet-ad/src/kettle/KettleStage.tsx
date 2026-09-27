import { useThree } from "@react-three/fiber";
import { ThreeCanvas } from "@remotion/three";
import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { useDelayRender, useVideoConfig } from "remotion";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { lerp, useGlobalTime } from "../lib/time";
import { fontsLoaded } from "../theme";
import { buildKettle } from "./buildKettle";
import { GOURD_SCALE, kettlePose } from "./pose";
import { CAMERA_DIST, CAMERA_FOV, PROFILE } from "./profile";

// Studio lighting: a soft room environment for reflections on the matte-black steel.
const StudioEnvironment: React.FC = () => {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  useLayoutEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env;
    scene.environmentIntensity = 0.9;
    gl.toneMappingExposure = 1.05;
    return () => {
      env.dispose();
      pmrem.dispose();
    };
  }, [gl, scene]);
  return null;
};

// Re-renders the 3D frame once the canvas textures (LED digits, logo) have their fonts.
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
  const [handle] = useState(() => delayRender("Drawing kettle textures"));
  const [fontsReady, setFontsReady] = useState(false);

  useEffect(() => {
    fontsLoaded
      .then(() => document.fonts.ready)
      .then(() => {
        kit.drawLogo();
        setFontsReady(true);
      });
  }, [kit]);
  const onDone = useMemo(() => () => continueRender(handle), [continueRender, handle]);

  const p = kettlePose(t);
  kit.dial.rotation.y = p.dialRy;
  kit.wetMat.opacity = p.wet;
  kit.powerMat.emissive.setRGB(0.25 * p.press, 0.7 * p.press, 0.3 * p.press);
  kit.setLed(`${Math.round(p.led)}°`, p.ledOn, fontsReady ? 1 : 0);

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
      <StudioEnvironment />
      <RenderWhenReady ready={fontsReady} onDone={onDone} />
      <directionalLight
        position={[-900, 1400, 1200]}
        intensity={2.2}
        color="#fff4e6"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-900}
        shadow-camera-right={900}
        shadow-camera-top={900}
        shadow-camera-bottom={-900}
        shadow-camera-near={10}
        shadow-camera-far={5000}
        shadow-radius={10}
        shadow-bias={-0.0006}
      />
      <directionalLight position={[1200, 600, -900]} intensity={1.4} />
      <hemisphereLight args={["#fff8ee", "#b8a98f", 0.5]} />
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
