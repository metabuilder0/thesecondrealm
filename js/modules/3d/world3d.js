import {
  Cache,
  Scene,
  AmbientLight
} from 'three';

import { Cube } from './cube.js';
import { HUD } from './hud/hud.js';
import { GuidedTour } from './guided-tour.js';
import { Autopilot } from './autopilot.js';
import { GuidedTourAutopilot } from './guided-tour-autopilot.js';
import { AudioGuide } from './audioguide.js';
import { Camera } from './camera.js';
import { PointsCloud } from './points-cloud.js';
import { SoundSystem } from './sound-system.js';
import { AutopilotController } from './autopilot-controller.js';
import { FlyController } from './fly-controller.js';
import { Renderer } from './renderer.js';
import { WebXRManager } from '../webxr/webxr-manager.js';
import { CUBE_SIZE } from '../data/positions-constants.js';
import { SelectionHelper } from './selection/selection-helper.js';


class World3D {

  /*
   * Constants
   */

  // PointsCloud display mode
  static DISPLAY_MODE_STATIC = 1;
  static DISPLAY_MODE_ANIMATION = 2;

  /**
   * Attributes
   */

  // Children
  scene = null;
  renderer = null;
  container = null;
  camera = null;
  hud = null;
  controller = null; 
  soundSystem = null;
  pointsCloud = null;
  xrManager = null;
  tour = null;
  audioguide = null;
  selectionHelper = null;

  // Tour type
  tourType = null;

  // Show boundaries
  showBoundaries = true;

  // Boolean flag indicating if loading has completed
  immersionModeActivated = false;


  /*
   * Constructor
   */
  constructor(container, tourType, showBoundaries) {
    //Cache.enabled = true;
    this.container = container;
    this.tourType = tourType;
    this.showBoundaries = showBoundaries;
  
    this.scene = new Scene();
    this.#initCamera();
    this.#initRenderer();
    this.#initController();
    this.#initSelectionHelper();
    this.#initXrSession();
    this.#initHUD();
    this.#initLights();
    this.#initGrid();
    this.#initAudio();
    this.#initAudioguide();

    this.renderer.renderLoopEnabled = true;

    this.renderer.animate();
  }

  /*
   * Initialize the camera
   */
  #initCamera() {
    this.camera = new Camera(this);
    this.scene.add(this.camera.parent);
  }

  /*
   * Initialize the renderer
   */
  #initRenderer() {
    this.renderer = new Renderer(this);
  }

  /*
   * Initialize the controller
   */
  #initController() {
    if (this.tourType == 'autopilot' || this.tourType == 'guided_tour_autopilot') {
      this.controller = new AutopilotController(this);
    } else {
      this.controller = new FlyController(this);
    }
  }

  /*
   * Initialize the XR session
   */
  #initXrSession() {
    this.xrManager = new WebXRManager(this);
    this.xrManager.addEventListener(
      'sessionstart', 
      this.renderer.onSessionStart.bind(this.renderer)
    );
    this.xrManager.startSession();
  }
        
  /*
   * Initialize the lights
   */ 
  #initLights() {
    // Creates an ambient light
    let ambientLight = new AmbientLight(0x202020);
    this.scene.add(ambientLight);
  }

  /*
   * Initialize a HUD
   */
  #initHUD() {
    this.hud = new HUD(this);
  }

  /*
   * Initialize the grid
   */
  #initGrid() {
    if (this.showBoundaries) {
      let cube = new Cube();
      this.scene.add(cube);
      cube.build(CUBE_SIZE, 0x1f1f1f);
    }
  }

  /*
   * Initialize the audio elements 
   */
  #initAudio() {
    this.soundSystem = new SoundSystem();
  }

  /*
   * Initialize the selection helper
   */
  #initSelectionHelper() {
    this.selectionHelper = new SelectionHelper(this);
    this.scene.add(this.selectionHelper);
  }

  /*
   * Initialize the audio elements 
   */
  #initAudioguide() {
    if (this.tourType != null) {
      this.audioguide = new AudioGuide(this);
    }
  } 
  
  /*
   * Initialize the Tour 
   */
  initTour() {
    if (this.tourType == null) return;
    // Initializes constants
    if (this.tourType == 'guided_tour') {
      this.tour = new GuidedTour(this);
    } else if (this.tourType == 'guided_tour_autopilot') {
      this.tour = new GuidedTourAutopilot(this);
      AutopilotController.CURVE_SLOWDOWN_SENSITIVITY = 1.0;
      AutopilotController.CURVE_SLOWDOWN_SMOOTHING = 2.0;
      AutopilotController.MAX_ANGULAR_SPEED = Math.PI / 4;
    } else if (this.tourType == 'autopilot') {
      this.tour = new Autopilot(this);
      AutopilotController.CURVE_SLOWDOWN_SENSITIVITY = 3.0;
      AutopilotController.CURVE_SLOWDOWN_SMOOTHING = 3.0;
      AutopilotController.MAX_ANGULAR_SPEED = Math.PI / 96;
    }
    // Initializes event handlers
    if (this.tourType == 'guided_tour_autopilot' || this.tourType == 'autopilot') {
      this.controller.addEventListener(
        'resume', 
        this.tour.displayOnTheMoveMessage.bind(this.tour), 
        false
      );
      this.controller.addEventListener(
        'completed', 
        this.tour.onTourComplete.bind(this.tour), 
        false
      );
    }
    // Adds the tour to the scene
    this.scene.add(this.tour);
  }

  /*
   * Start the Tour 
   */
  async startTour(url) {
    try {
      if (this.tourType != null) {
        // Loads the tour
        const path = await this.tour.load(url);
        // Loading of the path by the Autopilot controller 
        if (this.tourType == 'autopilot' || this.tourType == 'guided_tour_autopilot') {
          this.controller.loadPath(path);
        }
        // Starts the tour
        this.tour.start();
      }
    } catch (e) {
      console.log('A problem was encountered while trying to load the tour: ' + url);
      console.log(e);
    }
  }

  /**
   * Display a PointsCloud
   */
  displayPointsCloud(cloudData, mode) {
    // Disposes the PointsCloud if it already exists
    if (this.pointsCloud != null) {
      this.scene.remove(this.pointsCloud);
      this.pointsCloud.dispose(); 
    }
    // Initializes the PointsCloud
    this.pointsCloud = new PointsCloud(
      this,
      cloudData.dataPoints.length, 
      CUBE_SIZE
    );
    // Displays the PointsCloud  
    this.scene.add(this.pointsCloud);
    if (mode == World3D.DISPLAY_MODE_STATIC) {
      this.pointsCloud.showPointsCloud(cloudData);
    } else {
      this.pointsCloud.prepareAnimation(cloudData);
    }
    this.renderer.setFocus();
  }

  /**
   * Clear the World3D object
   */
  dispose() {
    this.immersionModeActivated = false;
    // Removes the event listeners 
    this.xrManager.removeEventListener(
      'sessionstart', 
      this.renderer.onSessionStart.bind(this.renderer)
    );
    if (this.tourType == 'guided_tour_autopilot' || this.tourType == 'autopilot') {
      this.controller.removeEventListener(
        'resume', 
        this.tour.displayOnTheMoveMessage.bind(this.tour)
      );
      this.controller.removeEventListener(
        'completed', 
        this.tour.onTourComplete.bind(this.tour)
      );
    }
    // Disposes the renderer 
    this.renderer.dispose();
    // Disposes the sound system
    this.soundSystem.stop();
    this.soundSystem.dispose();
    // Disposes the camera
    this.camera.dispose();
    // Disposes the controller
    this.controller.dispose();
    // Disposes the points cloud
    this.pointsCloud.dispose();
    // Disposes the hud
    this.hud.dispose();
    // Disposes the selection helper
    this.selectionHelper.dispose();
    // Disposes the guided tour
    if (this.tour) {
      this.tour.dispose();
    }
    // Disposes the audioguide
    if (this.audioguide) {
      this.audioguide.dispose();
    }
    // Disposes the Tree of Object3D
    this.disposeObjectTree(this.scene);
    // Resets the references to others objects
    this.scene = null;
    this.renderer = null;
    this.container = null;
    this.camera = null;
    this.hud = null;
    this.controller = null; 
    this.soundSystem = null;
    this.pointsCloud = null;
    this.selectionHelper = null;
    this.xrManager = null;
    this.tour = null;
    this.audioguide = null;
  }

  isRenderItem(obj) {
    return 'geometry' in obj && 'material' in obj;
  }

  disposeMaterial(obj) {
    if (!this.isRenderItem(obj)) return;
    // because obj.material can be a material or array of materials
    const materials = [].concat(obj.material);
    for (const material of materials) {
      material.dispose();
    }
  }

  disposeObject(
    obj, 
    removeFromParent = true, 
    destroyGeometry = true, 
    destroyMaterial = true
  ) {
    if (!obj) return;

    if (this.isRenderItem(obj)) {
      if (obj.geometry && destroyGeometry) {
        obj.geometry.dispose();
      }
      if (destroyMaterial) {
        this.disposeMaterial(obj);
      }
    }

    removeFromParent 
      && Promise.resolve().then(() => {
        // if we remove children in the same tick then we can't continue traversing,
        // so we defer to the next microtask
        obj.parent && obj.parent.remove(obj)
      });
  }

  disposeObjectTree(
    obj,
    removeFromParent = true, 
    destroyGeometry = true, 
    destroyMaterial = true
  ) {
    obj.traverse(node => {
      this.disposeObject(node, removeFromParent, destroyGeometry, destroyMaterial);
    });
  }

}

export { World3D };
