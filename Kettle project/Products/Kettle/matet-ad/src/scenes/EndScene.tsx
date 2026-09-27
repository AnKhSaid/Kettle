import { evolvePath } from "@remotion/paths";
import React from "react";
import { AbsoluteFill, Img, Interactive, spring, staticFile, useVideoConfig } from "remotion";
import { Halo, LEAF_D } from "../components/Art";
import { WhatsApp } from "../components/Icons";
import { FadeUp, InkReveal, WordSlam } from "../components/Text";
import { ease, lerp, prog, useGlobalTime } from "../lib/time";
import { COLORS, FONTS } from "../theme";

export const END_SCENE = { start: 23.9, end: 30 };

const TILE_INNER = "M-40 -98 H40 Q64 -98 64 -74 V-6 Q64 18 40 18 H-40 Q-64 18 -64 -6 V-74 Q-64 -98 -40 -98 Z";

export const EndBack: React.FC = () => {
  const t = useGlobalTime(END_SCENE.start);
  return <Halo k={prog(t, 24.1, 25.1, ease.out3)} cy={1060} />;
};


/** The leaf from the opening flies back and becomes the MATET logo; then the call to action. */
export const EndFront: React.FC = () => {
  const t = useGlobalTime(END_SCENE.start);
  const { fps } = useVideoConfig();

  const leafK = prog(t, 24.0, 24.9, ease.inOut2);
  const lx = lerp(980, 540, leafK) - Math.sin(leafK * Math.PI) * 160;
  const ly = lerp(-160, 255, leafK) - Math.sin(leafK * Math.PI) * 40;
  const tileF = Math.round((t - 24.6) * fps);
  const tile = tileF < 0 ? 0 : spring({ frame: tileF, fps, config: { damping: 11, stiffness: 170 } });
  const ctaF = Math.round((t - 26.4) * fps);
  const cta = ctaF < 0 ? 0 : spring({ frame: ctaF, fps, config: { damping: 10, stiffness: 180 } });
  const breathe = t > 27 ? 1 + Math.sin((t - 27) * 3) * 0.015 : 1;
  const shine = t < 28.9 ? prog(t, 27.4, 28.2, ease.sine) : prog(t, 28.9, 29.7, ease.sine);

  return (
    <AbsoluteFill>
      <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{ position: "absolute", inset: 0 }}>
        <g transform={`translate(540 300) scale(${lerp(0.3, 1, tile)})`} opacity={Math.min(1, tile * 2)}>
          <rect x={-105} y={-125} width={210} height={250} rx={34} fill="#151515" />
          <path d={TILE_INNER} fill="none" stroke="#fff" strokeWidth={9} {...evolvePath(prog(t, 24.75, 25.25, ease.inOut2), TILE_INNER)} />
          <text y={62} textAnchor="middle" fontFamily={FONTS.sans} fontWeight={600} fontSize={36} fill="#fff" opacity={prog(t, 25.0, 25.3)}>
            متيت
          </text>
          <text y={104} textAnchor="middle" fontFamily={FONTS.sans} fontWeight={600} fontSize={36} letterSpacing={2} fill="#fff" direction="ltr" opacity={prog(t, 25.1, 25.4)}>
            MATET
          </text>
        </g>
        {leafK > 0 ? (
          <g transform={`translate(${lx} ${ly}) rotate(${lerp(-200, 26, leafK)}) scale(${lerp(0.5, 0.27, leafK)})`}>
            <path d={LEAF_D} fill={COLORS.leaf} />
            <path d="M0 215 V150 C2 60 3 -40 0 -150" fill="none" stroke="#1f3d1b" strokeWidth={14} strokeLinecap="round" />
          </g>
        ) : null}
      </svg>

      <WordSlam name="End headline" text="إبريق متة ذكي" t={t} start={25.05} stagger={0.12} top={470} fontSize={96} />
      <InkReveal name="End tagline" t={t} start={25.5} duration={0.9} top={585} style={{ fontSize: 92, color: COLORS.green }}>
        متة مثالية في كل مرة
      </InkReveal>

      <Interactive.Div
        name="Call to action"
        style={{
          position: "absolute", left: "50%", top: 1440, translate: "-50% 0px", scale: String(lerp(0.6, 1, cta) * breathe),
          opacity: Math.min(1, cta * 2), background: COLORS.green, color: COLORS.cream, fontFamily: FONTS.sans, fontWeight: 800,
          fontSize: 64, padding: "18px 96px 28px", borderRadius: 999, whiteSpace: "nowrap", overflow: "hidden",
        }}
      >
        اطلب الآن
        <div
          style={{
            position: "absolute", top: 0, bottom: 0, width: 130, left: lerp(-200, 700, shine),
            background: "linear-gradient(100deg, transparent, rgba(255,255,255,.45), transparent)",
          }}
        />
      </Interactive.Div>

      <FadeUp name="Phone" t={t} start={26.7}
        style={{ left: 0, right: 0, top: 1585, textAlign: "center", direction: "ltr", fontFamily: FONTS.sans, fontWeight: 600, fontSize: 52, letterSpacing: 1, color: COLORS.ink }}>
        <WhatsApp style={{ verticalAlign: -11, marginRight: 16 }} />
        +963 931 884 610
      </FadeUp>
      <FadeUp name="Business Solutions Center" t={t} start={27.0} style={{ left: 445, top: 1680, width: 190 }}>
        <Img src={staticFile("images/bsc-logo.png")} style={{ width: 190 }} />
      </FadeUp>
    </AbsoluteFill>
  );
};
