import { Audio } from "@remotion/media";
import React from "react";
import { staticFile } from "remotion";
import { ease, sec } from "../lib/time";
import manifest from "./sfx-manifest.json";

type SfxName = keyof typeof manifest.sfx;

export type Cue = {
  /** global time in seconds */
  at: number;
  name: SfxName;
  /** level relative to the music, in dB (same values as the original mix) */
  db: number;
  rate?: number;
  /** play only this part of the file, in seconds */
  trim?: [number, number];
  /** loop the file until this time (s), with an optional envelope 0..1 over the loop */
  loopUntil?: number;
  envelope?: (x: number) => number;
  fadeIn?: number;
  fadeOut?: number;
};

// When the on-screen counter passes a value (100 -> 77, power2.inOut over 4.95-6.65 s).
const counterTime = (v: number) => {
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    const e = mid < 0.5 ? 2 * mid * mid : 1 - (-2 * mid + 2) ** 2 / 2;
    if (100 - 23 * e > v) lo = mid;
    else hi = mid;
  }
  return 4.95 + 1.7 * ((lo + hi) / 2);
};

// The cue sheet. Times match the picture (see the scenes) and the music's beat grid.
export const CUES: Cue[] = [
  // A — the leaf lands on water
  { at: 1.47, name: "drop", db: -9 },
  { at: 1.52, name: "splash", db: -22 },
  // B — the water boils
  { at: 2.3, name: "boil", db: -2, loopUntil: 4.8, envelope: (x) => 0.25 + 0.75 * x ** 1.5, fadeIn: 0.6, fadeOut: 0.02 },
  { at: 2.6, name: "bubbles", db: -10, loopUntil: 4.8, envelope: (x) => x ** 2, fadeIn: 0.8, fadeOut: 0.02 },
  { at: 4.19, name: "scribble", db: -8, trim: [0, 0.3] },
  { at: 4.33, name: "scribble", db: -8, trim: [0.55, 0.85] },
  // C — freeze, countdown, reversed swell
  { at: 4.8, name: "bell", db: -13 },
  { at: 4.8, name: "glass-tick", db: -16 },
  ...Array.from({ length: 23 }, (_, i): Cue => {
    const k = i + 1;
    return { at: counterTime(100 - k + 0.5), name: "tick", db: -17 - k * 0.12, rate: 1 + (12 - k) * 0.012 };
  }),
  { at: 7.2 - 0.64, name: "swish-reverse", db: -12 },
  // D — the drop (the music carries it)
  { at: 7.2, name: "thump", db: -14 },
  { at: 8.85, name: "swish", db: -15 },
  // E — sketch -> 3D, callouts
  { at: 9.5, name: "pencil", db: -8, trim: [0.2, 1.35] },
  { at: 10.05, name: "felt-tip", db: -14 },
  { at: 10.5, name: "twirl", db: -8 },
  { at: 10.8, name: "shimmer", db: -22 },
  { at: 11.35, name: "select", db: -18 },
  { at: 12.0, name: "pop-1", db: -15 },
  { at: 12.3, name: "pop-2", db: -15, rate: 1.06 },
  { at: 12.6, name: "pop-3", db: -15, rate: 1.12 },
  { at: 12.9, name: "pop-1", db: -15, rate: 1.18 },
  { at: 14.05, name: "minimize", db: -22 },
  // F — the pour
  { at: 14.3, name: "swish-classic-2", db: -14 },
  { at: 14.62, name: "wood-knock", db: -12 },
  { at: 15.05, name: "swish-gentle", db: -4 },
  { at: 15.72, name: "pour", db: -12, loopUntil: 18.85, fadeIn: 0.12, fadeOut: 0.35 },
  { at: 15.74, name: "bubble", db: -18 },
  { at: 16.8, name: "chime-1", db: -17 },
  { at: 17.4, name: "chime-2", db: -17, rate: 1.12 },
  { at: 18.0, name: "chime-3", db: -17, rate: 1.24 },
  { at: 19.05, name: "minimize", db: -22 },
  // G — solar
  { at: 19.1, name: "swish-1", db: -15 },
  { at: 19.35, name: "thump", db: -18 },
  ...Array.from({ length: 5 }, (_, k): Cue => ({ at: 20.25 + k * 0.26, name: "tick-hi", db: -26, rate: 1 + k * 0.05 })),
  // H — press · turn · enjoy
  { at: 21.4, name: "swish-5", db: -14 },
  { at: 21.9, name: "button", db: -6 },
  { at: 22.0, name: "confirm-1", db: -20 },
  { at: 22.5, name: "ratchet", db: -11, trim: [0, 0.62] },
  { at: 23.1, name: "swish-classic-1", db: -15 },
  // I — brand + call to action (the song's final chord lands at 26.4 s)
  { at: 24.0, name: "paper-flutter", db: -9, trim: [0, 1.0] },
  { at: 24.6, name: "thunk", db: -10 },
  { at: 24.62, name: "shimmer", db: -21 },
  { at: 26.4, name: "confirm-2", db: -17 },
  { at: 27.4, name: "shimmer", db: -26 },
  { at: 28.9, name: "shimmer", db: -27 },
];

// The original mix was: music + 0.9 * each effect at its dB. Files are normalised, so undo that.
const volumeOf = (c: Cue, musicGain: number) => {
  const file = manifest.sfx[c.name];
  return (0.9 * 10 ** (c.db / 20) * musicGain) / file.gain;
};

const SoundEffect: React.FC<{ cue: Cue; musicGain: number }> = ({ cue, musicGain }) => {
  const base = volumeOf(cue, musicGain);
  const src = staticFile(manifest.sfx[cue.name].file);
  if (cue.loopUntil !== undefined) {
    const frames = sec(cue.loopUntil - cue.at);
    const fin = sec(cue.fadeIn ?? 0.05);
    const fout = sec(cue.fadeOut ?? 0.05);
    return (
      <Audio
        src={src}
        from={sec(cue.at)}
        durationInFrames={frames}
        loop
        loopVolumeCurveBehavior="extend"
        name={`SFX ${cue.name}`}
        volume={(f) => {
          const fadeIn = fin > 0 ? Math.min(1, f / fin) : 1;
          const fadeOut = fout > 0 ? Math.min(1, (frames - f) / fout) : 1;
          const env = cue.envelope ? cue.envelope(f / frames) : 1;
          return base * env * ease.sine(Math.max(0, Math.min(fadeIn, fadeOut)));
        }}
      />
    );
  }
  return (
    <Audio
      src={src}
      from={sec(cue.at)}
      name={`SFX ${cue.name}`}
      volume={base}
      playbackRate={cue.rate ?? 1}
      trimBefore={cue.trim ? sec(cue.trim[0]) : undefined}
      trimAfter={cue.trim ? sec(cue.trim[1]) : undefined}
    />
  );
};

/** A music edit plus its cue sheet of sound effects. `musicGain` is the edit's normalisation gain. */
export const Mix: React.FC<{ music: string; musicGain: number; cues: Cue[]; name: string }> = ({ music, musicGain, cues, name }) => (
  <>
    <Audio src={staticFile(music)} name={name} />
    {cues.map((cue, i) => (
      <SoundEffect key={i} cue={cue} musicGain={musicGain} />
    ))}
  </>
);

export const Soundtrack: React.FC = () => <Mix music="audio/music.wav" musicGain={manifest.musicGain} cues={CUES} name="Music: Hopeful (edited)" />;
