import React from "react";
import { AbsoluteFill, Img, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { clamp01, ease, lerp, prog, seeded } from "../lib/time";
import { FONTS } from "../theme";

// Option 3 — bold product ad: the real product photo from the brochure, flat colour fields
// that change on the beat, and big Arabic type. Colours are sampled from the brochure.
export const C3 = {
  cream: "#F5EFE8",
  ink: "#111111",
  deep: "#162917",
  forest: "#294919",
  leaf: "#739E2F",
  lime: "#B5D86A",
  sun: "#F2B544",
} as const;

export type Photo = { src: string; w: number; h: number; shadows?: { cx: number; cy: number; rx: number; ry: number; a: number }[] };

// Kettle, base and gourd cut out of the brochure photo (anchors below are in its pixels).
export const SET: Photo = {
  src: staticFile("images/o3/kettle-set.png"),
  w: 2019,
  h: 1615,
  shadows: [
    { cx: 1010, cy: 1382, rx: 650, ry: 46, a: 0.5 },
    { cx: 1812, cy: 1600, rx: 205, ry: 26, a: 0.55 },
  ],
};
export const GOURD: Photo = { src: staticFile("images/o3/gourd.png"), w: 441, h: 834, shadows: [{ cx: 222, cy: 824, rx: 205, ry: 24, a: 0.5 }] };

export const AT = {
  spout: [212, 520],
  spoutTop: [95, 200],
  knob: [820, 45],
  handle: [1344, 450],
  body: [800, 640],
  logo: [784, 1010],
  dial: [1400, 985],
  power: [1424, 1196],
  base: [1010, 1385],
  gourd: [1812, 1300],
} as const satisfies Record<string, readonly [number, number]>;

type ProductProps = {
  readonly photo?: Photo;
  /** screen position of `anchor` */
  readonly x: number;
  readonly y: number;
  /** screen px per photo px */
  readonly scale: number;
  readonly anchor?: readonly [number, number];
  readonly rotate?: number;
  readonly opacity?: number;
  /** 0..1 position of a light sweep across the product */
  readonly shine?: number;
  readonly whip?: number;
};

/** The cut-out photo, placed so that `anchor` lands on (x, y), with soft contact shadows. */
export const Product: React.FC<ProductProps> = ({ photo = SET, x, y, scale, anchor = [photo.w / 2, photo.h / 2], rotate = 0, opacity = 1, shine, whip = 0 }) => {
  const w = photo.w * scale;
  const h = photo.h * scale;
  return (
    <div
      style={{
        position: "absolute",
        left: x - anchor[0] * scale,
        top: y - anchor[1] * scale,
        width: w,
        height: h,
        rotate: `${rotate}deg`,
        transformOrigin: `${anchor[0] * scale}px ${anchor[1] * scale}px`,
        opacity,
        filter: whipFilter(whip),
      }}
    >
      {photo.shadows?.map((s, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: (s.cx - s.rx) * scale,
            top: (s.cy - s.ry) * scale,
            width: 2 * s.rx * scale,
            height: 2 * s.ry * scale,
            borderRadius: "50%",
            background: `radial-gradient(closest-side, rgba(0,0,0,${s.a}), rgba(0,0,0,${s.a * 0.35}) 55%, rgba(0,0,0,0))`,
          }}
        />
      ))}
      <Img src={photo.src} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />
      {shine !== undefined && shine > 0 && shine < 1 ? (
        <div
          style={{
            position: "absolute",
            inset: 0,
            WebkitMaskImage: `url(${photo.src})`,
            maskImage: `url(${photo.src})`,
            WebkitMaskSize: "100% 100%",
            maskSize: "100% 100%",
            background: `linear-gradient(105deg, rgba(255,255,255,0) ${shine * 150 - 45}%, rgba(255,255,255,0.32) ${shine * 150 - 30}%, rgba(255,255,255,0) ${shine * 150 - 15}%)`,
          }}
        />
      ) : null}
    </div>
  );
};

/** Horizontal motion blur for whip moves (SVG filters defined in <WhipFilters />). */
export const whipFilter = (amount: number) => {
  const a = Math.abs(amount);
  if (a < 2) return undefined;
  const level = [8, 16, 32, 64].reduce((best, v) => (Math.abs(v - a) < Math.abs(best - a) ? v : best), 8);
  return `url(#whip-${level})`;
};

export const WhipFilters: React.FC = () => (
  <svg width={0} height={0} style={{ position: "absolute" }}>
    <defs>
      {[8, 16, 32, 64].map((v) => (
        <filter key={v} id={`whip-${v}`} x="-30%" y="-5%" width="160%" height="110%">
          <feGaussianBlur stdDeviation={`${v} 0`} />
        </filter>
      ))}
    </defs>
  </svg>
);

/** Full-bleed colour field. */
export const Field: React.FC<{ color: string; glow?: string; glowAt?: [number, number]; glowR?: number }> = ({ color, glow, glowAt = [540, 960], glowR = 700 }) => (
  <AbsoluteFill
    style={{
      backgroundColor: color,
      backgroundImage: glow ? `radial-gradient(circle ${glowR}px at ${glowAt[0]}px ${glowAt[1]}px, ${glow}, rgba(0,0,0,0))` : undefined,
    }}
  />
);

const GRAIN = staticFile("images/o3/grain.png");
const TILE = 256;

/** Film grain over everything: a tiled noise texture that jumps to a new offset every frame. */
export const Grain: React.FC<{ opacity?: number }> = ({ opacity = 0.1 }) => {
  const frame = useCurrentFrame();
  const r = seeded(frame * 7 + 3);
  const ox = -Math.floor(r() * TILE);
  const oy = -Math.floor(r() * TILE);
  return (
    <AbsoluteFill style={{ opacity, mixBlendMode: "overlay", pointerEvents: "none", overflow: "hidden" }}>
      {Array.from({ length: 6 * 9 }, (_, i) => (
        <Img key={i} src={GRAIN} style={{ position: "absolute", left: ox + (i % 6) * TILE, top: oy + Math.floor(i / 6) * TILE, width: TILE, height: TILE }} />
      ))}
    </AbsoluteFill>
  );
};

type TextProps = {
  readonly t: number;
  readonly at: number;
  readonly out?: number;
  readonly top: number;
  readonly size: number;
  readonly color: string;
  readonly weight?: number;
  readonly children: React.ReactNode;
  readonly style?: React.CSSProperties;
};

const textBase = (top: number, size: number, color: string, weight: number): React.CSSProperties => ({
  position: "absolute",
  left: 50,
  right: 50,
  top,
  textAlign: "center",
  direction: "rtl",
  whiteSpace: "nowrap",
  fontFamily: FONTS.sans,
  fontWeight: weight,
  fontSize: size,
  lineHeight: 1.25,
  color,
});

/** Big word that punches in (scale 1.7 -> 1 on a spring) and snaps out. */
export const Slam: React.FC<TextProps & { tilt?: number }> = ({ t, at, out, top, size, color, weight = 800, tilt = 0, children, style }) => {
  const { fps } = useVideoConfig();
  const f = Math.round((t - at) * fps);
  if (f < 0) return null;
  const s = spring({ frame: f, fps, config: { damping: 12, stiffness: 190, mass: 0.7 } });
  const o = out === undefined ? 0 : prog(t, out, out + 0.18, ease.in2);
  if (o >= 1) return null;
  return (
    <div style={{ ...textBase(top, size, color, weight), opacity: clamp01(s * 1.8) * (1 - o), scale: String(lerp(1.7, 1, s) * (1 - 0.15 * o)), rotate: `${tilt * (1 - s)}deg`, ...style }}>
      {children}
    </div>
  );
};

/** Line that rises out of a mask. */
export const Rise: React.FC<TextProps & { dur?: number }> = ({ t, at, out, top, size, color, weight = 700, dur = 0.45, children, style }) => {
  const k = prog(t, at, at + dur, ease.expoOut);
  const o = out === undefined ? 0 : prog(t, out, out + 0.3, ease.in3);
  if (k <= 0 || o >= 1) return null;
  return (
    <div style={{ ...textBase(top, size, color, weight), overflow: "hidden", paddingBottom: size * 0.12, ...style }}>
      <div style={{ translate: `0px ${(1 - k) * size * 1.3 - o * size * 1.3}px` }}>{children}</div>
    </div>
  );
};

/** Rounded label, e.g. for callouts and the call to action. */
export const Pill: React.FC<{ bg: string; color: string; size: number; children: React.ReactNode; style?: React.CSSProperties }> = ({ bg, color, size, children, style }) => (
  <div
    style={{
      display: "inline-block",
      padding: `${size * 0.28}px ${size * 0.62}px ${size * 0.34}px`,
      borderRadius: 999,
      background: bg,
      color,
      fontFamily: FONTS.sans,
      fontWeight: 700,
      fontSize: size,
      lineHeight: 1.2,
      direction: "rtl",
      whiteSpace: "nowrap",
      ...style,
    }}
  >
    {children}
  </div>
);

// ---------------------------------------------------------------- 7-segment digits (SVG)
const SEGS: Record<string, string> = {
  "0": "abcdef", "1": "bc", "2": "abged", "3": "abgcd", "4": "fgbc", "5": "afgcd", "6": "afgedc", "7": "abc", "8": "abcdefg", "9": "abcdfg", C: "adef",
};

const seg = (cx: number, cy: number, len: number, th: number, vertical: boolean) => {
  const h = len / 2;
  const t = th / 2;
  const p = vertical
    ? [[0, -h], [t, -h + t], [t, h - t], [0, h], [-t, h - t], [-t, -h + t]]
    : [[-h, 0], [-h + t, -t], [h - t, -t], [h, 0], [h - t, t], [-h + t, t]];
  return p.map(([x, y]) => `${(cx + x).toFixed(1)},${(cy + y).toFixed(1)}`).join(" ");
};

const digitPolys = (ch: string, x: number, y: number, w: number, h: number, th: number) => {
  const gap = th * 0.28;
  const vx = [x + th / 2, x + w - th / 2];
  const hy = [y + th / 2, y + h / 2, y + h - th / 2];
  const vl = h / 2 - th / 2 - 2 * gap;
  const hl = w - th - 2 * gap;
  const all: Record<string, string> = {
    a: seg(x + w / 2, hy[0], hl, th, false),
    g: seg(x + w / 2, hy[1], hl, th, false),
    d: seg(x + w / 2, hy[2], hl, th, false),
    f: seg(vx[0], (hy[0] + hy[1]) / 2, vl, th, true),
    b: seg(vx[1], (hy[0] + hy[1]) / 2, vl, th, true),
    e: seg(vx[0], (hy[1] + hy[2]) / 2, vl, th, true),
    c: seg(vx[1], (hy[1] + hy[2]) / 2, vl, th, true),
  };
  return [...(SEGS[ch] ?? "")].map((s) => all[s]);
};

/** The kettle's LED readout ("77℃") as crisp SVG, centred on (cx, cy). */
export const SevenSeg: React.FC<{ value: number; cx: number; cy: number; height: number; color?: string; glow?: number }> = ({ value, cx, cy, height, color = "#F2FFF6", glow = 1 }) => {
  const text = String(Math.round(value));
  const k = height / 168;
  const dw = 92 * k;
  const space = 20 * k;
  const th = 17 * k;
  const cw = 62 * k;
  const total = text.length * dw + (text.length - 1) * space + 18 * k + 26 * k + 8 * k + cw;
  const x0 = cx - total / 2;
  const y0 = cy - height / 2;
  const degX = x0 + text.length * dw + (text.length - 1) * space + 18 * k;
  const cTop = y0 + height * 0.36;
  const polys = [
    ...[...text].flatMap((ch, i) => digitPolys(ch, x0 + i * (dw + space), y0, dw, height, th)),
    ...digitPolys("C", degX + 34 * k, cTop, cw, height * 0.64, th * 0.8),
  ];
  return (
    <g>
      <g filter={glow > 0 ? "url(#led-glow)" : undefined} fill={color}>
        {polys.map((p, i) => (
          <polygon key={i} points={p} />
        ))}
      </g>
      <circle cx={degX + 13 * k} cy={cTop - 4 * k} r={11 * k} fill="none" stroke={color} strokeWidth={7 * k} />
    </g>
  );
};

export const LedGlowFilter: React.FC = () => (
  <filter id="led-glow" x="-20%" y="-20%" width="140%" height="140%">
    <feGaussianBlur stdDeviation={9} result="b" />
    <feMerge>
      <feMergeNode in="b" />
      <feMergeNode in="SourceGraphic" />
    </feMerge>
  </filter>
);

/** Flat sun with slowly turning rays. */
export const Sun: React.FC<{ cx: number; cy: number; r: number; k: number; spin: number; color: string }> = ({ cx, cy, r, k, spin, color }) => (
  <g transform={`translate(${cx} ${cy}) scale(${k}) rotate(${spin})`}>
    {Array.from({ length: 12 }, (_, i) => (
      <rect key={i} x={-r * 0.09} y={-r * 1.78} width={r * 0.18} height={r * 0.52} rx={r * 0.09} fill={color} transform={`rotate(${i * 30})`} />
    ))}
    <circle r={r} fill={color} />
  </g>
);
