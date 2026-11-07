import {
  Color,
  Group
} from 'three';

import ThreeMeshUI from '../../../libs/three-mesh-ui/three-mesh-ui.module.min.js';

import { createHudButton } from './hud-button.js';


const FONT_FAMILY = 'js/libs/three-mesh-ui/assets/Roboto-msdf.json';
const FONT_TEXTURE = 'js/libs/three-mesh-ui/assets/Roboto-msdf.png';
const FONT_COLOR = new Color(0x10faef);
const BACKGROUND = new Color(0x000000);
const HOVER_BACKGROUND = new Color(0x0eb1c0);
const MAX_LENGTH = 48;

// ThreeMeshUI.Keyboard draws an outer block of width + padding * 2.
// The previous keyboard was 0.52 by 0.22 with 0.006 of padding.
// Scale it so the outer width matches the tour builder panel.
const PANEL_WIDTH = 0.27;
const SCALE = PANEL_WIDTH / (0.52 + 0.006 * 2);
const KEY_FONT_SIZE = 0.012 * SCALE;


class HUDVirtualKeyboard extends Group {

  /*
   * Attributes
   */

  world3d = null;
  keyboard = null;

  #text = '';
  #onValidate = null;
  #inputText = null;
  #cancelButton = null;


  /*
   * Constructor
   */
  constructor(world3d) {
    super();
    this.world3d = world3d;

    this.keyboard = new ThreeMeshUI.Keyboard({
      width: 0.52 * SCALE,
      height: 0.22 * SCALE,
      margin: 0.003 * SCALE,
      padding: 0.006 * SCALE,
      fontFamily: FONT_FAMILY,
      fontTexture: FONT_TEXTURE,
      fontSize: KEY_FONT_SIZE,
      fontColor: FONT_COLOR,
      backgroundColor: BACKGROUND,
      backgroundOpacity: 0.85,
      borderRadius: 0,
      enterTexture: 'js/libs/three-mesh-ui/assets/enter.png',
      shiftTexture: 'js/libs/three-mesh-ui/assets/shift.png',
      backspaceTexture: 'js/libs/three-mesh-ui/assets/backspace.png'
    });
    this.#styleKeys();
    this.add(this.keyboard);

    const inputBlock = new ThreeMeshUI.Block({
      width: 0.36 * SCALE,
      height: 0.04 * SCALE,
      margin: 0,
      padding: 0.006 * SCALE,
      offset: 0,
      justifyContent: 'center',
      alignItems: 'start',
      textAlign: 'left',
      fontFamily: FONT_FAMILY,
      fontTexture: FONT_TEXTURE,
      fontColor: FONT_COLOR,
      backgroundOpacity: 0.5,
      backgroundColor: BACKGROUND,
      borderRadius: [0, 0, 0, 0],
      borderWidth: 0.002 * SCALE,
      borderColor: new Color(0x044b4f),
      borderOpacity: 1,
      hiddenOverflow: true
    });
    this.#inputText = new ThreeMeshUI.Text({
      content: 'STAGE TITLE',
      offset: 0,
      fontSize: KEY_FONT_SIZE
    });
    inputBlock.add(this.#inputText);
    inputBlock.position.set(-0.07 * SCALE, 0.15 * SCALE, 0);
    this.add(inputBlock);

    this.#cancelButton = createHudButton(world3d, {
      width: 0.1 * SCALE,
      height: 0.032 * SCALE,
      label: 'CANCEL',
      fontSize: KEY_FONT_SIZE,
      margin: 0,
      onClick: () => this.close()
    });
    // The button sits on this Group, so it does not inherit a font from a parent block.
    this.#cancelButton.set({
      fontFamily: FONT_FAMILY,
      fontTexture: FONT_TEXTURE
    });
    this.#cancelButton.position.set(0.2 * SCALE, 0.15 * SCALE, 0.001);
    this.add(this.#cancelButton);

    this.#bindKeys();
    this.visible = false;
    this.syncLayers();
  }

  /*
   * Paint keys with the same palette as the other HUD controls.
   */
  #styleKeys() {
    for (const key of this.keyboard.keys) {
      key.set({
        backgroundColor: BACKGROUND,
        backgroundOpacity: 0.65,
        fontColor: FONT_COLOR,
        borderWidth: 0.001 * SCALE,
        borderColor: FONT_COLOR,
        borderOpacity: 1,
        borderRadius: 0.004 * SCALE
      });
      key.setupState({
        state: 'hovered',
        attributes: {
          backgroundColor: HOVER_BACKGROUND,
          backgroundOpacity: 0.9
        }
      });
      key.setupState({
        state: 'pressed',
        attributes: {
          backgroundColor: HOVER_BACKGROUND,
          backgroundOpacity: 0.9
        }
      });
      key.setupState({
        state: 'idle',
        attributes: {
          backgroundColor: BACKGROUND,
          backgroundOpacity: 0.65
        }
      });
    }
  }

  #bindKeys() {
    for (const key of this.keyboard.keys) {
      this.world3d.xrManager.makeInteractive(key, {
        onPointerOver: (intersection) => {
          if (!this.#isActiveKey(key)) return;
          const controller = this.world3d.xrManager.controllers[intersection.idxController];
          if (controller == null) return;
          controller.xrInputSource.gamepad.hapticActuators?.[0]?.pulse(0.4, 50);
          key.setState('hovered');
        },
        onPointerOut: () => {
          if (!this.#isActiveKey(key)) return;
          key.setState('idle');
        },
        onPress: () => {
          if (!this.#isActiveKey(key)) return;
          key.setState('pressed');
        },
        onClick: () => {
          if (!this.#isActiveKey(key)) return;
          key.setState('idle');
          this.#onKey(key);
        }
      });
    }
  }

  /*
   * Keys of the hidden charset stay in the raycast list.
   * Ignore them, and keep their layer off so they cannot steal the hit.
   */
  #isActiveKey(key) {
    if (!this.visible) return false;
    const current = this.keyboard.panels[this.keyboard.currentPanel];
    return key.panel == current;
  }

  #onKey(key) {
    const command = key.info.command;
    if (command == 'enter') {
      const value = this.#text.trim();
      const callback = this.#onValidate;
      this.close();
      if (callback && value.length > 0) callback(value);
      return;
    }
    if (command == 'backspace') {
      this.#text = this.#text.slice(0, -1);
    } else if (command == 'space') {
      this.#append(' ');
    } else if (command == 'shift') {
      this.keyboard.toggleCase();
    } else if (command == 'switch') {
      this.keyboard.setNextPanel();
    } else if (command == 'switch-set') {
      this.keyboard.setNextCharset();
    } else if (!command && key.info.input) {
      this.#append(key.info.input);
    }
    this.#refreshField();
    this.syncLayers();
  }

  #append(value) {
    if (this.#text.length >= MAX_LENGTH) return;
    this.#text += value;
  }

  #refreshField() {
    this.#inputText.set({
      content: this.#text.length > 0 ? this.#text : 'STAGE TITLE'
    });
  }

  /*
   * Ask for a stage title.
   * callback receives the trimmed title.
   */
  open(callback) {
    this.#onValidate = callback;
    this.#text = '';
    this.#refreshField();
    this.visible = true;
    this.syncLayers();
  }

  close() {
    this.visible = false;
    this.#onValidate = null;
    this.#text = '';
    this.syncLayers();
  }

  /*
   * Hidden widgets stay registered as interactive.
   * Park them on layer 1 so the raycaster (layer 0) skips them.
   * Called every frame because three-mesh-ui may add meshes later.
   */
  syncLayers() {
    const keyboardOpen = this.visible;
    const current = this.keyboard.panels[this.keyboard.currentPanel];
    for (const key of this.keyboard.keys) {
      const active = keyboardOpen && key.panel == current;
      key.traverse((obj) => {
        obj.layers.set(active ? 0 : 1);
        // Letter meshes appear after the font file loads.
        if (obj.isText && !obj.userData.hudFontSized) {
          obj.set({ fontSize: KEY_FONT_SIZE, fontColor: FONT_COLOR });
          obj.userData.hudFontSized = true;
        }
        // Enter, shift and backspace icons inherit the key border and the
        // default 1 cm offset, so the texture sits in front of the key.
        if (obj.isInlineBlock && !obj.userData.hudIconStyled) {
          obj.set({ borderWidth: 0, offset: 0 });
          obj.userData.hudIconStyled = true;
        }
      });
    }
    this.#cancelButton.traverse((obj) => obj.layers.set(keyboardOpen ? 0 : 1));
  }

  /*
   * Dispose the object
   */
  dispose() {
    this.world3d = null;
    this.keyboard = null;
    this.#inputText = null;
    this.#cancelButton = null;
    this.#onValidate = null;
  }

}

export { HUDVirtualKeyboard };
