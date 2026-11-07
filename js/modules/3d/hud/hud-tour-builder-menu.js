import {
  Color,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  Shape,
  ShapeGeometry
} from 'three';

import ThreeMeshUI from '../../../libs/three-mesh-ui/three-mesh-ui.module.min.js';

import { createHudButton } from './hud-button.js';


const FONT_FAMILY = 'js/libs/three-mesh-ui/assets/Roboto-msdf.json';
const FONT_TEXTURE = 'js/libs/three-mesh-ui/assets/Roboto-msdf.png';

const TYPE_LABELS = {
  guided_tour: 'GUIDED TOUR',
  guided_tour_autopilot: 'AUTOPILOT',
  autopilot: 'WANDERING'
};


class HUDTourBuilderMenu extends ThreeMeshUI.Block {

  /*
   * Attributes
   */

  world3d = null;
  hud = null;
  panel = null;

  #addButton = null;
  #exportButton = null;
  #spawnButton = null;
  #typeButton = null;
  #modeButton = null;
  //#cycleMark = null;
  //#cycleMaterial = null;


  /*
   * Constructor
   */
  constructor(world3d, hud, panel, width, height) {
    super({
      ref: 'container',
      justifyContent: 'center',
      alignItems: 'center',
      textAlign: 'center',
      fontColor: new Color(0x10faef),
      fontOpacity: 1,
      backgroundOpacity: 0,
      backgroundColor: new Color(0x000000)
    });

    this.set({
      fontFamily: FONT_FAMILY,
      fontTexture: FONT_TEXTURE
    });

    this.world3d = world3d;
    this.hud = hud;
    this.panel = panel;

    this.#buildMenu(width, height);
  }

  /*
   * Build the button bar
   */
  #buildMenu(width, height) {
    const bar = new ThreeMeshUI.Block({
      width: width,
      height: height,
      contentDirection: 'row',
      justifyContent: 'end',
      alignItems: 'center',
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
    this.add(bar);

    const buttonWidth = (width / 4 - 2 * 0.004) * 0.75;
    const buttonHeight = height - 2 * 0.004;
    const buttonFontSize = 0.0045;

    this.#addButton = createHudButton(this.world3d, {
      width: buttonWidth,
      height: buttonHeight,
      label: 'ADD STAGE',
      fontSize: buttonFontSize,
      onClick: () => this.panel.addStage()
    });
    this.#exportButton = createHudButton(this.world3d, {
      width: buttonWidth,
      height: buttonHeight,
      label: 'EXPORT',
      fontSize: buttonFontSize,
      onClick: () => this.panel.exportTour()
    });
    this.#typeButton = createHudButton(this.world3d, {
      width: buttonWidth,
      height: buttonHeight,
      label: 'GUIDED TOUR',
      fontSize: buttonFontSize,
      onClick: () => this.panel.cycleType()
    });
    //this.#cycleMark = HUDTourBuilderMenu.buildCycleMark();
    //this.#cycleMaterial = this.#cycleMark.userData.material;
    //this.#cycleMark.position.set(buttonWidth / 2 - 0.009, 0, 0.002);
    //this.#typeButton.add(this.#cycleMark);
    this.#modeButton = createHudButton(this.world3d, {
      width: buttonWidth,
      height: buttonHeight,
      label: 'TEST',
      fontSize: buttonFontSize,
      onClick: () => this.panel.toggleMode()
    });
    this.#spawnButton = createHudButton(this.world3d, {
      width: buttonWidth,
      height: buttonHeight,
      label: 'SPAWN POSITION',
      fontSize: buttonFontSize,
      onClick: () => this.panel.saveSpawnPosition()
    });

    bar.add(this.#typeButton);
    bar.add(this.#spawnButton);
    bar.add(this.#addButton);
    bar.add(this.#modeButton);
    bar.add(this.#exportButton);
  }

  /*
   * Reflect the editor mode and the current tour type.
   */
  refresh() {
    const editing = this.panel.mode == 'edit';
    const type = this.panel.tourEditor ? this.panel.tourEditor.type : 'guided_tour';
    this.#addButton.setEnabled(editing);
    this.#spawnButton.setShown(editing);
    this.#spawnButton.setEnabled(editing);
    this.#typeButton.setEnabled(editing);
    this.#typeButton.setLabel(TYPE_LABELS[type] || 'TYPE');
    //this.#cycleMaterial.color.set(editing ? 0x10faef : 0x1a3a3c);
    this.#modeButton.setLabel(editing ? 'TEST' : 'EDIT');
  }

  /*
   * Two right-pointing triangles. The font has no arrow glyphs,
   * and the mark shows that the button cycles to the next value.
   */
  static buildCycleMark() {
    const shape = new Shape();
    shape.moveTo(0, 0.0032);
    shape.lineTo(0.0034, 0);
    shape.lineTo(0, -0.0032);
    shape.closePath();

    const geometry = new ShapeGeometry(shape);
    const material = new MeshBasicMaterial({
      color: 0x10faef,
      side: DoubleSide
    });
    const mark = new Group();
    const first = new Mesh(geometry, material);
    const second = new Mesh(geometry, material);
    second.position.x = 0.0044;
    mark.add(first);
    mark.add(second);
    mark.userData.material = material;
    mark.userData.geometry = geometry;
    return mark;
  }

  /*
   * Dispose the object
   */
  dispose() {
    //if (this.#cycleMark) {
      //this.#cycleMark.userData.geometry.dispose();
      //this.#cycleMaterial.dispose();
    //}
    this.world3d = null;
    this.hud = null;
    this.panel = null;
    this.#addButton = null;
    this.#exportButton = null;
    this.#spawnButton = null;
    this.#typeButton = null;
    this.#modeButton = null;
    //this.#cycleMark = null;
    //this.#cycleMaterial = null;
  }

}

export { HUDTourBuilderMenu };
