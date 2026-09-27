import React from "react";
import { AbsoluteFill, Sequence } from "remotion";
import { KettleStage } from "../kettle/KettleStage";
import { sec } from "../lib/time";
import { END_SCENE, EndBack, EndFront } from "./EndScene";
import { HOWTO_SCENE, HowToFront } from "./HowToScene";
import { POUR_SCENE, PourFront } from "./PourScene";
import { REVEAL_SCENE, RevealBack, RevealFront } from "./RevealScene";
import { SOLAR_SCENE, SolarBack, SolarFront } from "./SolarScene";

export const PRODUCT = { start: 9.4, end: 30 };

// Sequences inside this component are positioned relative to PRODUCT.start.
const at = (seconds: number) => sec(seconds - PRODUCT.start);
const span = (scene: { start: number; end: number }) => ({
  from: at(scene.start),
  durationInFrames: sec(scene.end - scene.start),
  premountFor: sec(0.5),
});

/** 9.4 - 30 s: the 3D kettle, with each scene's back layers behind it and front layers on top. */
export const Product: React.FC = () => (
  <AbsoluteFill>
    <Sequence name="Halo (reveal)" {...span(REVEAL_SCENE)}>
      <RevealBack />
    </Sequence>
    <Sequence name="Sun" {...span(SOLAR_SCENE)}>
      <SolarBack />
    </Sequence>
    <Sequence name="Halo (end)" {...span(END_SCENE)}>
      <EndBack />
    </Sequence>

    <Sequence name="3D kettle" from={0} durationInFrames={sec(PRODUCT.end - PRODUCT.start)} premountFor={sec(1)}>
      <KettleStage start={PRODUCT.start} />
    </Sequence>

    <Sequence name="Reveal" {...span(REVEAL_SCENE)}>
      <RevealFront />
    </Sequence>
    <Sequence name="Pour" {...span(POUR_SCENE)}>
      <PourFront />
    </Sequence>
    <Sequence name="Solar" {...span(SOLAR_SCENE)}>
      <SolarFront />
    </Sequence>
    <Sequence name="How to" {...span(HOWTO_SCENE)}>
      <HowToFront />
    </Sequence>
    <Sequence name="End card" {...span(END_SCENE)}>
      <EndFront />
    </Sequence>
  </AbsoluteFill>
);
