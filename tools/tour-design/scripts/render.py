import os, json, sys, math, numpy as np, matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
# Renders the camera view (yaw only, vfov 95, 16:9) at each stage trigger and a few seconds later.
cfg = json.load(open(sys.argv[1])); sim = json.load(open('/tmp/simlog.json'))
out = sys.argv[2]; offsets = [float(v) for v in (sys.argv[3].split(',') if len(sys.argv) > 3 else ['0', '12'])]
X = np.load('/tmp/X.npy'); Y = np.load('/tmp/Y.npy'); Z = np.load('/tmp/Z.npy'); C = 210000
D = os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../../static/data/series_blocks_')
xi = X * 20894 / C; zo = Z * 23641 / C + 1; key = np.arange(1, len(X) + 1)
H = 0.75 - Y * 0.75 / C; S = 0.5 + Z / (2 * C); L = 0.33 + X / (3 * C)
def hls2rgb(h, l, s):
    def f(n):
        k = (n + h * 12) % 12; a = s * np.minimum(l, 1 - l)
        return l - a * np.maximum(-1, np.minimum(np.minimum(k - 3, 9 - k), 1))
    return np.stack([f(0), f(8), f(4)], 1)
col = np.clip(hls2rgb(H, L, S) * 1.5, 0, 1)
raw = {'key': key, 'x': xi, 'y': key, 'z': zo}
def mask(filters):
    if not filters: return np.ones(len(X), bool)
    m = np.zeros(len(X), bool)
    for g in filters:
        mg = np.ones(len(X), bool)
        for a, lo, hi in g: mg &= (raw[a] >= lo) & (raw[a] <= hi)
        m |= mg
    return m
log = sim['log']; ts = np.array([e['t'] for e in log])
def pose_at(t):
    i = int(np.clip(np.searchsorted(ts, t), 0, len(log) - 1)); return log[i]
vf = math.radians(95); asp = 16 / 9; tv = math.tan(vf / 2); th = tv * asp
cur = None
evs = sim['events']
filt_by_stage = [s.get('filters') for s in cfg['stages']]
for e in evs:
    st = e['stage']; m = mask(filt_by_stage[st])
    for off in offsets:
        p = pose_at(e['t'] + off); pos = np.array(p['p'], float); yaw = p['h']
        f = np.array([-math.sin(yaw), 0, -math.cos(yaw)]); r = np.array([math.cos(yaw), 0, -math.sin(yaw)])
        dx = X[m] - pos[0]; dy = Y[m] - pos[1]; dz = Z[m] - pos[2]
        depth = dx * f[0] + dz * f[2]; cx = dx * r[0] + dz * r[2]
        ok = depth > 50
        u = cx[ok] / depth[ok] / th; v = dy[ok] / depth[ok] / tv
        vis = (np.abs(u) <= 1) & (np.abs(v) <= 1)
        fig = plt.figure(figsize=(9.6, 5.4), facecolor='black'); ax = fig.add_axes([0, 0, 1, 1], facecolor='black')
        ax.scatter(u[vis], v[vis], s=(0.15 if m.sum() > 60000 else 1.5), c=col[m][ok][vis], alpha=0.8, linewidths=0)
        ax.set_xlim(-1, 1); ax.set_ylim(-1, 1); ax.axis('off')
        ax.text(-0.98, 0.93, f"stage {st} {e['title']}  t={p['t']:.0f}s (+{off:.0f})  pos={[round(v/1000) for v in p['p']]}k  hdg={math.degrees(yaw):.0f}", color='w', fontsize=8)
        ax.plot([0], [0], '+', color='#888', ms=8)
        fig.savefig(f'{out}_s{st}_{int(off)}.png', dpi=80); plt.close(fig)
print('rendered', len(evs))
