import { Easing, useCurrentFrame, useVideoConfig } from "remotion";

// Video grid: 1080x1920 @ 30 fps. The music ("Hopeful") is 100 BPM, so one beat is
// 0.6 s (18 frames) and one bar is 2.4 s (72 frames); scene changes sit on bar lines.
export const FPS = 30;
export const WIDTH = 1080;
export const HEIGHT = 1920;
export const DURATION_SECONDS = 30;

/** seconds -> frames */
export const sec = (seconds: number) => Math.round(seconds * FPS);

export type EaseFn = (x: number) => number;

export const ease = {
  linear: Easing.linear,
  out2: Easing.bezier(0.25, 0.46, 0.45, 0.94),
  out3: Easing.bezier(0.215, 0.61, 0.355, 1),
  out5: Easing.bezier(0.23, 1, 0.32, 1),
  expoOut: Easing.bezier(0.16, 1, 0.3, 1),
  in2: Easing.bezier(0.55, 0.085, 0.68, 0.53),
  in3: Easing.bezier(0.55, 0.055, 0.675, 0.19),
  inOut2: Easing.bezier(0.45, 0, 0.55, 1),
  inOut3: Easing.bezier(0.65, 0, 0.35, 1),
  sine: Easing.bezier(0.37, 0, 0.63, 1),
  backOut: Easing.bezier(0.34, 1.56, 0.64, 1),
  backIn: Easing.bezier(0.36, 0, 0.66, -0.56),
} satisfies Record<string, EaseFn>;

export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

/** eased 0 -> 1 progress while `t` goes from `a` to `b` (seconds) */
export const prog = (t: number, a: number, b: number, e: EaseFn = ease.linear) =>
  e(clamp01((t - a) / (b - a)));

/** Keyframe track: [time (s), value, easing used to arrive at this key] */
export type Key = readonly [number, number, EaseFn?];

export const track = (t: number, keys: readonly Key[]): number => {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [t1, v1, e] = keys[i];
    const [t0, v0] = keys[i - 1];
    if (t <= t1) {
      const k = t1 > t0 ? (t - t0) / (t1 - t0) : 1;
      return v0 + (v1 - v0) * (e ?? ease.linear)(k);
    }
  }
  return keys[keys.length - 1][1];
};

/** Mix two #rrggbb colours */
export const mixColor = (a: string, b: string, k: number) => {
  const pa = a.match(/\w\w/g)!.map((h) => parseInt(h, 16));
  const pb = b.match(/\w\w/g)!.map((h) => parseInt(h, 16));
  return (
    "#" +
    pa
      .map((v, i) => Math.round(lerp(v, pb[i], clamp01(k))).toString(16).padStart(2, "0"))
      .join("")
  );
};

/**
 * Scenes are placed in <Sequence from={sec(start)}>. Inside, this returns the *global*
 * time in seconds, so every scene can be written against the same cue sheet as the music.
 */
export const useGlobalTime = (sceneStartSeconds: number) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return frame / fps + sceneStartSeconds;
};

/** Deterministic pseudo-random generator (same values in every render tab). */
export const seeded = (seed: number) => {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
};
