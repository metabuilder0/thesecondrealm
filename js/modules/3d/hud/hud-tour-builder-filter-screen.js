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


class HUDTourBuilderFilterScreen extends ThreeMeshUI.Block {

  /*
   * Constants
   */

  static PAGE_SIZE = 8;

  static ATTRIBUTES = ['x', 'y', 'z', 'key'];

  static ATTRIBUTE_LABELS = {
    x: 'X',
    y: 'Y',
    z: 'Z',
    key: 'HEIGHT'
  };


  /*
   * Attributes
   */

  world3d = null;
  hud = null;
  panel = null;

  #stageIndex = null;
  #page = 0;
  #headerText = null;
  #pageText = null;
  #prevButton = null;
  #nextButton = null;
  #addGroupButton = null;
  #goButton = null;
  #backButton = null;
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
    this.visible = false;
  }

  /*
   * Build the list once. Rows are reused because interactive
   * objects cannot be unregistered from the XR manager.
   */
  #buildScreen(width, height) {
    const headerHeight = 0.032;
    const footerHeight = 0.046;
    const contentWidth = width - 2 * 0.006;
    const rowHeight = (height - headerHeight - footerHeight - 2 * 0.006) / HUDTourBuilderFilterScreen.PAGE_SIZE;

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
      borderWidth: 0,
      hiddenOverflow: true
    });
    this.#headerText = new ThreeMeshUI.Text({
      content: 'FILTERS',
      offset: 0,
      fontSize: 0.008
    });
    header.add(this.#headerText);
    this.add(header);

    for (let slot = 0; slot < HUDTourBuilderFilterScreen.PAGE_SIZE; slot++) {
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
      width: 0.042,
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

    const actionHeight = 0.026;
    this.#addGroupButton = createHudButton(this.world3d, {
      width: 0.068,
      height: actionHeight,
      label: 'ADD GROUP',
      fontSize: 0.0045,
      onClick: () => this.panel.addFilterGroup(this.#stageIndex)
    });
    this.#goButton = createHudButton(this.world3d, {
      width: 0.028,
      height: actionHeight,
      label: 'GO',
      fontSize: 0.005,
      onClick: () => this.panel.teleportTo(this.#stageIndex)
    });
    this.#backButton = createHudButton(this.world3d, {
      width: 0.042,
      height: actionHeight,
      label: 'BACK',
      fontSize: 0.005,
      onClick: () => this.panel.closeFilters()
    });

    footer.add(this.#prevButton);
    footer.add(pageBlock);
    footer.add(this.#nextButton);
    footer.add(this.#addGroupButton);
    footer.add(this.#goButton);
    footer.add(this.#backButton);
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

    const buttonHeight = Math.max(height - 0.006, 0.018);
    // Both row kinds occupy the same width, so DEL stays in the same place.
    // + RANGE 0.060 and DEL 0.034, margins included, leave the label the rest.
    const groupLabelWidth = width - 0.096;

    const groupLabel = new ThreeMeshUI.Block({
      width: groupLabelWidth,
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
    const groupText = new ThreeMeshUI.Text({
      content: '',
      offset: 0,
      fontSize: 0.006
    });
    groupLabel.add(groupText);

    const addButton = createHudButton(this.world3d, {
      width: 0.056,
      height: buttonHeight,
      label: '+ RANGE',
      fontSize: 0.0045,
      onClick: () => {
        const entry = this.#rows[slot].entry;
        if (!entry || entry.kind != 'group') return;
        this.panel.addFilterCondition(this.#stageIndex, entry.g);
      }
    });
    const attrButton = createHudButton(this.world3d, {
      width: 0.05,
      height: buttonHeight,
      label: 'X',
      fontSize: 0.005,
      onClick: () => {
        const entry = this.#rows[slot].entry;
        if (!entry || entry.kind != 'condition') return;
        this.panel.cycleFilterAttribute(this.#stageIndex, entry.g, entry.c);
      }
    });
    const minButton = createHudButton(this.world3d, {
      width: 0.074,
      height: buttonHeight,
      label: '',
      fontSize: 0.005,
      onClick: () => {
        const entry = this.#rows[slot].entry;
        if (!entry || entry.kind != 'condition') return;
        this.panel.editFilterBound(this.#stageIndex, entry.g, entry.c, 'min');
      }
    });
    const dash = new ThreeMeshUI.Block({
      width: 0.012,
      height: height,
      margin: 0,
      padding: 0,
      offset: 0,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundOpacity: 0,
      borderWidth: 0
    });
    dash.add(new ThreeMeshUI.Text({
      content: '-',
      offset: 0,
      fontSize: 0.007
    }));
    const maxButton = createHudButton(this.world3d, {
      width: 0.074,
      height: buttonHeight,
      label: '',
      fontSize: 0.005,
      onClick: () => {
        const entry = this.#rows[slot].entry;
        if (!entry || entry.kind != 'condition') return;
        this.panel.editFilterBound(this.#stageIndex, entry.g, entry.c, 'max');
      }
    });
    const delButton = createHudButton(this.world3d, {
      width: 0.03,
      height: buttonHeight,
      label: 'DEL',
      fontSize: 0.005,
      onClick: () => {
        const entry = this.#rows[slot].entry;
        if (!entry) return;
        if (entry.kind == 'group') {
          this.panel.removeFilterGroup(this.#stageIndex, entry.g);
        } else {
          this.panel.removeFilterCondition(this.#stageIndex, entry.g, entry.c);
        }
      }
    });

    row.add(groupLabel);
    row.add(addButton);
    row.add(attrButton);
    row.add(minButton);
    row.add(dash);
    row.add(maxButton);
    row.add(delButton);

    this.#rows.push({
      groupLabel,
      groupText,
      groupLabelWidth,
      addButton,
      attrButton,
      minButton,
      dash,
      maxButton,
      delButton,
      entry: null
    });
    return row;
  }

  /*
   * Open the list on the first page of a stage.
   */
  show(stageIndex) {
    this.#stageIndex = stageIndex;
    this.#page = 0;
    this.refresh();
  }

  /*
   * Move the page so a group, or one of its conditions, is on screen.
   */
  focus(groupIndex, conditionIndex) {
    const entries = this.#entries();
    let index = -1;
    if (conditionIndex == null) {
      index = entries.findIndex((entry) => entry.kind == 'group' && entry.g == groupIndex);
    } else {
      index = entries.findIndex((entry) => {
        return entry.kind == 'condition' && entry.g == groupIndex && entry.c == conditionIndex;
      });
    }
    if (index < 0) index = Math.max(0, entries.length - 1);
    this.#page = Math.floor(index / HUDTourBuilderFilterScreen.PAGE_SIZE);
    this.refresh();
  }

  #changePage(delta) {
    this.#page += delta;
    this.refresh();
  }

  #stage() {
    const editor = this.panel && this.panel.tourEditor;
    if (!editor || this.#stageIndex == null) return null;
    return editor.stages[this.#stageIndex] || null;
  }

  /*
   * One row per group header, then one row per condition of that group.
   */
  #entries() {
    const stage = this.#stage();
    const filters = stage && Array.isArray(stage.filters) ? stage.filters : [];
    const entries = [];
    filters.forEach((group, g) => {
      if (!Array.isArray(group)) return;
      entries.push({ kind: 'group', g: g });
      group.forEach((condition, c) => {
        if (!Array.isArray(condition)) return;
        entries.push({ kind: 'condition', g: g, c: c, condition: condition });
      });
    });
    return entries;
  }

  /*
   * Refresh captions and which buttons accept clicks.
   */
  refresh() {
    const stage = this.#stage();
    const entries = this.#entries();
    const count = entries.length;
    const pages = Math.max(1, Math.ceil(count / HUDTourBuilderFilterScreen.PAGE_SIZE));
    if (this.#page > pages - 1) this.#page = pages - 1;
    if (this.#page < 0) this.#page = 0;

    const title = stage ? stage.title : '';
    this.#headerText.set({
      content: `FILTERS : ${HUDTourBuilderFilterScreen.clip(title)}`
    });
    this.#pageText.set({
      content: count > 0 ? `${this.#page + 1}/${pages}` : '0/0'
    });

    const prevEnabled = this.#page > 0;
    const nextEnabled = this.#page < pages - 1;
    this.#prevButton.setEnabled(prevEnabled);
    this.#nextButton.setEnabled(nextEnabled);
    this.#setArrow(this.#prevButton, true, prevEnabled);
    this.#setArrow(this.#nextButton, true, nextEnabled);

    const hasStage = stage != null;
    this.#addGroupButton.setEnabled(hasStage);
    this.#goButton.setEnabled(hasStage);
    this.#backButton.setEnabled(true);

    for (let slot = 0; slot < this.#rows.length; slot++) {
      const row = this.#rows[slot];
      const entry = entries[this.#page * HUDTourBuilderFilterScreen.PAGE_SIZE + slot] || null;
      row.entry = entry;
      this.#applyEntry(row, entry);
    }
  }

  #applyEntry(row, entry) {
    const isGroup = entry != null && entry.kind == 'group';
    const isCondition = entry != null && entry.kind == 'condition';

    row.groupLabel.visible = isGroup;
    row.groupLabel.set({ width: isGroup ? row.groupLabelWidth : 0.0001 });
    row.groupText.set({
      content: isGroup ? HUDTourBuilderFilterScreen.groupLabel(entry.g) : ''
    });
    row.addButton.setShown(isGroup);
    row.addButton.setEnabled(isGroup);

    row.attrButton.setShown(isCondition);
    row.minButton.setShown(isCondition);
    row.maxButton.setShown(isCondition);
    row.dash.visible = isCondition;
    row.dash.set({ width: isCondition ? 0.012 : 0.0001 });
    row.attrButton.setEnabled(isCondition);
    row.minButton.setEnabled(isCondition);
    row.maxButton.setEnabled(isCondition);

    if (isCondition) {
      const condition = entry.condition;
      row.attrButton.setLabel(HUDTourBuilderFilterScreen.attributeLabel(condition[0]));
      row.minButton.setLabel(HUDTourBuilderFilterScreen.formatValue(condition[1]));
      row.maxButton.setLabel(HUDTourBuilderFilterScreen.formatValue(condition[2]));
    } else {
      row.attrButton.setLabel('');
      row.minButton.setLabel('');
      row.maxButton.setLabel('');
    }

    row.delButton.setShown(entry != null);
    row.delButton.setEnabled(entry != null);
    row.delButton.setLabel(entry != null ? 'DEL' : '');
  }

  /*
   * The HUD font has no arrow glyphs, so the page buttons carry a mesh.
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

  static groupLabel(groupIndex) {
    const number = groupIndex + 1;
    if (groupIndex == 0) return `GROUP ${number}`;
    return `OR GROUP ${number}`;
  }

  static nextAttribute(attr) {
    const index = HUDTourBuilderFilterScreen.ATTRIBUTES.indexOf(attr);
    const next = (index + 1) % HUDTourBuilderFilterScreen.ATTRIBUTES.length;
    return HUDTourBuilderFilterScreen.ATTRIBUTES[next];
  }

  static attributeLabel(attr) {
    return HUDTourBuilderFilterScreen.ATTRIBUTE_LABELS[attr] || String(attr == null ? '' : attr).toUpperCase();
  }

  /*
   * Compact label for a bound button.
   * Integers stay as they are. Larger values use a k or M suffix.
   */
  static formatValue(value) {
    if (!Number.isFinite(value)) return '';
    const abs = Math.abs(value);
    const sign = value < 0 ? '-' : '';
    if (abs >= 1000000) return sign + HUDTourBuilderFilterScreen.#digits(abs / 1000000) + 'M';
    if (abs >= 10000) return sign + HUDTourBuilderFilterScreen.#digits(abs / 1000) + 'k';
    if (Number.isInteger(value)) return String(value);
    return sign + HUDTourBuilderFilterScreen.#digits(abs);
  }

  static #digits(value) {
    return String(Number(value.toPrecision(4)));
  }

  /*
   * Full value typed into the keyboard, without the k/M suffix.
   */
  static fullValue(value) {
    if (!Number.isFinite(value)) return '';
    const text = String(value);
    if (!/[eE]/.test(text)) return text;
    return value.toFixed(12).replace(/\.?0+$/, '');
  }

  static clip(value) {
    const text = (value == null) ? '' : String(value);
    if (text.length <= 42) return text;
    return `${text.slice(0, 39)}...`;
  }

  /*
   * Dispose the object
   */
  dispose() {
    if (this.#arrowGeometry) {
      this.#arrowGeometry.dispose();
      this.#arrowGeometry = null;
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
    this.#addGroupButton = null;
    this.#goButton = null;
    this.#backButton = null;
    this.#rows = [];
  }

}

export { HUDTourBuilderFilterScreen };
