import { lightLeak } from "@remotion/effects/light-leak";
import { paper } from "@remotion/effects/paper";
import React from "react";
import { AbsoluteFill, Solid, useVideoConfig } from "remotion";
import { ease, prog } from "../lib/time";
import { COLORS } from "../theme";

export const LEAF_D = "M0 150 C-140 85 -135 -80 0 -175 C135 -80 140 85 0 150 Z";
const LEAF_RIB = "M0 225 C0 190 0 170 0 150 C 2 60 3 -40 0 -150";
const LEAF_VEINS =
  "M1 80 C-25 60 -55 45 -85 35 M1 80 C27 60 57 45 87 35 M2 5 C-22 -15 -50 -30 -80 -38 M2 5 C24 -15 52 -30 82 -38 M1 -70 C-15 -85 -32 -97 -52 -105 M1 -70 C17 -85 34 -97 54 -105";

/** Hand-drawn mate leaf (SVG, centred on 0,0, about 400 units tall). */
export const Leaf: React.FC<{ fill: string; ink?: boolean }> = ({ fill, ink = true }) => (
  <g>
    <path d={LEAF_D} fill={fill} />
    {ink ? (
      <g fill="none" stroke={COLORS.ink} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round">
        <path d={LEAF_D} />
        <path d={LEAF_RIB} />
        <path d={LEAF_VEINS} />
      </g>
    ) : null}
  </g>
);

/** Warm paper background (Remotion paper() effect on a cream solid). */
export const PaperBackground: React.FC = () => {
  const { width, height } = useVideoConfig();
  return (
    <Solid
      width={width}
      height={height}
      color={COLORS.cream}
      effects={[paper({ amount: 0.35, colorFront: COLORS.cream, colorBack: "#E6DECF", roughness: 0.4, fiber: 0.3, crumples: 0, folds: 0, drops: 0, seed: 7 })]}
    />
  );
};

export const Vignette: React.FC = () => (
  <AbsoluteFill
    style={{
      pointerEvents: "none",
      background: "radial-gradient(ellipse 85% 70% at 50% 48%, rgba(0,0,0,0) 60%, rgba(90,70,40,0.12) 100%)",
    }}
  />
);

/** Warm light leak that sweeps across a key moment (Remotion lightLeak() effect). */
export const LightLeak: React.FC<{ t: number; start: number; duration: number; seed?: number; hueShift?: number; opacity?: number }> = ({
  t, start, duration, seed = 0, hueShift = 0, opacity = 1,
}) => {
  const { width, height } = useVideoConfig();
  const progress = prog(t, start, start + duration);
  if (progress <= 0 || progress >= 1) return null;
  return (
    <AbsoluteFill style={{ opacity, mixBlendMode: "screen", pointerEvents: "none" }}>
      <Solid width={width} height={height} effects={[lightLeak({ seed, hueShift, progress })]} />
    </AbsoluteFill>
  );
};

/** Soft glowing disc behind the kettle in hero shots. */
export const Halo: React.FC<{ k: number; cy: number }> = ({ k, cy }) => (
  <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{ position: "absolute", inset: 0 }}>
    <defs>
      <radialGradient id="halo-grad">
        <stop offset="0" stopColor="#FBF8F2" />
        <stop offset="0.55" stopColor="#F6F1E8" />
        <stop offset="1" stopColor={COLORS.cream} stopOpacity={0} />
      </radialGradient>
    </defs>
    <circle cx={540} cy={cy} r={520 * k} fill="url(#halo-grad)" />
    <circle cx={540} cy={cy} r={430 * ease.out3(k)} fill="none" stroke="#E4DCCB" strokeWidth={3} opacity={k} />
  </svg>
);
