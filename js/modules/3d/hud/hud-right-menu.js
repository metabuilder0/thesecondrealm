import { 
  Color
} from 'three';

import ThreeMeshUI from '../../../libs/three-mesh-ui/three-mesh-ui.module.min.js';

import { Constants } from '/js/libs/@webxr-input-profiles/motion-controllers.module.js';
import { createHudButton, createHudToggleButton } from './hud-button.js';


class HUDRightMenu extends ThreeMeshUI.Block {

  /*
   * Attributes 
   */

  world3d = null;
  hud = null;

  helpButton = null;
  exitButton = null;


  /*
   * Constuctor
   */
  constructor(world3d, hud, width, height) {
    super({
      ref: 'container',
      justifyContent: 'center',
      alignItems: 'start',
      textAlign: 'center',
      fontColor: new Color(0x10faef),
      fontOpacity: 1,
      backgroundOpacity: 0,
		  backgroundColor: new Color(0x000000)
    });

    this.set({
      fontFamily: 'js/libs/three-mesh-ui/assets/Roboto-msdf.json',
      fontTexture: 'js/libs/three-mesh-ui/assets/Roboto-msdf.png'
    });
    
    this.world3d = world3d;
    this.hud = hud;

    this.buildMenu(width, height);
  }

  /*
   * Build the screen 
   */
  buildMenu(width, height) {
    // Menu block
    const subBlock1 = new ThreeMeshUI.Block({
      width: width,
      height: height,
      contentDirection: 'row',
      justifyContent: 'end',
      alignItems: 'end',
      offset: 0,
      margin: 0,
      padding: 0.002,
      backgroundOpacity: 0.5,
		  backgroundColor: new Color(0x000000),
      borderRadius: [0, 0, 0, 0],
      borderWidth: 0.002,
      borderColor: new Color(0x044b4f),
      borderOpacity: 1
    });
    this.add(subBlock1);
    
    // Buttons
    this.helpButton = createHudToggleButton(this.world3d, {
      width: width / 4 - 2 * 0.004,
      height: height - 2 * 0.004,
      label: '[ HELP ]',
      onToggle: (active) => {
        if (active) this.hud.openHelpScreen();
        else this.hud.closeHelpScreen();
      }
    });
    
    this.exitButton = createHudButton(this.world3d, {
      width: width / 4 - 2 * 0.004,
      height: height - 2 * 0.004,
      label: '[ EXIT ]',
      onClick: () => this.world3d.xrManager.endSession()
    });
    
    subBlock1.add(this.helpButton);
    subBlock1.add(this.exitButton);

    // Declares interactive components
    this.world3d.xrManager.makeInteractive(subBlock1, {
      onPointerOver: (intersection) => {
        const c = this.world3d.xrManager.controllers[intersection.idxController];
        if (c == null) return;
        c.xrInputSource.gamepad.hapticActuators?.[0]?.pulse(0.4, 50);
      }
    });

  }

  /*
   * Code processed in the rendering loop
   */
  updateMenu(delta) {
    if (this.world3d.immersionModeActivated) {
      //
    }
  }

  /*
   * Dispose the object 
   */
  dispose() {
    // Resets the references to others objects
    this.world3d = null;
    this.hud = null;
    this.helpButton = null;
    this.exitButton = null;
  }

}

export { HUDRightMenu };
