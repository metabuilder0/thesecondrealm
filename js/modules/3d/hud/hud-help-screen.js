import { 
  Color,
  TextureLoader
} from 'three';

import ThreeMeshUI from '../../../libs/three-mesh-ui/three-mesh-ui.module.min.js';

import * as data from '../../data/data-constants.js';
import { FlyController } from '../fly-controller.js';
import { Formatter } from '../../data/formatter.js';
import { CUBE_SIZE } from '../../data/positions-constants.js';


class HUDHelpScreen extends ThreeMeshUI.Block {

  /*
   * Constants
   */
  static COLORS_PALETTE = [
    0x02b9b7,
    0x0eb1c0,
    0x0d9595,
    0x0b5556,
    0x025452
  ];


  /*
   * Attributes 
   */

  world3d = null;
  hud = null;
  
  width = null;
  height = null;

  #subBlock1 = null;
  #subBlockImage = null;


  /*
   * Constuctor
   */
  constructor(world3d, hud, width, height) {
    super({
      ref: 'container',
      padding: 0.02,
      justifyContent: 'center',
      alignItems: 'start',
      textAlign: 'center',
      fontColor: new Color(0x10faef),
      fontOpacity: 1,
      backgroundOpacity: 0.5,
		  backgroundColor: new Color(0x000000)
    });

    this.set({
      fontFamily: 'js/libs/three-mesh-ui/assets/Roboto-msdf.json',
      fontTexture: 'js/libs/three-mesh-ui/assets/Roboto-msdf.png'
    });
    
    this.world3d = world3d;
    this.hud = hud;
    this.width = width;
    this.height = height;

    this.buildScreen(width, height);
  }

  /*
   * Build the screen 
   */
  buildScreen(width, height) {
    // First block
    this.#subBlock1 = new ThreeMeshUI.Block({
      width: width - 2 * 0.005,
      height: height - 2 * 0.005,
      margin: 0.005,
      padding: 0,
      offset: 0,
      justifyContent: 'center',
      alignItems: 'start',
      textAlign: 'center',
      backgroundOpacity: 1,
		  backgroundColor: new Color(0x000000),
      borderRadius: [0, 0, 0, 0],
      borderWidth: 0.005,
      borderColor: new Color(0x044b4f),
      borderOpacity: 1
    });
    this.add(this.#subBlock1);

    // Image block
    this.#subBlockImage = new ThreeMeshUI.Block({
      width: width - 2 * 0.005,
      height: height- 2 * 0.005,
      margin: 0,
      padding: 0.02,
      borderWidth: 0,
      backgroundOpacity: 1
    });
    this.#subBlock1.add(this.#subBlockImage);

    const loader = new TextureLoader();
    loader.load('static/images/hud_help.png', (texture) => {
      this.#subBlockImage.set({ backgroundTexture: texture });
    });
  }

  /*
   * Code processed in the rendering loop
   */
  updateScreen(delta) {
    //
  }

  /*
   * Dispose the object 
   */
  dispose() {
    // Resets the references to others objects
    this.world3d = null;
    this.hud = null;
    this.#subBlock1 = null;
    this.#subBlockImage = null;
  }

}

export { HUDHelpScreen };
