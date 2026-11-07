import json, sys, math
# World <-> data conversion for SPAM IN THE SKY (txo_in, index, txo_out)
C = 210000
FX = C / 20894.0
FY = C / (823785 - 1)
FZ = C / (23642 - 1)
def w2d(p):
    return [round(p[0] / FX, 1), round(p[1] / FY + 1), round(p[2] / FZ + 1, 1)]
def hb(h):
    return (h - 1) * FY

def build(name, cam, stages):
    cfg = {'camera': cam, 'stages': [{'title': s[0], 'w': s[1], 'filters': s[2] if len(s) > 2 else None} for s in stages]}
    json.dump(cfg, open(f'/tmp/{name}.json', 'w'), indent=1)
    return cfg

if __name__ == '__main__':
    exec(open(sys.argv[1]).read())
