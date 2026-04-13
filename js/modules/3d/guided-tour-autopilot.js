import { 
  Vector3
} from 'three';
import { GuidedTour } from './guided-tour.js';


class GuidedTourAutopilot extends GuidedTour {

  /*
   * Constants
   */

  static DEFAULT_LANG = 'en';


  /* 
   * Attributes
   */

  #refreshCumulWait = 0;
  #audioIntroPath = '';
  #audioOutroPath = '';



  /*
   * Constructor
   */
  constructor(world3d) {
    super(world3d);
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
      : GuidedTourAutopilot.DEFAULT_LANG;
    this.#audioIntroPath = `/static/sounds/guided_tour_auto_intro_${lang}.wav`;
    this.#audioOutroPath = `/static/sounds/guided_tour_outro_${lang}.wav`;
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
      if (this.getDistanceToProbe() <= 500) {
        // Moves the probe to the next stage of the trip
        // and displays the associated description
        this.switchToNextStage();
      }
      this.#refreshCumulWait = 0.0;
    }
  }
  
  /*
   * On tour complete
   */
  onTourComplete() {
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
   * Start tour
   */
  startAutopilot() {
    this.world3d.controller.resume();
  }

  /*
   * Display an introductory message 
   */
  displayIntroductoryMessage() {
    const title = `Welcome to our guided tour\n"${this.title}"`;

    let content1 = `You've entered The Second Realm, a purely digital space.\n\nEach point composing the point cloud in front of you represents a Bitcoin block, with its position defined by three attributes of the block.\n\n`;
    content1 += `During your journey into this realm, you'll be guided by a probe that localizes the points of interest. It looks like a pulsating red cube. You should be able to see it in front of you.\n\n`;
    content1 += `Fasten your seatbelt. Were about to start this guided tour.`;
    const content2 = ``;    
    this.world3d.hud.leftScreen.displayMessage(title, content1, content2);
    this.fadein = setTimeout(() => {
      this.world3d.audioguide.loadAudio(this.#audioIntroPath, this.startAutopilot.bind(this));
      clearTimeout(this.fadein);
    }, 1000);
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
    this.world3d.audioguide.loadAudio(this.#audioOutroPath, this.exit.bind(this));
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
   * Display content related to a given stage of the trip 
   */
  displayStageDescription(idxSage) {
    const stage = this.stages[idxSage];
    const title = `${stage.title}`;
    const content1 = `${stage.content}`;
    const content2 = ``;
    this.world3d.hud.leftScreen.displayMessage(title, content1, content2);
  }

  /*
   * Move to next stage of the trip 
   */
  switchToNextStage() {
    super.switchToNextStage();
    if (this.currentStage == this.stages.length) {
      this.world3d.controller.pause();
    }
  }

  /*
   * Dispose
   */
  dispose() {
    // Clears timeouts
    if (this.exitTimeout) {
      clearTimeout(this.exitTimeout); 
    }
    // Resets the references to others objects
    this.world3d = null;
  }

}

export { GuidedTourAutopilot };