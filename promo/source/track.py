# Laptop-screen tracking keyframes (source seconds -> crop centre in full-res 2160x3840 pixels),
# measured by hand from gridded frames. Linear interpolation in between, held at the ends.
KEYS = [(14, 1040, 1156), (17, 1040, 1156), (21, 1170, 986), (26, 1164, 906), (31, 1188, 992),
        (36, 1216, 1054), (41, 1270, 1078), (45, 1326, 1174), (49, 1352, 1224), (51, 1298, 1166), (60, 1298, 1166)]
W, H = 800, 450
X_SHIFT = -110  # battery sits left of the measured centre; centre it and drop the headline
def expr(axis, half):
    i = 1 if axis == 'x' else 2
    off = X_SHIFT if axis == 'x' else 0
    e = f"{KEYS[-1][i] - half + off}"
    for (t0, *a), (t1, *b) in reversed(list(zip(KEYS, KEYS[1:]))):
        off = X_SHIFT if axis == 'x' else 0
        v0, v1 = a[i - 1] - half + off, b[i - 1] - half + off
        e = f"if(lt(t,{t1}),{v0}+({v1}-{v0})*(t-{t0})/{t1 - t0},{e})"
    return f"if(lt(t,{KEYS[0][0]}),{KEYS[0][i] - half + off},{e})"
if __name__ == '__main__':
    print(f"crop={W}:{H}:'{expr('x', W // 2)}':'{expr('y', H // 2)}'")

# ---- refinement: per-second offsets of the battery from the window centre, read off gridded
# crops of the path above (full-res px). Smoothed 3-tap, then folded into dense keyframes.
OFFSETS = {17.5: (128, 67), 18.5: (128, 54), 19.5: (160, 95), 20.5: (144, 99), 21.5: (112, -45),
           22.5: (96, -76), 23.5: (96, -54), 24: (100, -38), 25: (95, -20), 26: (112, 8), 27: (110, 5),
           28: (100, 5), 29: (102, 10), 30: (115, -5), 31: (115, -10), 32: (105, 0), 33: (105, -25),
           34: (105, -12), 35: (110, 0), 36: (108, 0), 37: (112, -8), 38: (112, -5), 39: (105, 12),
           40: (102, 30), 41: (110, 18), 42: (102, 12), 43: (102, 12), 44: (102, 18), 45: (108, 15),
           46: (100, 5), 47: (100, 5), 48: (78, 25), 49: (115, 0), 50: (102, 12), 51: (112, 0),
           52: (105, -25), 53: (118, -25)}
def centre(t):
    for (t0, x0, y0), (t1, x1, y1) in zip(KEYS, KEYS[1:]):
        if t0 <= t <= t1:
            k = (t - t0) / (t1 - t0)
            return x0 + (x1 - x0) * k + X_SHIFT, y0 + (y1 - y0) * k
    return KEYS[-1][1] + X_SHIFT, KEYS[-1][2]
ts = sorted(OFFSETS)
smooth = {}
for i, t in enumerate(ts):
    nb = [OFFSETS[ts[j]] for j in range(max(0, i - 1), min(len(ts), i + 2))]
    smooth[t] = (sum(a for a, _ in nb) / len(nb), sum(b for _, b in nb) / len(nb))
DENSE = [(t, centre(t)[0] + smooth[t][0], centre(t)[1] + smooth[t][1]) for t in ts]
DENSE = [(14, *DENSE[0][1:])] + DENSE + [(60, *DENSE[-1][1:])]
def dense_expr(i, half):
    e = f"{DENSE[-1][i] - half:.0f}"
    for (t0, *a), (t1, *b) in reversed(list(zip(DENSE, DENSE[1:]))):
        v0, v1 = a[i - 1] - half, b[i - 1] - half
        e = f"if(lt(t,{t1}),{v0:.0f}+({v1 - v0:.0f})*(t-{t0})/{t1 - t0:.3f},{e})"
    return e
def dense_crop():
    return f"crop={W}:{H}:'{dense_expr(1, W // 2)}':'{dense_expr(2, H // 2)}'"
