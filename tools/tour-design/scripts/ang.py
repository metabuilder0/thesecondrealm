import json, math, numpy as np, sys
X=np.load('/tmp/X.npy');Y=np.load('/tmp/Y.npy');Z=np.load('/tmp/Z.npy')
sim=json.load(open('/tmp/simlog.json')); log=sim['log']; ts=np.array([e['t'] for e in log])
def view(t, keys):
    p=log[int(np.searchsorted(ts,t))]; pos=np.array(p['p']); h=p['h']
    f=np.array([-math.sin(h),-math.cos(h)]); r=np.array([math.cos(h),-math.sin(h)])
    res=[]
    for k in keys:
        i=k-1; d=np.array([X[i]-pos[0],Z[i]-pos[2]]); dy=Y[i]-pos[1]
        dep=d@f; cx=d@r
        res.append((k, round(math.degrees(math.atan2(cx,dep))), round(math.degrees(math.atan2(dy,math.hypot(*d)))), round(math.hypot(*d,dy)/1000)))
    return res
for spec in sys.argv[1:]:
    t,ks=spec.split(':'); ks=[int(k) for k in ks.split(',')]
    print(t, view(float(t),ks))
