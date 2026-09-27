import { Underline } from "@remotion/rough-notation";
import React from "react";
import { AbsoluteFill, Interactive, spring, useVideoConfig } from "remotion";
import { WordSlam } from "../components/Text";
import { project } from "../kettle/pose";
import { PROFILE } from "../kettle/profile";
import { ease, lerp, prog, seeded, useGlobalTime } from "../lib/time";
import { COLORS, FONTS } from "../theme";

export const POUR_SCENE = { start: 14.2, end: 19.4 };

const TIP: [number, number, number] = [PROFILE.tip[0] - 2, PROFILE.tip[1] - 8, 0];
const R = seeded(23);
const DROPS = Array.from({ length: 8 }, () => ({ r: 3 + R() * 4, a: -Math.PI / 2 + (R() - 0.5) * 2.2, v: 90 + R() * 120, ph: R() }));
const WISP = "M0 0 C-22 -40 22 -80 0 -120 C-22 -160 22 -200 0 -240";

/** Steam wisps rising from a point (used here and in the how-to). */
export const Steam: React.FC<{ t: number; x: number; y: number; k: number; scale?: number; spread?: number }> = ({ t, x, y, k, scale = 1, spread = 34 }) => {
  if (k <= 0) return null;
  return (
    <g>
      {[0, 1, 2, 3].map((i) => {
        const cyc = (t * 0.55 + i * 0.27) % 1;
        const dash = { strokeDasharray: "0.4 0.6", strokeDashoffset: -cyc + 0.4 };
        return (
          <g key={i} transform={`translate(${x + (i - 1.5) * spread * scale} ${y - 20 - cyc * 60}) scale(${scale})`} opacity={k * Math.sin(cyc * Math.PI) * 0.9}>
            <path d={WISP} pathLength={1} fill="none" stroke="#fff" strokeWidth={26} strokeLinecap="round" filter="url(#steam-soft)" opacity={0.7} style={dash} />
            <path d={WISP} pathLength={1} fill="none" stroke="#8a8275" strokeWidth={4} strokeLinecap="round" style={dash} />
          </g>
        );
      })}
    </g>
  );
};

export const SteamDefs: React.FC = () => (
  <defs>
    <filter id="steam-soft" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation={7} />
    </filter>
  </defs>
);

const BADGES = [
  { x: 780, at: 16.8, label: "الصبّة ١" },
  { x: 540, at: 17.4, label: "الصبّة ٢" },
  { x: 300, at: 18.0, label: "الصبّة ٣" },
];

/** The kettle pours into the gourd: same 77° from the first pour to the last. */
export const PourFront: React.FC = () => {
  const t = useGlobalTime(POUR_SCENE.start);
  const { fps } = useVideoConfig();

  const pour = prog(t, 15.7, 16.05, ease.in2);
  const pourEnd = prog(t, 18.45, 18.8, ease.in2);
  const streaming = pour > 0 && pourEnd < 1;
  const tip = project(t, "pot", TIP);
  const mouth = project(t, "gourd", [0, 178, 0]);
  const wob = Math.sin(t * 31) * 2.5;
  const streamD = `M${tip.x} ${tip.y} C${tip.x - 14} ${tip.y + 50} ${mouth.x + wob} ${lerp(tip.y, mouth.y, 0.45)} ${mouth.x + wob * 0.5} ${mouth.y}`;
  const dash = { strokeDasharray: `${pour - pourEnd} 3`, strokeDashoffset: -pourEnd };
  const steamK = prog(t, 16.3, 17.1, ease.out2) * (1 - prog(t, 19.0, 19.3));
  const out = prog(t, 18.95, 19.3, ease.in2);

  return (
    <AbsoluteFill>
      <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{ position: "absolute", inset: 0 }}>
        <SteamDefs />
        <defs>
          <linearGradient id="water-grad" x1="0" x2="1">
            <stop offset="0" stopColor="#BFE0EE" />
            <stop offset="0.5" stopColor={COLORS.water} />
            <stop offset="1" stopColor="#B3D8E8" />
          </linearGradient>
        </defs>
        {streaming ? (
          <g>
            <path d={streamD} pathLength={1} fill="none" stroke="url(#water-grad)" strokeWidth={11} strokeLinecap="round" style={dash} />
            <path d={streamD} pathLength={1} fill="none" stroke="#fff" strokeWidth={3} strokeLinecap="round" opacity={0.8} transform="translate(-3 0)" style={dash} />
            {pour >= 1 && pourEnd < 0.2
              ? DROPS.map((d, i) => {
                  const cyc = (t * 2.2 + d.ph) % 1;
                  return (
                    <circle key={i} cx={mouth.x + Math.cos(d.a) * d.v * cyc} cy={mouth.y + Math.sin(d.a) * d.v * cyc + 260 * cyc * cyc} r={d.r} fill="#9CC9DC" opacity={(1 - cyc) * 0.9} />
                  );
                })
              : null}
          </g>
        ) : null}
        <Steam t={t} x={mouth.x} y={project(t, "gourd", [0, 190, 0]).y} k={steamK} />
      </svg>

      <WordSlam name="Pour line 1" text="من أول صبّة…" t={t} start={15.0} stagger={0.14} outAt={18.95} top={200} fontSize={104} />
      <WordSlam name="Pour line 2" text="حتى الأخيرة" t={t} start={15.28} stagger={0.14} outAt={18.95} top={335} fontSize={104} color={COLORS.green}>
        {(line) => (
          <Underline progress={prog(t, 15.7, 16.1, ease.out2)} color={COLORS.leaf} strokeWidth={7} iterations={2} rtl padding={{ top: -14 }} style={{ display: "inline-block" }}>
            {line}
          </Underline>
        )}
      </WordSlam>

      {BADGES.map((b) => {
        const f = Math.round((t - b.at) * fps);
        const s = f < 0 ? 0 : spring({ frame: f, fps, config: { damping: 10, stiffness: 180 } });
        if (s <= 0.001) return null;
        return (
          <Interactive.Div
            key={b.label}
            name={`Badge ${b.label}`}
            style={{
              position: "absolute", left: b.x - 95, top: 520, width: 190, height: 190, borderRadius: "50%",
              background: COLORS.green, color: COLORS.cream, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              opacity: Math.min(1, s * 1.5) * (1 - out), scale: String(lerp(0.2, 1, s)), rotate: `${lerp(-25, 0, s)}deg`, translate: `0px ${-30 * out}px`,
              fontFamily: FONTS.sans,
            }}
          >
            <b style={{ fontWeight: 800, fontSize: 58, lineHeight: 1.1, direction: "ltr" }}>77°</b>
            <span style={{ fontWeight: 600, fontSize: 32, opacity: 0.92 }}>{b.label}</span>
          </Interactive.Div>
        );
      })}
    </AbsoluteFill>
  );
};
