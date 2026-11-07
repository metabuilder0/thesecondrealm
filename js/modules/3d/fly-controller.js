import {
	EventDispatcher,
	Quaternion,
	Vector3
} from 'three';

import { Constants } from '/js/libs/@webxr-input-profiles/motion-controllers.module.js';


class FlyController extends EventDispatcher {

  /*
   * Constants
   */

  // Max speeds
  static MAX_SPEEDS = [0, 12.5, 500, 2500, 5000];
  static MAX_ROT_SPEEDS= [0, Math.PI / 96, Math.PI / 96, Math.PI / 64, Math.PI / 56];

  // Acceleration multipliers
  static ACCEL_MULTS = [0, 0.5, 2, 4, 8];
  static ROT_ACCEL_MULTS = [0, 0.02, 0.02, 0.04, 0.08];

  // Friction coefficients
  static FRICTION_COEFFS = [1, 0.001, 0.0005, 0.0002, 0.0002];

  // 
  static EPS = 0.000001;

  /*
   * Attributes
   */

  world3d = null;

  enabled = false;
  speedMode = null;
  tmpQuaternion = null;
  lastQuaternion = null;
	lastPosition = null;
  lastSpeed = null;
  lastRotSpeed = null;
  translAccelVector = null;
  rotAccelVector = null;

  axButtonPushed = null;
  byButtonPushed = null;


  /*
   * Constructor
   */
  constructor(world3d) {
    super();
    this.world3d = world3d;
    this.enabled = true;
    this.speedMode = 3;
		this.lastQuaternion = new Quaternion();
		this.lastPosition = new Vector3(0, 0, 0);
    this.lastSpeed = new Vector3(0, 0, 0);
    this.lastRotSpeed = new Vector3(0, 0, 0);
		this.tmpQuaternion = new Quaternion();
    this.translAccelVector = new Vector3(0, 0, 0);
    this.rotAccelVector = new Vector3(0, 0, 0);
  }

  /*
   * Update methods
   */
  update(delta) {
    if (this.enabled === false) return;

    this.updateAccelerationState();

    // Translations
    const dirY = (this.lastSpeed.y >= 0) ? 1 : -1;
    const dirZ = (this.lastSpeed.z >= 0) ? 1 : -1;

    const frictionCoeff = FlyController.FRICTION_COEFFS[this.speedMode];
    const frictionY = delta * this.lastSpeed.y ** 2 * -dirY * frictionCoeff;
    const frictionZ = delta * this.lastSpeed.z ** 2 * -dirZ * frictionCoeff;
    
    const accelMult = delta * 300 * FlyController.ACCEL_MULTS[this.speedMode];
    const accelY = this.translAccelVector.y * accelMult;
    const accelZ = this.translAccelVector.z * accelMult;

    let speedY = this.lastSpeed.y + accelY + frictionY;
    let speedZ = this.lastSpeed.z + accelZ + frictionZ;

    const maxSpeed = FlyController.MAX_SPEEDS[this.speedMode];
    const maxSpeedY = Math.max(Math.abs(0.99 * this.lastSpeed.y), maxSpeed);
    const maxSpeedZ = Math.max(Math.abs(0.99 * this.lastSpeed.z), maxSpeed);
    speedY = Math.min(speedY, maxSpeedY);
    speedY = Math.max(speedY, -maxSpeedY);
    speedZ = Math.min(speedZ, maxSpeedZ);
    speedZ = Math.max(speedZ, -maxSpeedZ);
    
    this.lastSpeed.y = speedY;
    this.lastSpeed.z = speedZ;

    let object = this.world3d.camera.parent;
    object.translateY(speedY * delta);
    object.translateZ(speedZ * delta);

    this.lastPosition.copy(object.position);
    
    // Rotations 
    const rotAccelMult = delta * FlyController.ROT_ACCEL_MULTS[this.speedMode];
    const maxRotSpeed = FlyController.MAX_ROT_SPEEDS[this.speedMode];
    
    let rotSpeedX = 0.99 * this.lastRotSpeed.x;
    if (this.rotAccelVector.x != 0) {
      const rotAccelX = this.rotAccelVector.x * rotAccelMult;
      rotSpeedX = this.lastRotSpeed.x + rotAccelX;
      rotSpeedX = Math.min(rotSpeedX, maxRotSpeed);
      rotSpeedX = Math.max(rotSpeedX, -maxRotSpeed);
    }

    let rotSpeedY = 0.99 * this.lastRotSpeed.y;
    if (this.rotAccelVector.y != 0) {
      const rotAccelY = this.rotAccelVector.y * rotAccelMult;
      rotSpeedY = this.lastRotSpeed.y + rotAccelY;
      rotSpeedY = Math.min(rotSpeedY, maxRotSpeed);
      rotSpeedY = Math.max(rotSpeedY, -maxRotSpeed);
    }

    let rotSpeedZ = 0.99 * this.lastRotSpeed.z;
    if (this.rotAccelVector.z != 0) {
      const rotAccelZ = this.rotAccelVector.z * rotAccelMult;
      rotSpeedZ = this.lastRotSpeed.z + rotAccelZ;
      rotSpeedZ = Math.min(rotSpeedZ, maxRotSpeed);
      rotSpeedZ = Math.max(rotSpeedZ, -maxRotSpeed);
    }

    this.lastRotSpeed.x = rotSpeedX;
    this.lastRotSpeed.y = rotSpeedY;
    this.lastRotSpeed.z = rotSpeedZ;

    this.tmpQuaternion.set(
      rotSpeedX * delta, 
      rotSpeedY * delta, 
      rotSpeedZ * delta,
      1
    ).normalize();

    object.quaternion.multiply(this.tmpQuaternion);

    this.lastQuaternion.copy(object.quaternion);

    // Dispatch event
    if (
      this.lastPosition.distanceTo(object.position) > FlyController.EPS ||
      8 * (1 - this.lastQuaternion.dot(object.quaternion)) > FlyController.EPS
    ) {
      this.dispatchEvent({type: 'change'});
    }
  };

  /*
   * Refresh Acceleration state
   */
  updateAccelerationState() {
    this.translAccelVector.x = 0;
    this.translAccelVector.y = 0;
    this.translAccelVector.z = 0;
    this.rotAccelVector.x = 0;
    this.rotAccelVector.y = 0;
    this.rotAccelVector.z = 0;

    try {
      // Squeeze button: switch between translation and rotation modes
      let isRotationMode = false;
      for (let mc of this.world3d.xrManager.controllers) {
        if (mc == null) continue;
        Object.values(mc.components).forEach(c => {
          if (c.type == Constants.ComponentType.SQUEEZE) {
            if (c.values.state == Constants.ComponentState.PRESSED) {
              isRotationMode = true;
            }
          }
        });
      }

      // Refresh the acceleration state object
      for (let mc of this.world3d.xrManager.controllers) {
        if (mc == null) continue;
        Object.values(mc.components).forEach(c => {
          switch (c.type) {
            case Constants.ComponentType.TRIGGER:
              if (c.values.state == Constants.ComponentState.PRESSED) {
                this.translAccelVector.z = -c.values.button;
              }
              break;
            case Constants.ComponentType.THUMBSTICK:
            case Constants.ComponentType.TOUCHPAD:
              if (c.values.state != Constants.ComponentState.DEFAULT) {
                if (!isRotationMode) {
                  this.translAccelVector.y = -c.values.yAxis;
                  // yaw
                  this.rotAccelVector.y = -c.values.xAxis;
                } else {
                  // roll
                  this.rotAccelVector.z = -c.values.xAxis;
                  // pitch
                  this.rotAccelVector.x = c.values.yAxis;
                }
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
                  // Button relased => Performs action
                  const nbSpeeds = FlyController.MAX_SPEEDS.length;
                  this.speedMode = Math.min(this.speedMode + 1, nbSpeeds-1);
                  this.byButtonPushed = null;
                }
              } else if (c.id == 'a-button' || c.id == 'x-button') {
                if (
                  this.axButtonPushed == null &&
                  c.values.state == Constants.ComponentState.PRESSED
                ) {
                  // Registers button pushed
                  this.axButtonPushed = c.id;
                } else if (
                  c.id == this.axButtonPushed &&
                  c.values.state != Constants.ComponentState.PRESSED
                ) {
                  // Button relased => Performs action
                  this.speedMode = Math.max(this.speedMode - 1, 0);
                  this.axButtonPushed = null;
                }
              }
              break           
            default:
              //
          }
        });
      };
    } catch (e) {
      console.error(e);
    }
  }

  /*
   * Dispose the fly controller 
   */
  dispose() {
  }

}

export { FlyController };
