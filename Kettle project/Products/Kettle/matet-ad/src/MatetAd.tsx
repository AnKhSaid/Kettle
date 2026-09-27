import React from "react";
import { AbsoluteFill, Sequence } from "remotion";
import { Soundtrack } from "./audio/Soundtrack";
import { PaperBackground, Vignette } from "./components/Art";
import { sec } from "./lib/time";
import { Opening, OPENING } from "./scenes/Opening";
import { Product, PRODUCT } from "./scenes/Product";

/**
 * MATET smart mate kettle — 30 s vertical ad (1080x1920, 30 fps).
 * Opening (0-9.7 s): the riddle. Product (9.4-30 s): the 3D kettle and the call to action.
 */
export const MatetAd: React.FC = () => (
  <AbsoluteFill>
    <PaperBackground />
    <Sequence name="Opening" from={sec(OPENING.start)} durationInFrames={sec(OPENING.end - OPENING.start)} premountFor={sec(0.5)}>
      <Opening />
    </Sequence>
    <Sequence name="Product" from={sec(PRODUCT.start)} durationInFrames={sec(PRODUCT.end - PRODUCT.start)} premountFor={sec(1)}>
      <Product />
    </Sequence>
    <Vignette />
    <Soundtrack />
  </AbsoluteFill>
);
