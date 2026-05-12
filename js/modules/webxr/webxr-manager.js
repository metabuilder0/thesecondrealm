import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

import {
  fetchProfile,
  MotionController 
} from '/js/libs/@webxr-input-profiles/motion-controllers.module.js';

import {
  BufferGeometry,
  Line,
  LineBasicMaterial,
  Matrix4,
  Raycaster,
  Vector3
} from 'three';


class WebXRManager extends EventTarget {

  /*
   * Constants
   */

  static SESSION_INIT = { 
    requiredFeatures: [
      'local',
    ],
    optionalFeatures: [
      'local-floor',
      'high-refresh-rate',
      'high-fixed-foveation-level',
      'ca-correction',
      'bounded-floor', 
      'hand-tracking', 
      'layers'
    ]
  };

  static ASSETS_URI = '/static/webxr/profiles'

  static MAX_CLICK_DURATION = 800;
  static INTERSECTION_TOLERANCE = 120;


  /*
   * Attributes
   */

  world3d = null;
  session = null;
  loader = null;
  controllers = [];
  isActive = false;

  raycaster = new Raycaster();
  tempMatrix = new Matrix4();

  // Interactive objects 
  selectableObjects = [];
  
  // Controllers states
  controllerStates = [{ 
    controller: null,
    pressedObject: null,
    pressStartTime: 0,
    lastIntersectionTime: 0,
    currentHoveredObject: null
  }, {
    controller: null,
    pressedObject: null,
    pressStartTime: 0,
    lastIntersectionTime: 0,
    currentHoveredObject: null
  }];

  // Hack (required for some browsers) 
  #xrSessionIsGranted = false;


  /*
   * Constructor 
   */
  constructor(world3d) {
    super();

    this.world3d = world3d;
    this.loader = new GLTFLoader();

    // Initializes the controller and controller grip objects
    for (let i = 0; i < 2; ++i) {
      const controllerGrip = this.world3d.renderer.xr.getControllerGrip(i);
      if (controllerGrip == null) continue;
      controllerGrip.addEventListener('connected', this.onInputSourcesChange.bind(this));
      controllerGrip.addEventListener('disconnected', this.onInputSourcesChange.bind(this));
      this.world3d.camera.parent.add(controllerGrip);

      const controller = this.world3d.renderer.xr.getController(i);
      if (controller == null) continue;
      this.world3d.camera.parent.add(controller);
    }

    // Offer webxr session if it's supported by the browser
    if (typeof navigator !== 'undefined' && 'xr' in navigator) {
			// WebXRViewer (based on Firefox) has a bug where addEventListener
			// throws a silent exception and aborts execution entirely.
			if (/WebXRViewer\//i.test( navigator.userAgent)) return;
			navigator.xr.addEventListener('sessiongranted', () => {
				this.#xrSessionIsGranted = true;
			});
		}

    if (navigator.xr.offerSession !== undefined) {
      navigator.xr.offerSession('immersive-vr', WebXRManager.SESSION_INIT)
        .then(this.onSessionStarted.bind(this))
        .catch(err => {
          console.warn(err);
        });
    }
  }

  /*
   * onSessionStarted event handler
   */
  async onSessionStarted(session) {
    session.addEventListener('end', this.onSessionEnded.bind(this));
    this.session = session;
    this.isActive = true;
    this.dispatchEvent(new Event('sessionstart'));
  }

  /*
   * onSessionEnded event handler
   */
  onSessionEnded( /*event*/ ) {
    this.isActive = false;
    this.session.removeEventListener('end', this.onSessionEnded);
    this.session = null;
    this.dispose();
    this.dispatchEvent(new Event('sessionend'));
  }

  /*
   * Declare a 3D object as interactive
   */
  makeInteractive(object, callbacks = {}) {
    object.userData = {
      ...object.userData,
      onClick: callbacks.onClick || null,
      onPress: callbacks.onPress || null,
      onPointerOver: callbacks.onPointerOver || null,
      onPointerOut: callbacks.onPointerOut || null,
      isInteractive: true,
    };

    if (!this.selectableObjects.includes(object)) {
      this.selectableObjects.push(object);
    }
  }

  /*
   * onInputSourcesChange event handler
   */
  async onInputSourcesChange(e) {
    try {
      if (!this.isActive) return;

      this.clearControllers();

      for (let i = 0; i < 2; i++) {
        let inputSource = this.world3d.renderer.xr.getInputSource(i);
        if (inputSource == null) continue;

        let controllerGrip = this.world3d.renderer.xr.getControllerGrip(i);

        const ctrl = this.controllerStates[i];
        ctrl.controller = this.world3d.renderer.xr.getController(i);
        ctrl.controller.add(this.buildLaserLine());
        ctrl.controller.addEventListener('selectstart', (e) => this.onSelectStart(i, e).bind(this));
        ctrl.controller.addEventListener('selectend', (e) => this.onSelectEnd(i, e).bind(this));
        
        let {profile, assetPath} = await fetchProfile(inputSource, WebXRManager.ASSETS_URI);

        // Forces use of meta quest touch plus model for now
        let tokens = assetPath.split('/');
        tokens[tokens.length - 2] = 'meta-quest-touch-plus';
        assetPath = tokens.join('/');
        const motionController = new MotionController(inputSource, profile, assetPath);

        if (!this.loader) return;

        await this.loader.load(motionController.assetUrl, (glb) => {
          if (!this.isActive) return;
          // Attaches the model to the controller grip
          let controllerModel = glb.scene;
          controllerGrip.clear();
          controllerGrip.add(controllerModel);
          // Adds motionController to the array of controllers
          this.controllers[i] = motionController;
        }, undefined, (error) => {
          console.error(error);
        });   
      }
    } catch (e) {
      console.error(e);
    }
  }

  /*
   * Start a new XR session
   */
  startSession() {
    if (this.session === null) {
      navigator.xr.requestSession(
        'immersive-vr', 
        WebXRManager.SESSION_INIT
      ).then(
        this.onSessionStarted.bind(this)
      );
    } else {
      this.session.end();
      if (navigator.xr.offerSession !== undefined) {
        navigator.xr.offerSession(
          'immersive-vr', 
          WebXRManager.SESSION_INIT
        ).then(
          this.onSessionStarted.bind(this)
        ).catch( err => {
          console.warn(err);
        });
      }
    }
  }

  /*
   * End the XR session
   */
  async endSession() {
    if (this.session) {
      await this.session.end();
    }
  }

  /*
   * Animation loop
   */
  update(delta) {
    try {
      for (let controller of this.controllers) {
        if (controller != null) {
          controller.updateFromGamepad();
        }
      }
      this.updateXRInteractions();
    } catch (e) {
      console.error(e);
    }
  }

  updateXRInteractions() {
    for (let i = 0; i < 2; i++) {
      const ctrl = this.controllerStates[i];
      if (!ctrl.controller) continue;
      const intersection = this.getIntersection(i);
      this.updateHover(ctrl, intersection);
      this.updateLaser(ctrl, intersection);
    }
  }

  updateHover(ctrl, intersection) {
    const now = Date.now();
    let newHovered = null;
    if (intersection.interactiveObj) {
      newHovered = intersection.interactiveObj;
      ctrl.lastIntersectionTime = now;
    }
    // Hover changed?
    if (newHovered !== ctrl.currentHoveredObject) {
      if (ctrl.currentHoveredObject && ctrl.currentHoveredObject.userData.onPointerOut) {
        ctrl.currentHoveredObject.userData.onPointerOut(intersection);
      }
      if (newHovered && newHovered.userData && newHovered.userData.onPointerOver) {
        newHovered.userData.onPointerOver(intersection);
      }
      ctrl.currentHoveredObject = newHovered;
    }
  }

  updateLaser(ctrl, intersection) {
    for (let child of ctrl.controller.children) {
      if (child instanceof Line) {
        if (intersection.result) {
          child.visible = true;
          // Extend laser to hit point
          const hitDistance = intersection.result.distance;
          child.scale.set(1, 1, hitDistance);
        } else {
          child.visible = false;
          child.scale.set(1, 1, 2);   // default length when visible
        }
      }
    }
  }

  /*
   * Initialize a laser line for a controller
   */
  buildLaserLine() {
    const laserMaterial = new LineBasicMaterial({ 
      color: 0x10faef, 
      transparent: true, 
      opacity: 0.7 
    });
    const laserPoints = [new Vector3(0, 0, -0.05), new Vector3(0, 0, -1)];
    const laserGeometry = new BufferGeometry().setFromPoints(laserPoints);
    let laserLine = new Line(laserGeometry, laserMaterial);
    laserLine.visible = false;
    return laserLine;
  }

  /*
   * onSelectStart event handler
   */
  onSelectStart(i, e) {
    const ctrl = this.controllerStates[i];
    if (ctrl.controller == null) return;

    const intersection = this.getIntersection(i);

    if (intersection.interactiveObj) {
      if (ctrl.pressedObject != intersection.interactiveObj) {
        ctrl.pressedObject = intersection.interactiveObj;
        ctrl.pressStartTime = Date.now();
        ctrl.lastIntersectionTime = Date.now();

        // Optional immediate feedback
        if (ctrl.pressedObject.userData.onPress) {
          ctrl.pressedObject.userData.onPress(intersection);
        }
      }
    }
  }

  /*
   * onSelectEnd event handler
   */
  onSelectEnd(i, e) {
    const ctrl = this.controllerStates[i];
    if (!ctrl.pressedObject) return;

    const timeHeld = Date.now() - ctrl.pressStartTime;
    if (timeHeld > WebXRManager.MAX_CLICK_DURATION) {
      ctrl.pressedObject = null;
      return;
    }

    const intersection = this.getIntersection(i);

    const stillPointingAtSameObject =
      intersection.interactiveObj &&
      intersection.interactiveObj == ctrl.pressedObject;

    // Click detection
    if (
      stillPointingAtSameObject || 
      (Date.now() - ctrl.lastIntersectionTime) < INTERSECTION_TOLERANCE)
    {
      if (ctrl.pressedObject.userData.onClick) {
        ctrl.pressedObject.userData.onClick(intersection);
      }
    }

    ctrl.pressedObject = null;
  }

  /*
   * Raycast from a specific controller
   */
  getIntersection(i) {
    const ctrl = this.controllerStates[i];
    const controller = ctrl.controller;
    if (!controller) {
      return {
        idxController: i,
        result: null, 
        interactiveObj: null
      };
    }

    this.tempMatrix.identity().extractRotation(controller.matrixWorld);
    this.raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
    this.raycaster.ray.direction.set(0, 0, -1).applyMatrix4(this.tempMatrix);
    const intersects = this.raycaster.intersectObjects(this.selectableObjects, true);
    
    let intersect = intersects.length > 0 ? intersects[0] : null;
    let interactiveObj = null;
    
    if (intersect != null)  {
      interactiveObj = intersect.object;
      while (interactiveObj && !interactiveObj.userData.isInteractive) {
        interactiveObj = interactiveObj.parent;
      }
      if (interactiveObj && !interactiveObj.userData.isInteractive) {
        interactiveObj = null;
      }    
    }

    return {
      idxController: i,
      result: intersect, 
      interactiveObj: interactiveObj
    };
  }

  /*
   * Clear the controllers array
   */
  clearControllers() {
    try {
      for (let i = 0; i < 2; ++i) {
        const controller = this.controllerStates[i];
        controller.removeEventListener('selectstart', (e) => this.onSelectStart(i, e).bind(this));
        controller.removeEventListener('selectend', (e) => this.onSelectEnd(i, e).bind(this));
      }
    } catch (e) {}

    this.controllers = [null, null];
    
    this.controllerStates = [{ 
      controller: null,
      pressedObject: null,
      pressStartTime: 0,
      lastIntersectionTime: 0,
      currentHoveredObject: null
    }, {
      controller: null,
      pressedObject: null,
      pressStartTime: 0,
      lastIntersectionTime: 0,
      currentHoveredObject: null
    }];
  }

  /*
   * Clear the WebXRManager object
   */
  dispose() {
    for (let i = 0; i < 2; ++i) {
      const controllerGrip = this.world3d.renderer.xr.getControllerGrip(i);
      if (controllerGrip == null) continue;
      controllerGrip.removeEventListener('connected', this.onInputSourcesChange.bind(this));
      controllerGrip.removeEventListener('disconnected', this.onInputSourcesChange.bind(this));
    }

    this.clearControllers();

    this.controllers = null;
    this.controllerStates = null;
    this.selectableObjects = null;
    this.loader = null;
    this.world3d = null;
    this.session = null;
  }

}

export { WebXRManager };
