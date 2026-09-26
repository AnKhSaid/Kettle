"""Builds the soundtrack for the MATET ad -> audio/mix.wav

Music: "Hopeful" by Kevin MacLeod (FreePD, CC0 / public domain). It is exactly 100 BPM in 4/4,
with downbeats at 0.44 + 2.4*n s (measured with madmom), which is the same grid as the video.
Edit to picture:
    0.0 - 4.8   the song's opening bars, muffled (low-pass) and quiet, opening up as the water boils
    4.55 - 4.8  tape-stop into the freeze
    4.8 - 7.2   no music: freeze bell, countdown ticks, and a reversed swell of the drop bar
    7.2 ->      the song from bar 36 (86.84 s), its strongest section entrance, played
                continuously to the song's own ending: the final chord lands at 26.4 s
Sound effects: real recordings, all CC0 (see audio/sfx/CREDITS.txt).

Needs: numpy, scipy, librosa (for decoding), ffmpeg.
"""
import os
import subprocess
import numpy as np
import librosa
from scipy import signal
from scipy.io import wavfile

HERE = os.path.dirname(os.path.abspath(__file__))
SR = 48000
DUR = 30.0
N = int(SR * DUR)


def load(path):
    y, _ = librosa.load(os.path.join(HERE, path), sr=SR, mono=False)
    if y.ndim == 1:
        y = np.stack([y, y])
    return y.T.astype(np.float64)            # (n, 2)


def t2i(t):
    return int(round(t * SR))


def sos(kind, f, order=4):
    return signal.butter(order, f, btype=kind, fs=SR, output='sos')


def fade(x, fin=0.005, fout=0.02):
    x = x.copy(); a, b = min(t2i(fin), len(x) // 2), min(t2i(fout), len(x) // 2)
    if a: x[:a] *= np.linspace(0, 1, a)[:, None]
    if b: x[-b:] *= np.linspace(1, 0, b)[:, None]
    return x


def seg(x, t0, t1):
    return x[t2i(t0):t2i(t1)]


# =====================================================================
# MUSIC
# =====================================================================
song = load('music/Hopeful - Kevin MacLeod (FreePD CC0).mp3')
MUSIC = np.zeros((N, 2))

# --- intro (0 - 4.8 s): bars 0-1 of the song, muffled, opening up with the boil
DOWN0 = 0.44
intro = seg(song, DOWN0 - 0.25, DOWN0 + 4.8).copy()
t = np.arange(len(intro)) / SR - 0.25                 # video time
cut = np.interp(t, [0, 2.3, 4.5], [650, 900, 3200])     # time-varying low-pass
out = np.zeros_like(intro); zi = None
for i in range(0, len(intro), 512):
    s = sos('lowpass', float(cut[min(i, len(cut) - 1)]), 4)
    if zi is None: zi = np.zeros((s.shape[0], 2, 2))
    for c in range(2):
        out[i:i + 512, c], zi[:, c] = signal.sosfilt(s, intro[i:i + 512, c], zi=zi[:, c])
gain = np.interp(t, [-0.25, 0.3, 2.3, 4.5], [0, .42, .5, .95]) ** 1.3
intro = out * gain[:, None]
# tape-stop 4.55 -> 4.8
a, b = t2i(4.55 + 0.25), t2i(4.8 + 0.25)
rate = np.linspace(1, 0, b - a) ** 1.2
pos = a + np.cumsum(rate)
ts = np.stack([np.interp(pos, np.arange(len(intro)), intro[:, c]) for c in range(2)], 1)
intro[a:b] = ts * np.linspace(1, .4, b - a)[:, None]
intro[b:] = 0
MUSIC[:len(intro) - t2i(0.25)] += intro[t2i(0.25):]

# --- main (7.2 s ->): bar 36 of the song to its end
BAR36 = 86.84
main = seg(song, BAR36 - 0.012, BAR36 - 0.012 + (DUR - 7.2) + 0.012)
i0 = t2i(7.2 - 0.012)
MUSIC[i0:i0 + len(main)] += fade(main, 0.003, 0.0)

# --- reversed swell of the drop bar, pulling into 7.2 s
rev = seg(song, BAR36, BAR36 + 1.6)[::-1].copy()
rev = signal.sosfilt(sos('lowpass', 3500, 2), rev, axis=0)
L = t2i(0.35); ir = np.random.default_rng(1).normal(0, 1, (L, 2)) * np.exp(-np.arange(L) / SR / .12)[:, None]
rev = np.stack([signal.fftconvolve(rev[:, c], ir[:, c])[:len(rev)] for c in range(2)], 1)
rev /= np.max(np.abs(rev)) + 1e-9
rev *= (np.linspace(0, 1, len(rev)) ** 3)[:, None] * 0.55
e = t2i(7.2 - 0.03)
MUSIC[e - len(rev):e] += rev

# end: let the final chord ring, then fade out
fo = t2i(29.0)
MUSIC[fo:] *= np.linspace(1, 0, N - fo)[:, None] ** 2

# =====================================================================
# SOUND EFFECTS (real recordings, CC0)
# =====================================================================
SFX = np.zeros((N, 2))
_cache = {}


def sfx(name):
    if name not in _cache:
        _cache[name] = load('sfx/' + name)
    return _cache[name]


def put(at, x, db=0.0, pan=0.0, rate=1.0, t0=None, t1=None, fin=0.004, fout=0.03, lp=None, hp=None):
    x = x if t0 is None else seg(x, t0, t1 if t1 is not None else len(x) / SR)
    if rate != 1.0:                                 # simple resample = pitch + speed change
        n = int(len(x) / rate)
        x = np.stack([np.interp(np.arange(n) * rate, np.arange(len(x)), x[:, c]) for c in range(2)], 1)
    if lp: x = signal.sosfilt(sos('lowpass', lp, 2), x, axis=0)
    if hp: x = signal.sosfilt(sos('highpass', hp, 2), x, axis=0)
    x = fade(x, fin, fout)
    g = 10 ** (db / 20)
    l, r = np.cos((pan + 1) * np.pi / 4) * np.sqrt(2), np.sin((pan + 1) * np.pi / 4) * np.sqrt(2)
    i = t2i(at); n = min(len(x), N - i)
    if n > 0:
        SFX[i:i + n, 0] += x[:n, 0] * g * l
        SFX[i:i + n, 1] += x[:n, 1] * g * r


def loop(name, t0, t1, db, fade_in=.3, fade_out=.4, env=None, **kw):
    x = sfx(name); n = t2i(t1 - t0)
    reps = int(np.ceil(n / len(x))) + 1
    xl = np.concatenate([x] * reps)[:n]
    tt = np.linspace(0, 1, n)
    e = np.ones(n) if env is None else env(tt)
    xl = xl * e[:, None]
    put(t0, xl, db, fin=fade_in, fout=fade_out, **kw)


W = 'Micro_Pack_-_Organic_Wooshes__'
P = 'bb_-_Books,_Paper,_Writing_(Jan_2021)__'
K = 'kenney_interfacesounds__Audio__'
KI = 'kenney_impactsounds__Audio__'
WA = '40-cc0-water-splash-slime-sfx__'
M = 'bb_-_Smol_Mechanisms_(May_2021)__'

# A — a leaf lands on water
put(1.47, sfx(WA + 'bubble_02.ogg'), -9, .05)
put(1.52, sfx(WA + 'splash_09.ogg'), -22, 0, lp=6000)
# B — the water boils (real boiling water, building)
loop('30-cc0-sfx-loops__water_boiling.ogg', 2.3, 4.8, -2, fade_in=.6, fade_out=.02, env=lambda x: .25 + .75 * x ** 1.5)
loop(WA + 'loop_bubbles_02.ogg', 2.6, 4.8, -10, fade_in=.8, fade_out=.02, env=lambda x: x ** 2)
put(4.19, sfx(P + 'Thicc_Tip_Scribbles_2.wav'), -8, -.25, t0=0.0, t1=0.30)
put(4.33, sfx(P + 'Thicc_Tip_Scribbles_2.wav'), -8, .25, t0=0.55, t1=0.85)
# C — freeze, countdown, swell
put(4.80, sfx(KI + 'impactBell_heavy_000.ogg'), -13, 0, lp=2500, fout=.4)
put(4.80, sfx(KI + 'impactGlass_light_001.ogg'), -16, .15)


def odo_time(v):   # when the on-screen counter passes v (100 -> 77, power2.inOut over 4.95-6.65 s)
    lo, hi = 0.0, 1.0
    for _ in range(40):
        mid = (lo + hi) / 2
        e = 2 * mid * mid if mid < .5 else 1 - (-2 * mid + 2) ** 2 / 2
        lo, hi = (mid, hi) if 100 - 23 * e > v else (lo, mid)
    return 4.95 + 1.7 * (lo + hi) / 2


for k in range(1, 24):
    put(odo_time(100 - k + .5), sfx(K + 'tick_004.ogg'), -17 - k * .12, (k % 2 - .5) * .2, rate=1 + (12 - k) * .012)
put(7.2 - 0.64, sfx(W + 'Swish_3.wav')[::-1].copy(), -12, 0)
# D — the drop (the music carries it)
put(7.20, sfx(KI + 'impactSoft_medium_001.ogg'), -14)
put(8.85, sfx(W + 'Swish_3.wav'), -15, .3)
# E — sketch -> 3D, callouts
put(9.50, sfx(P + 'Mech_Pencil_Lines_2.wav'), -8, -.1, t0=0.2, t1=1.35, fout=.2)
put(10.05, sfx(P + 'Fine_Felt_Tip_Lines.wav'), -14, .2)
put(10.50, sfx(W + 'Twirl_Smol_2.wav'), -8, 0)
put(10.80, sfx(K + 'glass_004.ogg'), -22, 0, lp=9000)
put(11.35, sfx(K + 'select_002.ogg'), -18, .3)
for k, (t, f) in enumerate(zip([12.0, 12.3, 12.6, 12.9], ['drop_002.ogg', 'drop_003.ogg', 'drop_004.ogg', 'drop_002.ogg'])):
    put(t, sfx(K + f), -15, [-.4, .4, .4, -.4][k], rate=1 + k * .06)
put(14.05, sfx(K + 'minimize_003.ogg'), -22)
# F — the pour
put(14.30, sfx(W + 'Classic_Swish_2.wav'), -14, .3)
put(14.62, sfx(KI + 'impactWood_light_002.ogg'), -12, -.4)
put(15.05, sfx(W + 'Gentle_Swish.wav'), -4, -.1)
loop(WA + 'loop_water_02.ogg', 15.72, 18.85, -12, fade_in=.12, fade_out=.35, pan=-.3)
put(15.74, sfx(WA + 'bubble_01.ogg'), -18, -.3)
for k, t in enumerate([16.8, 17.4, 18.0]):
    put(t, sfx(K + ['glass_001.ogg', 'glass_005.ogg', 'glass_006.ogg'][k]), -17, [.4, 0, -.4][k], rate=1 + k * .12)
put(19.05, sfx(K + 'minimize_003.ogg'), -22)
# G — solar
put(19.10, sfx(W + 'Swish_1.wav'), -15)
put(19.35, sfx(KI + 'impactSoft_medium_001.ogg'), -18)
for k in range(5):
    put(20.25 + k * .26, sfx(K + 'tick_001.ogg'), -26, -.5 + k * .2, rate=1 + k * .05)
# H — press · turn · enjoy
put(21.40, sfx(W + 'Swish_5.wav'), -14, .2)
put(21.90, sfx(M + 'Click_Button_2.wav'), -6, .1)
put(22.00, sfx(K + 'confirmation_001.ogg'), -20, .1)
put(22.50, sfx(M + 'Ratchet_Muted_3.wav'), -11, .2, t0=0.0, t1=0.62, fout=.08)
put(23.10, sfx(W + 'Classic_Swish_1.wav'), -15, -.2)
# I — brand + call to action
put(24.00, sfx('Micro_Pack_-_Paper_Cutter__Paper_Flutter.wav'), -9, .3, t0=0.0, t1=1.0, fout=.3)
put(24.60, sfx(W + 'Thunk_2.wav'), -10)
put(24.62, sfx(K + 'glass_004.ogg'), -21, 0, lp=9000)
put(26.40, sfx(K + 'confirmation_002.ogg'), -17)
put(27.40, sfx(K + 'glass_004.ogg'), -26, .2, lp=9000)
put(28.90, sfx(K + 'glass_004.ogg'), -27, -.2, lp=9000)

# small room on the SFX bus so the dry recordings sit with the music
L = t2i(0.6); r = np.random.default_rng(3)
ir = r.normal(0, 1, (L, 2)) * np.exp(-np.arange(L) / SR / .14)[:, None]
ir = signal.sosfilt(sos('lowpass', 5000, 2), ir, axis=0); ir[:t2i(.008)] = 0; ir /= np.sqrt((ir ** 2).sum(0))
room = np.stack([signal.fftconvolve(SFX[:, c], ir[:, c])[:N] for c in range(2)], 1)
SFX = SFX + room * 0.12

# =====================================================================
# MIX + MASTER
# =====================================================================
mix = MUSIC * 1.0 + SFX * 0.9
mix /= np.max(np.abs(mix)) + 1e-9
mix *= 0.7
pre = os.path.join(HERE, '_premaster.wav')
wavfile.write(pre, SR, (mix * 32767).astype(np.int16))
for name, x in [('stem_music', MUSIC), ('stem_sfx', SFX)]:
    wavfile.write(os.path.join(HERE, f'{name}.wav'), SR, (np.clip(x / (np.max(np.abs(x)) + 1e-9) * .8, -1, 1) * 32767).astype(np.int16))
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', pre, '-af',
                'acompressor=threshold=-20dB:ratio=2:attack=20:release=200:makeup=1.5,'
                'alimiter=limit=0.89:attack=5:release=80,'
                'loudnorm=I=-14:TP=-1.2:LRA=11',
                '-ar', str(SR), '-c:a', 'pcm_s16le', os.path.join(HERE, 'mix.wav')], check=True)
os.remove(pre)
print('wrote audio/mix.wav')
