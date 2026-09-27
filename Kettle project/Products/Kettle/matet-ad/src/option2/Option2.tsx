import { evolvePath, interpolatePath } from "@remotion/paths";
import React from "react";
import { AbsoluteFill, Img, spring, staticFile, useVideoConfig } from "remotion";
import manifest from "../audio/sfx-manifest.json";
import { Cue, Mix } from "../audio/Soundtrack";
import { PaperBackground, Vignette } from "../components/Art";
import { WhatsApp } from "../components/Icons";
import { FadeUp, InkReveal } from "../components/Text";
import { PROFILE } from "../kettle/profile";
import { clamp01, ease, lerp, mixColor, prog, track, useGlobalTime } from "../lib/time";
import { FONTS } from "../theme";
import { BoilFilter, C2, DROP_D, GourdArt, Ink, KettleArt, LEAF_D, LEAF_DETAIL, steamD, Wash } from "./art";

// Option 2 — calm, illustrated: one ink line that keeps turning into the next thing.
// leaf -> drop -> ripples -> the perfect-temperature dial -> the kettle -> the pour -> the sun
// -> three steps -> the logo -> call to action. The music is the gentle start of "Hopeful";
// the song's own final chord arrives with the call to action at 26.4 s.

const kettleAt = (t: number) => ({
  x: track(t, [[0, 520], [14.4, 520], [15.0, 640, ease.inOut3], [16.4, 640], [17.2, 560, ease.inOut3], [23.9, 560], [24.0, 540]]),
  y: track(t, [[0, 1300], [16.4, 1300], [17.2, 1330, ease.inOut3], [23.9, 1330], [24.0, 1190]]),
  s: track(t, [[0, 1.1], [14.4, 1.1], [15.0, 0.95, ease.inOut3], [23.9, 0.95], [24.0, 0.92]]),
  draw: t < 19.2 ? prog(t, 9.3, 10.9, ease.inOut2) : t < 24 ? 1 - prog(t, 19.2, 19.8, ease.in2) : prog(t, 24.1, 25.1, ease.inOut2),
  fill: t < 19.2 ? prog(t, 10.4, 11.2) : t < 24 ? 1 - prog(t, 19.2, 19.45) : prog(t, 24.8, 25.4),
  lift: track(t, [[14.8, 0], [15.5, 150, ease.inOut2], [16.2, 150], [16.8, 0, ease.inOut2]]),
  tilt: track(t, [[14.8, 0], [15.5, 26, ease.inOut2], [16.2, 26], [16.8, 0, ease.inOut2]]),
});

/** Where the spout tip is on screen (same transforms as <KettleArt />). */
const tipOnScreen = (t: number) => {
  const k = kettleAt(t);
  const [px, py] = PROFILE.pivot;
  const a = (k.tilt * Math.PI) / 180;
  const dx = PROFILE.tip[0] - px;
  const dy = PROFILE.tip[1] - py;
  const x = px + dx * Math.cos(a) - dy * Math.sin(a);
  const y = py + dx * Math.sin(a) + dy * Math.cos(a) + k.lift;
  return { x: k.x + x * k.s, y: k.y - y * k.s };
};

const GOURD = { x: 242, y: 1361, s: 1.35 };
const DIAL = { x: 540, y: 900, r: 260 };

const arcPath = (cx: number, cy: number, r: number) => `M${cx} ${cy - r} A${r} ${r} 0 1 1 ${cx - 0.01} ${cy - r}`;
const roundedSquare = (cx: number, cy: number, w: number, h: number, r: number) =>
  `M${cx} ${cy - h / 2} H${cx + w / 2 - r} Q${cx + w / 2} ${cy - h / 2} ${cx + w / 2} ${cy - h / 2 + r} V${cy + h / 2 - r} Q${cx + w / 2} ${cy + h / 2} ${cx + w / 2 - r} ${cy + h / 2} H${cx - w / 2 + r} Q${cx - w / 2} ${cy + h / 2} ${cx - w / 2} ${cy + h / 2 - r} V${cy - h / 2 + r} Q${cx - w / 2} ${cy - h / 2} ${cx - w / 2 + r} ${cy - h / 2} Z`;

const STEPS = [
  { x: 820, label: "اضغط" },
  { x: 540, label: "أدِر" },
  { x: 260, label: "استمتع" },
];
const STEP_Y = 880;
const stepAt = (i: number) => 19.45 + i * 0.5;

const naskh = (size: number, color: string = C2.ink, weight = 700): React.CSSProperties => ({ fontFamily: FONTS.naskh, fontWeight: weight, fontSize: size, color, lineHeight: 1.6 });

const Drawing: React.FC = () => {
  const t = useGlobalTime(0);
  const { fps } = useVideoConfig();
  const k = kettleAt(t);

  // leaf -> drop -> fall
  const morph = prog(t, 4.8, 5.5, ease.inOut2);
  const fall = prog(t, 5.5, 6.15, ease.in2);
  const leafD = morph > 0 ? interpolatePath(morph, LEAF_D, DROP_D) : LEAF_D;
  const leafRot = lerp(-18 + 4 * Math.sin(t * 1.6), 0, morph);
  const leafS = lerp(1.4, 0.5, morph);
  const leafY = lerp(860 + 10 * Math.sin(t * 1.3), 1235, fall);

  // ripples; the first ring becomes the dial
  const ring = (i: number) => 40 + 420 * prog(t, 6.15 + i * 0.15, 7.3 + i * 0.15, ease.out3);
  const toCircle = prog(t, 7.2, 8.0, ease.inOut3);
  const toDial = prog(t, 9.0, 9.55, ease.inOut3);
  const dialScreen = { x: k.x + PROFILE.dial.x * k.s, y: k.y - (PROFILE.dial.h / 2) * k.s };
  const mainR = lerp(ring(0), DIAL.r, toCircle);
  const ringCx = lerp(DIAL.x, dialScreen.x, toDial);
  const ringCy = lerp(lerp(1240, DIAL.y, toCircle), dialScreen.y, toDial);
  const ringRx = lerp(mainR, PROFILE.dial.r * k.s, toDial);
  const ringRy = lerp(lerp(ring(0) * 0.22, DIAL.r, toCircle), PROFILE.dial.r * k.s * 0.35, toDial);
  const dialFade = 1 - prog(t, 8.9, 9.2);

  // pour
  const tip = tipOnScreen(t);
  const gourdIn = prog(t, 14.4, 15.0, ease.out3);
  const gourdOut = prog(t, 16.6, 17.2, ease.in2);
  const stream = prog(t, 15.45, 15.75) * (1 - prog(t, 16.05, 16.25));
  const mouthY = GOURD.y - 188 * GOURD.s;

  // sun
  const sunOut = 1 - prog(t, 19.2, 19.6);
  const sun = { x: 250, y: 650 };

  // logo
  const logoMove = prog(t, 24.0, 24.8, ease.inOut3);
  const logo = { x: 540, y: lerp(820, 330, logoMove), s: lerp(1, 0.5, logoMove) };
  const logoIn = prog(t, 21.8, 22.4, ease.inOut2);

  const cta = t < 26.4 ? 0 : spring({ frame: Math.round((t - 26.4) * fps), fps, config: { damping: 12, stiffness: 150 } });

  return (
    <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{ position: "absolute", inset: 0 }}>
      <defs>
        <BoilFilter />
      </defs>

      {/* 0 - 6.2 s: the leaf, then the drop */}
      {t < 6.2 ? (
        <g transform={`translate(540 ${leafY}) rotate(${leafRot}) scale(${leafS} ${leafS * (1 + 0.3 * fall)})`} filter="url(#boil)">
          <Wash d={leafD} k={prog(t, 1.5, 2.3)} color={mixColor(C2.olive, C2.water, morph)} dx={10} dy={7} />
          <Ink d={leafD} k={morph > 0 ? 1 : prog(t, 0.2, 1.5, ease.inOut2)} w={6 / leafS} />
          <g opacity={1 - prog(t, 4.7, 4.95)}>
            <Ink d={LEAF_DETAIL} k={prog(t, 1.0, 2.1, ease.inOut2)} w={5 / leafS} />
          </g>
        </g>
      ) : null}

      {/* 5.2 - 9.6 s: the water line, ripples, and the dial they become */}
      <g filter="url(#boil)">
        <g opacity={1 - prog(t, 7.2, 7.6)}>
          <Ink d="M190 1240 C390 1232 690 1248 890 1240" k={prog(t, 5.2, 5.8, ease.inOut2)} w={5} />
        </g>
        {[1, 2].map((i) =>
          t > 6.15 + i * 0.15 && t < 7.6 + i * 0.15 ? (
            <ellipse key={i} cx={540} cy={1240} rx={ring(i)} ry={ring(i) * 0.22} fill="none" stroke={C2.ink} strokeWidth={4} opacity={1 - prog(t, 6.9 + i * 0.15, 7.6 + i * 0.15)} />
          ) : null,
        )}
        {t > 6.15 && t < 9.6 ? (
          <ellipse cx={ringCx} cy={ringCy} rx={ringRx} ry={ringRy} fill="none" stroke={C2.ink} strokeWidth={lerp(5, 7, toCircle)} opacity={1 - prog(t, 9.4, 9.6)} />
        ) : null}
        {t > 7.5 && t < 9.3 ? (
          <g opacity={dialFade}>
            {Array.from({ length: 60 }, (_, i) => {
              const a = (i / 60) * Math.PI * 2 - Math.PI / 2;
              const long = i % 5 === 0;
              const o = clamp01(prog(t, 7.6, 8.4) * 60 - i);
              return (
                <line key={i} x1={DIAL.x + Math.cos(a) * 290} y1={DIAL.y + Math.sin(a) * 290} x2={DIAL.x + Math.cos(a) * (long ? 322 : 308)} y2={DIAL.y + Math.sin(a) * (long ? 322 : 308)}
                  stroke={long ? C2.ink : C2.muted} strokeWidth={long ? 5 : 3} strokeLinecap="round" opacity={o} />
              );
            })}
            <path d={arcPath(DIAL.x, DIAL.y, 232)} fill="none" stroke={C2.clay} strokeWidth={18} strokeLinecap="round" {...evolvePath(0.77 * prog(t, 7.9, 8.8, ease.inOut2), arcPath(DIAL.x, DIAL.y, 232))} />
            <text x={DIAL.x} y={DIAL.y + 70} textAnchor="middle" fontFamily={FONTS.naskh} fontWeight={700} fontSize={210} fill={C2.ink}
              opacity={prog(t, 8.1, 8.5)} transform={`translate(0 ${16 * (1 - prog(t, 8.1, 8.6, ease.out3))})`}>
              77°
            </text>
          </g>
        ) : null}
      </g>

      {/* 11.9 - 14.4 s: steam over the lid */}
      {t > 11.9 && t < 14.4
        ? [-40, 0, 40].map((dx, i) => {
            const ph = (((t - 11.9 - i * 0.45) % 1.5) + 1.5) % 1.5 / 1.5;
            if (t - 11.9 < i * 0.45) return null;
            const y0 = k.y - 500 * k.s - ph * 60;
            return (
              <g key={i} opacity={Math.sin(ph * Math.PI) * (1 - prog(t, 14.1, 14.4))} filter="url(#boil)">
                <Ink d={steamD(k.x + dx, y0, 150, i % 2 ? -1 : 1)} k={Math.min(1, ph * 2.2)} w={5} color={C2.muted} />
              </g>
            );
          })
        : null}

      {/* the kettle: drawn at 9.3 s, pours, rests under the sun, erased for the steps, redrawn for the end card */}
      {k.draw > 0 || k.fill > 0 ? <KettleArt x={k.x} y={k.y} s={k.s} draw={k.draw} fill={k.fill} lift={k.lift} tilt={k.tilt} led="77°" /> : null}

      {/* 14.4 - 17.2 s: the gourd and the pour */}
      {gourdIn > 0 && gourdOut < 1 ? (
        <g opacity={1 - gourdOut} transform={`translate(${-420 * (1 - gourdIn) - 300 * gourdOut} 0)`}>
          {stream > 0 ? (
            <g filter="url(#boil)">
              <path d={`M${tip.x} ${tip.y} Q${tip.x - 14} ${(tip.y + mouthY) / 2} ${GOURD.x + 10} ${mouthY}`} fill="none" stroke={C2.ink} strokeWidth={15} strokeLinecap="round" {...evolvePath(stream, `M${tip.x} ${tip.y} Q${tip.x - 14} ${(tip.y + mouthY) / 2} ${GOURD.x + 10} ${mouthY}`)} />
              <path d={`M${tip.x} ${tip.y} Q${tip.x - 14} ${(tip.y + mouthY) / 2} ${GOURD.x + 10} ${mouthY}`} fill="none" stroke={C2.water} strokeWidth={8} strokeLinecap="round" {...evolvePath(stream, `M${tip.x} ${tip.y} Q${tip.x - 14} ${(tip.y + mouthY) / 2} ${GOURD.x + 10} ${mouthY}`)} />
            </g>
          ) : null}
          <GourdArt x={GOURD.x} y={GOURD.y} s={GOURD.s} draw={gourdIn} fill={prog(t, 14.7, 15.2)} />
          {[0, 1].map((i) => {
            const p = prog(t, 15.9 + i * 0.3, 16.9 + i * 0.3);
            return p > 0 && p < 1 ? (
              <g key={i} opacity={Math.sin(p * Math.PI)} filter="url(#boil)">
                <Ink d={steamD(GOURD.x - 20 + i * 40, mouthY - 30 - p * 50, 130, i ? -1 : 1)} k={Math.min(1, p * 2)} w={5} color={C2.muted} />
              </g>
            ) : null;
          })}
        </g>
      ) : null}

      {/* 16.9 - 19.6 s: the sun, and the energy running to the base */}
      {t > 16.9 && sunOut > 0 ? (
        <g opacity={sunOut} filter="url(#boil)">
          <circle cx={sun.x + 8} cy={sun.y + 6} r={95} fill={C2.sun} opacity={prog(t, 17.5, 18.0)} />
          <Ink d={arcPath(sun.x, sun.y, 95)} k={prog(t, 17.0, 17.6, ease.inOut2)} w={6} />
          <g transform={`rotate(${8 * (t - 17)} ${sun.x} ${sun.y})`}>
            {Array.from({ length: 12 }, (_, i) => {
              const a = (i / 12) * Math.PI * 2;
              return (
                <Ink key={i} d={`M${sun.x + Math.cos(a) * 125} ${sun.y + Math.sin(a) * 125} L${sun.x + Math.cos(a) * 172} ${sun.y + Math.sin(a) * 172}`} k={prog(t, 17.3 + i * 0.03, 17.6 + i * 0.03)} w={6} />
              );
            })}
          </g>
          <path d={`M${sun.x + 40} ${sun.y + 190} C${sun.x + 40} ${sun.y + 420} ${k.x - 330} ${k.y - 150} ${k.x - 200 * k.s} ${k.y - 30}`} fill="none" stroke={C2.clay} strokeWidth={6}
            strokeDasharray="18 16" strokeDashoffset={-60 * t} strokeLinecap="round" opacity={prog(t, 17.8, 18.3)} />
        </g>
      ) : null}

      {/* 19.4 - 22.0 s: press · turn · enjoy */}
      {t > 19.4 && t < 22.1
        ? STEPS.map((s, i) => {
            const at = stepAt(i);
            const gather = prog(t, 21.6, 22.0, ease.in2);
            const x = lerp(s.x, 540, gather);
            const sc = 1 - 0.6 * gather;
            return (
              <g key={i} opacity={1 - gather} transform={`translate(${x} ${STEP_Y}) scale(${sc})`}>
                <g filter="url(#boil)">
                  <circle cx={6} cy={5} r={120} fill={C2.sage} opacity={0.55 * prog(t, at + 0.3, at + 0.7)} />
                  <Ink d={arcPath(0, 0, 120)} k={prog(t, at, at + 0.5, ease.inOut2)} w={6} />
                  {i === 0 ? (
                    <>
                      <Ink d="M26 -40 A48 48 0 1 1 -26 -40" k={prog(t, at + 0.2, at + 0.6)} w={9} />
                      <Ink d="M0 -64 V-6" k={prog(t, at + 0.45, at + 0.65)} w={9} />
                    </>
                  ) : i === 1 ? (
                    <>
                      <Ink d={arcPath(0, 0, 44)} k={prog(t, at + 0.2, at + 0.55)} w={8} />
                      <Ink d="M-78 20 A80 80 0 0 1 -20 -78 M-36 -90 L-20 -78 L-34 -62" k={prog(t, at + 0.4, at + 0.7)} w={8} color={C2.clay} />
                    </>
                  ) : null}
                </g>
                {i === 2 ? <GourdArt x={0} y={62} s={0.5} draw={prog(t, at + 0.2, at + 0.6)} fill={prog(t, at + 0.4, at + 0.7)} /> : null}
                <text x={0} y={220} textAnchor="middle" fontFamily={FONTS.naskh} fontWeight={700} fontSize={78} fill={C2.ink} opacity={prog(t, at + 0.25, at + 0.55)}>
                  {s.label}
                </text>
              </g>
            );
          })
        : null}

      {/* 21.8 s ->: the logo, drawn by the same line */}
      {logoIn > 0 ? (
        <g transform={`translate(${logo.x} ${logo.y}) scale(${logo.s}) translate(-540 -820)`}>
          <g filter="url(#boil)">
            <path d={roundedSquare(540, 820, 360, 430, 54)} fill={C2.charcoal} opacity={prog(t, 22.2, 22.6)} />
            <Ink d={roundedSquare(540, 820, 360, 430, 54)} k={logoIn} w={7} />
            <Ink d={roundedSquare(540, 760, 210, 200, 44)} k={prog(t, 22.3, 22.9, ease.inOut2)} w={14} color={C2.paper} />
            <g transform={`translate(540 760) rotate(35) scale(${0.36 * prog(t, 22.5, 23.0, ease.backOut)})`}>
              <path d={LEAF_D} fill={C2.olive} />
              <path d={LEAF_DETAIL} fill="none" stroke={C2.charcoal} strokeWidth={14} strokeLinecap="round" />
            </g>
          </g>
          <g opacity={prog(t, 22.8, 23.2)} fontFamily={FONTS.sans} fontWeight={600} fill={C2.paper} textAnchor="middle">
            <text x={540} y={935} fontSize={46}>متيت</text>
            <text x={540} y={990} fontSize={40} letterSpacing={2}>MATET</text>
          </g>
        </g>
      ) : null}

      {/* 26.4 s: call to action, a hand-drawn pill */}
      {cta > 0 ? (
        <g transform={`translate(540 1470) scale(${cta})`}>
          <g filter="url(#boil)">
            <path d={roundedSquare(8, 7, 460, 124, 62)} fill={C2.clay} />
            <Ink d={roundedSquare(0, 0, 460, 124, 62)} k={prog(t, 26.4, 26.9, ease.inOut2)} w={6} />
          </g>
          <text x={0} y={26} textAnchor="middle" fontFamily={FONTS.sans} fontWeight={800} fontSize={70} fill={C2.paper}>
            اطلب الآن
          </text>
        </g>
      ) : null}
    </svg>
  );
};

const CUES2: Cue[] = [
  { at: 0.2, name: "felt-tip", db: -14 },
  { at: 1.0, name: "pencil", db: -14, trim: [0.2, 1.2] },
  { at: 1.5, name: "paper-flutter", db: -20, trim: [0, 0.8] },
  { at: 4.8, name: "twirl", db: -16 },
  { at: 5.2, name: "pencil", db: -18, trim: [0.2, 0.8] },
  { at: 6.15, name: "drop", db: -9 },
  { at: 6.2, name: "splash", db: -24 },
  { at: 7.2, name: "swish-gentle", db: -12 },
  ...Array.from({ length: 8 }, (_, i): Cue => ({ at: 7.62 + i * 0.1, name: "tick", db: -24 - i * 0.2, rate: 1 + i * 0.03 })),
  { at: 8.1, name: "chime-1", db: -21 },
  { at: 9.0, name: "swish-gentle", db: -14 },
  { at: 9.3, name: "pencil", db: -11, trim: [0.2, 1.35] },
  { at: 10.2, name: "felt-tip", db: -17 },
  { at: 10.9, name: "shimmer", db: -23 },
  { at: 14.4, name: "swish-classic-2", db: -16 },
  { at: 14.8, name: "wood-knock", db: -15 },
  { at: 15.45, name: "pour", db: -14, loopUntil: 16.25, fadeIn: 0.12, fadeOut: 0.25 },
  { at: 15.5, name: "bubble", db: -20 },
  { at: 16.8, name: "swish-gentle", db: -14 },
  { at: 17.3, name: "chime-2", db: -21 },
  { at: 17.8, name: "shimmer", db: -24 },
  { at: 19.2, name: "paper-flutter", db: -16, trim: [0, 0.8] },
  { at: 19.55, name: "button", db: -12 },
  { at: 20.05, name: "ratchet", db: -15, trim: [0, 0.62] },
  { at: 20.55, name: "chime-3", db: -21 },
  { at: 21.8, name: "felt-tip", db: -15 },
  { at: 22.5, name: "wood-knock", db: -15 },
  { at: 22.55, name: "shimmer", db: -23 },
  { at: 24.0, name: "swish-gentle", db: -14 },
  { at: 24.1, name: "pencil", db: -16, trim: [0.2, 1.2] },
  { at: 26.4, name: "confirm-2", db: -17 },
  { at: 26.8, name: "pop-2", db: -23 },
  { at: 27.2, name: "pop-3", db: -24 },
  { at: 28.0, name: "shimmer", db: -28 },
];

export const Option2: React.FC = () => {
  const t = useGlobalTime(0);
  return (
    <AbsoluteFill>
      <PaperBackground />
      <Drawing />
      <InkReveal name="Leaf line" t={t} start={1.0} duration={1.1} outAt={4.6} top={290} style={naskh(96)}>ورقةٌ خضراء…</InkReveal>
      <InkReveal name="Water line" t={t} start={5.0} duration={1.1} outAt={7.0} top={290} style={naskh(90)}>قليلٌ من الماءِ الدافئ…</InkReveal>
      <InkReveal name="Temperature line" t={t} start={7.4} duration={1.0} outAt={9.0} top={290} style={naskh(96)}>…والحرارةُ المثالية</InkReveal>
      <InkReveal name="Product name" t={t} start={10.2} duration={0.9} outAt={12.1} top={240} style={naskh(124)}>إبريق متة ذكي</InkReveal>
      <FadeUp name="Product line" t={t} start={10.8} outAt={12.1} style={{ left: 0, right: 0, top: 450, textAlign: "center", fontFamily: FONTS.sans, fontWeight: 300, fontSize: 46, color: C2.muted }}>
        مصمّم خصيصًا لعشّاق المتة
      </FadeUp>
      <InkReveal name="Hold line" t={t} start={12.4} duration={1.0} outAt={14.2} top={260} style={naskh(84)}>يحفظ الحرارة التي تختارها</InkReveal>
      <InkReveal name="Hold line 2" t={t} start={12.75} duration={0.6} outAt={14.2} top={390} style={naskh(84, C2.olive)}>طوال الوقت</InkReveal>
      <InkReveal name="Pour line" t={t} start={14.8} duration={1.1} outAt={16.6} top={280} style={naskh(88)}>من أول صبّةٍ… حتى الأخيرة</InkReveal>
      <InkReveal name="Watts" t={t} start={17.1} duration={0.8} outAt={19.0} top={250} style={{ ...naskh(124), left: 330 }}>500 واط فقط</InkReveal>
      <FadeUp name="Solar line" t={t} start={17.6} outAt={19.0} style={{ left: 330, right: 60, top: 460, textAlign: "center", fontFamily: FONTS.sans, fontWeight: 300, fontSize: 46, color: C2.ink }}>
        يعمل على الطاقة الشمسية
      </FadeUp>
      <InkReveal name="Steps line" t={t} start={19.3} duration={1.0} outAt={21.5} top={300} style={naskh(90)}>ثلاث خطواتٍ بسيطة</InkReveal>
      <InkReveal name="Promise" t={t} start={23.0} duration={1.0} outAt={23.85} top={1170} style={naskh(84, C2.olive)}>متة مثالية في كل مرة</InkReveal>
      <InkReveal name="End promise" t={t} start={25.2} duration={1.0} top={1250} style={naskh(76, C2.olive)}>متة مثالية في كل مرة</InkReveal>
      <FadeUp name="Phone" t={t} start={26.8} style={{ left: 0, right: 0, top: 1590, textAlign: "center", fontFamily: FONTS.sans, fontWeight: 600, fontSize: 56, color: C2.ink }}>
        <WhatsApp size={58} style={{ verticalAlign: -12, marginRight: 16 }} />
        <span dir="ltr">+963 931 884 610</span>
      </FadeUp>
      <Img src={staticFile("images/bsc-logo.png")} style={{ position: "absolute", left: 540 - 95, top: 1700, width: 190, opacity: prog(t, 27.2, 27.6) }} />
      <Vignette />
      <Mix music="audio/music-2.wav" musicGain={manifest.musicGains.option2} cues={CUES2} name="Music: Hopeful, opening bars + final chord" />
    </AbsoluteFill>
  );
};
