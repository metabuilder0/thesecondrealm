import { 
  Vector3,
  LineSegments,
  BoxGeometry,
  EdgesGeometry,
  LineBasicMaterial
} from 'three';

import { AudioGuide } from './audioguide.js';
import { POS_FARFAR_AWAY } from '../data/positions-constants.js';


class GuidedTour extends LineSegments {

  /*
   * Constants
   */

  static DEFAULT_LANG = 'en';

  static COORD_HEIGHT = 'block_height';
  static COORD_DATA= 'data_series';

  static COLORS_PALETTE = [
    0x590000,
    0x6c0000,
    0x760000,
    0x890000,
    0x9b0000,
    0xae0000,
    0xbb0000,
    0xcb0000,
    0xdb0000,
    0xf00000,
    0xdb0000,
    0xcb0000,
    0xbb0000,
    0xae0000,
    0x9b0000,
    0x890000,
    0x760000,
    0x6c0000,
  ];

  /* 
   * Attributes
   */

  world3d = null;

  version = null;
  title = null;
  coordTypes = null;
  initialPosition = null;
  stages = [];

  currentStage = -1;

  #probeColorAnimCtr = 0;
  #refreshCumulWait = 0;
  #audioIntroPath = '';
  #audioOutroPath = '';

  isLoadingOk = false;


  /*
   * Constructor
   */
  constructor(world3d) {
    const geometry = new BoxGeometry(1000, 1000, 1000);
    const edgesGeometry = new EdgesGeometry(geometry);
    const material = new LineBasicMaterial({ color: GuidedTour.COLORS_PALETTE[0]});
    super(edgesGeometry, material);

    this.setProbePosition(POS_FARFAR_AWAY[0]);

    this.world3d = world3d;

    // Pauses audioguide on resume event notified by the controller
    this.world3d.controller.addEventListener(
      'resume', 
      this.pauseAudioguide.bind(this), 
      false
    );
  }

  /*
   * Load the descriptor file 
   */
  async load(url) {
    this.isLoadingOk = false;
    const path = [];

    const tourDescriptor = await dataStore.getTourDescriptorFile(url);
    if (!tourDescriptor) {
      return []; 
    }
    
    this.title = tourDescriptor['title'];
    this.version = tourDescriptor['version'];
    this.coordTypes = tourDescriptor['coords_type'];
    this.initialPosition = this.getWorld3dPosition(tourDescriptor['initial_pos']);
    // Adds initial position to the path
    if (this.initialPosition == null) return [];
    // Sets default audio intro and outro
    if ('lang' in tourDescriptor) {
      const lang = AudioGuide.SUPPORTED_LANGS.includes(tourDescriptor['lang'])
        ? tourDescriptor['lang']
        : GuidedTour.DEFAULT_LANG;
      this.#audioIntroPath = `/static/sounds/guided_tour_intro_${lang}.wav`;
      this.#audioOutroPath = `/static/sounds/guided_tour_outro_${lang}.wav`;
    }
    // Sets volume of voice
    if ('voice_level' in tourDescriptor) {
      const voiceLevel = tourDescriptor['voice_level'];
      this.world3d.audioguide.setVolume(voiceLevel);
    }
    // Sets volume of background music
    if ('music_level' in tourDescriptor) {
      const musicLevel = tourDescriptor['music_level'];
      this.world3d.soundSystem.setVolume(musicLevel);
    }
    // Builds the tour and the path
    for (let stage of tourDescriptor['stages']) {
      const pos = this.getWorld3dPosition(stage['coords']);
      if (pos == null) return [];
      this.stages.push({
        'coords': pos,
        'title': stage['title'],
        'content': stage['desc'],
        'audiofile': 'audiofile' in stage ? stage['audiofile'] : null
      });
      path.push(pos);
    }

    this.isLoadingOk = true;
    return path;
  }

  /**
   * Converts a position expressed in block height 
   * or in data series coordinates
   * into World3D coordinates
   */
  getWorld3dPosition(pos) {
    if (this.coordTypes == GuidedTour.COORD_DATA) {
      return this.world3d.pointsCloud.rawDataToCoords3d(pos);
    } else {
      return this.world3d.pointsCloud.heightToCoords3d(pos);
    }
  } 

  /*
   * Start the trip
   */
  start() {
    if (!this.isLoadingOk) return;
    // Deactivates the selection tool during the tour
    this.world3d.selectionHelper.isActive = false; 
    // Displays the introductory message
    this.displayIntroductoryMessage();
    // Moves the probe to the initial position
    if (this.initialPosition != null) {
      this.setProbePosition(this.initialPosition);
    }
  }

  /*
   * Exit the realm
   */
  exit() {
    this.exitTimeout = setTimeout(() => {
      this.world3d.xrManager.endSession();
    }, 4000);
  }

  /*
   * Position the probe at a given position 
   */
  setProbePosition(position) {
    this.position.x = position[0];
    this.position.y = position[1];
    this.position.z = position[2];
    this.updateMatrixWorld(true);
  }

  /*
   * Display an introductory message 
   */
  displayIntroductoryMessage() {
    const title = `Welcome to our guided tour\n"${this.title}"`;

    let content1 = `You've entered The Second Realm, a purely digital space.\n\nEach point composing the point cloud in front of you represents a Bitcoin block, with its position defined by three attributes of the block.\n\n`;
    content1 += `During your journey into this realm, you'll be guided by a probe that localizes the points of interest. It looks like a pulsating red cube. You should be able to see it if you look around.\n\n`;
    content1 += `Get to the red probe to start the tour.`;
    const content2 = ``;
    this.world3d.hud.leftScreen.displayMessage(title, content1, content2);
    if (this.#audioIntroPath != null) {
      this.world3d.audioguide.loadAudio(this.#audioIntroPath);
    }
  }

  /*
   * Display a good bye message 
   */
  displayGoodByeMessage() {
    const title = `Thank you!`;
    let content1 = `This last step marks the end of the tour.\n\nWe hope that you have enjoyed your ride with us.\n\n`;
    content1 += `You will be back in the physical world in a few seconds.`;
    const content2 = ``;
    this.world3d.hud.leftScreen.displayMessage(title, content1, content2);
    if (this.#audioOutroPath != null) {
      this.world3d.audioguide.loadAudio(this.#audioOutroPath, this.exit.bind(this));
    } else {
      this.exit();
    }
  }

  /*
   * Display content related to a given stage of the trip 
   */
  displayStageDescription(idxSage) {
    const stage = this.stages[idxSage];
    const title = `${stage.title}`;
    const content1 = `${stage.content}`;
    const content2 = `When you're ready, get to the red probe to continue the tour.`;
    this.world3d.hud.leftScreen.displayMessage(title, content1, content2);
    if (stage['audiofile'] != null) {
      this.world3d.audioguide.loadAudio(stage['audiofile']);
    }
  }

  /*
   * Temporarily sets the audioguide on pause
   */
  pauseAudioguide() {
    this.world3d.audioguide.stop();
  }

  /*
   * Dispose
   */
  dispose() {
    // Clears event listeners
    this.world3d.controller.removeEventListener(
      'resume',
      this.pauseAudioguide.bind(this)
    );
    // Clears timeouts
    if (this.exitTimeout) {
      clearTimeout(this.exitTimeout); 
    }
    // Resets the references to others objects
    this.world3d = null;
  }

  /*
   * Code processed in the update loop 
   */
  update(delta) {
    if (!this.isLoadingOk) return;

    this.#refreshCumulWait += delta;
    if (this.#refreshCumulWait > 0.1) {
      // Animates pulsations of the probe
      this.updateProbeColor(delta);
      // Checks our distance to the probe
      if (this.getDistanceToProbe() <= 1000) {
        // Moves the probe to the next stage of the trip
        // and displays the associated description
        this.switchToNextStage();
      }
      this.#refreshCumulWait = 0.0;
    }
  }

  /*
   * Compute the distance
   * between the probe and the camera 
   */
  getDistanceToProbe() {
    let cameraPos = new Vector3();
    this.world3d.camera.parent.getWorldPosition(cameraPos);
    let probePos = new Vector3();
    this.getWorldPosition(probePos);
    return cameraPos.distanceTo(probePos);
  }

  /*
   * Update the color of the probe
   */
  updateProbeColor(delta) {
    const nbColors = GuidedTour.COLORS_PALETTE.length;
    this.#probeColorAnimCtr = (this.#probeColorAnimCtr + 1) % nbColors;
    this.material.color.setHex(GuidedTour.COLORS_PALETTE[this.#probeColorAnimCtr]);
  }
  
  /*
   * Move to next stage of the trip 
   */
  switchToNextStage() {
    this.currentStage++;
    if (this.currentStage < this.stages.length) {
      if (this.stages[this.currentStage]['audiofile'] != null) {
        this.world3d.audioguide.loadAudio(this.stages[this.currentStage]['audiofile']);
      }
      this.displayStageDescription(this.currentStage);
      this.setProbePosition(this.stages[this.currentStage].coords);
    } else {
      this.currentStage = -1;
      this.setProbePosition(POS_FARFAR_AWAY[0]);
      this.displayGoodByeMessage();
      // Reactivates the selection tool during the tour
      this.world3d.selectionHelper.isActive = true; 
    }
  }

}

export { GuidedTour };
