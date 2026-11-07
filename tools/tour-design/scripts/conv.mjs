import {load} from './load.mjs';
import fs from 'fs';
const [,, tourFile, sx,sy,sz, scs, filt, h, cam, yaw, out] = process.argv;
const scales=scs.split(','); const r=JSON.parse(filt); const maxH=+h||Infinity;
const t=JSON.parse(fs.readFileSync(tourFile));
const X=load(sx),Y=load(sy),Z=load(sz);
const tr=(v,s)=>s=='log'?Math.log10(v):v;
let mn=[1e30,1e30,1e30],mx=[-1e30,-1e30,-1e30];
for(let i=0;i<X.length;i++){ if(i+1>maxH) continue; const v=[tr(X[i],scales[0]),tr(Y[i],scales[1]),tr(Z[i],scales[2])];
 let ok=true;for(let k=0;k<3;k++){if(!(v[k]>=r[k][0]&&v[k]<=r[k][1])||v[k]==-Infinity)ok=false;} if(!ok)continue;
 for(let k=0;k<3;k++){mn[k]=Math.min(mn[k],v[k]);mx[k]=Math.max(mx[k],v[k]);}}
const w=c=>c.map((v,k)=>(tr(v,scales[k])-mn[k])*210000/(mx[k]-mn[k]));
fs.writeFileSync(out, JSON.stringify({camera:{pos:JSON.parse(cam),yaw:+yaw},stages:t.stages.map(s=>({title:s.title,w:w(s.coords)}))}));
