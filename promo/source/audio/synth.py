"""Original backing track for the CLYF promo: 120 BPM, A minor, 60 s, rendered to stems.

Pure Python (no numpy). Every sound is synthesised here, so the track carries no third-party
rights. Stems: drums, bass, keys (pad + arp), fx (riser, impacts, whooshes, chime)."""
import math, random, struct, wave, sys

SR = 44100
LEN = 60.0
N = int(SR * LEN)
BPM = 120
BEAT = 60 / BPM          # 0.5 s
BAR = 4 * BEAT           # 2 s
random.seed(7)

def buf(): return [0.0] * N

def add(dst, src, at, gain=1.0):
    i0 = int(at * SR)
    for k, v in enumerate(src):
        i = i0 + k
        if 0 <= i < N: dst[i] += v * gain
        elif i >= N: break

def note_hz(n): return 440.0 * 2 ** ((n - 69) / 12)   # MIDI note -> Hz

# ---------- one-shots ----------
def kick(dur=0.32):
    out = []; ph = 0.0
    for i in range(int(dur * SR)):
        t = i / SR
        f = 45 + 110 * math.exp(-t * 28)
        ph += 2 * math.pi * f / SR
        out.append(math.sin(ph) * math.exp(-t * 9) * (1.0 if t > 0.002 else t / 0.002))
    return out

def hat(dur=0.05, bright=1.0):
    out = []; prev = 0.0
    for i in range(int(dur * SR)):
        n = random.uniform(-1, 1)
        hp = n - prev; prev = n                       # crude high-pass
        out.append(hp * 0.5 * bright * math.exp(-i / SR * 70))
    return out

def clap():
    out = [0.0] * int(0.25 * SR); lp = 0.0
    for burst in (0.0, 0.011, 0.022):
        for i in range(int(0.2 * SR)):
            t = i / SR; j = int((burst + t) * SR)
            if j >= len(out): break
            n = random.uniform(-1, 1); lp += 0.35 * (n - lp)
            out[j] += (n - lp) * math.exp(-t * (38 if burst < 0.02 else 16)) * 0.6
    return out

def pluck(hz, dur=0.22, bright=0.6):
    out = []; ph = 0.0; lp = 0.0
    for i in range(int(dur * SR)):
        t = i / SR
        ph = (ph + hz / SR) % 1.0
        saw = 2 * ph - 1
        cut = 0.05 + bright * math.exp(-t * 18)      # filter envelope
        lp += cut * (saw - lp)
        out.append(lp * math.exp(-t * 11))
    return out

def bass_note(hz, dur):
    out = []; ph = 0.0; lp = 0.0
    for i in range(int(dur * SR)):
        t = i / SR
        ph = (ph + hz / SR) % 1.0
        sq = (1.0 if ph < 0.5 else -1.0) * 0.6 + (2 * ph - 1) * 0.4
        lp += (0.06 + 0.12 * math.exp(-t * 12)) * (sq - lp)
        env = min(1.0, t / 0.004) * (1.0 if t < dur - 0.02 else max(0.0, (dur - t) / 0.02))
        out.append((lp + 0.5 * math.sin(2 * math.pi * hz * t)) * env)
    return out

def pad_chord(notes, dur, attack=0.5):
    out = [0.0] * int(dur * SR)
    for n in notes:
        for det in (-0.12, 0.0, 0.11):
            hz = note_hz(n + det); ph = random.random(); lp = 0.0
            for i in range(len(out)):
                t = i / SR
                ph = (ph + hz / SR) % 1.0
                lp += 0.035 * ((2 * ph - 1) - lp)
                env = min(1.0, t / attack) * min(1.0, (dur - t) / 0.4)
                out[i] += lp * env * 0.12
    return out

def noise_riser(dur):
    out = []; lp = 0.0
    for i in range(int(dur * SR)):
        x = i / (dur * SR)
        n = random.uniform(-1, 1)
        lp += (0.01 + 0.5 * x ** 2) * (n - lp)
        out.append(lp * (x ** 1.6) * 0.9 + 0.25 * math.sin(2 * math.pi * (200 + 900 * x * x) * i / SR) * x ** 2)
    return out

def impact(dur=2.2):
    out = []; lp = 0.0; ph = 0.0
    for i in range(int(dur * SR)):
        t = i / SR
        ph += 2 * math.pi * (38 + 60 * math.exp(-t * 6)) / SR
        boom = math.sin(ph) * math.exp(-t * 2.2)
        n = random.uniform(-1, 1); lp += 0.2 * (n - lp)
        crash = (n - lp) * math.exp(-t * 3.5) * 0.35
        out.append(boom + crash)
    return out

def whoosh(dur=0.7, up=True):
    out = []; lp = 0.0
    for i in range(int(dur * SR)):
        x = i / (dur * SR)
        shape = math.sin(math.pi * x) ** 2
        cut = 0.02 + 0.3 * (x if up else 1 - x)
        n = random.uniform(-1, 1); lp += cut * (n - lp)
        out.append(lp * shape * 0.8)
    return out

def chime():
    out = [0.0] * int(1.6 * SR)
    for k, n in enumerate((84, 88, 91, 96)):     # C6 E6 G6 C7, rolled
        hz = note_hz(n); t0 = k * 0.07
        for i in range(int(1.4 * SR)):
            t = i / SR; j = int((t0 + t) * SR)
            if j >= len(out): break
            out[j] += (math.sin(2 * math.pi * hz * t) + 0.3 * math.sin(4 * math.pi * hz * t)) * math.exp(-t * 3.2) * 0.22
    return out

# ---------- arrangement ----------
CHORDS = [(57, 60, 64), (53, 57, 60), (48, 52, 55), (55, 59, 62)]  # Am F C G (pad, low octave)
ROOTS = [33, 29, 36, 31]                                            # A1 F1 C2 G1
def chord_at(bar): return CHORDS[bar % 4], ROOTS[bar % 4]

drums, bass, keys, fx = buf(), buf(), buf(), buf()
K, C = kick(), clap()
HAT, HAT_OPEN = hat(), hat(0.18, 0.8)
plucks = {}

def section(t):
    if t < 4: return 'intro'
    if t < 18: return 'verse'
    if t < 48: return 'main'
    if t < 54: return 'peak'
    if t < 56: return 'break'
    return 'outro'

total_bars = int(LEN / BAR)
for bar in range(total_bars):
    t_bar = bar * BAR
    sec = section(t_bar + 0.01)
    notes, root = chord_at(bar)
    # pads everywhere except the very first second
    if sec != 'intro' or bar == 1:
        add(keys, pad_chord(notes, BAR + 0.3, attack=0.6 if sec in ('break', 'outro') else 0.25), t_bar,
            0.9 if sec in ('break', 'outro', 'intro') else 0.6)
    for b in range(4):
        tb = t_bar + b * BEAT
        if sec in ('verse', 'main', 'peak'):
            add(drums, K, tb, 0.9 if sec != 'verse' else 0.75)
            add(drums, HAT if sec == 'verse' else HAT_OPEN, tb + BEAT / 2, 0.5 if sec == 'verse' else 0.35)
            if sec in ('main', 'peak') and b in (1, 3): add(drums, C, tb, 0.55)
            if sec == 'peak':
                add(drums, HAT, tb + BEAT / 4, 0.25); add(drums, HAT, tb + 3 * BEAT / 4, 0.25)
        # bass: eighths with an octave jump on the off-beat
        if sec in ('verse', 'main', 'peak'):
            for e in range(2):
                n = root + (12 if e == 1 and sec != 'verse' else 0)
                add(bass, bass_note(note_hz(n), BEAT / 2 - 0.02), tb + e * BEAT / 2, 0.55)
        # arp: sixteenths through the chord, two octaves up
        if sec in ('main', 'peak'):
            seq = [notes[0] + 12, notes[1] + 12, notes[2] + 12, notes[1] + 24]
            for s16 in range(4):
                n = seq[(b * 4 + s16) % 4] + (12 if sec == 'peak' and s16 % 2 else 0)
                if n not in plucks: plucks[n] = pluck(note_hz(n))
                pan_gain = 0.22 if sec == 'main' else 0.3
                add(keys, plucks[n], tb + s16 * BEAT / 4, pan_gain)

# fx: riser into the cold-open logo, impacts, whooshes on cuts, chime at READY
add(fx, noise_riser(3.0), 0.0, 0.8)
add(fx, impact(), 3.0, 0.9)
for t in (12.45, 18.3, 47.85, 55.5):
    add(fx, whoosh(0.7), t - 0.35, 0.7)
add(fx, impact(2.8), 56.0, 0.8)
add(fx, chime(), 44.1, 1.0)
add(drums, K, 3.0, 1.0)

def write(name, data, peak=0.89):
    m = max(1e-9, max(abs(v) for v in data))
    g = peak / m
    with wave.open(name, 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes(b''.join(struct.pack('<h', int(max(-1, min(1, v * g)) * 32767)) for v in data))
    print(name, f"peak-normalised x{g:.2f}")

out = sys.argv[1] if len(sys.argv) > 1 else '.'
for name, data in (('drums', drums), ('bass', bass), ('keys', keys), ('fx', fx)):
    write(f"{out}/{name}.wav", data)
