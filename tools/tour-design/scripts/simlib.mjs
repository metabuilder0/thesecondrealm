// Function version of sim.mjs
import { CatmullRomCurve3, Vector3, Quaternion, Euler, Object3D } from '../../../js/libs/three/three.module.js';

export function simulate(cfg, FPS = 30) {
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
    return SLOWF + (1 - SLOWF) * Math.pow(1 / (1 + a * SENS), 1.2);
  }
  let prevYaw = 0, curYaw = 0;
  function pose(et, dt) {
    const u = Math.min(1, et / T);
    const p = curve.getPointAt(u);
    const t = tanLocal(u);
    const pl = Math.hypot(t.x, t.z);
    const yaw = pl > 0.001 ? Math.atan2(-t.x, -t.z) : prevYaw;
    return { p, yaw, slow: curveFactor(u, dt) };
  }
  { const t = tanLocal(0); prevYaw = Math.atan2(-t.x, -t.z); curYaw = prevYaw; dolly.rotation.setFromQuaternion(yawQuat(curYaw), 'YXZ'); dolly.updateMatrixWorld(true); }
  let speed = 0, slow = 1, et = 0, trStart = 0, target = 1, transitioning = true, now = 0, paused = false;
  const dt = 1 / FPS;
  let probeIdx = 0;
  const probes = [pts[1], ...stages.map(s => new Vector3(...s))];
  const events = []; const log = [];
  let lastHeading = null, maxRate = 0, pauseAt = null;
  const fwd = new Vector3();
  const headingOf = () => { fwd.set(0, 0, -1).applyQuaternion(dolly.quaternion); return Math.atan2(-fwd.x, -fwd.z); };
  const checkEvery = Math.max(1, Math.round(FPS / 10));
  for (let frame = 0; frame < FPS * 3000; frame++) {
    now += dt * 1000;
    if (transitioning) {
      const pr = Math.min((now - trStart) / (target === 0 ? DECEL : ACCEL), 1);
      if (target === 0) { const e = 1 - Math.pow(1 - pr, 5); speed = 1 - e; }
      else { const e = pr < 0.5 ? 4 * pr ** 3 : 1 - Math.pow(-2 * pr + 2, 3) / 2; speed = (1 - e) * speed + e * target; }
      if (pr >= 1) { transitioning = false; if (target === 0) paused = true; }
    }
    if (paused) break;
    let ps = pose(et, dt);
    slow += (ps.slow - slow) * (1 - Math.exp(-SMOOTH * dt));
    const fs_ = speed * slow;
    et += dt * 1000 * fs_;
    if (et >= T) break;
    ps = pose(et, dt);
    dolly.position.copy(ps.p);
    let diff = ps.yaw - curYaw; diff = ((diff + Math.PI) % (Math.PI * 2)) - Math.PI;
    const md = MAXANG * dt; diff = Math.max(-md, Math.min(md, diff)); curYaw += diff; prevYaw = curYaw;
    dolly.rotation.setFromQuaternion(yawQuat(curYaw), 'YXZ'); dolly.updateMatrixWorld(true);
    const h = headingOf();
    if (lastHeading !== null) {
      let dh = h - lastHeading; dh = Math.atan2(Math.sin(dh), Math.cos(dh));
      const rate = Math.abs(dh / dt * 180 / Math.PI);
      if (rate > maxRate) maxRate = rate;
    }
    lastHeading = h;
    if (frame % checkEvery === 0) {
      if (probeIdx < probes.length && dolly.position.distanceTo(probes[probeIdx]) <= 1000) {
        if (probeIdx >= 1) events.push({ stage: probeIdx - 1, t: now / 1000, pos: dolly.position.toArray(), heading: h });
        probeIdx++;
      }
      if (T - et < 10000 && target !== 0) { target = 0; trStart = now; transitioning = true; pauseAt = now / 1000; }
    }
    if (frame % Math.round(FPS / 2) === 0) log.push({ t: now / 1000, p: dolly.position.toArray(), h, v: fs_ * SPEED });
  }
  return { L, T, real: now / 1000, pauseAt, maxRate, events, log };
}
