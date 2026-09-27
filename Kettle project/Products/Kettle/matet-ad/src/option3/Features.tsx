import React from "react";
import { AbsoluteFill, spring, useVideoConfig } from "remotion";
import { WordSlam } from "../components/Text";
import { clamp01, ease, lerp, prog, useGlobalTime } from "../lib/time";
import { AT, C3, Field, Pill, Product, Rise, Slam, Sun } from "./kit";

/** 9.6 - 12.0 s: "500 واط فقط" on a sun-yellow field — it runs on solar power. */
export const Solar: React.FC = () => {
  const t = useGlobalTime(9.6);
  const { fps } = useVideoConfig();
  const sun = spring({ frame: Math.round((t - 9.62) * fps), fps, config: { damping: 12, stiffness: 120 } });
  const rise = spring({ frame: Math.max(0, Math.round((t - 10.95) * fps)), fps, config: { damping: 13, stiffness: 120 } }) * (t >= 10.95 ? 1 : 0);

  return (
    <AbsoluteFill>
      <Field color={C3.sun} />
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <Sun cx={800} cy={420} r={112} k={sun} spin={22 * (t - 9.6)} color="#FFF6DE" />
      </svg>
      <Slam t={t} at={9.72} top={500} size={420} color={C3.ink}>500</Slam>
      <Slam t={t} at={10.02} top={1030} size={130} color={C3.ink}>واط فقط</Slam>
      <Rise t={t} at={10.62} top={1250} size={60} color={C3.cream} dur={0.5}>
        <Pill bg={C3.ink} color={C3.cream} size={58}>تعمل على الطاقة الشمسية</Pill>
      </Rise>
      {rise > 0 ? <Product x={560} y={1800 + 360 * (1 - rise)} scale={0.28} anchor={AT.base} /> : null}
    </AbsoluteFill>
  );
};

type Callout = { at: number; anchor: readonly [number, number]; pill: [number, number]; label: React.ReactNode };

const SCALE = 0.47;
const BASE_X = 560;
const BASE_Y = 1370;
const onScreen = ([ix, iy]: readonly [number, number], dx = 0) => [BASE_X + dx + (ix - AT.base[0]) * SCALE, BASE_Y + (iy - AT.base[1]) * SCALE];

const CALLOUTS: Callout[] = [
  { at: 12.5, anchor: AT.spout, pill: [255, 610], label: "عنق دقيق للصبّ" },
  { at: 12.8, anchor: AT.handle, pill: [850, 610], label: "مقبض مريح" },
  { at: 13.1, anchor: AT.dial, pill: [805, 1640], label: <>شاشة <span dir="ltr">LED</span> دائرية</> },
  { at: 13.4, anchor: [800, 700], pill: [285, 1640], label: <>ستانلس ستيل <span dir="ltr">304</span></> },
];

/** 12.0 - 14.4 s: "تصميم أنيق وعملي" — callouts pinned to the photo on the half-beats. */
export const Design: React.FC = () => {
  const t = useGlobalTime(12.0);
  const { fps } = useVideoConfig();
  const k = prog(t, 12.0, 12.3, ease.out3);
  const dx = -760 * (1 - k) + 16 * prog(t, 12.3, 14.4);

  return (
    <AbsoluteFill>
      <Field color={C3.cream} />
      <Product x={BASE_X + dx} y={BASE_Y} scale={SCALE} anchor={AT.base} whip={55 * (1 - k)} shine={prog(t, 13.55, 14.25)} />
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        {CALLOUTS.map((c, i) => {
          const pop = t < c.at ? 0 : spring({ frame: Math.round((t - c.at) * fps), fps, config: { damping: 13, stiffness: 180 } });
          if (pop <= 0.001) return null;
          const [ax, ay] = onScreen(c.anchor, dx);
          const reach = Math.min(1, pop);
          return (
            <g key={i}>
              <line x1={c.pill[0]} y1={c.pill[1]} x2={lerp(c.pill[0], ax, reach)} y2={lerp(c.pill[1], ay, reach)} stroke={C3.ink} strokeWidth={3} />
              <circle cx={ax} cy={ay} r={11 * clamp01(reach * 2 - 1)} fill={C3.lime} stroke={C3.ink} strokeWidth={3} />
            </g>
          );
        })}
      </svg>
      {CALLOUTS.map((c, i) => {
        const pop = t < c.at ? 0 : spring({ frame: Math.round((t - c.at) * fps), fps, config: { damping: 13, stiffness: 180 } });
        if (pop <= 0.001) return null;
        return (
          <div key={i} style={{ position: "absolute", left: c.pill[0], top: c.pill[1], translate: "-50% -50%", scale: String(pop) }}>
            <Pill bg={C3.ink} color={C3.cream} size={42}>{c.label}</Pill>
          </div>
        );
      })}
      <WordSlam name="Design title" text="تصميم أنيق وعملي" t={t} start={12.05} stagger={0.15} top={175} fontSize={90} color={C3.ink} wordColors={{ 1: C3.forest }} />
    </AbsoluteFill>
  );
};
