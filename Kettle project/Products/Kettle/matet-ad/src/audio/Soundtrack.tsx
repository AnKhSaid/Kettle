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

// The cue sheet. Every sound is a real recording of the thing on screen (or, for the kettle's
// beep, the pure tone a piezo beeper makes), kept quiet under the calm piano.
export const CUES: Cue[] = [
  // A — the leaf lands on the water
  { at: 1.5, name: "drop", db: -14 },
  // B — the water boils, the counter is crossed out
  { at: 2.3, name: "boil", db: 7, loopUntil: 4.8, envelope: (x) => 0.2 + 0.8 * x ** 1.5, fadeIn: 0.8, fadeOut: 0.02 },
  { at: 2.6, name: "bubbles", db: -4, loopUntil: 4.8, envelope: (x) => x ** 2, fadeIn: 0.8, fadeOut: 0.02 },
  { at: 4.19, name: "scribble", db: -9, trim: [0, 0.3] },
  { at: 4.33, name: "scribble", db: -9, trim: [0.55, 0.85] },
  // C — switched off: everything freezes, and the counter rolls down one detent per degree
  { at: 4.8, name: "switch-off", db: -7 },
  ...Array.from({ length: 23 }, (_, i): Cue => {
    const k = i + 1;
    return { at: counterTime(100 - k + 0.5), name: "detent", db: -18 - k * 0.1, trim: [0, 0.07], rate: 0.97 + (k % 3) * 0.03 };
  }),
  // D — the answer: the leaves scatter, the word is underlined
  { at: 7.2, name: "paper-flutter", db: -8, trim: [0, 0.9] },
  { at: 7.95, name: "felt-tip", db: -9, trim: [0, 0.45] },
  { at: 8.85, name: "swish-gentle", db: -14 },
  // E — the kettle is sketched, becomes real, and its display wakes up with a beep
  { at: 9.5, name: "pencil", db: -2, trim: [0.2, 1.35] },
  { at: 10.05, name: "felt-tip", db: -10 },
  { at: 10.55, name: "swish-gentle", db: -15 },
  { at: 11.35, name: "beep", db: -24 },
  // F — the gourd is set down, the kettle lifted, water poured, the kettle put back
  { at: 14.85, name: "gourd-knock", db: -14 },
  { at: 14.9, name: "steel-ting", db: -27 },
  { at: 15.1, name: "set-down", db: -21, rate: 1.15 },
  { at: 15.7, name: "water-contact", db: -14 },
  { at: 15.72, name: "stream", db: 9, loopUntil: 18.8, fadeIn: 0.15, fadeOut: 0.35 },
  { at: 18.85, name: "drop", db: -17 },
  { at: 19.05, name: "drop", db: -21, rate: 1.2 },
  { at: 19.18, name: "set-down", db: -15 },
  // G — solar: "500" is circled with a marker
  { at: 19.95, name: "felt-tip", db: -10, trim: [0, 0.5] },
  // H — press (click + beep) · turn (the dial's detents) · ready (double beep)
  { at: 21.9, name: "button-click", db: -12, trim: [0.1, 0.35] },
  { at: 22.0, name: "beep", db: -23 },
  { at: 22.5, name: "dial-ratchet", db: -2, trim: [0, 0.62] },
  { at: 23.12, name: "beep", db: -24 },
  { at: 23.35, name: "beep", db: -24 },
  // I — the leaf flies into the logo; the song's final note carries the call to action (26.4 s)
  { at: 24.0, name: "paper-flutter", db: -8, trim: [0, 1.0] },
  { at: 24.75, name: "felt-tip", db: -13, trim: [0, 0.5] },
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

export const Soundtrack: React.FC = () => <Mix music="audio/music.wav" musicGain={manifest.musicGain} cues={CUES} name="Music: Lovely Piano Song (edited)" />;
