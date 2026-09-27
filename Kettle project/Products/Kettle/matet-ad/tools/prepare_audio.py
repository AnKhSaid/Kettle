"""Prepares the audio assets that the Remotion composition plays.

Remotion mixes <Audio> elements but has no audio filters, so the parts of the soundtrack
that need processing are rendered here once:

  public/audio/music.wav      "Hopeful" (Kevin MacLeod, FreePD, CC0) edited to picture:
                                0.0-4.8 s  the song's first bars, muffled by a low-pass that opens up
                                4.55-4.8 s tape-stop into the freeze (silence until 7.2 s)
                                ~5.6-7.2 s reversed swell of the drop bar
                                7.2 s ->   the song from bar 36 (86.84 s) to its own ending;
                                           the final chord lands at 26.4 s
  public/audio/sfx/*.wav      CC0 sound effects converted to WAV, with a light room reverb
                              and any filtering/reversing baked in
  src/audio/sfx-manifest.json per-file gain so the composition can place every effect at the
                              same relative level as the original mix

The song is exactly 100 BPM (downbeats at 0.44 + 2.4*n s, measured with madmom), the same
grid as the video: 30 fps, 1 beat = 18 frames, 1 bar = 72 frames.

Run from the project root:  python3 tools/prepare_audio.py   (needs numpy, scipy, librosa)
"""
import json
import os

import librosa
import numpy as np
from scipy import signal
from scipy.io import wavfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "audio-src")
OUT = os.path.join(ROOT, "public", "audio")
SR = 48000
DUR = 30.0
N = int(SR * DUR)


def t2i(t):
    return int(round(t * SR))


def load(path):
    y, _ = librosa.load(path, sr=SR, mono=False)
    if y.ndim == 1:
        y = np.stack([y, y])
    return y.T.astype(np.float64)


def sos(kind, f, order=4):
    return signal.butter(order, f, btype=kind, fs=SR, output="sos")


def write(path, x, peak=0.89):
    """Write 16-bit WAV normalised to `peak`; returns the gain applied."""
    g = peak / (np.max(np.abs(x)) + 1e-12)
    wavfile.write(path, SR, (np.clip(x * g, -1, 1) * 32767).astype(np.int16))
    return g


# ---------------------------------------------------------------- music edit
song = load(os.path.join(SRC, "Hopeful - Kevin MacLeod (FreePD CC0).mp3"))
music = np.zeros((N, 2))

DOWN0, BAR36 = 0.44, 86.84
intro = song[t2i(DOWN0 - 0.25):t2i(DOWN0 + 4.8)].copy()
t = np.arange(len(intro)) / SR - 0.25
cutoff = np.interp(t, [0, 2.3, 4.5], [650, 900, 3200])
out = np.zeros_like(intro)
zi = None
for i in range(0, len(intro), 512):
    s = sos("lowpass", float(cutoff[min(i, len(cutoff) - 1)]), 4)
    if zi is None:
        zi = np.zeros((s.shape[0], 2, 2))
    for c in range(2):
        out[i:i + 512, c], zi[:, c] = signal.sosfilt(s, intro[i:i + 512, c], zi=zi[:, c])
gain = np.interp(t, [-0.25, 0.3, 2.3, 4.5], [0, .42, .5, .95]) ** 1.3
intro = out * gain[:, None]
a, b = t2i(4.55 + 0.25), t2i(4.8 + 0.25)                     # tape-stop
pos = a + np.cumsum(np.linspace(1, 0, b - a) ** 1.2)
intro[a:b] = np.stack([np.interp(pos, np.arange(len(intro)), intro[:, c]) for c in range(2)], 1) * np.linspace(1, .4, b - a)[:, None]
intro[b:] = 0
music[:len(intro) - t2i(0.25)] += intro[t2i(0.25):]

main = song[t2i(BAR36 - 0.012):t2i(BAR36 - 0.012 + DUR - 7.2 + 0.012)]
i0 = t2i(7.2 - 0.012)
music[i0:i0 + len(main)] += main

rev = song[t2i(BAR36):t2i(BAR36 + 1.6)][::-1].copy()          # reversed swell into the drop
rev = signal.sosfilt(sos("lowpass", 3500, 2), rev, axis=0)
L = t2i(0.35)
ir = np.random.default_rng(1).normal(0, 1, (L, 2)) * np.exp(-np.arange(L) / SR / .12)[:, None]
rev = np.stack([signal.fftconvolve(rev[:, c], ir[:, c])[:len(rev)] for c in range(2)], 1)
rev = rev / (np.max(np.abs(rev)) + 1e-9) * (np.linspace(0, 1, len(rev)) ** 3)[:, None] * 0.55
e = t2i(7.2 - 0.03)
music[e - len(rev):e] += rev

fo = t2i(29.0)
music[fo:] *= np.linspace(1, 0, N - fo)[:, None] ** 2

os.makedirs(os.path.join(OUT, "sfx"), exist_ok=True)
music_gain = write(os.path.join(OUT, "music.wav"), music)

# ---------------------------------------------------------------- sound effects
L = t2i(0.6)
room_ir = np.random.default_rng(3).normal(0, 1, (L, 2)) * np.exp(-np.arange(L) / SR / .14)[:, None]
room_ir = signal.sosfilt(sos("lowpass", 5000, 2), room_ir, axis=0)
room_ir[:t2i(.008)] = 0
room_ir /= np.sqrt((room_ir ** 2).sum(0))


def room(x, wet=0.12):
    wetsig = np.stack([signal.fftconvolve(x[:, c], room_ir[:, c]) for c in range(2)], 1)
    dry = np.zeros_like(wetsig)
    dry[:len(x)] = x
    return dry + wetsig * wet


P = "bb_-_Books,_Paper,_Writing_(Jan_2021)__"
W = "Micro_Pack_-_Organic_Wooshes__"
K = "kenney_interfacesounds__Audio__"
KI = "kenney_impactsounds__Audio__"
WA = "40-cc0-water-splash-slime-sfx__"
M = "bb_-_Smol_Mechanisms_(May_2021)__"
# name: (source file, processing)
SFX = {
    "drop": (WA + "bubble_02.ogg", {}),
    "splash": (WA + "splash_09.ogg", {"lp": 6000}),
    "boil": ("30-cc0-sfx-loops__water_boiling.ogg", {"loop": True}),
    "bubbles": (WA + "loop_bubbles_02.ogg", {"loop": True}),
    "scribble": (P + "Thicc_Tip_Scribbles_2.wav", {}),
    "bell": (KI + "impactBell_heavy_000.ogg", {"lp": 2500}),
    "glass-tick": (KI + "impactGlass_light_001.ogg", {}),
    "tick": (K + "tick_004.ogg", {}),
    "tick-hi": (K + "tick_001.ogg", {}),
    "swish-reverse": (W + "Swish_3.wav", {"reverse": True}),
    "swish": (W + "Swish_3.wav", {}),
    "swish-1": (W + "Swish_1.wav", {}),
    "swish-5": (W + "Swish_5.wav", {}),
    "swish-classic-1": (W + "Classic_Swish_1.wav", {}),
    "swish-classic-2": (W + "Classic_Swish_2.wav", {}),
    "swish-gentle": (W + "Gentle_Swish.wav", {}),
    "twirl": (W + "Twirl_Smol_2.wav", {}),
    "thunk": (W + "Thunk_2.wav", {}),
    "thump": (KI + "impactSoft_medium_001.ogg", {}),
    "pencil": (P + "Mech_Pencil_Lines_2.wav", {}),
    "felt-tip": (P + "Fine_Felt_Tip_Lines.wav", {}),
    "shimmer": (K + "glass_004.ogg", {"lp": 9000}),
    "select": (K + "select_002.ogg", {}),
    "pop-1": (K + "drop_002.ogg", {}),
    "pop-2": (K + "drop_003.ogg", {}),
    "pop-3": (K + "drop_004.ogg", {}),
    "minimize": (K + "minimize_003.ogg", {}),
    "wood-knock": (KI + "impactWood_light_002.ogg", {}),
    "pour": (WA + "loop_water_02.ogg", {"loop": True}),
    "bubble": (WA + "bubble_01.ogg", {}),
    "chime-1": (K + "glass_001.ogg", {}),
    "chime-2": (K + "glass_005.ogg", {}),
    "chime-3": (K + "glass_006.ogg", {}),
    "button": (M + "Click_Button_2.wav", {}),
    "confirm-1": (K + "confirmation_001.ogg", {}),
    "confirm-2": (K + "confirmation_002.ogg", {}),
    "ratchet": (M + "Ratchet_Muted_3.wav", {}),
    "paper-flutter": ("Micro_Pack_-_Paper_Cutter__Paper_Flutter.wav", {}),
}

# The original mix was: music + 0.9 * sfx (each at its dB), so every effect's volume in the
# composition is  0.9 * 10^(dB/20) * music_gain / file_gain  (see src/audio/Soundtrack.tsx).
manifest = {"musicGain": music_gain, "sfx": {}}
for name, (src, opts) in SFX.items():
    x = load(os.path.join(SRC, "sfx", src))
    if opts.get("reverse"):
        x = x[::-1].copy()
    if opts.get("lp"):
        x = signal.sosfilt(sos("lowpass", opts["lp"], 2), x, axis=0)
    if not opts.get("loop"):
        x = room(x)
    g = write(os.path.join(OUT, "sfx", f"{name}.wav"), x)
    manifest["sfx"][name] = {"file": f"audio/sfx/{name}.wav", "gain": g, "seconds": round(len(x) / SR, 3)}

with open(os.path.join(ROOT, "src", "audio", "sfx-manifest.json"), "w") as f:
    json.dump(manifest, f, indent=1)
print(f"music.wav written (gain {music_gain:.3f}); {len(SFX)} effects")
