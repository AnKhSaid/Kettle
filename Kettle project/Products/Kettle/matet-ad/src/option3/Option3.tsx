import React from "react";
import { AbsoluteFill, Sequence } from "remotion";
import manifest from "../audio/sfx-manifest.json";
import { Cue, Mix } from "../audio/Soundtrack";
import { sec } from "../lib/time";
import { Finale, Lovers, Steps } from "./Closing";
import { Design, Solar } from "./Features";
import { C3, Grain, WhipFilters } from "./kit";
import { DialShot, Hook, Reveal, Tip } from "./Opening";

// Option 3 — "bold product ad". Hard cuts on the beat; the music is "Hopeful" from bar 33, so
// its biggest entrance lands on 7.2 s and the final chord on the call to action at 26.4 s.
const SHOTS: { name: string; from: number; to: number; C: React.FC }[] = [
  { name: "A · Not just a kettle", from: 0, to: 2.4, C: Hook },
  { name: "B · Reveal", from: 2.4, to: 4.8, C: Reveal },
  { name: "C · Choose the temperature", from: 4.8, to: 7.2, C: DialShot },
  { name: "D · The pour tip", from: 7.2, to: 9.6, C: Tip },
  { name: "E · 500 W, solar", from: 9.6, to: 12.0, C: Solar },
  { name: "F · Design callouts", from: 12.0, to: 14.4, C: Design },
  { name: "G · Press, turn, enjoy", from: 14.4, to: 19.2, C: Steps },
  { name: "H · For mate lovers", from: 19.2, to: 21.6, C: Lovers },
  { name: "I · Logo and call to action", from: 21.6, to: 30, C: Finale },
];

const pops = (at: number, n: number, gap: number, db = -18): Cue[] =>
  Array.from({ length: n }, (_, i) => ({ at: at + i * gap, name: (["pop-1", "pop-2", "pop-3"] as const)[i % 3], db, rate: 1 + i * 0.06 }));

const CUES3: Cue[] = [
  // A — three close-ups on three beats, the word is struck out
  { at: 0, name: "thump", db: -11 },
  { at: 0, name: "swish", db: -13 },
  { at: 0.05, name: "pop-1", db: -17 },
  { at: 0.6, name: "swish-1", db: -13 },
  { at: 0.65, name: "pop-2", db: -17 },
  { at: 1.2, name: "swish-5", db: -13 },
  { at: 1.25, name: "pop-3", db: -17 },
  { at: 1.8, name: "scribble", db: -9, trim: [0, 0.3] },
  { at: 2.2, name: "swish-classic-1", db: -13 },
  // B — the product slams in
  { at: 2.4, name: "thunk", db: -8 },
  { at: 2.42, name: "shimmer", db: -21 },
  ...pops(3.0, 3, 0.3),
  { at: 3.7, name: "shimmer", db: -24 },
  // C — the dial counts up with ticks
  { at: 4.8, name: "select", db: -15 },
  { at: 4.95, name: "swish-gentle", db: -12 },
  ...Array.from({ length: 16 }, (_, i): Cue => ({ at: 5.2 + i * 0.068, name: "tick", db: -19 - i * 0.1, rate: 1 + i * 0.02 })),
  { at: 6.3, name: "confirm-1", db: -17 },
  { at: 6.56, name: "swish-reverse", db: -11 },
  // D — the song's big entrance: the gourd lands, the numbers flip
  { at: 7.2, name: "thump", db: -11 },
  { at: 7.22, name: "wood-knock", db: -12 },
  { at: 7.42, name: "pop-3", db: -15 },
  { at: 8.42, name: "swish-1", db: -15 },
  { at: 8.54, name: "pop-1", db: -15 },
  // E — solar
  { at: 9.6, name: "swish-gentle", db: -10 },
  { at: 9.72, name: "thump", db: -13 },
  { at: 10.02, name: "pop-2", db: -16 },
  { at: 10.62, name: "select", db: -18 },
  { at: 10.95, name: "swish-5", db: -16 },
  // F — design callouts on the half-beats
  { at: 12.0, name: "swish-classic-2", db: -12 },
  ...pops(12.05, 3, 0.15, -19),
  { at: 12.5, name: "pop-1", db: -14 },
  { at: 12.8, name: "pop-2", db: -14, rate: 1.06 },
  { at: 13.1, name: "pop-3", db: -14, rate: 1.12 },
  { at: 13.4, name: "pop-1", db: -14, rate: 1.18 },
  { at: 13.55, name: "shimmer", db: -24 },
  // G — press · turn · enjoy
  { at: 14.4, name: "swish", db: -13 },
  { at: 14.52, name: "button", db: -7 },
  { at: 15.6, name: "swish-1", db: -13 },
  { at: 15.7, name: "ratchet", db: -11, trim: [0, 0.62] },
  { at: 16.8, name: "swish-5", db: -13 },
  { at: 16.9, name: "pour", db: -15, loopUntil: 17.8, fadeIn: 0.1, fadeOut: 0.3 },
  { at: 16.95, name: "bubble", db: -18 },
  { at: 18.0, name: "minimize", db: -17 },
  { at: 18.2, name: "thump", db: -15 },
  // H — for mate lovers
  { at: 19.2, name: "swish-gentle", db: -9 },
  { at: 19.25, name: "paper-flutter", db: -15, trim: [0, 1.0] },
  { at: 19.66, name: "thunk", db: -13 },
  { at: 20.25, name: "shimmer", db: -24 },
  // I — the logo, the end card; the call to action lands on the final chord
  { at: 21.62, name: "thunk", db: -8 },
  { at: 21.64, name: "chime-3", db: -19 },
  ...pops(22.2, 3, 0.2),
  { at: 24.0, name: "swish-classic-1", db: -14 },
  { at: 24.1, name: "swish-gentle", db: -12 },
  { at: 25.2, name: "shimmer", db: -24 },
  { at: 26.4, name: "confirm-2", db: -15 },
  { at: 26.8, name: "pop-2", db: -21 },
  { at: 27.2, name: "pop-3", db: -22 },
  { at: 27.4, name: "shimmer", db: -27 },
  { at: 28.6, name: "shimmer", db: -28 },
];

export const Option3: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: C3.cream }}>
    <WhipFilters />
    {SHOTS.map(({ name, from, to, C }) => (
      <Sequence key={name} name={name} from={sec(from)} durationInFrames={sec(to - from)} premountFor={sec(0.6)}>
        <C />
      </Sequence>
    ))}
    <Grain opacity={0.09} />
    <Mix music="audio/music-3.wav" musicGain={manifest.musicGains.option3} cues={CUES3} name="Music: Hopeful from bar 33" />
  </AbsoluteFill>
);
