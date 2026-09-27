import React from "react";
import { AbsoluteFill, spring, useVideoConfig } from "remotion";
import { WordSlam } from "../components/Text";
import { clamp01, ease, lerp, prog, track, useGlobalTime } from "../lib/time";
import { FONTS } from "../theme";
import { AT, C3, Field, GOURD, LedGlowFilter, Pill, Product, Rise, SevenSeg, Slam } from "./kit";

// 0 - 9.6 s. The music starts on a downbeat, so the first cuts land on beats 1, 2 and 3.

/** 0 - 2.4 s: "ليست / مجرّد / غلاية" — three close-ups on three beats, then the word is struck out. */
export const Hook: React.FC = () => {
  const t = useGlobalTime(0);
  const exit = prog(t, 2.2, 2.4, ease.in2);
  const shift = 380 * exit;

  if (t < 0.6) {
    const k = prog(t, 0, 0.22, ease.out3);
    return (
      <AbsoluteFill>
        <Field color={C3.leaf} />
        <Product x={430 - 520 * (1 - k) + 30 * prog(t, 0.2, 0.6)} y={760} scale={1.35} anchor={AT.spout} whip={60 * (1 - k)} />
        <Slam t={t} at={0.04} top={1370} size={270} color={C3.cream}>ليست</Slam>
      </AbsoluteFill>
    );
  }
  if (t < 1.2) {
    const k = prog(t, 0.6, 0.82, ease.out3);
    return (
      <AbsoluteFill>
        <Field color={C3.cream} />
        <Product x={380 + 520 * (1 - k) - 30 * prog(t, 0.8, 1.2)} y={640} scale={1.5} anchor={AT.knob} whip={60 * (1 - k)} />
        <Slam t={t} at={0.64} top={140} size={270} color={C3.ink}>مجرّد</Slam>
      </AbsoluteFill>
    );
  }
  const k = prog(t, 1.2, 1.42, ease.out3);
  const strike = prog(t, 1.8, 1.98, ease.out3);
  return (
    <AbsoluteFill>
      <Field color={C3.sun} />
      <AbsoluteFill style={{ translate: `${shift}px 0px` }}>
        <Product x={610 - 520 * (1 - k) + 24 * prog(t, 1.4, 2.2)} y={860} scale={1.45} anchor={AT.dial} whip={60 * (1 - k) + 70 * exit} />
        <Slam t={t} at={1.24} top={1470} size={270} color={C3.ink}>غلاية</Slam>
        {strike > 0 ? (
          <div style={{ position: "absolute", top: 1645, left: 540 + 310 - 620 * strike, width: 620 * strike, height: 32, background: C3.deep, borderRadius: 16, rotate: "-4deg" }} />
        ) : null}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/** 2.4 - 4.8 s: the kettle slams in on a green disc — "إبريق متة ذكي". */
export const Reveal: React.FC = () => {
  const t = useGlobalTime(2.4);
  const { fps } = useVideoConfig();
  const f = Math.round((t - 2.4) * fps);
  const disc = spring({ frame: f, fps, config: { damping: 13, stiffness: 120, mass: 0.9 } });
  const land = spring({ frame: f - 2, fps, config: { damping: 11, stiffness: 150, mass: 0.8 } });
  const push = 1 + 0.035 * (t - 2.4);

  return (
    <AbsoluteFill>
      <Field color={C3.cream} />
      <AbsoluteFill style={{ scale: String(push) }}>
        <div
          style={{
            position: "absolute", top: 520, left: -300, right: -300, textAlign: "center", fontFamily: FONTS.sans, fontWeight: 800,
            fontSize: 340, letterSpacing: 12, color: "transparent", WebkitTextStroke: `3px ${C3.forest}`, opacity: 0.3 * disc, translate: `${-40 * (t - 2.4)}px 0px`,
          }}
        >
          MATET
        </div>
        <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
          <circle cx={468} cy={993} r={430 * disc} fill={C3.leaf} />
        </svg>
        <Product x={560} y={1330 + 70 * (1 - land)} scale={0.44 * lerp(1.22, 1, land)} anchor={AT.base} opacity={clamp01(land * 3)} shine={prog(t, 3.7, 4.45)} />
      </AbsoluteFill>
      <WordSlam name="Headline" text="إبريق متة ذكي" t={t} start={3.0} stagger={0.3} top={190} fontSize={128} color={C3.ink} wordColors={{ 2: C3.forest }} />
      <Rise t={t} at={4.05} top={392} size={58} color={C3.forest} weight={600}>متة مثالية في كل مرة</Rise>
    </AbsoluteFill>
  );
};

const CX = 540;
const CY = 990;
const GAUGE_R = 340;
const polar = (r: number, deg: number) => [CX + r * Math.cos((deg * Math.PI) / 180), CY + r * Math.sin((deg * Math.PI) / 180)];
const arc = (r: number, a0: number, a1: number) => {
  const [x0, y0] = polar(r, a0);
  const [x1, y1] = polar(r, a1);
  return `M${x0} ${y0} A${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1} ${y1}`;
};
const toAngle = (v: number) => 135 + (270 * (v - 20)) / 80;

/** 4.8 - 7.2 s: the dial, huge — the LED counts 28 → 77 while the gauge fills. */
export const DialShot: React.FC = () => {
  const t = useGlobalTime(4.8);
  const { fps } = useVideoConfig();
  const value = track(t, [[4.8, 28], [5.15, 28], [6.3, 77, ease.inOut2]]);
  const k = spring({ frame: Math.round((t - 4.8) * fps), fps, config: { damping: 14, stiffness: 140 } });
  const zoom = 1 + 0.22 * prog(t, 6.95, 7.2, ease.in3);
  const turning = prog(t, 4.95, 5.2, ease.out2) * (1 - prog(t, 6.3, 6.6, ease.in2));
  const wiggle = Math.sin((t - 4.95) * 9) * 6 * turning;
  const a = toAngle(value);

  return (
    <AbsoluteFill>
      <Field color="#0E0F0E" glow="#1E3A1A" glowAt={[CX, CY]} glowR={760} />
      <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{ position: "absolute", inset: 0, scale: String(zoom * lerp(0.8, 1, k)), opacity: clamp01(k * 2) }}>
        <defs>
          <LedGlowFilter />
          <radialGradient id="dial-face" cx="0.42" cy="0.35" r="0.75">
            <stop offset="0" stopColor="#1a1a1a" />
            <stop offset="1" stopColor="#070707" />
          </radialGradient>
          <linearGradient id="dial-bezel" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#8a8a8a" />
            <stop offset="0.35" stopColor="#2a2a2a" />
            <stop offset="0.7" stopColor="#141414" />
            <stop offset="1" stopColor="#4a4a4a" />
          </linearGradient>
          <radialGradient id="dial-gloss" cx="0.3" cy="0.2" r="0.6">
            <stop offset="0" stopColor="rgba(255,255,255,0.10)" />
            <stop offset="1" stopColor="rgba(255,255,255,0)" />
          </radialGradient>
        </defs>
        {Array.from({ length: 17 }, (_, i) => {
          const v = 20 + i * 5;
          const [x0, y0] = polar(GAUGE_R + 32, toAngle(v));
          const [x1, y1] = polar(GAUGE_R + (i % 2 === 0 ? 62 : 50), toAngle(v));
          return <line key={i} x1={x0} y1={y0} x2={x1} y2={y1} stroke={v <= value + 0.5 ? C3.lime : "#3a3a3a"} strokeWidth={i % 2 === 0 ? 6 : 4} strokeLinecap="round" />;
        })}
        <path d={arc(GAUGE_R, 135, 405)} fill="none" stroke="#262726" strokeWidth={20} strokeLinecap="round" />
        <path d={arc(GAUGE_R, 135, Math.max(135.5, a))} fill="none" stroke={C3.lime} strokeWidth={20} strokeLinecap="round" />
        <circle cx={polar(GAUGE_R, a)[0]} cy={polar(GAUGE_R, a)[1]} r={19} fill="#fff" />
        {/* the knob */}
        <circle cx={CX} cy={CY} r={262} fill="#050505" />
        <circle cx={CX} cy={CY} r={250} fill="url(#dial-face)" stroke="url(#dial-bezel)" strokeWidth={16} />
        <circle cx={CX} cy={CY} r={222} fill="#050505" />
        <SevenSeg value={value} cx={CX} cy={CY + 4} height={176} />
        <circle cx={CX} cy={CY} r={222} fill="url(#dial-gloss)" />
        {/* the "turn" arrows from the brochure */}
        <g opacity={turning} transform={`rotate(${wiggle} ${CX} ${CY})`} stroke={C3.lime} strokeWidth={12} fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d={arc(296, 150, 210)} />
          <path d={`M${polar(296, 150)[0] - 18} ${polar(296, 150)[1] - 26} L${polar(296, 150)[0]} ${polar(296, 150)[1]} L${polar(296, 150)[0] + 28} ${polar(296, 150)[1] - 12}`} />
          <path d={`M${polar(296, 210)[0] - 18} ${polar(296, 210)[1] + 26} L${polar(296, 210)[0]} ${polar(296, 210)[1]} L${polar(296, 210)[0] + 28} ${polar(296, 210)[1] + 12}`} />
        </g>
      </svg>
      <Slam t={t} at={4.9} top={200} size={118} color={C3.cream}>اختر الحرارة</Slam>
      <Rise t={t} at={6.2} top={1440} size={100} color={C3.lime} weight={800}>ويحافظ عليها</Rise>
      <Rise t={t} at={6.38} top={1575} size={100} color={C3.cream} weight={800}>طوال الوقت</Rise>
    </AbsoluteFill>
  );
};

const WISPS = [
  { x: 770, d: 0, w: 1 },
  { x: 815, d: 0.45, w: -1 },
  { x: 735, d: 0.9, w: 1 },
];

/** 7.2 - 9.6 s (the song's big entrance): the brochure's tip — first pour 62°, then 74–77°. */
export const Tip: React.FC = () => {
  const t = useGlobalTime(7.2);
  const { fps } = useVideoConfig();
  const g = spring({ frame: Math.round((t - 7.2) * fps), fps, config: { damping: 12, stiffness: 110, mass: 0.9 } });

  return (
    <AbsoluteFill>
      <Field color="#7AA535" />
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        {WISPS.map((w, i) => {
          const p = ((t - 7.3 + w.d) % 1.4) / 1.4;
          if (t < 7.3) return null;
          const y = 900 - p * 360;
          return (
            <path key={i} d={`M${w.x} ${y + 120} C${w.x + 30 * w.w} ${y + 80} ${w.x - 30 * w.w} ${y + 40} ${w.x} ${y}`} fill="none" stroke={C3.cream} strokeWidth={10} strokeLinecap="round" opacity={0.5 * Math.sin(p * Math.PI) * g} />
          );
        })}
      </svg>
      <Product photo={GOURD} x={800} y={1830 + 520 * (1 - g)} scale={1.1} anchor={[222, 830]} rotate={lerp(-9, -3, g)} />
      <div style={{ position: "absolute", top: 160, left: 0, right: 0, textAlign: "center", opacity: prog(t, 7.25, 7.45) }}>
        <Pill bg={C3.deep} color={C3.cream} size={44}>لأفضل تجربة متة</Pill>
      </div>
      <Slam t={t} at={7.3} out={8.32} top={300} size={86} color={C3.deep}>الصبّة الأولى</Slam>
      <Slam t={t} at={7.42} out={8.32} top={390} size={420} color={C3.cream}>62°</Slam>
      <Slam t={t} at={8.42} top={300} size={86} color={C3.deep}>ثم الصبّات التالية</Slam>
      <Slam t={t} at={8.54} top={450} size={250} color={C3.cream}>
        <span dir="ltr">74°–77°</span>
      </Slam>
    </AbsoluteFill>
  );
};

