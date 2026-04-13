import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

import {
  fetchProfile,
  MotionController 
} from '/js/libs/@webxr-input-profiles/motion-controllers.module.js';


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


  /*
   * Attributes
   */

  world3d = null;
  session = null;
  loader = null;
  controllers = [];
  isActive = false;

  // Hack (required for some browsers) 
  #xrSessionIsGranted = false;


  /*
   * Constructor 
   */
  constructor(world3d) {
    super();

    this.world3d = world3d;
    this.loader = new GLTFLoader();

    // Initializes the controller objects
    for (let i = 0; i < 2; ++i) {
      const controller = this.world3d.renderer.xr.getControllerGrip(i);
      if (controller == null) continue;
      controller.addEventListener('connected', this.onInputSourcesChange.bind(this));
      controller.addEventListener('disconnected', this.onInputSourcesChange.bind(this));
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
   * onInputSourcesChange event handler
   */
  async onInputSourcesChange(e) {
    try {
      if (!this.isActive) return;

      this.controllers = [];

      for (let i = 0; i < 2; i++) {
        let inputSource = this.world3d.renderer.xr.getInputSource(i);
        if (inputSource == null) continue;
        
        let controller = this.world3d.renderer.xr.getControllerGrip(i);
        
        let {profile, assetPath} = await fetchProfile(inputSource, WebXRManager.ASSETS_URI);

        // Forces use of meta quest touch plus model for now
        let tokens = assetPath.split('/');
        tokens[tokens.length - 2] = 'meta-quest-touch-plus';
        assetPath = tokens.join('/');
        const motionController = new MotionController(inputSource, profile, assetPath);

        if (!this.loader) return;
        await this.loader.load(motionController.assetUrl, (glb) => {
          if (!this.isActive) return;
          let controllerModel = glb.scene;
          controller.clear();
          controller.add(controllerModel);
          this.controllers.push(motionController);
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
        controller.updateFromGamepad();
      }
    } catch (e) {
      console.error(e);
    }
  }


  /**
   * Clear the WebXRManager object
   */
  dispose() {
    for (let i = 0; i < 2; ++i) {
      const controller = this.world3d.renderer.xr.getControllerGrip(i);
      if (controller == null) continue;
      controller.removeEventListener('connected', this.onInputSourcesChange.bind(this));
      controller.removeEventListener('disconnected', this.onInputSourcesChange.bind(this));
    }

    this.controllers = null;
    this.loader = null;
    this.world3d = null;
    this.session = null;
  }

}

export { WebXRManager };
