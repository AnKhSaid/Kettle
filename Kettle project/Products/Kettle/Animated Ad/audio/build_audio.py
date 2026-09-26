"""Builds the soundtrack for the MATET ad -> audio/mix.wav

1. Composes the score as MIDI (100 BPM, D):
     0.0-4.8   intro in maqam Hijaz: ney-like flute over a cello drone, then the boil:
               tremolo strings + an oud-style run + an accelerating darbuka roll
     4.8-7.2   "freeze": a tape-stop, a celesta countdown and suspended strings
     7.2-28.8  the drop: a warm groove (maqsum darbuka rhythm, bass, oud/qanun-style lead)
               over D - Bm - G - A, then the final D chord
2. Renders it with FluidSynth + the GeneralUser GS soundfont (in stems).
3. Synthesises every sound effect to picture (drop, boil, scribble, ticks, whooshes,
   pops, pour, steam, clicks, beeps, sparkles, impacts).
4. Mixes, applies sidechain pumping to the music, and masters with ffmpeg loudnorm.

Needs: numpy, scipy, mido, fluidsynth, ffmpeg, and GeneralUser-GS.sf2 next to this file
(https://github.com/mrbumpy409/GeneralUser-GS).
"""
import os
import subprocess
import numpy as np
import mido
from scipy import signal
from scipy.io import wavfile

HERE = os.path.dirname(os.path.abspath(__file__))
SF2 = os.path.join(HERE, 'GeneralUser-GS.sf2')
SR = 48000
DUR = 30.0
N = int(SR * DUR)
BPM = 100
BEAT = 60 / BPM                      # 0.6 s
TPB = 480
rng = np.random.default_rng(11)

NOTE = {'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11}


def m(n):
    """'F#5' -> midi number"""
    return NOTE[n[:-1]] + 12 * (int(n[-1]) + 1)


# =====================================================================
# 1. SCORE
# =====================================================================
class Score:
    def __init__(self):
        self.ev = []                  # (tick, order, channel, msg)

    def prog(self, ch, program, bank=0):
        self.ev.append((0, 0, ch, mido.Message('control_change', channel=ch, control=0, value=bank)))
        self.ev.append((0, 1, ch, mido.Message('program_change', channel=ch, program=program)))

    def cc(self, ch, beat, ctrl, val):
        self.ev.append((int(beat * TPB), 2, ch, mido.Message('control_change', channel=ch, control=ctrl, value=int(np.clip(val, 0, 127)))))

    def ramp(self, ch, b0, b1, ctrl, v0, v1, steps=24):
        for k in range(steps + 1):
            self.cc(ch, b0 + (b1 - b0) * k / steps, ctrl, v0 + (v1 - v0) * k / steps)

    def bend(self, ch, beat, val):
        self.ev.append((int(beat * TPB), 2, ch, mido.Message('pitchwheel', channel=ch, pitch=int(np.clip(val, -8192, 8191)))))

    def note(self, ch, beat, dur, pitch, vel, human=True):
        if isinstance(pitch, str):
            pitch = m(pitch)
        j = rng.integers(-6, 7) if human else 0
        v = int(np.clip(vel + (rng.integers(-5, 6) if human else 0), 1, 127))
        t0 = max(0, int(beat * TPB) + j)
        t1 = max(t0 + 10, int((beat + dur) * TPB) + j - 4)
        self.ev.append((t0, 4, ch, mido.Message('note_on', channel=ch, note=pitch, velocity=v)))
        self.ev.append((t1, 3, ch, mido.Message('note_off', channel=ch, note=pitch, velocity=0)))

    def save(self, path, channels=None):
        mf = mido.MidiFile(ticks_per_beat=TPB)
        tr = mido.MidiTrack(); mf.tracks.append(tr)
        tr.append(mido.MetaMessage('set_tempo', tempo=mido.bpm2tempo(BPM)))
        evs = sorted([e for e in self.ev if channels is None or e[2] in channels], key=lambda e: (e[0], e[1]))
        last = 0
        for t, _, _, msg in evs:
            tr.append(msg.copy(time=t - last)); last = t
        tr.append(mido.MetaMessage('end_of_track', time=TPB * 8))
        mf.save(path)


S = Score()
# channels
NEY, CELLO, TREM, OUD, QANUN, STR, BASS, PAD, CEL, DR, PIZZ, HARP, GLOCK, SLOW = 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13
for ch, p in [(NEY, 77), (CELLO, 42), (TREM, 44), (OUD, 24), (QANUN, 107), (STR, 49), (BASS, 33), (PAD, 89),
              (CEL, 8), (PIZZ, 45), (HARP, 46), (GLOCK, 9), (SLOW, 49)]:
    S.prog(ch, p)
S.prog(DR, 0)   # channel 10 = GS drum kit
# static mix (CC7 volume, CC10 pan, CC91 reverb send)
for ch, vol, pan, rev in [(NEY, 92, 58, 70), (CELLO, 88, 50, 60), (TREM, 84, 72, 70), (OUD, 104, 58, 45), (QANUN, 70, 84, 55),
                          (STR, 74, 40, 80), (BASS, 104, 64, 10), (PAD, 70, 64, 70), (CEL, 90, 76, 80), (DR, 110, 64, 25),
                          (PIZZ, 72, 44, 50), (HARP, 84, 70, 65), (GLOCK, 78, 80, 70), (SLOW, 70, 64, 90)]:
    S.cc(ch, 0, 7, vol); S.cc(ch, 0, 10, pan); S.cc(ch, 0, 91, rev); S.cc(ch, 0, 11, 110)

# ---------- drum helpers (GS standard kit) ----------
KICK, CLAP, TAMB, CRASH, HIB, LOB, MHC, LOC, SHAKER, TRI = 36, 39, 54, 49, 60, 61, 62, 64, 70, 81


def dr(beat, n, vel):
    S.note(DR, beat, .2, n, vel)


def doum(b, v=108): dr(b, LOC, v); dr(b, KICK, v - 45)
def tek(b, v=96): dr(b, HIB, v)
def ka(b, v=58): dr(b, LOB, v)


def groove(bar_beat, kind='full'):
    """one 4/4 bar of maqsum (D T - T D - T -) + modern layer; 16 sixteenth steps"""
    q = lambda s: bar_beat + s / 4
    soft = kind == 'light'
    dv = -22 if soft else 0
    doum(q(0), 110 + dv); tek(q(2), 96 + dv); tek(q(6), 92 + dv); doum(q(8), 104 + dv); tek(q(12), 96 + dv)
    ka(q(10), 52 + dv); ka(q(14), 56 + dv); ka(q(15), 46 + dv)
    for s in range(16):
        dr(q(s), SHAKER, (30 if s % 2 else 42) + dv)
    if kind in ('full', 'stab'):
        dr(q(0), KICK, 100); dr(q(8), KICK, 96); dr(q(7), KICK, 70)
        dr(q(4), CLAP, 66); dr(q(12), CLAP, 70)
        dr(q(4), TAMB, 52); dr(q(12), TAMB, 56)


def fill(bar_beat, from_step=8):
    for s in range(from_step, 16):
        b = bar_beat + s / 4
        tek(b, 70 + (s - from_step) * 6)
        if s >= 12:
            ka(b + 1 / 8, 60 + (s - 12) * 10)


# ---------- INTRO 0-2.4 s (beats 0-4): ney over a drone, in D Hijaz ----------
S.note(CELLO, 0, 8, 'D2', 70, False); S.note(CELLO, 0, 8, 'A2', 58, False)
S.ramp(CELLO, 0, 8, 11, 70, 124)
dr(0, TRI, 46)
for b, n, d, v in [(.5, 'A4', .9, 78), (1.5, 'Bb4', .45, 72), (2.0, 'A4', .5, 74), (2.5, 'G4', .5, 70),
                   (3.0, 'F#4', .5, 72), (3.5, 'Eb4', .5, 74), (4.0, 'D4', 1.6, 70)]:
    S.note(NEY, b, d, n, v)
S.ramp(NEY, 4, 5.6, 11, 110, 40)
S.note(OUD, 0, 1, 'D3', 64); S.note(OUD, 2, 1, 'A2', 58)

# ---------- BOIL 2.4-4.8 s (beats 4-8) ----------
S.note(TREM, 4, 4, 'D4', 70, False); S.note(TREM, 4, 4, 'D3', 64, False)
S.ramp(TREM, 4, 8, 11, 60, 127)
S.bend(TREM, 4, 0); [S.bend(TREM, 4 + k * .1, int(8191 * (k / 40) ** 2)) for k in range(41)]   # bends up a tone
S.note(TREM, 6, 2, 'A4', 76, False); S.note(TREM, 6.5, 1.5, 'Eb5', 72, False)
S.note(CELLO, 4, 4, 'D2', 90, False)
run = ['D4', 'Eb4', 'F#4', 'G4', 'A4', 'Bb4', 'C5', 'D5', 'Eb5', 'F#5', 'G5', 'A5']
for k, n in enumerate(run):                               # oud run up the Hijaz scale
    S.note(OUD, 5 + k * .25 * (1 - k * .02), .22, n, 78 + k * 3)
S.note(OUD, 7, .8, 'A5', 112)
# darbuka accelerating into the scribbled X (beat 7 = 4.2 s)
for b in [4, 4.5, 5, 5.5]:
    doum(b, 96) if b % 1 == 0 else tek(b, 88)
for k in range(8):
    tek(6 + k * .125, 70 + k * 5)
for k in range(8):
    dr(6.5 + k * .0625, [HIB, LOB][k % 2], 80 + k * 5)
dr(7, KICK, 127); dr(7, LOC, 127); dr(7, CRASH, 112); dr(7, 57, 80)
for k in range(16):                                       # roll into the freeze
    dr(7.02 + k * .06, [MHC, HIB][k % 2], 64 + k * 3)

# ---------- FREEZE 4.8-7.2 s (beats 8-12) ----------
S.note(SLOW, 8.2, 3.6, 'A5', 60, False); S.note(SLOW, 8.2, 3.6, 'E6', 52, False); S.note(SLOW, 9.2, 2.6, 'C#6', 50, False)
S.ramp(SLOW, 8.2, 11.7, 11, 30, 118)


def odo_time(v):   # when the odometer passes value v (100 -> 77, power2.inOut over 4.95-6.65 s)
    lo, hi = 0.0, 1.0
    for _ in range(40):
        mid = (lo + hi) / 2
        e = 2 * mid * mid if mid < .5 else 1 - (-2 * mid + 2) ** 2 / 2
        if 100 - 23 * e > v: lo = mid
        else: hi = mid
    return 4.95 + 1.7 * (lo + hi) / 2


for v, n in zip([99, 96, 93, 90, 87, 84, 81, 77.02], ['D7', 'C7', 'Bb6', 'A6', 'G6', 'F#6', 'Eb6', 'D6']):
    S.note(CEL, odo_time(v) / BEAT, .5, n, 76)

# ---------- THE DROP 7.2 s (beat 12) -> 28.8 s ----------
CH = {'D': (['D3', 'A3', 'D4', 'F#4'], 'D2', 'A1'), 'Bm': (['B2', 'F#3', 'B3', 'D4'], 'B1', 'F#2'),
      'G': (['G2', 'D3', 'G3', 'B3'], 'G1', 'D2'), 'A': (['A2', 'E3', 'A3', 'C#4'], 'A1', 'E2')}
BARS = [  # (start beat, chord, drums, melody)
    (12, 'D', 'full', [(0, 'D5', 1), (1, 'F#5', 1), (2, 'A5', 2), (4, 'F#5', 1), (5, 'E5', 1), (6, 'D5', 2)]),
    (16, 'Bm', 'full', [(0, 'B4', 2), (2, 'D5', 1), (3, 'F#5', 1), (4, 'E5', 2), (6, 'D5', 1), (7, 'C#5', 1)]),
    (20, 'G', 'full', [(0, 'B4', 1), (1, 'D5', 1), (2, 'G5', 2), (4, 'F#5', 1), (5, 'E5', 1), (6, 'D5', 1), (7, 'B4', 1)]),
    (24, 'A', 'light', None),                                           # the pour: harp instead
    (28, 'D', 'light', [(0, 'A5', 2), (2, 'F#5', 1), (3, 'A5', 1), (4, 'D6', 2), (6, 'C#6', 1), (7, 'A5', 1)]),
    (32, 'Bm', 'full', [(0, 'B5', 1), (1, 'A5', 1), (2, 'F#5', 2), (4, 'D5', 1), (5, 'E5', 1), (6, 'F#5', 2)]),
    (36, 'G', 'stab', [(0, 'G5', 3), (4, 'D5', 2), (6, 'B4', 2)]),
    (40, 'D', 'full', [(0, 'D6', 2), (2, 'A5', 1), (3, 'D6', 1), (4, 'F#6', 2), (6, 'E6', 1), (7, 'D6', 1)]),
]
SCALE = [m(x) for x in ['C#4', 'D4', 'E4', 'F#4', 'G4', 'A4', 'B4', 'C#5', 'D5', 'E5', 'F#5', 'G5', 'A5', 'B5', 'C#6', 'D6', 'E6', 'F#6', 'G6', 'A6']]


def upper(p):
    for s in SCALE:
        if s > p: return s
    return p + 2


def lead(bar, mel, qanun=True, oct_q=12, vel=92):
    for pos, n, d in mel:
        b = bar + pos / 2
        p = m(n)
        if d >= 2:                                   # oud-style: grace note + risha tremolo on long notes
            S.note(OUD, b - .09, .08, upper(p), vel - 30)
            for k in range(d * 2):
                S.note(OUD, b + k / 4, .24, p, vel - (0 if k == 0 else 26 + k * 2))
        else:
            S.note(OUD, b, d / 2 * .95, p, vel)
        if qanun:
            S.note(QANUN, b, d / 2 * .9, p + oct_q, 62)


for bar, chord, kind, mel in BARS:
    voices, root, fifth = CH[chord]
    for v in voices:
        S.note(PAD, bar, 4, v, 62, False)
    if bar >= 16 and kind != 'light':
        for v in voices[1:]:
            S.note(STR, bar, 4, m(v) + 12, 54, False)
    # bass
    R, F = m(root), m(fifth)
    for s, p, d in [(0, R, 3), (3, R, 2), (6, F, 2), (8, R + 12, 2), (10, R, 2), (14, F, 2)]:
        S.note(BASS, bar + s / 4, d / 4 * .9, p, 100 if s == 0 else 84)
    groove(bar, kind)
    if mel:
        lead(bar, mel, qanun=bar in (12, 16, 20, 32, 40), oct_q=0 if bar == 40 else 12, vel=84 if kind == 'light' else 94)

dr(12, CRASH, 118); dr(12, KICK, 124)                    # the drop
# callout plucks (12.0 / 12.45 / 12.9 / 13.35 s)
for t, n in zip([12.0, 12.45, 12.9, 13.35], ['D6', 'F#6', 'A6', 'D7']):
    S.note(GLOCK, t / BEAT, .5, n, 70)
# pizzicato counter line in the G bar
for k, n in enumerate(['G3', 'B3', 'D4', 'B3', 'G3', 'B3', 'D4', 'G4']):
    S.note(PIZZ, 20 + k * .5, .4, n, 72)
# the pour: harp arpeggios over A (beats 24-28)
for k, n in enumerate(['A3', 'C#4', 'E4', 'A4', 'C#5', 'E5', 'A5', 'E5', 'C#5', 'A4', 'E4', 'C#4', 'A3', 'E4', 'A4', 'C#5']):
    S.note(HARP, 24 + k * .25, .6, n, 70 - (k % 4) * 4)
# badge dings (16.8, 17.4, 18.0 s = beats 28, 29, 30)
for b, n in zip([28, 29, 30], ['F#6', 'A6', 'D7']):
    S.note(GLOCK, b, 1.2, n, 92)
# solar (19.2 s, beat 32): strings swell
for v in ['B3', 'D4', 'F#4', 'B4']:
    S.note(SLOW, 32, 4, v, 70, False)
S.ramp(SLOW, 32, 34, 11, 40, 115)
# how-to stabs (21.85 / 22.45 / 23.2 s)
for t in [21.85, 22.45, 23.2]:
    for v in ['G3', 'B3', 'D4']:
        S.note(PIZZ, t / BEAT, .3, v, 90)
# logo (24.0 s, beat 40)
dr(40, CRASH, 110)
for k, n in enumerate(['D5', 'F#5', 'A5', 'D6']):
    S.note(GLOCK, 40.9 + k * .12, 1.5, n, 74)
# last bar 26.4-28.8 (beats 44-48): G | A, fill, then the final D
for bar, chord in [(44, 'G'), (46, 'A')]:
    voices, root, fifth = CH[chord]
    for v in voices:
        S.note(PAD, bar, 2, v, 66, False); S.note(STR, bar, 2, m(v) + 12, 62, False)
    for s, p in [(0, m(root)), (3, m(root)), (6, m(fifth))]:
        S.note(BASS, bar + s / 4, .45, p, 96)
q = lambda s: 44 + s / 4
doum(q(0), 110); tek(q(2), 96); tek(q(6), 92); dr(q(0), KICK, 100); dr(q(4), CLAP, 68)
for s in range(16): dr(q(s), SHAKER, 38)
fill(44, 8)
lead(44, [(0, 'B5', 1), (1, 'D6', 1), (2, 'G5', 2), (4, 'C#6', 1), (5, 'E6', 1), (6, 'A5', 1), (7, 'C#6', 1)], qanun=False)
S.ramp(STR, 44, 48, 11, 80, 127)
# final chord at 28.8 s (beat 48)
for v in ['D2', 'A2', 'D3', 'F#3', 'A3', 'D4']:
    S.note(PAD, 48, 3, v, 80, False)
for v in ['A4', 'D5', 'F#5', 'A5']:
    S.note(STR, 48, 2.6, v, 76, False)
for k, v in enumerate(['D3', 'A3', 'D4', 'F#4', 'A4', 'D5']):
    S.note(OUD, 48 + k * .035, 2.4, v, 96 - k * 4)
S.note(QANUN, 48, 2, 'D6', 70); S.note(GLOCK, 48, 2.2, 'D6', 80)
S.note(BASS, 48, 2.5, 'D1', 110, False); S.note(BASS, 48, 2.5, 'D2', 90, False)
dr(48, KICK, 127); dr(48, LOC, 124); dr(48, CRASH, 116)
S.ramp(PAD, 48, 50, 11, 110, 0); S.ramp(STR, 48, 50, 11, 127, 0)

# ---------- render stems ----------
STEMS = {
    'intro': None,                     # beats < 8 (everything before the freeze)
    'drums': [DR],
    'bass': [BASS],
    'keys': [NEY, CELLO, TREM, OUD, QANUN, STR, PAD, CEL, PIZZ, HARP, GLOCK, SLOW],
}


def render_stem(name, chans, beat_lo=None, beat_hi=None):
    sub = Score()
    lo, hi = (beat_lo or 0) * TPB, (beat_hi or 1e9) * TPB
    for e in S.ev:
        if chans is not None and e[2] not in chans: continue
        msg = e[3]
        if msg.type in ('note_on', 'note_off'):
            # keep notes whose note-on is inside the window (match offs by pairing below)
            pass
        sub.ev.append(e)
    # window notes by their start
    keep, starts = [], {}
    for e in sorted(sub.ev, key=lambda e: (e[0], e[1])):
        msg = e[3]
        if msg.type == 'note_on':
            if lo <= e[0] < hi:
                starts[(msg.channel, msg.note)] = starts.get((msg.channel, msg.note), 0) + 1
                keep.append(e)
        elif msg.type == 'note_off':
            k = (msg.channel, msg.note)
            if starts.get(k, 0) > 0:
                starts[k] -= 1; keep.append(e)
        else:
            keep.append(e)
    sub.ev = keep
    mid = os.path.join(HERE, f'_{name}.mid'); wav = os.path.join(HERE, f'_{name}.wav')
    sub.save(mid)
    subprocess.run(['fluidsynth', '-ni', '-q', '-g', '0.5', '-r', str(SR), '-F', wav,
                    '-o', 'synth.reverb.active=1', '-o', 'synth.reverb.room-size=0.62', '-o', 'synth.reverb.damp=0.35',
                    '-o', 'synth.reverb.width=0.9', '-o', 'synth.reverb.level=0.55', '-o', 'synth.chorus.active=0',
                    '-o', 'synth.polyphony=512', SF2, mid], check=True, capture_output=True)
    sr, x = wavfile.read(wav)
    x = x.astype(np.float64) / 32768.0
    if x.ndim == 1: x = np.stack([x, x], 1)
    out = np.zeros((N, 2)); n = min(N, len(x)); out[:n] = x[:n]
    os.remove(mid); os.remove(wav)
    return out


# =====================================================================
# 2. SOUND DESIGN
# =====================================================================
def t2i(t): return int(round(t * SR))


def butter(kind, f, order=4):
    return signal.butter(order, f, btype=kind, fs=SR, output='sos')


def filt(x, kind, f, order=4):
    return signal.sosfilt(butter(kind, f, order), x)


def env(n, a, r, curve=2.0):
    """attack/release envelope in samples-length n (a, r as fractions of n)"""
    t = np.linspace(0, 1, n)
    e = np.ones(n)
    ai, ri = max(1, int(a * n)), max(1, int(r * n))
    e[:ai] = np.linspace(0, 1, ai) ** curve
    e[-ri:] *= np.linspace(1, 0, ri) ** curve
    return e


def swept_bp(x, fc, bw=0.8, block=256):
    """band-pass with a time-varying centre frequency fc[i] (per sample array)"""
    y = np.zeros_like(x); zi = None
    for i in range(0, len(x), block):
        f = float(np.clip(fc[min(i, len(fc) - 1)], 60, SR / 2 * 0.9))
        lo, hi = f / (1 + bw), min(f * (1 + bw), SR / 2 * 0.95)
        sos = signal.butter(2, [lo, hi], btype='bandpass', fs=SR, output='sos')
        if zi is None: zi = signal.sosfilt_zi(sos) * 0
        y[i:i + block], zi = signal.sosfilt(sos, x[i:i + block], zi=zi)
    return y


def pan2(x, p):
    """p in [-1, 1] (scalar or per-sample)"""
    a = (np.asarray(p) + 1) * np.pi / 4
    return np.stack([x * np.cos(a), x * np.sin(a)], 1)


SFX = np.zeros((N, 2))


def put(at, x, db=0.0, p=0.0):
    if x.ndim == 1: x = pan2(x, p)
    i = t2i(at); g = 10 ** (db / 20)
    n = min(len(x), N - i)
    if n > 0: SFX[i:i + n] += x[:n] * g


def whoosh(dur, f0=300, f1=2600, f2=500, peak=.6, bw=.9, p0=-.5, p1=.5):
    n = t2i(dur); t = np.linspace(0, 1, n)
    fc = np.where(t < peak, f0 * (f1 / f0) ** (t / peak), f1 * (f2 / f1) ** ((t - peak) / (1 - peak)))
    x = swept_bp(rng.normal(0, 1, n), fc, bw)
    e = np.where(t < peak, (t / peak) ** 2.2, ((1 - t) / (1 - peak)) ** 1.6)
    x = x * e
    return pan2(x / (np.max(np.abs(x)) + 1e-9), p0 + (p1 - p0) * t)


def plip(f0=500, f1=1700, dur=.09, dec=.035):
    n = t2i(dur); t = np.arange(n) / SR
    f = f0 * (f1 / f0) ** np.clip(t / (dur * .6), 0, 1)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / dec) * np.clip(t / .002, 0, 1)
    return x


def bubbles(dur, rate0, rate1, fmin=350, fmax=1300, seed=0):
    r = np.random.default_rng(seed); n = t2i(dur); x = np.zeros(n)
    t = 0.0
    while t < dur:
        rate = rate0 + (rate1 - rate0) * (t / dur)
        t += r.exponential(1 / max(rate, .1))
        f0 = r.uniform(fmin, fmax)
        b = plip(f0, f0 * r.uniform(1.8, 3.2), r.uniform(.04, .1), r.uniform(.012, .04)) * r.uniform(.2, 1)
        i = t2i(t)
        k = min(len(b), n - i)
        if k > 0: x[i:i + k] += b[:k]
    return x


def click(f=3200, dec=.006, body=900, level_body=.5):
    n = t2i(.05); t = np.arange(n) / SR
    x = rng.normal(0, 1, n) * np.exp(-t / .0012)
    x += np.sin(2 * np.pi * f * t) * np.exp(-t / dec) * .8
    x += np.sin(2 * np.pi * body * t) * np.exp(-t / .008) * level_body
    return filt(x, 'highpass', 300, 2)


def pop(f0=900, f1=260, dur=.12):
    n = t2i(dur); t = np.arange(n) / SR
    f = f1 + (f0 - f1) * np.exp(-t / .018)
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = (np.sin(ph) + .25 * np.sin(2 * ph)) * np.exp(-t / .045) * np.clip(t / .0015, 0, 1)
    return x


def boom(dur=1.6, f0=70, f1=32, noise=.25):
    n = t2i(dur); t = np.arange(n) / SR
    f = f1 + (f0 - f1) * np.exp(-t / .12)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / .45)
    nz = filt(rng.normal(0, 1, n), 'lowpass', 900, 2) * np.exp(-t / .05) * noise
    snap = filt(rng.normal(0, 1, n), 'highpass', 2500, 2) * np.exp(-t / .015) * .3
    return x + nz + snap


def reverse_cymbal(dur):
    n = t2i(dur); t = np.linspace(0, 1, n)
    x = filt(rng.normal(0, 1, n), 'highpass', 3500, 4) + .4 * filt(rng.normal(0, 1, n), 'bandpass', [900, 3000], 2)
    return x * (t ** 3.2)


def scribble(dur, seed=1):
    r = np.random.default_rng(seed); n = t2i(dur); t = np.arange(n) / SR
    x = filt(r.normal(0, 1, n), 'bandpass', [1400, 6500], 2)
    am = .55 + .45 * np.sin(2 * np.pi * (22 + 8 * np.sin(t * 9)) * t)
    return x * am * env(n, .12, .25, 1)


def sparkle(dur, count, fmin=2500, fmax=7000, seed=3):
    r = np.random.default_rng(seed); n = t2i(dur); x = np.zeros((n, 2))
    for k in range(count):
        at = r.uniform(0, dur * .85); f = r.uniform(fmin, fmax)
        m_ = t2i(.35); tt = np.arange(m_) / SR
        s = np.sin(2 * np.pi * f * tt) * np.exp(-tt / r.uniform(.05, .14)) * r.uniform(.3, 1)
        i = t2i(at); k2 = min(m_, n - i)
        x[i:i + k2] += pan2(s[:k2], r.uniform(-.8, .8))
    return x


def beep(freqs=(1850, 2470), each=.06, gap=.02):
    out = []
    for f in freqs:
        n = t2i(each); t = np.arange(n) / SR
        out += [np.sin(2 * np.pi * f * t) * env(n, .08, .3, 1), np.zeros(t2i(gap))]
    return np.concatenate(out)


def hiss(dur, lo=3500, hi=11000):
    n = t2i(dur); t = np.linspace(0, 1, n)
    x = filt(rng.normal(0, 1, n), 'bandpass', [lo, hi], 2)
    return x * (.6 + .4 * np.sin(2 * np.pi * 1.3 * t * dur)) * env(n, .2, .3, 1.5)


def pour(dur):
    n = t2i(dur); t = np.arange(n) / SR
    stream = filt(rng.normal(0, 1, n), 'bandpass', [600, 3800], 2)
    mod = .7 + .3 * filt(rng.normal(0, 1, n), 'lowpass', 6, 1) * 8
    stream *= np.clip(mod, .2, 1.3)
    b = bubbles(dur, 50, 70, 700, 2400, seed=9) * .6
    x = stream * .5 + b
    return x * env(n, .06, .12, 1.2)


def zap(dur=.12):
    n = t2i(dur); t = np.arange(n) / SR
    x = np.sign(np.sin(2 * np.pi * (180 + 900 * t) * t)) * (rng.random(n) > .6)
    return filt(x.astype(float), 'bandpass', [1500, 7000], 2) * np.exp(-t / .04)


def ratchet(dur, count):
    x = np.zeros(t2i(dur))
    for k in range(count):
        c = click(2600 + rng.uniform(-200, 200), .004, 1400, .3) * rng.uniform(.6, 1)
        i = t2i(dur * k / count); kk = min(len(c), len(x) - i); x[i:i + kk] += c[:kk]
    return x


def thud(f=170, dur=.3):
    n = t2i(dur); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * f * t) + .5 * np.sin(2 * np.pi * f * 2.4 * t) * np.exp(-t / .03)) * np.exp(-t / .07)


def flutter(dur):
    n = t2i(dur); t = np.linspace(0, dur, n)
    x = filt(rng.normal(0, 1, n), 'bandpass', [700, 3000], 2)
    return pan2(x * (.5 + .5 * np.sin(2 * np.pi * 14 * t) ** 2) * env(n, .3, .4, 1.5), np.linspace(.7, 0, n))


def rumble(dur):
    n = t2i(dur); t = np.linspace(0, 1, n)
    x = filt(rng.normal(0, 1, n), 'lowpass', 220, 3)
    return x * (t ** 1.4)


# ---------- the cue sheet (seconds match js/main.js) ----------
# A: the leaf lands on water
put(1.50, plip(420, 1500, .12, .05), -4)
put(1.53, bubbles(.35, 14, 4, 500, 1400, seed=2) * .5, -12)
put(1.50, sparkle(1.0, 6, 3000, 6000, seed=4), -22)
# B: boil
put(2.25, whoosh(.7, 200, 1600, 900, .8, 1.0, -.2, .2), -9)
put(2.40, rumble(2.4) * 2.2, -8)
put(2.40, bubbles(2.4, 6, 90, 250, 1100, seed=5) * .55, -8)
put(4.20, scribble(.15, 1), -10, -.3); put(4.33, scribble(.15, 2), -10, .3)
put(4.20, boom(.9, 90, 40, .4), -6)
# C: freeze + countdown
put(4.80, boom(2.2, 60, 28, .15), -5)
put(4.80, sparkle(1.4, 14, 4000, 9000, seed=6), -18)
prev = 100
for k in range(1, 24):   # one tick per degree
    v = 100 - k
    put(odo_time(v + .5), click(3400 - k * 45, .005, 1100, .35), -15 - k * .15)
put(6.55, pan2(reverse_cymbal(.62), 0), -9)
# D: the drop
put(7.20, boom(1.6, 75, 32, .3), -3)
put(7.20, sparkle(1.3, 24, 2500, 8000, seed=7), -17)
put(8.85, whoosh(.75, 400, 3000, 700, .5, .9, -.3, .6), -12)
# E: sketch -> 3D, callouts
for i in range(8):
    put(9.5 + i * .12, scribble(.5, 10 + i) * .8, -20, (i % 3 - 1) * .4)
put(10.55, whoosh(.8, 600, 5000, 3000, .85, .7, 0, 0), -13)
put(10.7, sparkle(.8, 12, 3500, 8000, seed=8), -18)
put(11.35, beep((2100,), .07), -16)
for k, t in enumerate([12.0, 12.45, 12.9, 13.35]):
    put(t, pop(700 + k * 120, 240 + k * 40, .12), -9, [-.5, .5, .5, -.5][k])
put(14.05, whoosh(.3, 1500, 800, 400, .3, .8, 0, 0), -18)
# F: pour
put(14.30, whoosh(.9, 250, 1800, 500, .55, .9, .6, -.4), -12)
put(14.60, thud(160, .35), -8, -.4); put(14.62, pop(520, 200, .1), -14, -.4)
put(15.05, whoosh(.8, 200, 900, 300, .6, .8, 0, -.2), -20)
put(15.70, pour(3.1), -8, -.35)
put(15.75, bubbles(.4, 60, 20, 500, 1500, seed=12) * .5, -12, -.35)
put(16.30, pan2(hiss(3.0), -.3), -26)
put(19.05, pop(420, 200, .1), -14, -.4)
# G: solar
put(19.10, whoosh(.8, 300, 2200, 600, .5, .9, -.3, .3), -12)
put(19.20, sparkle(1.2, 10, 2000, 5000, seed=13), -18)
put(19.35, boom(.8, 80, 45, .2), -10)
put(19.90, whoosh(.5, 800, 4000, 2000, .6, .5, -.6, .2), -18)
for k in range(5):
    put(20.2 + k * .26, zap(), -20, -.5 + k * .2)
# H: press - turn - enjoy
put(21.40, whoosh(.6, 300, 2500, 800, .55, .9, .4, -.2), -10)
put(21.85, click(1800, .01, 220, 1.0) * 1.3, -7)
put(21.95, beep((1500, 2250)), -15)
put(22.45, ratchet(.7, 16), -12, .2)
put(23.20, whoosh(.8, 900, 2800, 300, .4, .9, -.2, .2), -11)
put(23.35, pan2(hiss(.9, 2500, 9000), 0), -22)
# I: brand + CTA
put(24.00, flutter(.9), -15)
put(24.60, thud(120, .4), -7); put(24.62, pop(900, 300, .12), -12)
put(25.05, boom(.6, 90, 55, .15), -14)
put(26.10, pop(760, 280, .13), -9)
put(26.80, sparkle(.8, 10, 3000, 8000, seed=15), -17)
put(28.30, sparkle(.8, 10, 3000, 8000, seed=16), -17)
put(28.80, boom(2.0, 65, 30, .25), -4)


# ---------- reverb for the SFX bus ----------
def reverb(x, rt=.9, seed=0):
    r = np.random.default_rng(seed); L = t2i(rt * 1.6); tt = np.arange(L) / SR
    out = np.zeros_like(x)
    for c in range(2):
        ir = r.normal(0, 1, L) * np.exp(-tt * 6.9 / rt)
        ir = filt(ir, 'lowpass', 6000, 2); ir[:t2i(.01)] = 0; ir /= np.sqrt(np.sum(ir ** 2))
        out[:, c] = signal.fftconvolve(x[:, c], ir)[:len(x)]
    return out


SFX = SFX + reverb(SFX, .8, 5) * .22

# =====================================================================
# 3. MIX + MASTER
# =====================================================================
print('rendering stems with fluidsynth…')
intro = render_stem('intro', None, 0, 8)
drums = render_stem('drums', [DR], 8, None)
bass = render_stem('bass', [BASS], 8, None)
keys = render_stem('keys', STEMS['keys'], 8, None)

# tape-stop the intro into the freeze (4.55 -> 4.8 s), then cut it
a, b = t2i(4.55), t2i(4.80)
seg_n = b - a
rate = np.linspace(1, 0, seg_n)
pos = a + np.cumsum(rate)
ts = np.zeros((seg_n, 2))
for c in range(2):
    ts[:, c] = np.interp(pos, np.arange(len(intro)), intro[:, c])
intro[a:b] = ts * np.linspace(1, .6, seg_n)[:, None]
intro[b:] = 0

# sidechain pump: duck bass/keys under each kick of the groove
kick_times = [e[0] / TPB * BEAT for e in S.ev if e[3].type == 'note_on' and e[2] == DR and e[3].note == KICK and e[0] / TPB >= 12]
duck = np.ones(N)
for kt in kick_times:
    i = t2i(kt); L = t2i(.28); k = min(L, N - i)
    if k > 0: duck[i:i + k] = np.minimum(duck[i:i + k], 1 - .32 * np.exp(-np.arange(k) / SR / .09))
music = intro + drums * 1.0 + bass * duck[:, None] * 1.05 + keys * duck[:, None] * 1.0
music = filt(music.T, 'highpass', 28, 2).T

mix = music * 0.9 + SFX * 0.75
# fade the tail
mix[t2i(29.3):] *= np.linspace(1, 0, N - t2i(29.3))[:, None] ** 1.5
peak = np.max(np.abs(mix)); mix = mix / peak * 0.7

pre = os.path.join(HERE, '_premaster.wav')
wavfile.write(pre, SR, (mix * 32767).astype(np.int16))
for name, x in [('stem_music', music), ('stem_sfx', SFX)]:
    wavfile.write(os.path.join(HERE, f'{name}.wav'), SR, (np.clip(x / (np.max(np.abs(x)) + 1e-9) * .8, -1, 1) * 32767).astype(np.int16))

# master: gentle glue compression + limiter + loudness to -14 LUFS / -1 dBTP
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', pre, '-af',
                'acompressor=threshold=-18dB:ratio=2.5:attack=15:release=180:makeup=2,'
                'alimiter=limit=0.89:attack=4:release=60,'
                'loudnorm=I=-14:TP=-1.2:LRA=9',
                '-ar', str(SR), '-c:a', 'pcm_s16le', os.path.join(HERE, 'mix.wav')], check=True)
os.remove(pre)
print('wrote audio/mix.wav')
