import {
	EventDispatcher,
  Euler,
	Vector3,
  Quaternion,
  CatmullRomCurve3
} from 'three';

import { Constants } from '/js/libs/@webxr-input-profiles/motion-controllers.module.js';


class AutopilotController extends EventDispatcher {

  /*
   * Constants
   */

  // Tension of Catmull-Rom 
  // (0 = cardinal spline, 0.5 = classical Catmull-Rom)
  static TENSION = 0.5;  
  // Transition duration in ms (accel/decel)
  static ACCEL_DURATION = 6000;
  static DECEL_DURATION = 8000;
  // EPS
  static EPS = 0.000001;
  // SPEED
  static SPEED = 3000;
  // YAW DAMPING
  static YAW_DAMPING = 2.0;
  // MAX ANGULAR SPEED 
  static MAX_ANGULAR_SPEED = Math.PI / 96;
  // SLOWDOWN FACTOR
  static CURVE_SLOWDOWN_FACTOR = 0.005; 
  // SLOWDOWN SENSITIVITY
  static CURVE_SLOWDOWN_SENSITIVITY = 3.0;
  // SLOWDOWN SMOOTHING
  static CURVE_SLOWDOWN_SMOOTHING = 3.0;


  /*
   * Attributes
   */

  world3d = null;

  enabled = false;
  speedMode = null;
  isAnimating = false;
  isPaused = true;
  stopRequested = false;
  transitionRequested = false;

  lastPosition = null;
  lastSpeed = null;
  lastQuaternion = null;

  byButtonPushed = null;

  // Total duration
  totalDuration = 0;
  // Virtual time progressing at a variable speed
  effectiveTime = 0; 
  // Current speed (between 0 and 1)
  currentSpeed = 0;
  // Current yaw
  currentYaw = 0;
  // Current slowdown
  currentSlowdown = 1;
  // Target speed
  targetSpeed = 0;
  // Timestamp of transition start
  transitionStart = 0;
  // For when the tangent is vertical
  previousYaw = 0;
  // List of Points composing the path
  positionPoints = null;
  // CatmullRom curve
  curve = null;

  /*
   * Constructor
   */
  constructor(world3d) {
    super();
    this.world3d = world3d;
    this.enabled = false;
    this.isAnimating = false;
    this.isPaused = true;
    this.speedMode = 4;

    this.lastQuaternion = new Quaternion();
		this.lastPosition = new Vector3(0, 0, 0);
    this.lastSpeed = new Vector3(0, 0, 0);
  }

  /*
   * Load path
   */
  loadPath(path) {
    if (!path || path.length < 2) {
      console.warn('Path should be composed of at least 2 points');
      return;
    }
    // Camera position
    const cameraPos = [
      this.world3d.camera.parent.position.x,
      this.world3d.camera.parent.position.y,
      this.world3d.camera.parent.position.z
    ];
    // Adds camera position and initial position to the path
    path = [cameraPos].concat(path);
    // Builds the list of Points composing the path 
    this.positionPoints = path.map(p => new Vector3(p[0], p[1], p[2]));
    // Creates the CatmullRom curve
    this.curve = new CatmullRomCurve3(
      this.positionPoints,
      false,
      'centripetal',
      AutopilotController.TENSION
    );
    // Computes the total duration of the tour (at a speed of 3600 units/s)
    this.totalDuration = this.curve.getLength() * 1000 / AutopilotController.SPEED;
    // Initializes previous yaw with first tangent
    const initialTan = this.getCurveTangentAt(0); 
    const projectedTan = Math.sqrt(initialTan.x ** 2 + initialTan.z ** 2);
    if (projectedTan > 0.001) {
      this.previousYaw = Math.atan2(-initialTan.x, -initialTan.z);
      this.currentYaw = this.previousYaw;

      let object = this.world3d.camera.parent;
      const worldQuat = this.cameraYaw2Quaternion(this.currentYaw);
      object.rotation.setFromQuaternion(worldQuat, 'YXZ');
      object.updateMatrixWorld(true);
    }
    // Path is loaded. Enables controller.
    this.enabled = true;
  }

  /*
   * Returns (position, yaw) at a given time t
   */
  getPoseAtTime(virtualElapsed, delta) {
    // Computes normalized time
    let normalizedTime = virtualElapsed / this.totalDuration;

    if (normalizedTime >= 1) {
      // Stops the animation
      let lastYaw = this.previousYaw;
      const lastPos = this.positionPoints[this.positionPoints.length - 1];
      const lastTan = this.getCurveTangentAt(1); 
      const tanProjLen = Math.sqrt(lastTan.x ** 2 + lastTan.z ** 2);
      // Avoid divide by zero
      if (tanProjLen > 0.001) {
        lastYaw = Math.atan2(-lastTan.x, -lastTan.z);
      }
      this.isAnimating = false;
      this.dispatchEvent({type: 'completed'});
      return { position: lastPos, yaw: lastYaw };
    }
    // Computes position on the Catmull-Rom curve at constant speed
    const totalLength = this.curve.getLength();
    const u = normalizedTime * totalLength / totalLength;
    const position = this.curve.getPointAt(u);
    const rawCurveFactor = this.getCurveFactor(u, delta);
    // Computes the tangent (camera orientation)
    const tangent = this.getCurveTangentAt(u);
    const tanProjLen = Math.sqrt(tangent.x ** 2 + tangent.z ** 2);
    // Computes yaw but avoids instabilities
    let yaw;
    if (tanProjLen > 0.001) { 
      yaw = Math.atan2(-tangent.x, -tangent.z);
    } else {
      // Pure vertical move => keep previous yaw
      yaw = this.previousYaw;
    }
    return { position, yaw, slowdown: rawCurveFactor };
  }

  /*
   * Stop the tour
   */
  stop() { 
    this.stopRequested = true;
    this.isAnimating = false; 
  }

  /*
   * Pause the tour
   */
  pause() { 
    if (this.transitionRequested) return;

    if (this.targetSpeed !== 0) {
      this.targetSpeed = 0; 
      this.transitionStart = null;
      this.transitionRequested = true;
    }
  }

  /*
   * Resume the tour
   */
  resume() { 
    if (this.transitionRequested) return;

    // Starts the animation 
    if (!this.isAnimating) {
      this.isAnimating = true;
    }

    // Resumes a paused animation
    if (this.isPaused && this.isAnimating) {
      this.isPaused = false;
      this.targetSpeed = 1;
      this.transitionStart = null;
      this.transitionRequested = true;
      this.dispatchEvent({type: 'resume'});
    }
  }

  /*
   * Boolean flag indicating if tour is running 
   */
  isRunning() {
    return this.isAnimating && !this.isPaused;
  }

  /*
   * Update methods
   */
  update(delta) {
    if (!this.enabled) return;

    // Processes controller commands
    this.processCommands();

    const now = performance.now();

    // Checks if animation is requested
    if (this.stopRequested || this.isPaused || !this.isAnimating) 
      return;

    // Manages speed transition if necessary
    if (this.transitionRequested) {
      if (this.transitionStart === null) 
        this.transitionStart = now;

      let transitionProgress, eased;
      if (this.targetSpeed == 0) {
        transitionProgress = Math.min((now - this.transitionStart) / AutopilotController.DECEL_DURATION, 1);
        eased = this.easeOutQuint(transitionProgress);
        this.currentSpeed = 1 - eased + eased * this.targetSpeed;
      } else {
        transitionProgress = Math.min((now - this.transitionStart) / AutopilotController.ACCEL_DURATION, 1);
        eased = this.easeInOutCubic(transitionProgress);
        this.currentSpeed = (1 - eased) * this.currentSpeed + eased * this.targetSpeed;
      }
      if (transitionProgress >= 1) {
        if (this.targetSpeed == 0) {
          this.isPaused = true;
        }
        this.transitionStart = null;
        this.transitionRequested = false;
      }
    }

    // Computes pose at current position
    let pose = this.getPoseAtTime(this.effectiveTime, delta);

    // Updates virtual time
    // Slowdowns in the curves
    const alphaSlow = 1 - Math.exp(-AutopilotController.CURVE_SLOWDOWN_SMOOTHING * delta);
    this.currentSlowdown = this.currentSlowdown + (pose.slowdown - this.currentSlowdown) * alphaSlow;
    const finalSpeed = this.currentSpeed * this.currentSlowdown;
    this.effectiveTime += delta * 1000 * finalSpeed;

    // Computes new position
    pose = this.getPoseAtTime(this.effectiveTime, delta);
    
    // Updates camera position
    if (pose) {
      // Sets camera position
      let object = this.world3d.camera.parent;
      object.position.copy(pose.position);
      this.lastPosition.copy(object.position);
      
      // Damps the yaw
      const alpha = 1 - Math.exp(-AutopilotController.YAW_DAMPING * delta);
      this.currentYaw = this.lerpAngles(this.currentYaw, pose.yaw, alpha, delta);
      this.previousYaw = this.currentYaw;
      
      // Sets camera rotation
      const worldQuat = this.cameraYaw2Quaternion(this.currentYaw);
      object.rotation.setFromQuaternion(worldQuat, 'YXZ');
      this.lastQuaternion.copy(object.quaternion);

      // Dispatch event
      if (
        this.lastPosition.distanceTo(object.position) > AutopilotController.EPS ||
        8 * (1 - this.lastQuaternion.dot(object.quaternion)) > AutopilotController.EPS
      ) {
        this.dispatchEvent({type: 'change'});
      }
    }

    // Updates last speed
    this.lastSpeed.x = AutopilotController.SPEED * finalSpeed;
  }

  /*
   * Process controller commands
   */
  processCommands() {
    for (let mc of this.world3d.xrManager.controllers) {
      if (mc == null) continue;
      Object.values(mc.components).forEach(c => {
        switch (c.type) {
          case Constants.ComponentType.TRIGGER:
            if (c.values.state == Constants.ComponentState.PRESSED) {
              // // Put action here
              // if (this.isRunning()) {
              //   this.pause();
              // } else {
              //   this.resume();
              // }
            }
            break;
          case Constants.ComponentType.BUTTON:
            if (c.id == 'b-button' || c.id == 'y-button') {
              if (
                this.byButtonPushed == null &&
                c.values.state == Constants.ComponentState.PRESSED
              ) {
                // Registers button pushed
                this.byButtonPushed = c.id;
              } else if (
                c.id == this.byButtonPushed &&
                c.values.state != Constants.ComponentState.PRESSED
              ) {
                // Button released => Performs action
                // // if (this.isRunning()) {
                // //   this.pause();
                // // } else {
                // //   this.resume();
                // // }
                // if (!this.isRunning()) {
                //   this.resume();
                // }
                this.byButtonPushed = null;
              }
            }
            break
          default:
          //
        }
      });
    };
  }

  /*
   * Easing function for acceleration transitions
   */
  easeInOutCubic(t) {
    return t < 0.5 
      ? 4 * t * t * t 
      : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  /*
   * Easing function for decceleration transitions
   */
  easeOutQuint(t) {
    return 1 - Math.pow(1 - t, 5);
  }

  /*
   * Gets curve tangent at a given parametized position
   */
  getCurveTangentAt(u) {
    let tangent = this.curve.getTangentAt(u);
    tangent = tangent.clone().applyQuaternion(
      this.world3d.camera.parent.quaternion.clone().conjugate()
    );
    return tangent;
  }

  /*
   * Lerps angles
   */
  lerpAngles(a, b, t, delta) {
    let diff = b - a;
    diff = ((diff + Math.PI) % (Math.PI * 2)) - Math.PI;
    const maxDeltaYaw = AutopilotController.MAX_ANGULAR_SPEED * delta;
    diff = Math.max(-maxDeltaYaw, Math.min(maxDeltaYaw, diff));
    return a + diff * t;
  }

  /*
   * Computes the curve factor around position u
   */
  getCurveFactor(u, t) {
    const delta = (this.curve.getLength() * t) / (2 * this.totalDuration);
    const u1 = Math.max(0, u - delta);
    const u2 = Math.min(1, u + delta);
    
    const t1 = this.getCurveTangentAt(u1);
    t1.y = 0; t1.normalize();
    
    const t2 = this.getCurveTangentAt(u2);
    t2.y = 0; t2.normalize();
    
    let dot = t1.dot(t2);
    dot = Math.max(-1, Math.min(1, dot)); // clamp
    
    const angleRad = Math.acos(dot);
    const sharpness = Math.abs(angleRad) * AutopilotController.CURVE_SLOWDOWN_SENSITIVITY;
    
    // Transforms into a speed factor (1 →  curveSlowdownFactor)
    const baseFactor = Math.pow(1 / (1 + sharpness), 1.2);
    return AutopilotController.CURVE_SLOWDOWN_FACTOR + (1 - AutopilotController.CURVE_SLOWDOWN_FACTOR) * baseFactor;
  }

  /*
   * Convert camera yaw to a quaternion in world referential
   */
  cameraYaw2Quaternion(yaw) {
    const euleurYaw = new Euler(0, yaw, 0, 'YXZ');
    const localQuat = new Quaternion();
    localQuat.setFromEuler(euleurYaw);      
    const worldQuat = new Quaternion();
    this.world3d.camera.parent.getWorldQuaternion(worldQuat);
    worldQuat.multiply(localQuat);
    return worldQuat;
  }

  /*
   * Dispose the autopilot controller 
   */
  dispose() {
    // Resets the references to others objects
    this.world3d = null;
    this.curve = null;
    this.lastPosition = null;
    this.lastSpeed = null;
    this.lastQuaternion = null;
  }

}

export { AutopilotController };