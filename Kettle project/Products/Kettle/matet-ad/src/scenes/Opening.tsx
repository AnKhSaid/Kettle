import React from "react";
import { AbsoluteFill, Sequence } from "remotion";
import { LightLeak } from "../components/Art";
import { sec, useGlobalTime } from "../lib/time";
import { LEAF_SCENE, LeafScene } from "./LeafScene";
import { TEMPERATURE_SCENE, TemperatureBack, TemperatureFront } from "./TemperatureScene";

export const OPENING = { start: 0, end: 9.7 };

const DropLightLeak: React.FC = () => {
  const t = useGlobalTime(OPENING.start);
  return <LightLeak t={t} start={7.1} duration={1.2} seed={3} opacity={0.32} />;
};

/** 0 - 9.7 s: the riddle. Leaf on water → boiling 100° → freeze → 77° → "the perfect degree". */
export const Opening: React.FC = () => (
  <AbsoluteFill>
    <Sequence name="Boiling flood" from={sec(TEMPERATURE_SCENE.start)} durationInFrames={sec(7.0 - TEMPERATURE_SCENE.start)} premountFor={sec(0.5)}>
      <TemperatureBack />
    </Sequence>
    <Sequence name="Leaf" from={sec(LEAF_SCENE.start)} durationInFrames={sec(LEAF_SCENE.end - LEAF_SCENE.start)} premountFor={sec(0.5)}>
      <LeafScene />
    </Sequence>
    <Sequence name="Temperature" from={sec(TEMPERATURE_SCENE.start)} durationInFrames={sec(TEMPERATURE_SCENE.end - TEMPERATURE_SCENE.start)} premountFor={sec(0.5)}>
      <TemperatureFront />
    </Sequence>
    <DropLightLeak />
  </AbsoluteFill>
);
