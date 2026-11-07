import {
	Group,
  Vector3
} from 'three';

import ThreeMeshUI from '../../../libs/three-mesh-ui/three-mesh-ui.module.min.js';

import { HUDLeftScreen } from './hud-left-screen.js';
import { HUDRightScreen } from './hud-right-screen.js';
import { HUDRightMenu } from './hud-right-menu.js';
import { HUDHelpScreen } from './hud-help-screen.js';
import { HUDTourBuilderPanel } from './hud-tour-builder-panel.js';
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
  helpScreen = null;
  tourBuilderPanel = null;
  isHelpScreenOpen = false;
  // Set when immersion is entered in builder mode. It does not follow TEST/EDIT.
  builderMode = false;

  /*
   * Constructor 
   */
  constructor(world3d) {
    super()

    this.world3d = world3d;

    this.leftScreen = new HUDLeftScreen(world3d, this, 0.2, 0.3);
    this.leftScreen.position.x = -0.215;
    this.leftScreen.position.y = 0.85;
    this.leftScreen.position.z = -0.5;
    this.leftScreen.rotateOnAxis(new Vector3(1, 0, 0), -Math.PI/3);
    this.leftScreen.updateMatrixWorld(true);
    this.add(this.leftScreen);

    this.rightScreen = new HUDRightScreen(world3d, this,0.2, 0.3);
    this.rightScreen.position.x = 0.2;
    this.rightScreen.position.y = 0.85;
    this.rightScreen.position.z = -0.5;
    this.rightScreen.rotateOnAxis(new Vector3(1, 0, 0), -Math.PI/3);
    this.rightScreen.updateMatrixWorld(true);
    this.add(this.rightScreen);

    this.rightMenu = new HUDRightMenu(world3d, this, 0.2, 0.03);
    this.rightMenu.position.x = 0.2;
    this.rightMenu.position.y = 0.95;
    this.rightMenu.position.z = -0.65;
    this.rightMenu.rotateOnAxis(new Vector3(1, 0, 0), -Math.PI/9);
    this.rightMenu.updateMatrixWorld(true);
    this.add(this.rightMenu);

    this.#compass = new Compass(world3d, this);
    this.#compass.position.y = 0.85;
    this.#compass.position.z = -0.5;
    this.add(this.#compass);

    this.helpScreen = new HUDHelpScreen(world3d, this, 0.600, 0.3375);
    this.helpScreen.position.x = -0.015;
    this.helpScreen.position.y = 1.14;
    this.helpScreen.position.z = -0.66;
    this.helpScreen.updateMatrixWorld(true);
    this.helpScreen.visible = false;
    this.isHelpScreenOpen = false;
    this.add(this.helpScreen);

    // Left of the user, yawed inward, same pitch as the other screens.
    // The panel's bottom-right corner stays at the left screen's height,
    // 1.5 cm to its left and 2 cm closer to the user.
    this.tourBuilderPanel = new HUDTourBuilderPanel(world3d, this);
    this.tourBuilderPanel.position.set(-0.521, 0.854, -0.334);
    this.tourBuilderPanel.rotation.y = 50 * Math.PI / 180;
    this.tourBuilderPanel.visible = false;
    this.add(this.tourBuilderPanel);

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
   * Show the tour builder. descriptor is null when the scene has no tour.
   */
  activateTourBuilder(descriptor, sceneParams) {
    this.builderMode = true;
    this.tourBuilderPanel.activate(descriptor, sceneParams);
  }

  /*
   * Open the help screen
   */
  openHelpScreen() {
    if (!this.isHelpScreenOpen) {
      this.isHelpScreenOpen = true;
      this.helpScreen.visible = true;
    }
  }

  /*
   * Close the help screen
   */
  closeHelpScreen() {
    if (this.isHelpScreenOpen) {
      this.isHelpScreenOpen = false;
      this.helpScreen.visible = false;
    }
  }

  /*
   * Code processed in the rendering loop
   */
  update(delta) {
    this.leftScreen.updateScreen(delta);
    this.rightScreen.updateScreen(delta);
    this.#compass.update(delta);
    this.helpScreen.updateScreen(delta);
    try {
      ThreeMeshUI.update();
      this.rightMenu.updateMenu(delta);
      // After three-mesh-ui, so meshes created this frame pick up the layer.
      this.tourBuilderPanel.updatePanel();
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
    this.helpScreen.dispose();
    this.tourBuilderPanel.dispose();
    // Resets the references to others objects
    this.world3d = null;
    this.leftScreen = null;
    this.rightScreen = null;
    this.rightMenu = null;
    this.#compass = null;
    this.helpScreen = null;
    this.tourBuilderPanel = null;
  }

}

export { HUD };
