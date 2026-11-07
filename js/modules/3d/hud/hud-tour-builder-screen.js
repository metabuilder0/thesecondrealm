import {
  Color,
  DoubleSide,
  Mesh,
  MeshBasicMaterial,
  Shape,
  ShapeGeometry
} from 'three';

import ThreeMeshUI from '../../../libs/three-mesh-ui/three-mesh-ui.module.min.js';

import { createHudButton } from './hud-button.js';


const FONT_FAMILY = 'js/libs/three-mesh-ui/assets/Roboto-msdf.json';
const FONT_TEXTURE = 'js/libs/three-mesh-ui/assets/Roboto-msdf.png';


class HUDTourBuilderScreen extends ThreeMeshUI.Block {

  /*
   * Constants
   */

  static PAGE_SIZE = 8;


  /*
   * Attributes
   */

  world3d = null;
  hud = null;
  panel = null;

  #page = 0;
  #editEnabled = true;
  #headerText = null;
  #pageText = null;
  #prevButton = null;
  #nextButton = null;
  #rows = [];
  #arrowGeometry = null;


  /*
   * Constructor
   */
  constructor(world3d, hud, panel, width, height) {
    super({
      ref: 'container',
      width: width,
      height: height,
      padding: 0.006,
      margin: 0,
      contentDirection: 'column',
      justifyContent: 'start',
      alignItems: 'center',
      textAlign: 'center',
      fontColor: new Color(0x10faef),
      fontOpacity: 1,
      backgroundOpacity: 0.5,
      backgroundColor: new Color(0x000000),
      borderRadius: [0, 0, 0, 0],
      borderWidth: 0.005,
      borderColor: new Color(0x044b4f),
      borderOpacity: 1
    });

    this.set({
      fontFamily: FONT_FAMILY,
      fontTexture: FONT_TEXTURE
    });

    this.world3d = world3d;
    this.hud = hud;
    this.panel = panel;

    this.#buildScreen(width, height);
  }

  /*
   * Build the list, once. Rows are reused because interactive
   * objects cannot be unregistered from the XR manager.
   */
  #buildScreen(width, height) {
    const headerHeight = 0.032;
    const footerHeight = 0.038;
    const contentWidth = width - 2 * 0.006;
    const rowHeight = (height - headerHeight - footerHeight - 2 * 0.006) / HUDTourBuilderScreen.PAGE_SIZE;

    const header = new ThreeMeshUI.Block({
      width: contentWidth,
      height: headerHeight,
      margin: 0,
      padding: 0.004,
      offset: 0,
      justifyContent: 'center',
      alignItems: 'center',
      textAlign: 'center',
      backgroundOpacity: 0,
      borderWidth: 0
    });
    this.#headerText = new ThreeMeshUI.Text({
      content: 'STAGES',
      offset: 0,
      fontSize: 0.01
    });
    header.add(this.#headerText);
    this.add(header);

    for (let slot = 0; slot < HUDTourBuilderScreen.PAGE_SIZE; slot++) {
      this.add(this.#buildRow(contentWidth, rowHeight, slot));
    }

    const footer = new ThreeMeshUI.Block({
      width: contentWidth,
      height: footerHeight,
      margin: 0,
      padding: 0,
      offset: 0,
      contentDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundOpacity: 0,
      borderWidth: 0
    });

    const pageButtonSize = 0.022;
    this.#prevButton = createHudButton(this.world3d, {
      width: pageButtonSize,
      height: pageButtonSize,
      label: '',
      onClick: () => this.#changePage(-1)
    });
    this.#addArrow(this.#prevButton, 'left');
    this.#nextButton = createHudButton(this.world3d, {
      width: pageButtonSize,
      height: pageButtonSize,
      label: '',
      onClick: () => this.#changePage(1)
    });
    this.#addArrow(this.#nextButton, 'right');

    const pageBlock = new ThreeMeshUI.Block({
      width: 0.1,
      height: footerHeight,
      margin: 0,
      padding: 0,
      offset: 0,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundOpacity: 0,
      borderWidth: 0
    });
    this.#pageText = new ThreeMeshUI.Text({
      content: '0/0',
      offset: 0,
      fontSize: 0.007
    });
    pageBlock.add(this.#pageText);

    footer.add(this.#prevButton);
    footer.add(pageBlock);
    footer.add(this.#nextButton);
    this.add(footer);
  }

  #buildRow(width, height, slot) {
    const row = new ThreeMeshUI.Block({
      width: width,
      height: height,
      margin: 0,
      padding: 0,
      offset: 0,
      contentDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundOpacity: 0,
      borderWidth: 0
    });

    const titleBlock = new ThreeMeshUI.Block({
      width: width - 4 * 0.036,
      height: height,
      margin: 0,
      padding: 0.003,
      offset: 0,
      justifyContent: 'center',
      alignItems: 'start',
      textAlign: 'left',
      backgroundOpacity: 0,
      borderWidth: 0,
      hiddenOverflow: true
    });
    const titleText = new ThreeMeshUI.Text({
      content: '',
      offset: 0,
      fontSize: 0.0065
    });
    titleBlock.add(titleText);

    const buttonHeight = Math.max(height - 0.008, 0.018);
    const buttonWidth = 0.03;
    const delButton = createHudButton(this.world3d, {
      width: buttonWidth,
      height: buttonHeight,
      label: 'DEL',
      onClick: () => this.panel.removeStage(this.#stageIndex(slot))
    });
    const upButton = createHudButton(this.world3d, {
      width: buttonWidth,
      height: buttonHeight,
      label: '',
      onClick: () => this.panel.moveStageUp(this.#stageIndex(slot))
    });
    this.#addArrow(upButton, 'up');
    const downButton = createHudButton(this.world3d, {
      width: buttonWidth,
      height: buttonHeight,
      label: '',
      onClick: () => this.panel.moveStageDown(this.#stageIndex(slot))
    });
    this.#addArrow(downButton, 'down');
    const goButton = createHudButton(this.world3d, {
      width: buttonWidth,
      height: buttonHeight,
      label: 'GO',
      onClick: () => this.panel.teleportTo(this.#stageIndex(slot))
    });

    row.add(titleBlock);
    row.add(upButton);
    row.add(downButton);
    row.add(goButton);
    row.add(delButton);

    this.#rows.push({
      titleText,
      upButton,
      downButton,
      goButton,
      delButton
    });
    return row;
  }

  #stageIndex(slot) {
    return this.#page * HUDTourBuilderScreen.PAGE_SIZE + slot;
  }

  #changePage(delta) {
    this.#page += delta;
    this.refresh();
  }

  /*
   * Grey out editing controls while a test run is active.
   * GO is hidden for the duration of the test.
   */
  setEditEnabled(enabled) {
    this.#editEnabled = enabled;
    this.refresh();
  }

  /*
   * Refresh captions and which buttons accept clicks.
   */
  refresh() {
    const stages = this.panel.tourEditor ? this.panel.tourEditor.stages : [];
    const count = stages.length;
    const pages = Math.max(1, Math.ceil(count / HUDTourBuilderScreen.PAGE_SIZE));
    if (this.#page > pages - 1) this.#page = pages - 1;
    if (this.#page < 0) this.#page = 0;

    this.#headerText.set({content: 'TOUR BUILDER'});
    this.#pageText.set({
      content: count > 0 ? `${this.#page + 1}/${pages}` : '0/0'
    });
    const prevEnabled = this.#page > 0;
    const nextEnabled = this.#page < pages - 1;
    this.#prevButton.setEnabled(prevEnabled);
    this.#nextButton.setEnabled(nextEnabled);
    this.#setArrow(this.#prevButton, true, prevEnabled);
    this.#setArrow(this.#nextButton, true, nextEnabled);

    for (let slot = 0; slot < this.#rows.length; slot++) {
      const row = this.#rows[slot];
      const index = this.#stageIndex(slot);
      const stage = stages[index];
      if (!stage) {
        row.titleText.set({ content: '' });
        row.delButton.setEnabled(false);
        row.upButton.setEnabled(false);
        row.downButton.setEnabled(false);
        row.goButton.setShown(this.#editEnabled);
        row.goButton.setEnabled(false);
        row.delButton.setLabel('');
        row.goButton.setLabel('');
        this.#setArrow(row.upButton, false, false);
        this.#setArrow(row.downButton, false, false);
        this.#setRowChrome(row, false);
        continue;
      }

      row.titleText.set({ content: HUDTourBuilderScreen.clipTitle(stage.title) });
      row.delButton.setLabel('DEL');
      row.goButton.setLabel(this.#editEnabled ? 'GO' : '');
      const upEnabled = this.#editEnabled && index > 0;
      const downEnabled = this.#editEnabled && index < count - 1;
      row.delButton.setEnabled(this.#editEnabled);
      row.upButton.setEnabled(upEnabled);
      row.downButton.setEnabled(downEnabled);
      row.goButton.setShown(this.#editEnabled);
      row.goButton.setEnabled(this.#editEnabled);
      this.#setArrow(row.upButton, true, upEnabled);
      this.#setArrow(row.downButton, true, downEnabled);
      this.#setRowChrome(row, true);
    }
  }

  /*
   * The HUD font has no arrow glyphs, so the move buttons carry a mesh.
   */
  #addArrow(button, direction) {
    const material = new MeshBasicMaterial({
      color: 0x10faef,
      side: DoubleSide
    });
    const arrow = new Mesh(this.#arrowGeometryOrCreate(), material);
    if (direction == 'down') arrow.rotation.z = Math.PI;
    else if (direction == 'left') arrow.rotation.z = Math.PI / 2;
    else if (direction == 'right') arrow.rotation.z = -Math.PI / 2;
    arrow.position.z = 0.002;
    button.add(arrow);
    button.userData.arrow = arrow;
    button.userData.arrowMaterial = material;
  }

  #arrowGeometryOrCreate() {
    if (this.#arrowGeometry) return this.#arrowGeometry;
    const shape = new Shape();
    shape.moveTo(0, 0.0042);
    shape.lineTo(0.0032, 0.0006);
    shape.lineTo(0.00115, 0.0006);
    shape.lineTo(0.00115, -0.0042);
    shape.lineTo(-0.00115, -0.0042);
    shape.lineTo(-0.00115, 0.0006);
    shape.lineTo(-0.0032, 0.0006);
    shape.closePath();
    this.#arrowGeometry = new ShapeGeometry(shape);
    return this.#arrowGeometry;
  }

  #setArrow(button, shown, enabled) {
    const arrow = button.userData.arrow;
    if (!arrow) return;
    arrow.visible = shown;
    button.userData.arrowMaterial.color.set(enabled ? 0x10faef : 0x1a3a3c);
  }

  #setRowChrome(row, shown) {
    const borderOpacity = shown ? 1 : 0;
    const backgroundOpacity = shown ? 0.5 : 0;
    row.delButton.set({ borderOpacity, backgroundOpacity });
    row.upButton.set({ borderOpacity, backgroundOpacity });
    row.downButton.set({ borderOpacity, backgroundOpacity });
    row.goButton.set({ borderOpacity, backgroundOpacity });
  }

  static clipTitle(title) {
    const value = (title == null) ? '' : String(title);
    if (value.length <= 32) return value;
    return `${value.slice(0, 29)}...`;
  }

  /*
   * Dispose the object
   */
  dispose() {
    if (this.#arrowGeometry) {
      this.#arrowGeometry.dispose();
      this.#arrowGeometry = null;
    }
    for (const row of this.#rows) {
      row.upButton.userData.arrowMaterial?.dispose();
      row.downButton.userData.arrowMaterial?.dispose();
    }
    this.#prevButton.userData.arrowMaterial?.dispose();
    this.#nextButton.userData.arrowMaterial?.dispose();
    this.world3d = null;
    this.hud = null;
    this.panel = null;
    this.#headerText = null;
    this.#pageText = null;
    this.#prevButton = null;
    this.#nextButton = null;
    this.#rows = [];
  }

}

export { HUDTourBuilderScreen };
