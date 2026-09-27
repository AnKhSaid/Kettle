import React from "react";
import { AbsoluteFill, Interactive } from "remotion";
import { project } from "../kettle/pose";
import { PROFILE } from "../kettle/profile";
import { clamp01, ease, lerp, prog, useGlobalTime } from "../lib/time";
import { COLORS, FONTS } from "../theme";
import { Steam, SteamDefs } from "./PourScene";

export const HOWTO_SCENE = { start: 21.3, end: 24.5 };

const STEPS = [
  { at: 21.65, num: "١", word: "اضغط" },
  { at: 22.5, num: "٢", word: "أدِر" },
  { at: 23.1, num: "٣", word: "استمتع" },
];
const D = PROFILE.dial;

/** Close-up "how to": press · turn · enjoy, landing on the music's beats. */
export const HowToFront: React.FC = () => {
  const t = useGlobalTime(HOWTO_SCENE.start);
  const step = t < STEPS[1].at ? 0 : t < STEPS[2].at ? 1 : 2;
  const pop = prog(t, STEPS[step].at, STEPS[step].at + 0.3, ease.out3);
  const visible = prog(t, 21.65, 21.95) * (1 - prog(t, 23.8, 24.05));

  const press = t < 23.1 ? prog(t, 21.9, 22.5, ease.out2) : 0;
  const turn = prog(t, 22.5, 23.1, ease.inOut2);
  const pw = project(t, "base", [PROFILE.power.x, 1, PROFILE.power.z]);
  const dial = project(t, "base", [D.x, D.h, D.z]);
  const a0 = -2.4;
  const a1 = a0 + turn * 2.6;
  const rx = 190;
  const ry = 110;
  const arcPts = Array.from({ length: 31 }, (_, k) => {
    const a = lerp(a0, a1, k / 30);
    return `${dial.x + Math.cos(a) * rx} ${dial.y + Math.sin(a) * ry}`;
  });
  const hx = dial.x + Math.cos(a1) * rx;
  const hy = dial.y + Math.sin(a1) * ry;
  const tx = -Math.sin(a1) * rx;
  const ty = Math.cos(a1) * ry;
  const tl = Math.hypot(tx, ty) || 1;
  const ux = tx / tl;
  const uy = ty / tl;
  const tip = project(t, "pot", [PROFILE.tip[0], PROFILE.tip[1] + 10, 0]);
  const steamK = prog(t, 23.25, 23.75) * (1 - prog(t, 23.9, 24.4));

  return (
    <AbsoluteFill>
      <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{ position: "absolute", inset: 0 }}>
        <SteamDefs />
        {t > 21.5 && t < 23.1 ? (
          <g fill="none" stroke={COLORS.leaf} strokeWidth={6} strokeLinecap="round">
            {[0, 1].map((k) => {
              const s = clamp01(press * 1.3 - k * 0.3);
              return s > 0 && s < 1 ? <ellipse key={k} cx={pw.x} cy={pw.y} rx={20 + s * 90} ry={(20 + s * 90) * 0.55} opacity={1 - s} /> : null;
            })}
            {turn > 0 ? <path d={"M" + arcPts.join(" L")} /> : null}
            {turn > 0.05 ? (
              <path d={`M${hx + ux * 26} ${hy + uy * 26} L${hx - uy * 16} ${hy + ux * 16} L${hx + uy * 16} ${hy - ux * 16} Z`} fill={COLORS.leaf} stroke="none" />
            ) : null}
          </g>
        ) : null}
        <Steam t={t} x={tip.x} y={tip.y} k={steamK} scale={0.7} />
      </svg>

      <Interactive.Div
        name="How-to step"
        style={{
          position: "absolute", left: 0, right: 0, top: 250, display: "flex", justifyContent: "center", alignItems: "center", gap: 34,
          direction: "rtl", opacity: visible, scale: String(lerp(0.6, 1, pop)), translate: `0px ${-30 * prog(t, 23.8, 24.05)}px`,
          fontFamily: FONTS.sans,
        }}
      >
        <div style={{ width: 150, height: 150, borderRadius: "50%", background: COLORS.ink, color: COLORS.cream, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 86 }}>
          {STEPS[step].num}
        </div>
        <div style={{ fontWeight: 800, fontSize: 120, color: COLORS.ink }}>{STEPS[step].word}</div>
      </Interactive.Div>
    </AbsoluteFill>
  );
};
