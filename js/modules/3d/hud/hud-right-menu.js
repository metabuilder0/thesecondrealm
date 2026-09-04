import { 
  Color
} from 'three';

import ThreeMeshUI from '../../../libs/three-mesh-ui/three-mesh-ui.module.min.js';

import { Constants } from '/js/libs/@webxr-input-profiles/motion-controllers.module.js';


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
    
    // Help Button
    this.helpButton = new ThreeMeshUI.Block({
      width: width / 4 - 2 * 0.004,
      height: height - 2 * 0.004,
      margin: 0.002,
      padding: 0.005,
      offset: 0.0001,
      justifyContent: 'center',
      alignItems: 'center',
      textAlign: 'center',
      backgroundOpacity: 0.5,
		  backgroundColor: new Color(0x000000),
      borderRadius: [0, 0, 0, 0],
      borderWidth: 0.0002,
      borderColor: new Color(0x10faef),
      borderOpacity: 1
    });

    this.helpButton.setupState({
      state: 'hovered_visible',
      attributes: {
        borderWidth: 0.0015,
        backgroundColor: new Color(0x0eb1c0)
      }
    });

    this.helpButton.setupState({
      state: 'hovered_hidden',
      attributes: {
        borderWidth: 0.0015,
        backgroundColor: new Color(0x000000)
      }
    });

    this.helpButton.setupState({
      state: 'pressed',
      attributes: {
        borderWidth: 0.0015,
        backgroundColor: new Color(0x0eb1c0)
      }
    });

    this.helpButton.setupState({
      state: 'idle_visible',
      attributes: {
        borderWidth: 0.0002,
        backgroundColor: new Color(0x0eb1c0)
      }
    });

    this.helpButton.setupState({
      state: 'idle_hidden',
      attributes: {
        borderWidth: 0.0002,
        backgroundColor: new Color(0x000000)
      }
    });

    const helpText = new ThreeMeshUI.Text({
      content: '[ HELP ]',
      offset: 0,
      fontSize: 0.006,
    });

    this.helpButton.add(helpText);
    subBlock1.add(this.helpButton);

    // Exit Button
    this.exitButton = new ThreeMeshUI.Block({
      width: width / 4 - 2 * 0.004,
      height: height - 2 * 0.004,
      margin: 0.002,
      padding: 0.005,
      offset: 0.0001,
      justifyContent: 'center',
      alignItems: 'center',
      textAlign: 'center',
      backgroundOpacity: 0.5,
		  backgroundColor: new Color(0x000000),
      borderRadius: [0, 0, 0, 0],
      borderWidth: 0.0002,
      borderColor: new Color(0x10faef),
      borderOpacity: 1
    });

    this.exitButton.setupState({
      state: 'hovered',
      attributes: {
        borderWidth: 0.0015,
        backgroundColor: new Color(0x000000)
      }
    });

    this.exitButton.setupState({
      state: 'pressed',
      attributes: {
        borderWidth: 0.0015,
        backgroundColor: new Color(0x0eb1c0)
      }
    });

    this.exitButton.setupState({
      state: 'idle',
      attributes: {
        borderWidth: 0.0002,
        backgroundColor: new Color(0x000000)
      }
    });

    const exitText = new ThreeMeshUI.Text({
      content: '[ EXIT ]',
      offset: 0,
      fontSize: 0.006,
    });

    this.exitButton.add(exitText);
    subBlock1.add(this.exitButton);

    // Declares interactive components
    this.world3d.xrManager.makeInteractive(subBlock1, {
      onPointerOver: (intersection) => {
        const c = this.world3d.xrManager.controllers[intersection.idxController];
        if (c == null) return;
        c.xrInputSource.gamepad.hapticActuators?.[0]?.pulse(0.4, 50);
      }
    });

    this.world3d.xrManager.makeInteractive(this.helpButton, {
      onPointerOver: (intersection) => {
        const c = this.world3d.xrManager.controllers[intersection.idxController];
        if (c == null) return;
        c.xrInputSource.gamepad.hapticActuators?.[0]?.pulse(0.4, 100);
        if (!this.hud.isHelpScreenOpen) {
          this.helpButton.setState('hovered_hidden');
        } else {
          this.helpButton.setState('hovered_visible');
        }
      },
      onPointerOut: (intersection) => {
        if (!this.hud.isHelpScreenOpen) {
          this.helpButton.setState('idle_hidden');
        } else {
          this.helpButton.setState('idle_visible');
        }
      }, 
      onPress: (intersection) => {
        this.helpButton.setState('pressed');
      },
      onClick: (intersection) => {
        if (this.hud.isHelpScreenOpen) {
          this.hud.closeHelpScreen();
        } else {
          this.hud.openHelpScreen();
        }
      }
    });

    this.world3d.xrManager.makeInteractive(this.exitButton, {
      onPointerOver: (intersection) => {
        const c = this.world3d.xrManager.controllers[intersection.idxController];
        if (c == null) return;
        c.xrInputSource.gamepad.hapticActuators?.[0]?.pulse(0.4, 100);
        this.exitButton.setState('hovered');
      },
      onPointerOut: (intersection) => {
        this.exitButton.setState('idle');
      },
      onPress: (intersection) => {
        this.exitButton.setState('pressed');
      },
      onClick: (intersection) => {
        this.world3d.xrManager.endSession();
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
