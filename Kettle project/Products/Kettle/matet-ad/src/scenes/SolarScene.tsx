import { evolvePath, getLength, getPointAtLength } from "@remotion/paths";
import { Circle } from "@remotion/rough-notation";
import React from "react";
import { AbsoluteFill } from "remotion";
import { FadeUp, WordSlam } from "../components/Text";
import { project } from "../kettle/pose";
import { PROFILE } from "../kettle/profile";
import { clamp01, ease, lerp, prog, useGlobalTime } from "../lib/time";
import { COLORS, FONTS } from "../theme";

export const SOLAR_SCENE = { start: 19.0, end: 21.8 };

const sunAmount = (t: number) => prog(t, 19.2, 20.1, ease.out3) * (1 - prog(t, 21.35, 21.7, ease.in2));

/** Behind the kettle: a sun rising with slowly turning rays. */
export const SolarBack: React.FC = () => {
  const t = useGlobalTime(SOLAR_SCENE.start);
  const k = sunAmount(t);
  if (k <= 0) return null;
  return (
    <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{ position: "absolute", inset: 0 }}>
      <defs>
        <radialGradient id="sun-grad" cx="0.45" cy="0.4" r="0.6">
          <stop offset="0" stopColor="#F7CF6A" />
          <stop offset="1" stopColor="#E88B3C" />
        </radialGradient>
      </defs>
      <g transform={`translate(810 ${lerp(1250, 800, k)}) scale(${lerp(0.6, 1, k)})`} opacity={clamp01(k * 1.5)}>
        <g transform={`rotate(${t * 22})`} stroke="#E9A042" strokeWidth={10} strokeLinecap="round">
          {Array.from({ length: 16 }, (_, i) => {
            const a = (i / 16) * Math.PI * 2;
            const r2 = i % 2 ? 245 : 275;
            return <line key={i} x1={Math.cos(a) * 205} y1={Math.sin(a) * 205} x2={Math.cos(a) * r2} y2={Math.sin(a) * r2} />;
          })}
        </g>
        <circle r={170} fill="url(#sun-grad)" />
      </g>
    </svg>
  );
};

const PANEL = [
  "M-150 40 L130 40 L90 -80 L-190 -80 Z",
  "M-170 -20 L110 -20",
  "M-103 40 L-133 -80 M-57 40 L-77 -80 M-10 40 L-20 -80 M36 40 L37 -80 M83 40 L93 -80",
  "M-20 40 L-10 110 M-60 110 H40",
];

/** In front: "only 500 W", the solar panel and energy flowing into the base. */
export const SolarFront: React.FC = () => {
  const t = useGlobalTime(SOLAR_SCENE.start);
  const out = prog(t, 21.35, 21.65, ease.in2);
  const panelK = prog(t, 19.6, 20.2, ease.inOut2);
  const wireK = prog(t, 19.9, 20.4, ease.out2) * (1 - out);
  const b = project(t, "base", [PROFILE.base.x0 + 30, -30, 60]);
  const wireD = `M330 1560 C 400 1560 ${b.x - 160} ${b.y + 40} ${b.x} ${b.y}`;
  const wireLen = getLength(wireD);
  const spark = prog(t, 20.2, 21.5) * 1.4;

  return (
    <AbsoluteFill>
      <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{ position: "absolute", inset: 0 }}>
        <defs>
          <filter id="spark-glow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation={6} result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {panelK > 0 ? (
          <g transform="translate(200 1560)" opacity={1 - out}>
            <path d={PANEL[0]} fill="#2D4A63" opacity={panelK} />
            {PANEL.map((d, i) => (
              <path key={i} d={d} fill="none" stroke={i === 1 || i === 2 ? "#CFE3F0" : COLORS.ink} strokeWidth={i === 1 || i === 2 ? 3 : 5}
                strokeLinecap="round" strokeLinejoin="round" {...evolvePath(panelK, d)} />
            ))}
          </g>
        ) : null}
        {wireK > 0 ? (
          <g>
            <path d={wireD} fill="none" stroke={COLORS.ink} strokeWidth={4} strokeDasharray="2 12" strokeLinecap="round" opacity={wireK} />
            {Array.from({ length: 5 }, (_, i) => {
              const u = spark * 1.2 - i * 0.22;
              if (u <= 0 || u >= 1) return null;
              const pt = getPointAtLength(wireD, clamp01(u) * wireLen);
              if (!pt) return null;
              return <circle key={i} cx={pt.x} cy={pt.y} r={9} fill={COLORS.sun} filter="url(#spark-glow)" opacity={wireK} />;
            })}
          </g>
        ) : null}
      </svg>

      <WordSlam
        name="Solar headline"
        text="500 واط فقط"
        t={t}
        start={19.35}
        outAt={21.35}
        top={210}
        fontSize={136}
        wrapWord={{
          0: (w) => (
            <Circle progress={prog(t, 19.95, 20.45, ease.out2)} color={COLORS.clay} strokeWidth={6} iterations={2} padding={{ left: 14, right: 14, top: 4, bottom: 4 }} style={{ display: "inline-block" }}>
              {w}
            </Circle>
          ),
        }}
      />
      <FadeUp name="Solar support" t={t} start={19.75} outAt={21.35}
        style={{ left: 80, right: 80, top: 425, textAlign: "center", direction: "rtl", fontFamily: FONTS.sans, fontSize: 46, color: COLORS.ink, whiteSpace: "nowrap" }}>
        متوافقة مع منظومات الطاقة الشمسية
      </FadeUp>
    </AbsoluteFill>
  );
};
