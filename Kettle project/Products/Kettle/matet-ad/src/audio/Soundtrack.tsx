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
  db?: number;
  /** or: peak level of the effect in the mix, in dBFS (files are normalised to 0.89) */
  level?: number;
  rate?: number;
  /** play only this part of the file, in seconds */
  trim?: [number, number];
  /** loop the file until this time (s), with an optional envelope 0..1 over the loop */
  loopUntil?: number;
  envelope?: (x: number) => number;
  fadeIn?: number;
  fadeOut?: number;
};

// The cue sheet. Each effect was generated for its moment in this ad (ElevenLabs Sound Effects,
// prompts in tools/sfx-prompts.json) and is placed so its transient lands on the frame of the
// action. `level` is the effect's peak in the mix; the piano is only a quiet bed underneath.
export const CUES: Cue[] = [
  { at: 0, name: "el-room-tone", level: -34, loopUntil: 30, fadeIn: 0.6, fadeOut: 1.0 },
  // A — the leaf lands on the water
  { at: 1.11, name: "el-leaf-drop", level: -11 },
  // B — the water boils, 100° is crossed out
  { at: 2.2, name: "el-boil-rise", level: -10, trim: [0, 2.6] },
  { at: 4.18, name: "el-marker-x", level: -12 },
  // C — switched off: time stands still while the dial clicks down to 77°
  { at: 4.75, name: "el-switch-off", level: -12 },
  { at: 4.8, name: "el-freeze-air", level: -14 },
  { at: 4.98, name: "el-detents-a", level: -14, trim: [0.8, 1.88] },
  { at: 6.0, name: "el-detents-b", level: -15, trim: [0.7, 1.88] },
  // D — the answer: leaves scatter, the ring flies to the dial
  { at: 7.12, name: "el-leaves-burst", level: -10 },
  { at: 8.82, name: "el-ring-whoosh", level: -14 },
  // E — revealed, the display wakes up, the specs appear
  { at: 10.4, name: "el-reveal-sweep", level: -14 },
  { at: 11.35, name: "el-led-beep", level: -14 },
  ...[12.0, 12.3, 12.6, 12.9].map((at): Cue => ({ at, name: "el-callout-tick", level: -20 })),
  // F — gourd set down, kettle lifted, water poured, kettle put back
  { at: 14.83, name: "el-gourd-set", level: -12 },
  { at: 15.05, name: "el-kettle-lift", level: -14 },
  { at: 15.58, name: "el-pour", level: -18 },
  { at: 19.06, name: "el-kettle-return", level: -13 },
  // G — solar: energy runs to the base
  { at: 20.2, name: "el-power-flow", level: -18 },
  // H — press · turn · ready
  { at: 21.88, name: "el-button-press", level: -12 },
  { at: 22.5, name: "el-dial-turn", level: -12, trim: [0, 0.62] },
  { at: 23.12, name: "el-ready-beep", level: -14 },
  // I — the leaf flies into the logo; the song's final note carries the call to action (26.4 s)
  { at: 24.0, name: "paper-flutter", db: -8, trim: [0, 1.0] },
];

// The piano stays a quiet bed under the effects and only comes up for the end card.
const musicVolume = (f: number) => {
  const t = f / 30;
  return 0.1 + 0.25 * Math.min(1, Math.max(0, (t - 24) / 1.5));
};

// The original mix was: music + 0.9 * each effect at its dB. Files are normalised, so undo that.
const volumeOf = (c: Cue, musicGain: number) => {
  if (c.level !== undefined) return 10 ** (c.level / 20) / 0.89;
  const file = manifest.sfx[c.name];
  return (0.9 * 10 ** ((c.db ?? 0) / 20) * musicGain) / file.gain;
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
export const Mix: React.FC<{ music: string; musicGain: number; cues: Cue[]; name: string; volume?: (frame: number) => number }> = ({ music, musicGain, cues, name, volume }) => (
  <>
    <Audio src={staticFile(music)} name={name} volume={volume} />
    {cues.map((cue, i) => (
      <SoundEffect key={i} cue={cue} musicGain={musicGain} />
    ))}
  </>
);

export const Soundtrack: React.FC = () => <Mix music="audio/music.wav" musicGain={manifest.musicGain} cues={CUES} name="Music: Lovely Piano Song (edited)" volume={musicVolume} />;
