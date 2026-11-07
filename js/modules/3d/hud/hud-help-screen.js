import {
  Color,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  Shape,
  ShapeGeometry,
  TextureLoader
} from 'three';

import ThreeMeshUI from '../../../libs/three-mesh-ui/three-mesh-ui.module.min.js';

import { createHudButton } from './hud-button.js';


const FONT_FAMILY = 'js/libs/three-mesh-ui/assets/Roboto-msdf.json';
const FONT_TEXTURE = 'js/libs/three-mesh-ui/assets/Roboto-msdf.png';

// Display order. A page is dropped when the current mode cannot show it.
const PAGES = [
  { id: 'tour_builder', src: 'static/images/tour_builder_help.png' },
  { id: 'controller', src: 'static/images/controller_help.png' },
  { id: 'hud', src: 'static/images/hud_help.png' }
];


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
  #prevButton = null;
  #nextButton = null;
  #arrowGeometry = null;
  #loader = new TextureLoader();
  #textures = {};
  #pages = [];
  #index = 0;
  #pageId = null;
  #signature = '';


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
      backgroundOpacity: 1,
      backgroundColor: new Color(0x000000)
    });

    this.set({
      fontFamily: FONT_FAMILY,
      fontTexture: FONT_TEXTURE
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
      height: height - 2 * 0.005,
      margin: 0,
      padding: 0.02,
      borderWidth: 0,
      backgroundOpacity: 1,
      offset: 0
    });
    this.#subBlock1.add(this.#subBlockImage);

    // Declares interactive components
    this.world3d.xrManager.makeInteractive(this.#subBlock1, {
      onPointerOver: (intersection) => {
        const c = this.world3d.xrManager.controllers[intersection.idxController];
        if (c == null) return;
        c.xrInputSource.gamepad.hapticActuators?.[0]?.pulse(0.4, 50);
      }
    });

    // A Group is not laid out, so the arrows stay in the corners.
    // The image block sits at the default offset (0.01). The arrows must
    // be closer to the user, otherwise that plane takes the raycast once
    // the panel itself is interactive.
    const overlay = new Group();
    overlay.position.z = 0.01;
    this.#subBlock1.add(overlay);

    const size = 0.0255;
    const margin = 0.018;
    const halfW = (width - 2 * 0.005) / 2;
    const halfH = (height - 2 * 0.005) / 2;
    const y = halfH - margin - size / 2;

    this.#prevButton = this.#createArrowButton('left', size, () => this.#step(-1));
    this.#prevButton.position.set(-halfW + margin + size / 2, y, 0);
    this.#nextButton = this.#createArrowButton('right', size, () => this.#step(1));
    this.#nextButton.position.set(halfW - margin - size / 2, y, 0);
    overlay.add(this.#prevButton);
    overlay.add(this.#nextButton);

    this.#preload();
    this.#syncPages();
    this.#syncLayers();
  }

  /*
   * Pages the current mode can show, in display order.
   * The builder plate follows the mode immersion was entered in.
   * The controller plate is hidden while an autopilot tour is running.
   */
  #availablePages() {
    const builder = !!(this.hud && this.hud.builderMode);
    const type = this.world3d && this.world3d.tourType;
    const autopilot = type == 'guided_tour_autopilot' || type == 'autopilot';
    return PAGES.filter((page) => {
      if (page.id == 'tour_builder') return builder;
      if (page.id == 'controller') return !autopilot;
      return true;
    });
  }

  /*
   * Keep the list aligned with the mode. Stay on the same plate when it remains.
   */
  #syncPages() {
    const pages = this.#availablePages();
    const signature = pages.map((page) => page.id).join(',');
    if (signature == this.#signature) return;
    const stay = pages.findIndex((page) => page.id == this.#pageId);
    this.#pages = pages;
    this.#signature = signature;
    this.#index = stay >= 0 ? stay : 0;
    this.#showCurrent();
  }

  #step(delta) {
    const next = this.#index + delta;
    if (next < 0 || next >= this.#pages.length) return;
    this.#index = next;
    this.#showCurrent();
  }

  #showCurrent() {
    const page = this.#pages[this.#index];
    if (!page) return;
    this.#pageId = page.id;
    const texture = this.#textures[page.id];
    if (texture) {
      this.#subBlockImage.set({ backgroundTexture: texture });
    }
    this.#refreshArrows();
  }

  #preload() {
    for (const page of PAGES) {
      this.#loader.load(page.src, (texture) => {
        this.#textures[page.id] = texture;
        if (this.#pageId == page.id) {
          this.#subBlockImage.set({ backgroundTexture: texture });
        }
      });
    }
  }

  #createArrowButton(direction, size, onClick) {
    const button = createHudButton(this.world3d, {
      width: size,
      height: size,
      label: '',
      margin: 0,
      onClick: onClick
    });
    button.set({
      fontFamily: FONT_FAMILY,
      fontTexture: FONT_TEXTURE
    });
    this.#addArrow(button, direction);
    return button;
  }

  /*
   * The HUD font has no arrow glyphs, so the buttons carry a mesh.
   * The shape points up. Left and right are that shape turned on its side.
   */
  #addArrow(button, direction) {
    const material = new MeshBasicMaterial({
      color: 0x10faef,
      side: DoubleSide
    });
    const arrow = new Mesh(this.#arrowGeometryOrCreate(), material);
    if (direction == 'left') arrow.rotation.z = Math.PI / 2;
    else if (direction == 'right') arrow.rotation.z = -Math.PI / 2;
    arrow.scale.set(1.0875, 1.0875, 1);
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

  #refreshArrows() {
    const prevEnabled = this.#index > 0;
    const nextEnabled = this.#index < this.#pages.length - 1;
    this.#prevButton.setEnabled(prevEnabled);
    this.#nextButton.setEnabled(nextEnabled);
    this.#setArrow(this.#prevButton, prevEnabled);
    this.#setArrow(this.#nextButton, nextEnabled);
  }

  #setArrow(button, enabled) {
    const material = button.userData.arrowMaterial;
    if (!material) return;
    material.color.set(enabled ? 0x10faef : 0x1a3a3c);
  }

  /*
   * Hidden controls stay on layer 1 so the raycaster (layer 0) skips them.
   */
  #syncLayers() {
    const open = this.visible;
    this.traverse((obj) => {
      obj.layers.set(open ? 0 : 1);
    });
  }

  /*
   * Code processed in the rendering loop
   */
  updateScreen(delta) {
    this.#syncPages();
    this.#syncLayers();
  }

  /*
   * Dispose the object
   */
  dispose() {
    for (const texture of Object.values(this.#textures)) {
      texture.dispose();
    }
    this.#textures = {};
    if (this.#arrowGeometry) {
      this.#arrowGeometry.dispose();
      this.#arrowGeometry = null;
    }
    this.#prevButton?.userData.arrowMaterial?.dispose();
    this.#nextButton?.userData.arrowMaterial?.dispose();
    // Resets the references to others objects
    this.world3d = null;
    this.hud = null;
    this.#subBlock1 = null;
    this.#subBlockImage = null;
    this.#prevButton = null;
    this.#nextButton = null;
    this.#pages = [];
  }

}

export { HUDHelpScreen };
