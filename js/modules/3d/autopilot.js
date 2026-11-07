import {
  LineSegments,
  BoxGeometry,
  EdgesGeometry,
  LineBasicMaterial,
  Vector3
} from 'three';

import { POS_FARFAR_AWAY } from '../data/positions-constants.js';
import { AudioGuide } from './audioguide.js';


class Autopilot extends LineSegments {

  /*
   * Constants
   */

  static DEFAULT_LANG = 'en';
  static COORD_HEIGHT = 'block_height';
  static COORD_DATA= 'data_series';

  static DEFAULT_SPEED = 1500;


  /* 
   * Attributes
   */

  world3d = null;

  version = null;
  title = null;
  coordTypes = null;
  stages = [];
  
  currentStage = -1;

  #refreshCumulWait = 0;
  #audioIntroPath = '';
  #audioOutroPath = '';

  curve = null;
  enabled = false;
  isLoadingOk = false;
  hasStageDescriptions = false;
  
  

  /*
   * Constructor 
   */
  constructor(world3d) {
    const geometry = new BoxGeometry(1000, 1000, 1000);
    const edgesGeometry = new EdgesGeometry(geometry);
    // Creates a material for the autopilot line
    const material = new LineBasicMaterial({
      color: 0x000000,
      opacity: 0,
      transparent: true
    });

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
    const tourDescriptor = await dataStore.getTourDescriptorFile(url);
    if (!tourDescriptor) {
      return []; 
    }
    return this.loadDescriptor(tourDescriptor);
  }

  /*
   * Build the tour from an already loaded descriptor.
   */
  loadDescriptor(tourDescriptor) {
    this.isLoadingOk = false;
    this.stages = [];
    this.currentStage = -1;
    this.hasStageDescriptions = false;
    const path = [];

    this.title = tourDescriptor['title'];
    this.version = tourDescriptor['version'];
    this.coordTypes = tourDescriptor['coords_type'];

    // Forces initial position in front of the camera
    const initPos = new Vector3(0, 0, -50000);
    const initPosWorld = new Vector3();
    this.world3d.camera.parent.localToWorld(initPosWorld.copy(initPos));
    this.initialPosition = [initPosWorld.x, initPosWorld.y, initPosWorld.z];
    // Adds initial position to the path
    path.push(this.initialPosition);
    // Sets default audio intro and outro
    const lang = 
      'lang' in tourDescriptor && AudioGuide.SUPPORTED_LANGS.includes(tourDescriptor['lang'])
      ? tourDescriptor['lang']
      : Autopilot.DEFAULT_LANG;
    this.#audioIntroPath = `/static/sounds/wandering_intro_${lang}.wav`;
    this.#audioOutroPath = `/static/sounds/wandering_outro_${lang}.wav`;
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
      if (pos == null) continue;
      if ('desc' in stage) {
        this.hasStageDescriptions = true;
      }
      this.stages.push({
        'coords': pos,
        'title': stage['title'],
        'content': stage['desc'],
        'audiofile': 'audiofile' in stage ? stage['audiofile'] : null,
        'filters': 'filters' in stage ? stage['filters'] : null
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
    if (this.coordTypes == Autopilot.COORD_DATA) {
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
   * Start tour
   */
  startAutopilot() {
    this.world3d.controller.resume();
  }

  /*
   * Exit the realm
   */
  exit() {
    this.exitTimeout = setTimeout(() => {
      if (this.world3d) {
        this.world3d.onTourExit();
      }
    }, 4000);
  }

  /*
   * On tour complete
   */
  onTourComplete() {
    this.displayGoodByeMessage();
  }

  /*
   * Display an introductory message 
   */
  displayIntroductoryMessage() {
    const title = `Welcome to our tour\n"${this.title}"`;
    let content1 = `You've entered The Second Realm, a purely digital space.\n\nEach point composing the point cloud in front of you represents a Bitcoin block, with its position defined by three attributes of the block.\n\n`;
    content1 += `Fasten your seatbelt.\n\nWe're about to start this tour.`;
    const content2 = ``;
    this.world3d.hud.leftScreen.displayMessage(title, content1, content2);
    this.fadein = setTimeout(() => {
      this.world3d.audioguide.loadAudio(this.#audioIntroPath, this.startAutopilot.bind(this));
      clearTimeout(this.fadein);
    }, 1000);
  }

  /*
   * Display a message when the dataship is moving 
   */
  displayOnTheMoveMessage() {
    const title = ``;
    let content1 = ``;
    const content2 = ``;
    this.world3d.hud.leftScreen.displayMessage(title, content1, content2);
  }

  /*
   * Display a good bye message 
   */
  displayGoodByeMessage() {
    const title = `Thank you!`;
    let content1 = `This is the end of this tour.\n\nWe hope that you have enjoyed your ride with us.`;
    content1 += `You will be back in the physical world in a few seconds.`;
    const content2 = ``;
    this.world3d.hud.leftScreen.displayMessage(title, content1, content2);
    this.world3d.audioguide.loadAudio(this.#audioOutroPath, this.exit.bind(this));
  }

  /*
   * Display a progress message
   */
  displayProgressMessage(currentTime, totalDuration) {
    const remaining = Math.floor((totalDuration - currentTime) / 1000);
    const title = `Expected Time of Arrival`;
    const content1 = `Our dataship is expected to arrive at destination in \n${remaining} seconds.`;
    const content2 = ``;
    this.world3d.hud.leftScreen.displayMessage(title, content1, content2);
  }

  /*
   * Display content related to a given stage of the trip 
   */
  displayStageDescription(idxSage) {
    const stage = this.stages[idxSage];
    const title = `${stage.title}`;
    const content1 = `${stage.content}`;
    const content2 = ``;
    this.world3d.hud.leftScreen.displayMessage(title, content1, content2);
    if (stage['audiofile'] != null) {
      this.world3d.audioguide.loadAudio(stage['audiofile']);
    }
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
   * Code processed in the update loop 
   */
  update(delta) {
    if (!this.isLoadingOk) return;
    this.#refreshCumulWait += delta;
    if (this.#refreshCumulWait > 0.1) {
      this.#processTourProgress(delta);
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
   * Process tour progress
   */
  #processTourProgress(delta) {
    // Pauses the tour if we're less than 5s from the end of the tour
    const controller = this.world3d.controller;
    const remainingDuration = controller.totalDuration - controller.effectiveTime;
    if (controller.isRunning()) {
      if (remainingDuration < 10000) {
        controller.pause();
        this.displayGoodByeMessage();
      } else {
        if (!this.hasStageDescriptions) {
          this.displayProgressMessage(controller.effectiveTime, controller.totalDuration);
        }
      }
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
   * Move to next stage of the trip 
   */
  switchToNextStage() {
    if (this.currentStage < this.stages.length) {
      this.setProbePosition(this.stages[this.currentStage+1].coords);
      if (this.currentStage >= 0) {
        if (this.stages[this.currentStage]['audiofile'] != null) {
          this.world3d.audioguide.loadAudio(this.stages[this.currentStage]['audiofile']);
        }
        this.displayStageDescription(this.currentStage);
        this.world3d.pointsCloud.filterPointsCloud(this.stages[this.currentStage].filters);
      }
    } else {
      this.currentStage = -1;
      this.setProbePosition(POS_FARFAR_AWAY[0]);
    }
    this.currentStage++;
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
    this.curve = null;
  }

}

export { Autopilot };
