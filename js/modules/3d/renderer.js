import {
	Clock,
  WebGLRenderer
} from 'three';


class Renderer extends WebGLRenderer {

  /*
   * Attributes
   */

  world3d = null;
  renderLoopEnabled = false;
  
  #clock = new Clock();


  /*
   * Constructor
   */
  constructor(world3d) {
    super({
      antialias: true,
      powerPreference: 'high-performance'
    });

    this.world3d = world3d;
    this.setPixelRatio(window.devicePixelRatio);
    this.setSize(window.innerWidth, window.innerHeight);
    this.sortObjects = false;
    this.domElement.tabIndex = 0;
    this.localClippingEnabled = true;

    this.world3d.container.appendChild(this.domElement);

    this.xr.enabled = true;
    this.xr.cameraAutoUpdate = true;
    this.xr.setReferenceSpace('local');
    this.xr.setFoveation(0);
    this.xr.setFramebufferScaleFactor(2.0);
    
    window.addEventListener(
      'resize', 
      this.refreshRendererSize.bind(this), 
      false
    );
  }

  onSessionStart(e) {
    this.xr.setSession(this.world3d.xrManager.session);    
  }

  /*
   * Animate the scene3d
   */
  animate() {
    let animateFn = this.processRendering.bind(this);
    this.setAnimationLoop(animateFn);
  }

  /*
   * Render the scene3d
   */
  processRendering() {
    let delta = this.#clock.getDelta();
    if (this.renderLoopEnabled && this.world3d.xrManager) {
      this.world3d.xrManager.update(delta);
    }
    if (this.renderLoopEnabled && this.world3d.controller) {
      this.world3d.controller.update(delta);
    }
    if (this.renderLoopEnabled && this.world3d.pointsCloud) {
      this.world3d.pointsCloud.update(delta);
    }
    if (this.renderLoopEnabled && this.world3d.hud) {
      this.world3d.hud.update(delta);
    }
    if (this.renderLoopEnabled && this.world3d.selectionHelper) {
      this.world3d.selectionHelper.update(delta);
    }
    if (this.renderLoopEnabled && this.world3d.tour) {
      this.world3d.tour.update(delta);
    }
    if (this.renderLoopEnabled && this.world3d.autopilot) {
      this.world3d.autopilot.update(delta);
    }
    this.render(this.world3d.scene, this.world3d.camera);
  }

  /*
   * Set focus 
   */
  setFocus() {
    if (this.domElement !== null)
      this.domElement.focus();
  }

  /*
   * Refresh Renderer size 
   */
  refreshRendererSize() {
    this.setSize(window.innerWidth, window.innerHeight);
  }

  /*
   * Dispose the renderer 
   */
  dispose() {
    this.renderLoopEnabled = false;
    // Removes the event listeners
    window.removeEventListener(
      'resize', 
      this.refreshRendererSize.bind(this)
    );
    // Resets the references to others objects
    this.world3d = null;
    this.#clock = null;
    // Call parent method
    super.dispose();
  }

}

export { Renderer };
