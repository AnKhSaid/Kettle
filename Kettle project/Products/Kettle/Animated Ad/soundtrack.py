"""Generates soundtrack.wav for the MATET ad: a warm ambient pad, soft
kalimba-like plucks synced to the on-screen moments, and a gentle pour.

    python3 soundtrack.py        (needs numpy)
"""
import wave
import numpy as np

SR = 48000
DUR = 26.5
N = int(SR * DUR)
t = np.arange(N) / SR
rng = np.random.default_rng(7)


def hz(midi):
    return 440.0 * 2 ** ((midi - 69) / 12)


NOTE = {n: i for i, n in enumerate(['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'])}


def m(name):  # 'D4' -> midi
    return NOTE[name[:-1]] + 12 * (int(name[-1]) + 1)


# ---------- pad ----------
# (start time, notes) — each chord crossfades into the next
CHORDS = [
    (0.0, ['D3', 'A3', 'E4', 'F#4']),     # Dadd9  — calm, curious
    (4.0, ['B2', 'F#3', 'D4', 'A4']),     # Bm7    — "not boiling…"
    (6.6, ['G2', 'D3', 'B3', 'F#4']),     # Gmaj7  — cooling down
    (9.2, ['D3', 'A3', 'C#4', 'F#4']),    # Dmaj7  — the kettle
    (14.2, ['G2', 'D3', 'A3', 'B3']),     # Gadd9  — the pour
    (18.6, ['E3', 'B3', 'D4', 'F#4']),    # Em9    — features
    (21.6, ['D3', 'A3', 'E4', 'F#4']),    # Dadd9  — home
]
pad = np.zeros(N)
XF = 0.9
for i, (start, notes) in enumerate(CHORDS):
    end = CHORDS[i + 1][0] if i + 1 < len(CHORDS) else DUR
    env = np.clip((t - start) / XF, 0, 1) * np.clip((end + XF - t) / XF, 0, 1)
    env = np.sin(env * np.pi / 2) ** 2
    for k, n in enumerate(notes):
        f = hz(m(n))
        for det in (-0.12, 0.12):  # slight chorus
            ph = rng.uniform(0, 2 * np.pi)
            v = np.sin(2 * np.pi * (f + det) * t + ph) + 0.18 * np.sin(2 * np.pi * 2 * (f + det) * t + ph)
            pad += env * v * (0.55 if k == 0 else 0.4)
# fade in/out + slow breathing
pad *= np.clip(t / 1.5, 0, 1) * np.clip((DUR - t) / 2.0, 0, 1)
pad *= 0.85 + 0.15 * np.sin(2 * np.pi * 0.12 * t)
pad *= 0.045


# ---------- plucks ----------
def pluck(at, note, amp=1.0, decay=0.9):
    f = hz(m(note)) if isinstance(note, str) else note
    i0 = int(at * SR)
    L = int(SR * 3.0)
    tt = np.arange(L) / SR
    att = np.clip(tt / 0.004, 0, 1)
    v = (np.sin(2 * np.pi * f * tt) * np.exp(-tt / decay)
         + 0.35 * np.sin(2 * np.pi * 2.0 * f * tt) * np.exp(-tt / (decay * 0.35))
         + 0.12 * np.sin(2 * np.pi * 5.4 * f * tt) * np.exp(-tt / 0.08))
    v *= att * amp
    seg = min(L, N - i0)
    out[i0:i0 + seg] += v[:seg]


def tick(at, amp=0.25):
    i0 = int(at * SR)
    L = int(SR * 0.05)
    tt = np.arange(L) / SR
    v = np.sin(2 * np.pi * 2400 * tt) * np.exp(-tt / 0.006) * amp
    out[i0:i0 + L] += v[:max(0, min(L, N - i0))]


out = np.zeros(N)
# S1 — leaf
pluck(0.25, 'F#5', .55); pluck(0.55, 'A5', .35); pluck(1.75, 'D6', .3, 1.2)
# S2 — ring, number, strike, countdown, resolution
pluck(4.0, 'B4', .55); pluck(4.5, 'F#5', .45)
pluck(5.8, 'B3', .7, .35)                                  # the strike: low & short
for k in range(12):                                        # countdown ticks, easing out
    x = k / 11
    tick(6.45 + 1.2 * (x ** 1.6) * (1 - 0.25 * x), .22 - .1 * x)
for k, n in enumerate(['D5', 'F#5', 'A5', 'D6']):          # "…the perfect degree"
    pluck(7.6 + k * .09, n, .42, 1.3)
# S3 — kettle
pluck(9.5, 'A4', .4); pluck(11.3, 'C#5', .38); pluck(11.9, 'E5', .3)
pluck(12.65, 'A6', .22, .5)                                 # LED on
# S4 — pour
pluck(14.7, 'G4', .35); pluck(16.2, 'D6', .28, .6)          # tag pop
# S5 — features
for k, n in enumerate(['E5', 'F#5', 'B5']):
    pluck(18.95 + k * .38, n, .4)
# S6 — logo + CTA
for k, n in enumerate(['D4', 'A4', 'D5', 'F#5', 'A5']):
    pluck(21.72 + k * .07, n, .38, 1.6)
pluck(23.6, 'E6', .3, .9); pluck(23.65, 'A5', .22, .9)
out *= 0.16

# ---------- pour (filtered noise) ----------
def smooth(x, k):
    ker = np.ones(k) / k
    return np.convolve(x, ker, mode='same')


noise = rng.normal(0, 1, N)
water = smooth(noise, 6) - smooth(noise, 60)                # crude band-pass
wenv = np.clip((t - 15.45) / 0.35, 0, 1) * np.clip((18.2 - t) / 0.4, 0, 1)
wenv *= 0.8 + 0.2 * np.sin(2 * np.pi * 7.3 * t) * np.sin(2 * np.pi * 1.1 * t)
water *= wenv * 0.05

dry = pad + out + water


# ---------- reverb (convolution with a decaying-noise IR, per channel) ----------
def reverb(x, seed):
    r = np.random.default_rng(seed)
    L = int(SR * 2.6)
    tt = np.arange(L) / SR
    ir = r.normal(0, 1, L) * np.exp(-tt / 0.55)
    ir = smooth(ir, 4)
    ir[: int(SR * 0.012)] = 0
    ir /= np.sqrt(np.sum(ir ** 2))
    n = 1 << int(np.ceil(np.log2(len(x) + L)))
    y = np.fft.irfft(np.fft.rfft(x, n) * np.fft.rfft(ir, n), n)[: len(x)]
    return y


wetL, wetR = reverb(dry, 1), reverb(dry, 2)
L = dry * 0.78 + wetL * 0.42
R = dry * 0.78 + wetR * 0.42
st = np.stack([L, R], axis=1)
st = np.tanh(st * 1.2) / 1.2                                # soft safety limiter
st *= 10 ** (-1.5 / 20) / np.max(np.abs(st))                # peak at -1.5 dBFS
rms = 20 * np.log10(np.sqrt(np.mean(st ** 2)))
print(f'peak -1.5 dBFS, rms {rms:.1f} dBFS')

with wave.open('soundtrack.wav', 'wb') as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((st * 32767).astype('<i2').tobytes())
