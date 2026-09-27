import { noise2D } from "@remotion/noise";
import { evolvePath } from "@remotion/paths";
import { CrossedOff, Underline } from "@remotion/rough-notation";
import React from "react";
import { AbsoluteFill, spring, useVideoConfig } from "remotion";
import { LEAF_D } from "../components/Art";
import { Odometer } from "../components/Odometer";
import { InkReveal, WordSlam } from "../components/Text";
import { DIAL_SCREEN } from "../kettle/lineArt";
import { shake } from "../lib/shake";
import { clamp01, ease, lerp, mixColor, prog, seeded, track, useGlobalTime } from "../lib/time";
import { COLORS } from "../theme";

export const TEMPERATURE_SCENE = { start: 2.2, end: 9.7 };

const CX = 540;
const CY = 900;
const RING_R = 300;
const RING_D = `M${CX} ${CY - RING_R} A${RING_R} ${RING_R} 0 1 1 ${CX - 0.01} ${CY - RING_R}`;

const R = seeded(11);
const BUBBLES = Array.from({ length: 110 }, (_, i) => ({
  x: R() * 1080, r: 6 + R() ** 2 * 38, v: 0.6 + R() * 0.9, off: R() * 2300, ph: R() * 6.28, filled: i % 3 === 0,
}));
const CONFETTI = Array.from({ length: 28 }, (_, i) => ({
  a: (i / 28) * Math.PI * 2 + (R() - 0.5) * 0.3, d: 380 + R() * 420, rot: (R() - 0.5) * 900, s: 0.09 + R() * 0.1,
  fill: ["#6AA344", "#3E7A38", "#8DBE5A", "#557F2F"][i % 4],
}));

/** Organic, slightly wobbling liquid edge instead of a perfect circle. */
const blobPath = (cx: number, cy: number, radius: number, t: number) => {
  if (radius <= 0) return "";
  const n = 72;
  const pts = Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    const r = radius * (1 + 0.04 * noise2D("flood", Math.cos(a) * 1.6 + t * 0.5, Math.sin(a) * 1.6 + t * 0.3));
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
  });
  const mid = (i: number) => {
    const [x0, y0] = pts[i % n];
    const [x1, y1] = pts[(i + 1) % n];
    return [(x0 + x1) / 2, (y0 + y1) / 2];
  };
  let d = `M${mid(0)[0]} ${mid(0)[1]}`;
  for (let i = 1; i <= n; i++) {
    const [x, y] = pts[i % n];
    const [mx, my] = mid(i);
    d += ` Q${x} ${y} ${mx} ${my}`;
  }
  return d + " Z";
};

/** Integral of the bubbles' speed: they accelerate while boiling and freeze at 4.8 s. */
const bubbleClock = (t: number) => {
  let c = 0;
  const end = Math.min(t, 4.8);
  for (let x = 2.4; x < end; x += 1 / 120) c += (0.25 + 1.6 * prog(x, 2.4, 4.3) ** 1.6) / 120;
  return c;
};

/** Behind the leaf: the boiling flood and its bubbles. */
export const TemperatureBack: React.FC = () => {
  const t = useGlobalTime(TEMPERATURE_SCENE.start);
  const sh = shake(t);
  const radius = t < 4.9 ? 2300 * prog(t, 2.3, 2.9, ease.in2) : 2300 * (1 - prog(t, 5.0, 6.5, ease.inOut3));
  const [fx, fy] = t < 4.9 ? [540, 1010] : [CX, CY];
  const clock = bubbleClock(t);
  const active = prog(t, 2.5, 4.4, ease.in2) * BUBBLES.length;
  const fade = prog(t, 4.9, 5.7, ease.in2);

  return (
    <AbsoluteFill style={{ translate: sh.translate, rotate: sh.rotate }}>
      {/* overflow visible: the flood must extend past the frame while the camera shakes */}
      <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        <defs>
          <radialGradient id="boil-grad" cx="0.5" cy="0.55" r="0.6">
            <stop offset="0" stopColor="#D2704A" />
            <stop offset="1" stopColor="#A94529" />
          </radialGradient>
        </defs>
        <path d={blobPath(fx, fy, radius, t)} fill="url(#boil-grad)" />
        {t > 2.4 && t < 5.8
          ? BUBBLES.map((b, i) => {
              if (i >= active) return null;
              const y = 2050 - ((clock * b.v * 900 + b.off) % 2300) + fade * 120;
              const x = b.x + Math.sin(clock * 5 + b.ph) * 14;
              const r = b.r * (1 - fade * 0.6);
              const o = (1 - fade) * clamp01((active - i) / 4);
              return (
                <g key={i} opacity={o}>
                  <circle cx={x} cy={y} r={r} fill={b.filled ? "rgba(242,237,227,.22)" : "none"} stroke={COLORS.cream} strokeWidth={3 + (i % 3)} />
                  <path d={`M${x - r * 0.55} ${y - r * 0.1} A${r * 0.6} ${r * 0.6} 0 0 1 ${x - r * 0.1} ${y - r * 0.55}`} fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" opacity={0.7} />
                </g>
              );
            })
          : null}
      </svg>
    </AbsoluteFill>
  );
};

/** In front: the counter, the X, the dial ring, confetti and the lines of text. */
export const TemperatureFront: React.FC = () => {
  const t = useGlobalTime(TEMPERATURE_SCENE.start);
  const { fps } = useVideoConfig();
  const sh = shake(t);

  // counter: 40 -> 100 while boiling, then rolls back down to 77
  const value = track(t, [[2.6, 40], [4.2, 100, ease.in2], [4.95, 100], [6.65, 77, ease.inOut2]]);
  const odoColor = mixColor(COLORS.cream, COLORS.green, prog(t, 5.55, 6.35, ease.inOut2));
  const windUp = prog(t, 6.6, 7.2, ease.in2);
  const punchFrame = Math.round((t - 7.2) * fps);
  const punch = punchFrame < 0 ? 0 : spring({ frame: punchFrame, fps, config: { damping: 7, stiffness: 220, mass: 0.6 } });
  const toDial = prog(t, 8.85, 9.55, ease.inOut3);
  const odoScale = (t < 7.2 ? 1 - 0.06 * windUp : 0.94 + 0.06 * punch) * lerp(1, 0.1, toDial);
  const odoOpacity = prog(t, 2.6, 2.9) * (1 - prog(t, 9.35, 9.55));

  // ring: draws to 77 %, completes, then shrinks into the kettle's dial (with the counter)
  const draw = t < 8.6 ? 0.77 * prog(t, 5.2, 6.6, ease.inOut2) : lerp(0.77, 1, prog(t, 8.6, 8.9, ease.inOut2));
  const ringDash = evolvePath(draw, RING_D);
  const ringScale = lerp(1, 0.19, toDial);
  const ringOn = t > 5.2 && t < 9.6;

  const confettiK = prog(t, 7.2, 8.5, ease.out2);

  return (
    <AbsoluteFill style={{ translate: sh.translate, rotate: sh.rotate }}>
      <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{ position: "absolute", inset: 0 }}>
        {Array.from({ length: 60 }, (_, i) => {
          const a = (i / 60) * Math.PI * 2 - Math.PI / 2;
          const long = i % 5 === 0;
          const r1 = 345;
          const r2 = long ? 372 : 360;
          const o = clamp01(prog(t, 5.3, 6.3) * 60 - i) * (1 - prog(t, 8.6, 9.0, ease.in2));
          return (
            <line key={i} x1={CX + Math.cos(a) * r1} y1={CY + Math.sin(a) * r1} x2={CX + Math.cos(a) * r2} y2={CY + Math.sin(a) * r2}
              stroke={long ? COLORS.ink : "#B9B09F"} strokeWidth={long ? 5 : 3} strokeLinecap="round" opacity={o} />
          );
        })}
        {ringOn ? (
          <g transform={`translate(${lerp(CX, DIAL_SCREEN.cx, toDial)} ${lerp(CY, DIAL_SCREEN.cy, toDial)}) scale(${ringScale}) translate(${-CX} ${-CY})`} opacity={1 - prog(t, 9.4, 9.6)}>
            <path d={RING_D} fill="none" stroke={mixColor(COLORS.green, COLORS.ink, toDial)} strokeWidth={14 / lerp(1, 0.4, toDial)} strokeLinecap="round" {...ringDash} />
          </g>
        ) : null}
        {confettiK > 0 && confettiK < 1
          ? CONFETTI.map((c, i) => {
              const d = c.d * ease.out3(confettiK);
              return (
                <path key={i} d={LEAF_D} fill={c.fill} opacity={1 - confettiK ** 3}
                  transform={`translate(${CX + Math.cos(c.a) * d} ${CY + Math.sin(c.a) * d + confettiK ** 2 * 160}) rotate(${c.rot * confettiK}) scale(${c.s * (1 - confettiK * 0.3)})`} />
              );
            })
          : null}
      </svg>

      <div
        style={{
          position: "absolute", left: 0, right: 0, top: CY - 200, height: 400,
          display: "flex", justifyContent: "center", alignItems: "center",
          opacity: odoOpacity,
          translate: `${(DIAL_SCREEN.cx - CX) * toDial}px ${(DIAL_SCREEN.cy - CY) * toDial}px`,
          scale: String(odoScale),
        }}
      >
        {/* the X is drawn at 100° and erased again as everything freezes */}
        <CrossedOff
          progress={prog(t, 4.2, 4.5, ease.out2) * (1 - prog(t, 4.95, 5.25, ease.in2))}
          color={COLORS.ink}
          strokeWidth={16}
          iterations={1}
          roughness={1.6}
          style={{ display: "inline-block" }}
        >
          <Odometer value={value} color={odoColor} fontSize={330} />
        </CrossedOff>
      </div>

      <InkReveal name="Riddle line 2" t={t} start={2.95} duration={1.0} outAt={4.85} top={1300} style={{ color: COLORS.cream }}>
        ولا في الماء المغلي…
      </InkReveal>

      <WordSlam name="Answer line 1" text="بل في الدرجة" t={t} start={7.3} stagger={0.12} outAt={8.75} top={1290} />
      <WordSlam name="Answer line 2" text="المثالية" t={t} start={7.66} outAt={8.75} top={1415} fontSize={140} color={COLORS.green}>
        {(line) => (
          <Underline progress={prog(t, 7.95, 8.35, ease.out2)} color={COLORS.leaf} strokeWidth={8} iterations={2} rtl padding={{ top: -18 }} style={{ display: "inline-block" }}>
            {line}
          </Underline>
        )}
      </WordSlam>
    </AbsoluteFill>
  );
};
