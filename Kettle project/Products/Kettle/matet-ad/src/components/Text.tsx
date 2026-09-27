import React from "react";
import { Interactive, spring, useVideoConfig } from "remotion";
import { clamp01, ease, lerp, prog } from "../lib/time";
import { COLORS, FONTS } from "../theme";

const SLAM = { damping: 11, stiffness: 160, mass: 0.7 };

type WordSlamProps = {
  readonly name: string;
  readonly text: string;
  /** global time (s) */
  readonly t: number;
  /** when the first word lands (global s) */
  readonly start: number;
  readonly stagger?: number;
  /** when the line leaves (global s) */
  readonly outAt?: number;
  readonly top: number;
  readonly fontSize?: number;
  readonly color?: string;
  readonly weight?: number;
  readonly wordColors?: Record<number, string>;
  /** wrap individual words, e.g. with a rough-notation circle */
  readonly wrapWord?: Record<number, (word: React.ReactNode) => React.ReactNode>;
  readonly children?: (line: React.ReactNode) => React.ReactNode;
};

/** Arabic headline whose words punch in one by one (right to left). */
export const WordSlam: React.FC<WordSlamProps> = ({
  name, text, t, start, stagger = 0.1, outAt, top, fontSize = 100, color = COLORS.ink, weight = 800, wordColors, wrapWord, children,
}) => {
  const { fps } = useVideoConfig();
  const out = outAt === undefined ? 0 : prog(t, outAt, outAt + 0.35, ease.in2);
  const words = text.split(/\s+/);
  const line = (
    <span style={{ display: "inline-block" }}>
      {words.map((w, i) => {
        const f = Math.round((t - start - i * stagger) * fps);
        const s = f < 0 ? 0 : spring({ frame: f, fps, config: SLAM });
        const word = (
          <span
            style={{
              display: "inline-block",
              opacity: clamp01(s * 1.6),
              scale: String(lerp(1.8, 1, s)),
              translate: `0px ${20 * (1 - s)}px`,
              color: wordColors?.[i] ?? color,
            }}
          >
            {w}
          </span>
        );
        return (
          <React.Fragment key={i}>
            {i > 0 ? " " : null}
            {wrapWord?.[i] ? wrapWord[i](word) : word}
          </React.Fragment>
        );
      })}
    </span>
  );
  return (
    <Interactive.Div
      name={name}
      style={{
        position: "absolute",
        left: 80,
        right: 80,
        top,
        textAlign: "center",
        direction: "rtl",
        whiteSpace: "nowrap",
        fontFamily: FONTS.sans,
        fontWeight: weight,
        fontSize,
        lineHeight: 1.35,
        letterSpacing: -1,
        opacity: 1 - out,
        translate: `0px ${-30 * out}px`,
      }}
    >
      {children ? children(line) : line}
    </Interactive.Div>
  );
};

type InkRevealProps = {
  readonly name: string;
  readonly t: number;
  readonly start: number;
  readonly duration: number;
  readonly outAt?: number;
  readonly top: number;
  readonly style?: React.CSSProperties;
  readonly children: React.ReactNode;
};

/** Text that appears as if written with a pen: a soft mask sweeps right to left. */
export const InkReveal: React.FC<InkRevealProps> = ({ name, t, start, duration, outAt, top, style, children }) => {
  const k = prog(t, start, start + duration, ease.sine) * 112;
  const out = outAt === undefined ? 0 : prog(t, outAt, outAt + 0.3, ease.in2);
  const mask = `linear-gradient(to left, #000 ${k - 12}%, transparent ${k}%)`;
  return (
    <Interactive.Div
      name={name}
      style={{
        position: "absolute",
        left: 80,
        right: 80,
        top,
        textAlign: "center",
        direction: "rtl",
        whiteSpace: "nowrap",
        fontFamily: FONTS.ruqaa,
        fontWeight: 700,
        fontSize: 104,
        lineHeight: 1.5,
        WebkitMaskImage: mask,
        maskImage: mask,
        opacity: 1 - out,
        translate: `0px ${-30 * out}px`,
        ...style,
      }}
    >
      {children}
    </Interactive.Div>
  );
};

type FadeUpProps = {
  readonly name: string;
  readonly t: number;
  readonly start: number;
  readonly outAt?: number;
  readonly style: React.CSSProperties;
  readonly children: React.ReactNode;
};

/** Supporting line that rises into place. */
export const FadeUp: React.FC<FadeUpProps> = ({ name, t, start, outAt, style, children }) => {
  const k = prog(t, start, start + 0.5, ease.out3);
  const out = outAt === undefined ? 0 : prog(t, outAt, outAt + 0.3, ease.in2);
  return (
    <Interactive.Div
      name={name}
      style={{
        position: "absolute",
        opacity: k * (1 - out),
        translate: `0px ${20 * (1 - k) - 30 * out}px`,
        ...style,
      }}
    >
      {children}
    </Interactive.Div>
  );
};
