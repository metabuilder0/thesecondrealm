// Replays AutopilotController + Autopilot logic (autopilot mode constants) on a candidate circuit.
import { CatmullRomCurve3, Vector3, Quaternion, Euler, Object3D } from '../../../js/libs/three/three.module.js';
import fs from 'fs';

const cfg = JSON.parse(fs.readFileSync(process.argv[2]));
const FPS = cfg.fps || 60;
const SPEED = 3000, ACCEL = 6000, DECEL = 8000;
const SENS = 3.0, SMOOTH = 3.0, MAXANG = Math.PI / 96, SLOWF = 0.005;

const dolly = new Object3D();
dolly.position.set(...cfg.camera.pos);
dolly.rotation.set(0, cfg.camera.yaw, 0);
dolly.updateMatrixWorld(true);
const initPos = dolly.localToWorld(new Vector3(0, 0, -50000));
const stages = cfg.stages.map(s => s.w);
const pts = [cfg.camera.pos, [initPos.x, initPos.y, initPos.z], ...stages].map(p => new Vector3(...p));
const curve = new CatmullRomCurve3(pts, false, 'centripetal', 0.5);
const L = curve.getLength();
const T = L * 1000 / SPEED;

const tanLocal = u => curve.getTangentAt(u).clone().applyQuaternion(dolly.quaternion.clone().conjugate());
const yawQuat = yaw => { const q = new Quaternion().setFromEuler(new Euler(0, yaw, 0, 'YXZ')); const w = new Quaternion(); dolly.getWorldQuaternion(w); return w.multiply(q); };
function curveFactor(u, dt) {
  const d = (L * dt) / (2 * T);
  const t1 = tanLocal(Math.max(0, u - d)); t1.y = 0; t1.normalize();
  const t2 = tanLocal(Math.min(1, u + d)); t2.y = 0; t2.normalize();
  const a = Math.acos(Math.max(-1, Math.min(1, t1.dot(t2))));
  const base = Math.pow(1 / (1 + a * SENS), 1.2);
  return SLOWF + (1 - SLOWF) * base;
}
function pose(et, dt) {
  const u = Math.min(1, et / T);
  const p = curve.getPointAt(u);
  const t = tanLocal(u);
  const pl = Math.hypot(t.x, t.z);
  const yaw = pl > 0.001 ? Math.atan2(-t.x, -t.z) : prevYaw;
  return { p, yaw, slow: curveFactor(u, dt), u };
}
// initial alignment (loadPath)
let prevYaw = 0, curYaw = 0;
{ const t = tanLocal(0); prevYaw = Math.atan2(-t.x, -t.z); curYaw = prevYaw; dolly.rotation.setFromQuaternion(yawQuat(curYaw), 'YXZ'); dolly.updateMatrixWorld(true); }

let speed = 0, slow = 1, et = 0, trStart = 0, target = 1, transitioning = true, now = 0, paused = false;
const dt = 1 / FPS;
let probeIdx = 0; // index into [initPos, ...stages]
const probes = [pts[1], ...stages.map(s => new Vector3(...s))];
const events = []; const log = [];
let lastHeading = null, maxRate = 0, maxRateT = 0, prevRate = 0, maxAcc = 0, cum = 0, ended = false, pauseAt = null;
const headingOf = () => { const f = new Vector3(0, 0, -1).applyQuaternion(dolly.quaternion); return Math.atan2(-f.x, -f.z); };
for (let frame = 0; frame < FPS * 3000 && !ended; frame++) {
  now += dt * 1000;
  if (transitioning) {
    const pr = Math.min((now - trStart) / (target === 0 ? DECEL : ACCEL), 1);
    if (target === 0) { const e = 1 - Math.pow(1 - pr, 5); speed = 1 - e; }
    else { const e = pr < 0.5 ? 4 * pr ** 3 : 1 - Math.pow(-2 * pr + 2, 3) / 2; speed = (1 - e) * speed + e * target; }
    if (pr >= 1) { transitioning = false; if (target === 0) { paused = true; } }
  }
  if (paused) break;
  let ps = pose(et, dt);
  slow += (ps.slow - slow) * (1 - Math.exp(-SMOOTH * dt));
  const fs_ = speed * slow;
  et += dt * 1000 * fs_;
  if (et >= T) { ended = true; break; }
  ps = pose(et, dt);
  dolly.position.copy(ps.p);
  // lerpAngles
  let diff = ps.yaw - curYaw; diff = ((diff + Math.PI) % (Math.PI * 2)) - Math.PI;
  const md = MAXANG * dt; diff = Math.max(-md, Math.min(md, diff)); curYaw += diff; prevYaw = curYaw;
  dolly.rotation.setFromQuaternion(yawQuat(curYaw), 'YXZ'); dolly.updateMatrixWorld(true);
  const h = headingOf();
  if (lastHeading !== null) {
    let dh = h - lastHeading; dh = Math.atan2(Math.sin(dh), Math.cos(dh));
    const rate = dh / dt * 180 / Math.PI; // deg/s
    if (Math.abs(rate) > maxRate) { maxRate = Math.abs(rate); maxRateT = now / 1000; }
    const acc = Math.abs(rate - prevRate) / dt; if (frame > 5 && acc > maxAcc) maxAcc = acc;
    prevRate = rate;
  }
  lastHeading = h;
  // tour logic: every frame check distance (real code: every 0.1s)
  if (frame % Math.round(FPS / 10) === 0) {
    if (probeIdx < probes.length && dolly.position.distanceTo(probes[probeIdx]) <= 1000) {
      if (probeIdx >= 1) events.push({ stage: probeIdx - 1, title: cfg.stages[probeIdx - 1].title, t: +(now / 1000).toFixed(1), pos: dolly.position.toArray().map(Math.round), yaw: +curYaw.toFixed(4), heading: +h.toFixed(4) });
      probeIdx++;
    }
    const remaining = T - et;
    if (remaining < 10000 && target !== 0) { target = 0; trStart = now; transitioning = true; pauseAt = now / 1000; }
  }
  if (frame % Math.round(FPS / 4) === 0) log.push({ t: +(now / 1000).toFixed(2), p: dolly.position.toArray().map(v => Math.round(v)), h: +h.toFixed(4), v: Math.round(fs_ * SPEED) });
}
// per-segment stats
const summary = { length: Math.round(L), fullSpeedDuration_s: +(T / 1000).toFixed(1), realDuration_s: +(now / 1000).toFixed(1), pauseAt_s: pauseAt, maxYawRate_degps: +maxRate.toFixed(2), maxYawRateAt_s: +maxRateT.toFixed(1), maxYawAcc_degps2: +maxAcc.toFixed(1) };
console.log(JSON.stringify(summary));
let prevT = null;
for (const e of events) { console.log(`stage ${e.stage} ${e.title.padEnd(28)} t=${e.t}s  +${prevT === null ? '-' : (e.t - prevT).toFixed(1)}s  pos=${e.pos}  heading=${(e.heading * 180 / Math.PI).toFixed(1)}`); prevT = e.t; }
const reached = events.length;
if (reached < stages.length - 1) console.log(`WARNING: only ${reached}/${stages.length} stages reached (last one is expected to be skipped)`);
// rate histogram
const rates = []; for (let i = 1; i < log.length; i++) { let dh = log[i].h - log[i - 1].h; dh = Math.atan2(Math.sin(dh), Math.cos(dh)); rates.push(Math.abs(dh / (log[i].t - log[i - 1].t)) * 180 / Math.PI); }
const bins = [1, 2, 3, 5, 8, 12, 1e9]; const cnt = bins.map(() => 0); for (const r of rates) cnt[bins.findIndex(b => r <= b)]++;
console.log('yaw rate distribution (deg/s, share of time):', bins.map((b, i) => `<=${b}:${(100 * cnt[i] / rates.length).toFixed(0)}%`).join(' '));
fs.writeFileSync('/tmp/simlog.json', JSON.stringify({ log, events }));
