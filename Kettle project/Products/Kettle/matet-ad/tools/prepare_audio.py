"""Prepares the audio assets that the Remotion composition plays.

Remotion mixes <Audio> elements but has no audio filters, so the parts of the soundtrack
that need processing are rendered here once:

  public/audio/music.wav      option 1: "Lovely Piano Song" (Kevin MacLeod, FreePD, CC0), calm solo piano
                              edited to picture:
                                0.0-4.8 s  the song's opening, placed so a bar starts on the freeze
                                4.8 s      the music stops and rings out in the room (time freezes)
                                ~6-7.2 s   a reversed piano swell leads back in
                                7.2 s ->   the song from bar 28 (69.14 s); its final note lands at 26.4 s
  public/audio/music-2.wav    option 2 (illustrated): the song's gentle first 11 bars, then its
                              final chord at 26.4 s (a V -> I cadence hides the jump)
  public/audio/music-3.wav    option 3 (bold product ad): the song from bar 33, so its biggest
                              entrance (bar 36) hits at 7.2 s and the final chord at 26.4 s
  public/audio/sfx/*.wav      CC0 sound effects converted to WAV, with a light room reverb
                              and any filtering/reversing baked in
  src/audio/sfx-manifest.json per-file gain so the composition can place every effect at the
                              same relative level as the original mix

Both songs are exactly 100 BPM — the same grid as the video: 30 fps, 1 beat = 18 frames,
1 bar = 72 frames. "Hopeful" has downbeats at 0.44 + 2.4*n s (measured with madmom); "Lovely
Piano Song" at 1.944 + 2.4*n s, with its final note on bar 36 (88.34 s).

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


# ---------------------------------------------------------------- music edits
song = load(os.path.join(SRC, "Hopeful - Kevin MacLeod (FreePD CC0).mp3"))
DOWN0 = 0.44
piano = load(os.path.join(SRC, "Lovely Piano Song - Kevin MacLeod (FreePD CC0).mp3"))
P_DOWN0, P_FINAL = 1.944, 1.944 + 2.4 * 36


def room_tail(x, seconds, decay, seed):
    """Convolve with a soft, decaying noise impulse: the sound ringing out in a room."""
    L = t2i(seconds)
    rng = np.random.default_rng(seed)
    ir = rng.normal(0, 1, (L, 2)) * np.exp(-np.arange(L) / SR / decay)[:, None]
    ir = signal.sosfilt(sos("lowpass", 2500, 2), ir, axis=0)
    ir /= np.sqrt((ir ** 2).sum(0))
    return np.stack([signal.fftconvolve(x[:, c], ir[:, c]) for c in range(2)], 1)


# option 1: calm piano. The song's opening (a bar starts at 2.4 s and at the 4.8 s freeze) ...
music = np.zeros((N, 2))
lead = 2.4 - P_DOWN0                                          # video time of the song's t = 0
intro = piano[:t2i(4.8 - lead)].copy()
intro[:t2i(0.3)] *= np.linspace(0, 1, t2i(0.3))[:, None]
intro[-t2i(0.05):] *= np.linspace(1, 0, t2i(0.05))[:, None]
i0 = t2i(lead)
music[i0:i0 + len(intro)] += intro
# ... at the freeze the last moment rings out in the room while everything stands still ...
held = piano[t2i(4.8 - lead - 0.35):t2i(4.8 - lead)].copy() * np.linspace(0.3, 1, t2i(0.35))[:, None]
tail = room_tail(held, 2.2, 0.55, 5)[t2i(0.35):]
tail = tail / (np.max(np.abs(tail)) + 1e-9) * np.max(np.abs(held)) * 0.7
e = min(N, t2i(4.8) + len(tail))
music[t2i(4.8):e] += tail[:e - t2i(4.8)]
# ... a reversed piano swell leads back in ...
BAR28 = P_DOWN0 + 2.4 * 28
rev = piano[t2i(BAR28):t2i(BAR28 + 1.4)][::-1].copy()
rev = room_tail(rev, 0.6, 0.18, 1)[:len(rev)]
rev = rev / (np.max(np.abs(rev)) + 1e-9) * (np.linspace(0, 1, len(rev)) ** 2.5)[:, None] * 0.35
e = t2i(7.2 - 0.02)
music[e - len(rev):e] += rev
# ... and the song returns from bar 28, so its final note lands on the call to action at 26.4 s.
main = piano[t2i(BAR28 - 0.012):t2i(BAR28 - 0.012) + N - t2i(7.2 - 0.012)]
i0 = t2i(7.2 - 0.012)
music[i0:i0 + len(main)] += main
fo = t2i(29.2)
music[fo:] *= np.linspace(1, 0, N - fo)[:, None] ** 2

os.makedirs(os.path.join(OUT, "sfx"), exist_ok=True)
music_gain = write(os.path.join(OUT, "music.wav"), music)


def fade(x, start, end, curve=2):
    """Fade x (in place) to silence between two times (s)."""
    a, b = t2i(start), min(len(x), t2i(end))
    x[a:b] *= np.linspace(1, 0, b - a)[:, None] ** curve
    x[b:] = 0
    return x


FINAL = DOWN0 + 2.4 * 44                                      # the song's final chord

# option 2: bars 0-10 (gentle opening), then the final chord at 26.4 s
m2 = np.zeros((N, 2))
head = song[t2i(DOWN0):t2i(DOWN0 + 26.4 - 0.012)].copy()   # stop just before bar 11's downbeat
head[:t2i(0.4)] *= np.linspace(0, 1, t2i(0.4))[:, None] ** 2
head[-t2i(0.06):] *= np.linspace(1, 0, t2i(0.06))[:, None]
m2[:len(head)] += head
tail = song[t2i(FINAL - 0.012):t2i(FINAL - 0.012 + DUR - 26.4 + 0.012)]
m2[t2i(26.4 - 0.012):t2i(26.4 - 0.012) + len(tail)] += tail[:N - t2i(26.4 - 0.012)]
music2_gain = write(os.path.join(OUT, "music-2.wav"), fade(m2, 29.0, 30.0))

# option 3: straight from bar 33 — bar 36 lands on 7.2 s and the final chord on 26.4 s
BAR33 = DOWN0 + 2.4 * 33
m3 = song[t2i(BAR33 - 0.008):t2i(BAR33 - 0.008) + N].copy()
m3[:t2i(0.008)] *= np.linspace(0, 1, t2i(0.008))[:, None]
music3_gain = write(os.path.join(OUT, "music-3.wav"), fade(m3, 29.0, 30.0))

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
    # realistic foley for option 1
    "switch-off": ("100-CC0-SFX__switch_01.ogg", {}),
    "detent": (M + "Ratchet_Muted_1.wav", {"hp": 400}),
    "dial-ratchet": (M + "Ratchet_Muted_4.wav", {"hp": 300}),
    "button-click": (M + "Click_Button_1.wav", {}),
    "gourd-knock": ("100-CC0-SFX__wooden_01.ogg", {"lp": 5000}),
    "steel-ting": ("BB_Retail_Therapy__Silverware_Ting_1.wav", {"lp": 9000}),
    "set-down": ("BB_Retail_Therapy__Good_Thunk_1.wav", {"lp": 3500}),
    "water-contact": (WA + "bubble_03.ogg", {"lp": 6000}),
    "stream": ("bb_-_Fans_and_Drones_(Jul_2021)__Sink_and_Faucet_10-15s.wav", {"loop": True, "lp": 7000, "hp": 180}),
    "beep": ("synth:beep", {}),
}


def beep(n=1, f=2750, dur=0.13, gap=0.1):
    """The kettle's piezo beep: a pure tone with a soft edge (n beeps)."""
    t = np.arange(t2i(dur)) / SR
    env = np.minimum(1, t / 0.004) * np.minimum(1, (dur - t) / 0.02)
    one = (np.sin(2 * np.pi * f * t) + 0.08 * np.sin(2 * np.pi * 3 * f * t)) * env
    x = np.zeros(t2i(n * dur + (n - 1) * gap))
    for k in range(n):
        a = t2i(k * (dur + gap))
        x[a:a + len(one)] += one
    return np.stack([x, x], 1)

# The original mix was: music + 0.9 * sfx (each at its dB), so every effect's volume in the
# composition is  0.9 * 10^(dB/20) * music_gain / file_gain  (see src/audio/Soundtrack.tsx).
manifest = {"musicGain": music_gain, "musicGains": {"option2": music2_gain, "option3": music3_gain}, "sfx": {}}
for name, (src, opts) in SFX.items():
    x = beep() if src == "synth:beep" else load(os.path.join(SRC, "sfx", src))
    if opts.get("hp"):
        x = signal.sosfilt(sos("highpass", opts["hp"], 2), x, axis=0)
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
print(f"music edits written (gains {music_gain:.3f}, {music2_gain:.3f}, {music3_gain:.3f}); {len(SFX)} effects")
