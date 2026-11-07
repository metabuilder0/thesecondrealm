import { Color } from 'three';

import ThreeMeshUI from '../../../libs/three-mesh-ui/three-mesh-ui.module.min.js';


const FONT_COLOR = new Color(0x10faef);
const BORDER_COLOR = new Color(0x10faef);
const BACKGROUND = new Color(0x000000);
const HOVER_BACKGROUND = new Color(0x0eb1c0);
const DISABLED_BORDER = new Color(0x1a3a3c);
const DISABLED_FONT = new Color(0x1a3a3c);


/*
 * Button styled like the controls of HUDRightMenu.
 * setEnabled(false) greys the button out and ignores clicks.
 * setLabel() replaces the caption.
 */
function createHudButton(world3d, options) {
  const {
    width,
    height,
    label,
    fontSize = 0.006,
    margin = 0.002,
    onClick
  } = options;

  const button = new ThreeMeshUI.Block({
    width: width,
    height: height,
    margin: margin,
    padding: 0.002,
    offset: 0.0001,
    justifyContent: 'center',
    alignItems: 'center',
    textAlign: 'center',
    backgroundOpacity: 0.5,
    backgroundColor: BACKGROUND,
    fontColor: FONT_COLOR,
    borderRadius: [0, 0, 0, 0],
    borderWidth: 0.0002,
    borderColor: BORDER_COLOR,
    borderOpacity: 1
  });

  button.setupState({
    state: 'hovered',
    attributes: {
      borderWidth: 0.0015,
      backgroundColor: HOVER_BACKGROUND,
      borderColor: BORDER_COLOR
    }
  });

  button.setupState({
    state: 'pressed',
    attributes: {
      borderWidth: 0.0015,
      backgroundColor: HOVER_BACKGROUND,
      borderColor: BORDER_COLOR
    }
  });

  button.setupState({
    state: 'idle',
    attributes: {
      borderWidth: 0.0002,
      backgroundColor: BACKGROUND,
      borderColor: BORDER_COLOR,
      fontColor: FONT_COLOR
    }
  });

  button.setupState({
    state: 'disabled',
    attributes: {
      borderWidth: 0.0002,
      backgroundColor: BACKGROUND,
      borderColor: DISABLED_BORDER,
      fontColor: DISABLED_FONT
    }
  });

  const text = new ThreeMeshUI.Text({
    content: label,
    offset: 0,
    fontSize: fontSize
  });
  button.add(text);

  button.userData.hudEnabled = true;

  button.setEnabled = (enabled) => {
    button.userData.hudEnabled = enabled;
    text.set({ fontColor: enabled ? FONT_COLOR : DISABLED_FONT });
    button.setState(enabled ? 'idle' : 'disabled');
  };

  button.setLabel = (value) => {
    text.set({ content: value });
  };

  button.setShown = (shown) => {
    if (button.userData.hudWidth == null) {
      button.userData.hudWidth = button.width;
      button.userData.hudMargin = button.margin || 0;
    }
    button.visible = shown;
    button.set({
      width: shown ? button.userData.hudWidth : 0,
      margin: shown ? button.userData.hudMargin : 0
    });
  };

  world3d.xrManager.makeInteractive(button, {
    onPointerOver: (intersection) => {
      if (!button.userData.hudEnabled) return;
      const controller = world3d.xrManager.controllers[intersection.idxController];
      if (controller == null) return;
      controller.xrInputSource.gamepad.hapticActuators?.[0]?.pulse(0.4, 100);
      button.setState('hovered');
    },
    onPointerOut: () => {
      button.setState(button.userData.hudEnabled ? 'idle' : 'disabled');
    },
    onPress: () => {
      if (!button.userData.hudEnabled) return;
      button.setState('pressed');
    },
    onClick: () => {
      if (!button.userData.hudEnabled) return;
      onClick();
    }
  });

  return button;
}

export { createHudButton };
