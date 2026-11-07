import os, numpy as np, matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt, colorsys
D=os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../../static/data/series_blocks_')
def load(n):
    with open(D+n+'.csv') as f:
        f.readline(); return np.array([float(l) if l.strip() else 0.0 for l in f])
xi=load('txo_in'); zo=load('txo_out'); h=load('index')
C=210000
X=xi*C/20894; Y=(h-1)*C/(823785-1); Z=(zo-1)*C/(23642-1)
np.save('/tmp/X.npy',X);np.save('/tmp/Y.npy',Y);np.save('/tmp/Z.npy',Z)
H=0.75-Y*0.75/C; S=0.5+Z/(2*C); L=0.33+X/(3*C)
import matplotlib.colors as mc
# vectorized hls->rgb
def hls2rgb(h,l,s):
    def f(n):
        k=(n+h*12)%12; a=s*np.minimum(l,1-l)
        return l-a*np.maximum(-1,np.minimum(np.minimum(k-3,9-k),1))
    return np.stack([f(0),f(8),f(4)],1)
col=hls2rgb(H,L,S)
views=[('front_xy',X,Y,'X world (inputs)','Y world (height)'),('side_zy',Z,Y,'Z world (outputs)','Y world'),('top_xz',X,Z,'X world (inputs)','Z world (outputs)')]
for name,a,b,la,lb in views:
    fig=plt.figure(figsize=(12,12),facecolor='black');ax=fig.add_subplot(111,facecolor='black')
    ax.scatter(a,b,s=0.05,c=col,alpha=0.6,linewidths=0)
    ax.set_xlim(0,C);ax.set_ylim(0,C);ax.set_xlabel(la,color='w');ax.set_ylabel(lb,color='w');ax.tick_params(colors='w')
    ax.set_xticks(range(0,C+1,10000),minor=True);ax.grid(True,which='both',color='#333',lw=0.3)
    fig.savefig(f'/tmp/plots/{name}.png',dpi=90,bbox_inches='tight');plt.close(fig)
print('ok')
