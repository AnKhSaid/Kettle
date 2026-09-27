import { evolvePath } from "@remotion/paths";
import React from "react";
import { AbsoluteFill, Interactive, spring, useVideoConfig } from "remotion";
import { Halo } from "../components/Art";
import { FadeUp, WordSlam } from "../components/Text";
import { LINE_ART_TRANSFORM, LINE_PARTS } from "../kettle/lineArt";
import { kettlePose, project, type Part } from "../kettle/pose";
import { PROFILE } from "../kettle/profile";
import { ease, lerp, prog, useGlobalTime } from "../lib/time";
import { COLORS, FONTS } from "../theme";

export const REVEAL_SCENE = { start: 9.4, end: 14.6 };

export const RevealBack: React.FC = () => {
  const t = useGlobalTime(REVEAL_SCENE.start);
  const k = prog(t, 10.9, 11.9, ease.out3) * (1 - prog(t, 14.2, 14.6, ease.in2));
  return <Halo k={k} cy={1000} />;
};

type Callout = { name: string; at: number; part: Part; local: [number, number, number]; pos: [number, number]; label: React.ReactNode };

const D = PROFILE.dial;
const CALLOUTS: Callout[] = [
  { name: "Spout callout", at: 12.0, part: "pot", local: [-300, 330, 0], pos: [235, 640], label: <>عنق رفيع <small>لصبّ دقيق</small></> },
  { name: "Capacity callout", at: 12.3, part: "pot", local: [60, 452, 40], pos: [850, 610], label: <>سعة <span dir="ltr">0.6</span> لتر</> },
  { name: "LED callout", at: 12.6, part: "base", local: [D.x, D.h, D.z], pos: [850, 1500], label: <>شاشة LED <small>دائرية</small></> },
  { name: "Steel callout", at: 12.9, part: "pot", local: [100, 150, 140], pos: [240, 1500], label: <>ستانلس ستيل <span dir="ltr">304</span></> },
];

/** Sketch → 3D reveal, the product name, and four spec callouts pinned to the model. */
export const RevealFront: React.FC = () => {
  const t = useGlobalTime(REVEAL_SCENE.start);
  const { fps } = useVideoConfig();
  const reveal = kettlePose(t).reveal;
  const linesOpacity = 1 - prog(t, 11.15, 11.5);
  const scanY = (lerp(69, 36, reveal) / 100) * 1920;

  return (
    <AbsoluteFill>
      <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{ position: "absolute", inset: 0 }}>
        <defs>
          <filter id="scan-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation={8} result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {linesOpacity > 0 ? (
          <g transform={LINE_ART_TRANSFORM} opacity={linesOpacity}>
            {LINE_PARTS.map((part, i) => {
              const k = part.id === "dial" ? 1 : prog(t, 9.5 + i * 0.12, 9.5 + i * 0.12 + 0.55, ease.inOut2);
              if (k <= 0) return null;
              return (
                <path key={part.id} d={part.d} fill="none" stroke={COLORS.ink} strokeWidth={part.strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...evolvePath(k, part.d)} />
              );
            })}
          </g>
        ) : null}
        {reveal > 0 && reveal < 1 ? <line x1={0} x2={1080} y1={scanY} y2={scanY} stroke={COLORS.leaf} strokeWidth={6} filter="url(#scan-glow)" /> : null}

        {CALLOUTS.map((c, i) => {
          const pop = spring({ frame: Math.max(0, Math.round((t - c.at) * fps)), fps, config: { damping: 12, stiffness: 170 } }) * (t >= c.at ? 1 : 0);
          const k = pop * (1 - prog(t, 14.05 + i * 0.04, 14.3 + i * 0.04, ease.in2));
          if (k <= 0.001) return null;
          const a = project(t, c.part, c.local);
          const reach = Math.min(1, k);
          return (
            <g key={c.name}>
              <line x1={c.pos[0]} y1={c.pos[1]} x2={lerp(c.pos[0], a.x, reach)} y2={lerp(c.pos[1], a.y, reach)} stroke={COLORS.ink} strokeWidth={3} />
              <circle cx={a.x} cy={a.y} r={9 * Math.max(0, reach * 2 - 1)} fill={COLORS.ink} />
            </g>
          );
        })}
      </svg>

      <WordSlam name="Product name" text="إبريق متة ذكي" t={t} start={11.2} outAt={14.2} top={250} />
      <FadeUp name="Product promise" t={t} start={11.6} outAt={14.2}
        style={{ left: 80, right: 80, top: 398, textAlign: "center", direction: "rtl", fontFamily: FONTS.sans, fontSize: 44, color: COLORS.muted, whiteSpace: "nowrap" }}>
        يثبّت الحرارة التي تختارها… طوال الوقت
      </FadeUp>

      {CALLOUTS.map((c, i) => {
        const pop = t >= c.at ? spring({ frame: Math.round((t - c.at) * fps), fps, config: { damping: 12, stiffness: 170 } }) : 0;
        const k = pop * (1 - prog(t, 14.05 + i * 0.04, 14.3 + i * 0.04, ease.in2));
        if (k <= 0.001) return null;
        return (
          <Interactive.Div
            key={c.name}
            name={c.name}
            style={{
              position: "absolute", left: c.pos[0], top: c.pos[1], translate: "-50% -50%", scale: String(Math.max(0, k)),
              padding: "10px 32px 18px", borderRadius: 999, background: COLORS.cream, border: `3px solid ${COLORS.ink}`,
              fontFamily: FONTS.sans, fontWeight: 600, fontSize: 40, color: COLORS.ink, whiteSpace: "nowrap", direction: "rtl",
            }}
          >
            {c.label}
          </Interactive.Div>
        );
      })}
    </AbsoluteFill>
  );
};
