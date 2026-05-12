import {
	Group,
  Vector3
} from 'three';

import ThreeMeshUI from '../../../libs/three-mesh-ui/three-mesh-ui.module.min.js';

import { HUDLeftScreen } from './hud-left-screen.js';
import { HUDRightScreen } from './hud-right-screen.js';
import { HUDRightMenu } from './hud-right-menu.js';
import { Compass } from './compass.js';


class HUD extends Group {

  /*
   * Attributes 
   */

  world3d = null;

  leftScreen = null;
  rightScreen = null;
  rightMenu = null;
  #compass = null;


  /*
   * Constructor 
   */
  constructor(world3d) {
    super()

    this.world3d = world3d;

    this.leftScreen = new HUDLeftScreen(world3d, 0.2, 0.3);
    this.leftScreen.position.x = -0.215;
    this.leftScreen.position.y = 0.85;
    this.leftScreen.position.z = -0.5;
    this.leftScreen.rotateOnAxis(new Vector3(1, 0, 0), -Math.PI/3);
    this.leftScreen.updateMatrixWorld(true);
    this.add(this.leftScreen);

    this.rightScreen = new HUDRightScreen(world3d, 0.2, 0.3);
    this.rightScreen.position.x = 0.2;
    this.rightScreen.position.y = 0.85;
    this.rightScreen.position.z = -0.5;
    this.rightScreen.rotateOnAxis(new Vector3(1, 0, 0), -Math.PI/3);
    this.rightScreen.updateMatrixWorld(true);
    this.add(this.rightScreen);

    this.rightMenu = new HUDRightMenu(world3d, 0.2, 0.03);
    this.rightMenu.position.x = 0.2;
    this.rightMenu.position.y = 0.95;
    this.rightMenu.position.z = -0.65;
    this.rightMenu.rotateOnAxis(new Vector3(1, 0, 0), -Math.PI/9);
    this.rightMenu.updateMatrixWorld(true);
    this.add(this.rightMenu);

    this.#compass = new Compass();
    this.#compass.position.y = 0.85;
    this.#compass.position.z = -0.5;
    this.add(this.#compass);

    // Links the HUD to the camera's parent group
    this.position.z = -1000000
    this.world3d.camera.parent.add(this);
  }

  /**
   * Activate the HUD 
   */
  activate() {
    this.position.z = 0;
    this.leftScreen.clearLoadingText();
  }

  /*
   * Code processed in the rendering loop
   */
  update(delta) {
    this.leftScreen.updateScreen(delta);
    this.rightScreen.updateScreen(delta);
    this.#compass.update(delta);
    try {
      ThreeMeshUI.update();
      this.rightMenu.updateMenu(delta);
    } catch {
      //
    }
  }

  /*
   * Dispose the hud 
   */
  dispose() {   
    // Disposes the children 
    this.leftScreen.dispose();
    this.rightScreen.dispose();
    this.rightMenu.dispose();
    this.#compass.dispose();
    // Resets the references to others objects
    this.world3d = null;
    this.leftScreen = null;
    this.rightScreen = null;
    this.rightMenu = null;
    this.#compass = null;
  }

}

export { HUD };
