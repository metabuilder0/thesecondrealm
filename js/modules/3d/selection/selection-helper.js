import {
  LineSegments,
  BoxGeometry,
  EdgesGeometry,
  LineBasicMaterial
} from 'three';

import * as data from '/js/modules/data/data-constants.js';
import { Formatter } from '/js/modules/data/formatter.js';
import { POS_FARFAR_AWAY } from '/js/modules/data/positions-constants.js';


class SelectionHelper extends LineSegments {

  /*
   * Attributes
   */

  world3d = null;
  pickedBlock = null;
  isActive = false;

  #series = null;
  #refreshCumulWait = null;
  #worker = null;
  #chronoDeselection = 0;


  /*
   * Constructor
   */
  constructor(world3d){
    const geometry = new BoxGeometry(1, 1, 1);
    const edgesGeometry = new EdgesGeometry(geometry);
    const material = new LineBasicMaterial({ color: 0x09bbc7});
    super(edgesGeometry, material);
    this.setPosition(POS_FARFAR_AWAY);

    // Initializes the attributes
    this.world3d = world3d;
    this.isActive = false;
    this.pickedBlock = null;
    this.#series = data.initializeSeriesList();
    this.#refreshCumulWait = 0;
    this.#worker = new Worker(
      '/js/modules/3d/selection/selection-task-wrapper.js', 
      { type: 'module' }
    ); 
    this.#worker.onmessage = this.processResultRaycasting.bind(this);
  }

  /**
   * Check if Raycaster has picked a block
   */
  pick(delta) {
    if (this.world3d.immersionModeActivated) {
      this.#refreshCumulWait += delta;
      if (this.#refreshCumulWait > 0.1) {
        for (let i = 0; i < 2; ++i) {
          const controller = this.world3d.renderer.xr.getController(i);
          if (controller == null) continue;
          const array = controller.matrixWorld.toArray();
          this.#worker.postMessage([1, array, delta]);
        }
        this.#refreshCumulWait = 0;
      }
    }
  }

  processResultRaycasting(e) {
    if (e.data == null) return;

    const idx = e.data[0];
    const delta = e.data[1];
    
    // Clears the HUD after 2s
    if (this.pickedBlock != null) {
      this.#chronoDeselection += delta;
      if (this.#chronoDeselection >= 2) {
        this.setPosition(POS_FARFAR_AWAY);
        this.world3d.hud.leftScreen.displayMessage('', '', '');
        this.pickedBlock = null;
        this.#chronoDeselection = 0;
      }
    }

    // Retrieves information about the picked block
    const cloudData = this.world3d.pointsCloud.cloudData;
    const dataPoint = cloudData.dataPoints[idx];
    
    // Case of a new selection
    if ((idx != -1) && (this.pickedBlock != idx)) {
      const dist = e.data[2];
      // Processes a new selection
      this.pickedBlock = idx;
      this.#chronoDeselection = 0;
      // Displays information about the selected block
      const height = Formatter.numberWithCommas(
        Formatter.numberToFixedDecimalsStr(dataPoint['key'], 0, false)
      );
      const date = Formatter.formatDate(dataPoint['ts']);
      const distance = Formatter.numberWithCommas(
        Formatter.numberToFixedDecimalsStr(dist, 2, false)
      );
      // Moves the cube
      this.setPosition(this.world3d.pointsCloud.dataToCoords3d(dataPoint));
      this.setScale(Math.max(0.1, dist / 100));
      // X coord
      const formatX = this.#series[cloudData.seriesNames[0]]['format'];
      let coordX = dataPoint['x'];
      if (cloudData.scaleX == data.SCALE_LOG) {
        coordX = 10 ** coordX;
      }
      coordX = Formatter.formatCoord(coordX, formatX);
      const labelX = this.#series[cloudData.seriesNames[0]]['label'];
      // Y coord
      const formatY = this.#series[cloudData.seriesNames[1]]['format'];
      let coordY = dataPoint['y'];
      if (cloudData.scaleY == data.SCALE_LOG) {
        coordY = 10 ** coordY;
      }
      coordY = Formatter.formatCoord(coordY, formatY);
      const labelY = this.#series[cloudData.seriesNames[1]]['label'];
      // Z coord
      const formatZ = this.#series[cloudData.seriesNames[2]]['format'];
      let coordZ = dataPoint['z'];
      if (cloudData.scaleZ == data.SCALE_LOG) {
        coordZ = 10 ** coordZ;
      }
      coordZ = Formatter.formatCoord(coordZ, formatZ);
      const labelZ = this.#series[cloudData.seriesNames[2]]['label'];
      // Displays block info on the HUD
      const title = `BLOCK #${height}\n\n`;
      let content = `TIMESTAMP: ${date}\n\n`;
      content += `${labelX}: ${coordX}\n\n`;
      content += `${labelY}: ${coordY}\n\n`;
      content += `${labelZ}: ${coordZ}\n\n`;
      let content2 = `DISTANCE TO BLOCK: ${distance} UNITS\n`;
      if (this.world3d.hud && this.world3d.hud.leftScreen) {
        this.world3d.hud.leftScreen.displayMessage(title, content, content2);
      }
    }    
  }

  /**
   * Set the position of the cube used to visualize the selection
   */
  setPosition(pos) {
    this.position.x = pos[0];
    this.position.y = pos[1];
    this.position.z = pos[2];
  }

  setScale(scale) {
    this.scale.x = scale;
    this.scale.y = scale;
    this.scale.z = scale;
  }

  /**
   * onPointsCloudLoaded
   */
  onPointsCloudLoaded() {
    const data = this.world3d.pointsCloud.geometry.getAttribute('position').array.buffer;   
    this.#worker.postMessage([0, data]);
    this.isActive = true;
  }

  /*
   * Dispose 
   */
  dispose() {
    // Resets the references to others objects
    this.world3d = null;
    this.raycaster = null;
    this.pickedBlock = null;
  }

  /*
   * Code processed in the update loop 
   */
  update(delta) {
    if (this.isActive) {
      this.pick(delta);
      this.animateCube(delta);
    }
  }

  /*
   * Animate the cube
   */
  animateCube(delta) {
    const rot = 0.01;
    this.rotation.x += rot;
    this.rotation.y += rot;
  }

}

export { SelectionHelper };
