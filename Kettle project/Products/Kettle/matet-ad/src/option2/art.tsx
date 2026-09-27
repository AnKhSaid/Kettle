import { evolvePath } from "@remotion/paths";
import React from "react";
import { useCurrentFrame } from "remotion";
import { LEAF_D } from "../components/Art";
import { LINE_PARTS } from "../kettle/lineArt";
import { PROFILE } from "../kettle/profile";
import { clamp01 } from "../lib/time";

// Option 2 — flat illustration on paper. Warm ink, muted flat colours, and a "line boil":
// the outlines wobble a little, re-drawn 10 times a second like hand-drawn animation.
export const C2 = {
  paper: "#F3EDE2",
  ink: "#2B2722",
  muted: "#8A7F70",
  olive: "#7F9B4E",
  sage: "#B9C79A",
  clay: "#D97757",
  water: "#8FB3C0",
  wood: "#A8683F",
  charcoal: "#35312D",
  sun: "#E9B44C",
} as const;

/** SVG filter that makes everything it touches look hand-drawn (defines #boil). */
export const BoilFilter: React.FC<{ amount?: number }> = ({ amount = 4.5 }) => {
  const frame = useCurrentFrame();
  return (
    <filter id="boil" x="-5%" y="-5%" width="110%" height="110%">
      <feTurbulence type="fractalNoise" baseFrequency="0.016" numOctaves={2} seed={Math.floor(frame / 3) % 40} result="n" />
      <feDisplacementMap in="SourceGraphic" in2="n" scale={amount} xChannelSelector="R" yChannelSelector="G" />
    </filter>
  );
};

/** An ink stroke that draws itself (k: 0 -> 1). */
export const Ink: React.FC<{ d: string; k: number; w?: number; color?: string }> = ({ d, k, w = 6, color = C2.ink }) =>
  k <= 0 ? null : <path d={d} fill="none" stroke={color} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" {...(k < 1 ? evolvePath(k, d) : {})} />;

/** Flat fill printed slightly off the outline, like a two-colour print. */
export const Wash: React.FC<{ d: string; k: number; color: string; dx?: number; dy?: number }> = ({ d, k, color, dx = 7, dy = 5 }) =>
  k <= 0 ? null : <path d={d} fill={color} opacity={k} transform={`translate(${dx} ${dy})`} />;

export const DROP_D = "M0 175 C-150 175 -130 -40 0 -175 C130 -40 150 175 0 175 Z";
export const LEAF_DETAIL = "M0 225 C0 190 0 170 0 150 C 2 60 3 -40 0 -150 M1 80 C-25 60 -55 45 -85 35 M1 80 C27 60 57 45 87 35 M2 5 C-22 -15 -50 -30 -80 -38 M2 5 C24 -15 52 -30 82 -38";
export { LEAF_D };

const part = (id: string) => LINE_PARTS.find((p) => p.id === id)!.d;
const FILLS: Record<string, string> = { base: "#2A2724", dial: "#1E1C1A", body: C2.charcoal, knob: "#2A2724", handle: C2.charcoal, spout: C2.charcoal };
const POT = ["body", "knob", "handle", "spout"];

type KettleArtProps = {
  /** kettle-space origin (bottom centre of the body) on screen, and scale */
  readonly x: number;
  readonly y: number;
  readonly s: number;
  readonly draw: number;
  readonly fill: number;
  readonly lift?: number;
  readonly tilt?: number;
  readonly led?: string;
};

/** The MATET kettle as a flat illustration, drawn from the same measured outlines as the 3D model. */
export const KettleArt: React.FC<KettleArtProps> = ({ x, y, s, draw, fill, lift = 0, tilt = 0, led }) => {
  const [px, py] = PROFILE.pivot;
  const k = (i: number) => clamp01((draw * 1.7 - i * 0.14) / 0.95);
  const layer = (ids: string[], offset: number) =>
    ids.map((id, i) => (
      <g key={id}>
        <Wash d={part(id)} k={fill} color={FILLS[id]} dx={5} dy={-4} />
        <Ink d={part(id)} k={k(offset + i)} w={5 / s + 1} />
      </g>
    ));
  return (
    <g transform={`translate(${x} ${y}) scale(${s} ${-s})`} filter="url(#boil)">
      {layer(["base", "dial"], 0)}
      {led && fill > 0 ? (
        <g transform={`translate(${PROFILE.dial.x} ${PROFILE.dial.h * 0.5}) scale(1 -1)`} opacity={fill}>
          <text textAnchor="middle" dominantBaseline="middle" fontFamily="Alexandria" fontWeight={300} fontSize={22} fill="#E8F5E4">{led}</text>
        </g>
      ) : null}
      <g transform={`translate(0 ${lift}) rotate(${tilt} ${px} ${py})`}>
        {layer(POT, 2)}
        {/* soft highlight down the body, and the knob's steel band */}
        <path d="M-104 30 C-98 150 -92 260 -92 400" fill="none" stroke="#5A544D" strokeWidth={16} strokeLinecap="round" opacity={0.7 * fill} />
        <path d="M-71 466 H71" stroke="#D8CDBB" strokeWidth={6} opacity={fill} />
        {/* the logo print */}
        <g opacity={fill} transform="translate(0 70)">
          <rect x={-22} y={-22} width={44} height={44} rx={10} fill="none" stroke="#F3EDE2" strokeWidth={4.5} />
          <path d={LEAF_D} fill="#F3EDE2" transform="scale(0.085 -0.085) rotate(25)" />
        </g>
      </g>
    </g>
  );
};

const GOURD_PTS: [number, number][] = [[45, 0], [80, 12], [104, 40], [114, 76], [110, 112], [98, 140], [88, 160], [87, 172], [92, 184], [96, 190]];
const GOURD_D = `M${[...GOURD_PTS].reverse().map(([r, h]) => `${-r} ${h}`).join(" L")} L${GOURD_PTS.map(([r, h]) => `${r} ${h}`).join(" L")} Z`;

/** Mate gourd with yerba and a bombilla (origin at the bottom centre, y up). */
export const GourdArt: React.FC<{ x: number; y: number; s: number; draw: number; fill: number }> = ({ x, y, s, draw, fill }) => (
  <g transform={`translate(${x} ${y}) scale(${s} ${-s})`} filter="url(#boil)">
    <Wash d={GOURD_D} k={fill} color={C2.wood} dx={4} dy={-3} />
    <ellipse cx={0} cy={188} rx={84} ry={14} fill={C2.olive} opacity={fill} />
    <Ink d="M-70 60 L-40 100 L-10 60 L20 100 L50 60 L80 100" k={clamp01(draw * 1.4 - 0.4)} w={4 / s + 1} color="#6E4122" />
    <Ink d={GOURD_D} k={draw} w={5 / s + 1} />
    <Ink d="M30 120 L78 300 Q82 312 96 312" k={clamp01(draw * 1.4 - 0.3)} w={8} color="#B9AE9C" />
  </g>
);

/** A rising curl of steam (k: 0 -> 1 draws it). */
export const steamD = (x: number, y: number, h: number, w = 1) =>
  `M${x} ${y} C${x + 26 * w} ${y - h * 0.25} ${x - 26 * w} ${y - h * 0.5} ${x} ${y - h * 0.7} S${x + 20 * w} ${y - h * 0.9} ${x + 6 * w} ${y - h}`;
