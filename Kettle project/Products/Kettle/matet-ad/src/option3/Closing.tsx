import React from "react";
import { AbsoluteFill, Img, spring, staticFile, useVideoConfig } from "remotion";
import { LEAF_D } from "../components/Art";
import { WhatsApp } from "../components/Icons";
import { WordSlam } from "../components/Text";
import { clamp01, ease, lerp, prog, seeded, useGlobalTime } from "../lib/time";
import { FONTS } from "../theme";
import { AT, C3, Field, Pill, Product, Rise, Slam } from "./kit";

const STEPS = [
  { at: 14.4, img: "images/o3/step1-press.jpg", num: "1", verb: "اضغط", sub: "زر التشغيل", rot: -2.5 },
  { at: 15.6, img: "images/o3/step2-dial.jpg", num: "2", verb: "أدِر", sub: "العجلة لاختيار الحرارة", rot: 2 },
  { at: 16.8, img: "images/o3/step3-gourd.jpg", num: "3", verb: "استمتع", sub: "بنفس الحرارة في كل مرة", rot: -1.5 },
];
const SUMMARY_AT = 18.0;
// small cards in a row, right to left
const ROW = [
  { x: 860, y: 780 },
  { x: 540, y: 780 },
  { x: 220, y: 780 },
];

const Card: React.FC<{ src: string; x: number; y: number; size: number; rot: number; num: string; badge: number }> = ({ src, x, y, size, rot, num, badge }) => (
  <div style={{ position: "absolute", left: x - size / 2, top: y - size / 2, width: size, height: size, rotate: `${rot}deg` }}>
    <div style={{ position: "absolute", inset: 0, borderRadius: size * 0.06, overflow: "hidden", boxShadow: "0 30px 70px rgba(0,0,0,.45)" }}>
      <Img src={staticFile(src)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
    </div>
    <div
      style={{
        position: "absolute", right: -size * 0.05, top: -size * 0.05, width: badge, height: badge, borderRadius: "50%", background: C3.lime,
        display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONTS.sans, fontWeight: 800, fontSize: badge * 0.62, color: C3.ink,
        boxShadow: "0 10px 24px rgba(0,0,0,.3)",
      }}
    >
      {num}
    </div>
  </div>
);

/** 14.4 - 19.2 s: press · turn · enjoy — the brochure's photos as cards, one per two beats. */
export const Steps: React.FC = () => {
  const t = useGlobalTime(14.4);
  const { fps } = useVideoConfig();
  const summary = prog(t, SUMMARY_AT, SUMMARY_AT + 0.45, ease.inOut3);

  return (
    <AbsoluteFill>
      <Field color={C3.deep} glow="#24452066" glowR={900} />
      <Rise t={t} at={14.45} top={140} size={60} color={C3.lime} weight={700}>سهلة الاستخدام</Rise>
      {STEPS.map((s, i) => {
        const next = STEPS[i + 1]?.at;
        if (t < s.at || (next !== undefined && t > next + 0.3)) return null;
        const land = spring({ frame: Math.round((t - s.at) * fps), fps, config: { damping: 14, stiffness: 150, mass: 0.9 } });
        const leave = next === undefined ? 0 : prog(t, next - 0.05, next + 0.25, ease.in2);
        let x = lerp(-560, 540, land) + 1100 * leave;
        let y = 830;
        let size = 780;
        let rot = lerp(-14, s.rot, land) + 12 * leave;
        if (next === undefined && summary > 0) {
          // the last big card shrinks into its place in the row
          x = lerp(x, ROW[i].x, summary);
          y = lerp(y, ROW[i].y, summary);
          size = lerp(780, 290, summary);
          rot = lerp(rot, 0, summary);
        }
        return <Card key={i} src={s.img} x={x} y={y} size={size} rot={rot} num={s.num} badge={lerp(184, 92, summary * (next === undefined ? 1 : 0))} />;
      })}
      {summary > 0
        ? STEPS.slice(0, 2).map((s, i) => {
            const k = prog(t, SUMMARY_AT + 0.08 * (1 - i), SUMMARY_AT + 0.45 + 0.08 * (1 - i), ease.out3);
            return <Card key={i} src={s.img} x={lerp(1400, ROW[i].x, k)} y={ROW[i].y} size={290} rot={0} num={s.num} badge={92} />;
          })
        : null}
      {STEPS.map((s, i) => {
        const out = (STEPS[i + 1]?.at ?? SUMMARY_AT) - 0.12;
        return (
          <React.Fragment key={i}>
            <Slam t={t} at={s.at + 0.08} out={out} top={1285} size={150} color={C3.cream}>{s.verb}</Slam>
            <Rise t={t} at={s.at + 0.25} out={out} top={1490} size={50} color="rgba(245,239,232,0.78)" weight={500}>{s.sub}</Rise>
          </React.Fragment>
        );
      })}
      <Slam t={t} at={SUMMARY_AT + 0.2} top={1080} size={112} color={C3.cream}>ثلاث خطوات فقط</Slam>
    </AbsoluteFill>
  );
};

const R = seeded(21);
const LEAVES = Array.from({ length: 12 }, () => ({ x: R() * 1080, y0: -150 - R() * 500, v: 260 + R() * 220, s: 0.12 + R() * 0.12, rot: R() * 360, spin: (R() - 0.5) * 120, sway: R() * 6 }));

/** 19.2 - 21.6 s: "صُمّمت خصيصًا لعشّاق المتة" — the product in a pool of light, leaves falling. */
export const Lovers: React.FC = () => {
  const t = useGlobalTime(19.2);
  const { fps } = useVideoConfig();
  const land = spring({ frame: Math.round((t - 19.2) * fps), fps, config: { damping: 15, stiffness: 110 } });
  const dt = t - 19.2;

  return (
    <AbsoluteFill>
      <Field color={C3.deep} glow="#6E9B35" glowAt={[520, 1180]} glowR={640} />
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        {LEAVES.map((l, i) => (
          <path
            key={i}
            d={LEAF_D}
            fill={i % 3 === 0 ? C3.lime : C3.leaf}
            opacity={0.85}
            transform={`translate(${l.x + Math.sin(dt * 2 + l.sway) * 40} ${l.y0 + l.v * dt}) rotate(${l.rot + l.spin * dt}) scale(${l.s})`}
          />
        ))}
      </svg>
      <Product x={560} y={1530} scale={0.47 * lerp(0.86, 1, land)} anchor={AT.base} opacity={clamp01(land * 2.5)} shine={prog(t, 20.25, 20.95)} />
      <Rise t={t} at={19.3} top={250} size={84} color={C3.cream} weight={600}>صُمّمت خصيصًا</Rise>
      <Slam t={t} at={19.66} top={365} size={150} color={C3.lime}>لعشّاق المتة</Slam>
    </AbsoluteFill>
  );
};

/** 21.6 - 30 s: the logo lands, then the end card; the call to action hits on the final chord (26.4 s). */
export const Finale: React.FC = () => {
  const t = useGlobalTime(21.6);
  const { fps } = useVideoConfig();
  const f = (at: number) => Math.max(0, Math.round((t - at) * fps));
  const logoIn = spring({ frame: f(21.62), fps, config: { damping: 11, stiffness: 140, mass: 0.8 } });
  const up = prog(t, 24.0, 24.7, ease.inOut3);
  const logoW = lerp(380, 180, up);
  const logoY = lerp(700, 250, up);
  const product = t < 24.1 ? 0 : spring({ frame: f(24.1), fps, config: { damping: 14, stiffness: 110 } });
  const cta = t < 26.4 ? 0 : spring({ frame: f(26.4), fps, config: { damping: 9, stiffness: 170, mass: 0.7 } });
  const shineX = ((t - 26.9) % 1.2) / 1.2;

  return (
    <AbsoluteFill>
      <Field color={C3.cream} />
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        {[0, 1, 2].map((i) => {
          const k = prog(t, 21.62 + i * 0.12, 22.5 + i * 0.12, ease.out3);
          if (k <= 0 || k >= 1) return null;
          return <circle key={i} cx={540} cy={700} r={200 + 520 * k} fill="none" stroke={i === 1 ? C3.lime : C3.leaf} strokeWidth={14 * (1 - k)} opacity={1 - k} />;
        })}
      </svg>
      <Img
        src={staticFile("images/o3/logo-tile.png")}
        style={{
          position: "absolute", left: 540 - logoW / 2, top: logoY - (logoW * 700) / 570 / 2, width: logoW,
          scale: String(logoIn), rotate: `${(1 - logoIn) * -12}deg`, filter: "drop-shadow(0 18px 30px rgba(0,0,0,.25))",
        }}
      />
      <WordSlam name="Brand line" text="إبريق متة ذكي" t={t} start={22.2} stagger={0.2} outAt={23.8} top={1010} fontSize={122} color={C3.ink} wordColors={{ 2: C3.forest }} />
      <Rise t={t} at={22.85} out={23.8} top={1200} size={62} color={C3.forest} weight={600}>متة مثالية في كل مرة</Rise>

      {product > 0 ? <Product x={560} y={1175 + 520 * (1 - product)} scale={0.42} anchor={AT.base} shine={prog(t, 25.2, 25.95)} /> : null}
      <Rise t={t} at={24.65} top={1235} size={60} color={C3.forest} weight={600}>متة مثالية في كل مرة</Rise>
      {cta > 0 ? (
        <div style={{ position: "absolute", left: 0, right: 0, top: 1370, textAlign: "center", scale: String(cta) }}>
          <Pill bg={C3.forest} color={C3.cream} size={86} style={{ position: "relative", overflow: "hidden", boxShadow: "0 16px 36px rgba(41,73,25,.35)" }}>
            اطلب الآن
            {t > 26.9 ? (
              <span
                style={{
                  position: "absolute", inset: 0,
                  background: `linear-gradient(105deg, rgba(255,255,255,0) ${shineX * 160 - 40}%, rgba(255,255,255,.4) ${shineX * 160 - 25}%, rgba(255,255,255,0) ${shineX * 160 - 10}%)`,
                }}
              />
            ) : null}
          </Pill>
        </div>
      ) : null}
      <div
        style={{
          position: "absolute", left: 0, right: 0, top: 1545, textAlign: "center", fontFamily: FONTS.sans, fontWeight: 600, fontSize: 58, color: C3.ink,
          opacity: prog(t, 26.8, 27.1), translate: `0px ${20 * (1 - prog(t, 26.8, 27.2, ease.out3))}px`,
        }}
      >
        <WhatsApp size={60} style={{ verticalAlign: -12, marginRight: 16 }} />
        <span dir="ltr">+963 931 884 610</span>
      </div>
      <Img
        src={staticFile("images/bsc-logo.png")}
        style={{ position: "absolute", left: 540 - 95, top: 1665, width: 190, opacity: prog(t, 27.2, 27.6), translate: `0px ${16 * (1 - prog(t, 27.2, 27.7, ease.out3))}px` }}
      />
    </AbsoluteFill>
  );
};
