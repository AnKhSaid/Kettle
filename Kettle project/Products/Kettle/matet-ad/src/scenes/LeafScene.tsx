import React from "react";
import { AbsoluteFill } from "remotion";
import { Leaf } from "../components/Art";
import { InkReveal } from "../components/Text";
import { shake } from "../lib/shake";
import { clamp01, ease, lerp, mixColor, prog, seeded, useGlobalTime } from "../lib/time";
import { COLORS } from "../theme";

export const LEAF_SCENE = { start: 0, end: 4.6 };

const R = seeded(7);
const MOTES = Array.from({ length: 28 }, () => ({
  x: 60 + R() * 960, y: 300 + R() * 1400, v: 18 + R() * 40, ph: R() * 6.28, a: R() * 180, rx: 2 + R() * 5, ry: 1.2 + R() * 2.5,
}));
const SPLASH = Array.from({ length: 10 }, () => ({ r: 4 + R() * 5, vx: (R() - 0.5) * 520, vy: -380 - R() * 420 }));

/**
 * 0.0 - 2.4 s: leaf motes drift, a mate leaf falls onto water (its shadow growing) and the
 * riddle appears: "The secret isn't in the leaves…". In the boil the leaf burns and flies off.
 */
export const LeafScene: React.FC = () => {
  const t = useGlobalTime(LEAF_SCENE.start);

  // slow push-in on the opening shot, released while the screen floods
  const push = 1 + 0.035 * ease.inOut3(prog(t, 0, 2.4)) * (1 - ease.inOut3(prog(t, 2.4, 2.9)));
  const sh = shake(t);

  // the falling leaf
  const p = prog(t, 0, 1.5);
  const up = prog(t, 2.6, 4.3, ease.in2);
  let x = 560 + Math.sin(p * Math.PI * 2.5) * 150 * (1 - p * 0.75);
  let y = lerp(-240, 1000, p);
  let rot = 25 + Math.sin(p * Math.PI * 2.5 + 1) * 40 * (1 - p);
  if (t > 1.5) y += Math.sin((t - 1.5) * 7) * 8 * Math.exp(-(t - 1.5) * 1.5);
  x += Math.sin(t * 13) * 40 * up;
  y -= up * 1300;
  rot += up * up * 900 + Math.sin(t * 19) * 20 * up;
  const burnt = mixColor(COLORS.leaf, "#6b3f1f", prog(t, 2.6, 4.0));

  const moteK = clamp01(t / 0.6) * (1 - prog(t, 2.25, 2.6));
  const shadowK = t < 2.4 ? clamp01(p * 1.4 - 0.4) : 0;

  return (
    <AbsoluteFill style={{ scale: String(push), translate: sh.translate, rotate: sh.rotate }}>
      <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{ position: "absolute", inset: 0 }}>
        <defs>
          <filter id="leaf-soft" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation={7} />
          </filter>
        </defs>
        {MOTES.map((m, i) => {
          const mx = m.x + Math.sin(t * 0.9 + m.ph) * 24;
          const my = m.y - t * m.v;
          return (
            <ellipse key={i} cx={mx} cy={my} rx={m.rx} ry={m.ry} fill={COLORS.leaf} opacity={moteK * 0.35} transform={`rotate(${m.a + t * 30} ${mx} ${my})`} />
          );
        })}
        <ellipse cx={540} cy={1012} rx={40 + 60 * shadowK} ry={8 + 8 * shadowK} fill="#3a2c18" filter="url(#leaf-soft)" opacity={shadowK * 0.22 * (1 - prog(t, 1.5, 2.3))} />
        {[0, 1, 2].map((k) => {
          const s = prog(t, 1.5 + k * 0.22, 1.5 + k * 0.22 + 1.2);
          const rx = 30 + ease.out3(s) * 430;
          const on = t > 1.5 + k * 0.22 && s < 1 && t < 2.6;
          return <ellipse key={k} cx={540} cy={1010} rx={rx} ry={rx * 0.17} fill="none" stroke={COLORS.ink} strokeWidth={4} opacity={on ? (1 - s) * 0.8 : 0} />;
        })}
        {SPLASH.map((d, i) => {
          const tau = t - 1.5;
          const on = tau > 0 && tau < 0.7;
          return <circle key={i} cx={540 + d.vx * tau} cy={1000 + d.vy * tau + 1400 * tau * tau} r={d.r} fill={COLORS.ink} opacity={on ? 1 - tau / 0.7 : 0} />;
        })}
        {t < 4.6 ? (
          <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${0.55 - up * 0.15})`}>
            <Leaf fill={burnt} />
          </g>
        ) : null}
      </svg>
      <InkReveal name="Riddle line 1" t={t} start={0.35} duration={1.3} outAt={2.25} top={560}>
        السرّ ليس في الأوراق…
      </InkReveal>
    </AbsoluteFill>
  );
};
