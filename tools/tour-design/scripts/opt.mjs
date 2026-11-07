// Hill-climbing optimizer for the Spam in the Sky circuit
import { simulate } from './simlib.mjs';
import fs from 'fs';

const C = 210000, FY = C / 823784;
const hb = h => (h - 1) * FY;
const init = JSON.parse(fs.readFileSync(process.argv[2]));
const iters = +(process.argv[3] || 400);
const out = process.argv[4] || '/tmp/opt_best.json';

// Visual targets per stage (world coords) : [point, weight]
const T = {
  0: [[[5000, 40000, 5000], 1], [[40000, 120000, 40000], 0.5]],
  1: [[[2500, 36700, 15000], 1], [[2500, 36700, 60000], 1], [[2500, 36700, 110000], 0.5]],
  2: [[[1500, 46000, 1500], 2.5]],
  3: [[[12000, 93000, 175000], 1], [[65000, 92900, 0], 1], [[209000, 93800, 7000], 1], [[132000, 93800, 115000], 1]],
  4: [[[65000, 92900, 0], 2]],
  5: [[[209000, 93800, 7000], 1.5], [[132000, 93800, 115000], 0.5]],
  6: [[[48000, 125000, 45000], 1]],
  7: [[[67000, 203000, 74000], 1.5]],
  8: [[[67000, 205000, 74000], 1]],
};
const MINI = { 0: 28, 1: 32, 2: 32, 3: 32, 4: 32, 5: 32, 6: 32, 7: 32, 8: 30 };

function viewPenalty(pos, heading, tgt, w, maxd = 140000) {
  const fx = -Math.sin(heading), fz = -Math.cos(heading);
  const dx = tgt[0] - pos[0], dz = tgt[2] - pos[2], dy = tgt[1] - pos[1];
  const hd = Math.hypot(dx, dz);
  const ang = Math.abs(Math.atan2(fx * dz - fz * dx, fx * dx + fz * dz)) * 180 / Math.PI;
  const vang = Math.abs(Math.atan2(dy, hd)) * 180 / Math.PI;
  const dist = Math.hypot(dx, dy, dz);
  let p = 0;
  if (ang > 40) p += ((ang - 40) / 10) ** 2;
  if (vang > 38) p += ((vang - 38) / 8) ** 2;
  if (dist > maxd) p += ((dist - maxd) / 40000) ** 2;
  if (dist < 15000) p += ((15000 - dist) / 8000) ** 2;
  return w * p;
}

function score(cfg, verbose = false) {
  const r = simulate(cfg, 60);
  const n = cfg.stages.length - 1; // described stages
  let s = 0; const rep = [];
  if (r.events.length < n) return { s: 1e6 + (n - r.events.length) * 1e4, r };
  const ev = r.events;
  for (let i = 0; i < n; i++) {
    const end = i + 1 < n ? ev[i + 1].t : r.pauseAt;
    const iv = end - ev[i].t;
    if (iv < MINI[i]) s += ((MINI[i] - iv) / 2) ** 2 * 3;
    if (iv > 42) s += ((iv - 42) / 4) ** 2;
    let vp = 0;
    for (const [tg, w] of T[i]) vp += viewPenalty(ev[i].pos, ev[i].heading, tg, w, (i === 3 ? 270000 : i === 5 ? 160000 : 140000));
    // also check 10s after trigger
    const lg = r.log.find(l => l.t >= ev[i].t + 10);
    if (lg) for (const [tg, w] of T[i]) vp += (i === 1 || i === 2 ? 1.5 : 0.5) * viewPenalty(lg.p, lg.h, tg, w, (i === 3 ? 270000 : i === 5 ? 160000 : 140000));
    if (i === 1) {
      const a = (tg) => { const p = ev[1].pos, h = ev[1].heading; const fx = -Math.sin(h), fz = -Math.cos(h); const dx = tg[0] - p[0], dz = tg[2] - p[2]; return Math.atan2(fx * dz - fz * dx, fx * dx + fz * dz) * 180 / Math.PI; };
      const spread = Math.abs(a([2500, 36700, 15000]) - a([2500, 36700, 110000]));
      if (spread < 35) vp += ((35 - spread) / 5) ** 2;
    }
    s += vp;
    rep.push({ i, title: cfg.stages[i].title, t: +ev[i].t.toFixed(1), iv: +iv.toFixed(1), head: +(ev[i].heading * 180 / Math.PI).toFixed(1), vp: +vp.toFixed(2) });
  }
  if (ev[0].t > 35) s += ((ev[0].t - 35) / 3) ** 2;
  if (r.maxRate > 2.5) s += ((r.maxRate - 2.5) * 2) ** 2;
  if (r.real > 380) s += ((r.real - 380) / 10) ** 2;
  if (verbose) return { s, r, rep };
  return { s, r };
}

// Free parameters: x,z (and y where allowed) of every stage incl. exit; camera x,z
const YFREE = { 0: [12000, 25000], 2: [48000, 62000], 3: [110000, 120000], 4: [106000, 115000], 5: [104000, 113000], 6: [118000, 135000], 7: [175000, 195000], 8: [205000, 222000], 9: [222000, 245000] };
function clone(c) { return JSON.parse(JSON.stringify(c)); }
function fixCam(c) {
  const s0 = c.stages[0].w, cp = c.camera.pos;
  c.camera.yaw = Math.atan2(-(s0[0] - cp[0]), -(s0[2] - cp[2]));
}
let cur = clone(init); fixCam(cur);
let best = score(cur);
let sigma = 6000;
let rng = 12345; const rand = () => { rng = (rng * 1103515245 + 12345) % 2147483648; return rng / 2147483648; };
const gauss = () => { let u = 0, v = 0; while (u === 0) u = rand(); v = rand(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
for (let it = 0; it < iters; it++) {
  const cand = clone(cur);
  const k = Math.floor(rand() * (cand.stages.length + 1)); // stage index or camera
  const sg = sigma * (0.3 + rand());
  if (k === cand.stages.length) {
    cand.camera.pos[0] += gauss() * sg; cand.camera.pos[2] += gauss() * sg;
  } else {
    const w = cand.stages[k].w;
    w[0] += gauss() * sg; w[2] += gauss() * sg;
    if (YFREE[k]) { w[1] = Math.min(YFREE[k][1], Math.max(YFREE[k][0], w[1] + gauss() * sg * 0.5)); }
  }
  fixCam(cand);
  const sc = score(cand);
  if (sc.s < best.s) { best = sc; cur = cand; }
  if (it % 50 === 0) { console.log(it, best.s.toFixed(2), best.r.real.toFixed(0), best.r.maxRate.toFixed(2)); sigma *= 0.93; }
}
const fin = score(cur, true);
console.log(JSON.stringify({ s: +fin.s.toFixed(2), real: +fin.r.real.toFixed(1), L: Math.round(fin.r.L), maxRate: +fin.r.maxRate.toFixed(2) }));
for (const x of fin.rep) console.log(JSON.stringify(x));
fs.writeFileSync(out, JSON.stringify(cur, null, 1));
