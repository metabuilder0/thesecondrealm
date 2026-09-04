import { 
  Color
} from 'three';

import ThreeMeshUI from '../../../libs/three-mesh-ui/three-mesh-ui.module.min.js';

import * as data from '../../data/data-constants.js';
import { FlyController } from '../fly-controller.js';
import { Formatter } from '../../data/formatter.js';
import { CUBE_SIZE } from '../../data/positions-constants.js';


class HUDRightScreen extends ThreeMeshUI.Block {

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
  
  #speed = null;
  #speedUnit = null;
  #speedRefreshCumulWait = 0;
  #speedModes = [];
  
  #series = {};
  #axisLabels = [];
  #coords = [];
  #positionRefreshCumulWait = 0;


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
      backgroundOpacity: 0,
		  backgroundColor: new Color(0x000000)
    });

    this.set({
      fontFamily: 'js/libs/three-mesh-ui/assets/Roboto-msdf.json',
      fontTexture: 'js/libs/three-mesh-ui/assets/Roboto-msdf.png'
    });
    
    this.world3d = world3d;
    this.hud = hud;
    this.#series = data.initializeSeriesList();

    this.buildScreen(width, height);
  }

  /*
   * Build the screen 
   */
  buildScreen(width, height) {
    const subBlock1 = new ThreeMeshUI.Block({
      contentDirection: 'row',
      offset: 0,
      backgroundOpacity: 0,
    });
    this.add(subBlock1);

    // Builds the "speed" block
    const subBlock11 = new ThreeMeshUI.Block({
      width: 2 * width / 3 - 2 * 0.005,
      height: height / 3,
      margin: 0.005,
      padding: 0.02,
      offset: 0,
      justifyContent: 'center',
      alignItems: 'start',
      textAlign: 'center',
      backgroundOpacity: 0.5,
		  backgroundColor: new Color(0x000000),
      borderRadius: [0, 0, 0, 0],
      borderWidth: 0.005,
      borderColor: new Color(0x044b4f),
      borderOpacity: 1,
      contentDirection: 'row'
    });
    subBlock1.add(subBlock11);

    this.#speed = new ThreeMeshUI.Text({
      content: '',
      offset: 0,
      fontSize: 0.03
    });

    this.#speedUnit = new ThreeMeshUI.Text({
      content: '',
      offset: 0,
      fontSize: 0.01
    });

    subBlock11.add(this.#speed, this.#speedUnit);

    // Builds the "speed modes" block
    const subBlock12 = new ThreeMeshUI.Block({
      margin: 0.005,
      padding: height/18,
      justifyContent: 'start',
      alignItems: 'start',
      textAlign: 'center',
      interLine: 0,
      offset: 0,
      backgroundOpacity: 0.5,
		  backgroundColor: new Color(0x000000),
      borderRadius: [0, 0, 0, 0],
      borderWidth: 0.005,
      borderColor: new Color(0x044b4f),
      borderOpacity: 1
    });
    subBlock1.add(subBlock12);

    for (let mode=1; mode < FlyController.MAX_SPEEDS.length; mode++) {
      const speedMode = new ThreeMeshUI.Text({
        content: '',
        offset: 0,
        fontSize: 0.08
      });
      this.#speedModes.push(speedMode);

      const subBlock = new ThreeMeshUI.Block({
        width: width/6,
        height: height/18,
        interLine: 0,
        offset: 0,
        backgroundOpacity: 0,
        margin: 0,
        padding: -2*height/18,
        borderWidth: 0,
        fontColor: new Color(HUDRightScreen.COLORS_PALETTE[mode]),
      });
      subBlock.add(speedMode);
      subBlock12.add(subBlock);
    }

    // Buids the "Position" block
    const subBlock2 = new ThreeMeshUI.Block({
      width: width,
      height: 2 * height / 3,
      margin: 0.005,
      padding: 0,
      offset: 0,
      justifyContent: 'center',
      alignItems: 'start',
      textAlign: 'center',
      offset: 0,
      backgroundOpacity: 0.5,
      backgroundColor: new Color(0x000000),
      borderRadius: [0, 0, 0, 0],
      borderWidth: 0.005,
      borderColor: new Color(0x044b4f),
      borderOpacity: 1
    });
    this.add(subBlock2);

    for (let i=0; i < 3; i++) {
      const subBlock21 = new ThreeMeshUI.Block({
        width: width,
        height: height / 12,
        interLine: 0,
        offset: 0,
        justifyContent: 'center',
        alignItems: 'center',
        textAlign: 'center',
        backgroundOpacity: 0,
        margin: 0,
        padding: 0,
        borderWidth: 0
      });
      subBlock2.add(subBlock21);

      const axisLabel = new ThreeMeshUI.Text({
        content: '',
        offset: 0,
        fontSize: 0.006
      });
      this.#axisLabels.push(axisLabel);
      subBlock21.add(axisLabel);

      const subBlock22 = new ThreeMeshUI.Block({
        width: width,
        height: height / 12,
        interLine: 0,
        offset: 0,
        alignItems: 'start',
        textAlign: 'center',
        backgroundOpacity: 0,
        margin: 0,
        padding: 0,
        borderWidth: 0
      });
      subBlock2.add(subBlock22);

      const coord = new ThreeMeshUI.Text({
        content: '',
        offset: 0,
        fontSize: 0.015
      });
      this.#coords.push(coord);
      subBlock22.add(coord);
    }
  }

  /*
   * Code processed in the rendering loop
   */
  updateScreen(delta) {
    if (this.world3d.immersionModeActivated) {
      this.updateSpeed(delta);
      this.updateSpeedMode(delta);
      this.updatePosition(delta);
    }
  }

  updateSpeed(delta) {
    if (!this.world3d.controller)
      return;
    this.#speedRefreshCumulWait += delta;
    if (this.#speedRefreshCumulWait > 0.3) {
      const controller = this.world3d.controller;
      const speed = Math.ceil(controller.lastSpeed.length());
      this.#speed.set({content: `${speed}`});
      this.#speedUnit.set({content: ' units/s'});
      this.#speedRefreshCumulWait = 0;
    }
  }

  updateSpeedMode(delta) {
    if (!this.world3d.controller)
      return;
    
    const controller = this.world3d.controller;
    const speedMode = controller.speedMode;
    const nbSpeedModes = FlyController.MAX_SPEEDS.length;
    
    for (let i=1; i< nbSpeedModes; i++) {
      if (speedMode > 0 && i <= speedMode) {
        this.#speedModes[nbSpeedModes-1-i].set({content: '-'});
      } else {
        this.#speedModes[nbSpeedModes-1-i].set({content: ''});
      }
    }
  }

  updatePosition(delta) {
    if (!this.world3d.pointsCloud)
      return;
    
    this.#positionRefreshCumulWait += delta;
    
    if (this.#positionRefreshCumulWait > 0.3) {
      const cloudData = this.world3d.pointsCloud.cloudData;
      // Displays axis labels
      for (let i=0; i < 3; i++) {
        const label = this.#series[cloudData.seriesNames[i]]['label'];
        this.#axisLabels[i].set({content: label});
      }
      // Displays coordinates
      const pos = this.world3d.camera.parent.position;
      let coordX = 0,
          coordY = 0,
          coordZ = 0,
          size = CUBE_SIZE;
      // X coord
      const formatX = this.#series[cloudData.seriesNames[0]]['format'];
      coordX = cloudData.minX + pos.x * (cloudData.maxX - cloudData.minX) / size;
      if (cloudData.scaleX == data.SCALE_LOG) {
        coordX = 10 ** coordX;
      }
      coordX = Formatter.formatCoord(coordX, formatX);
      // Y coord
      const formatY = this.#series[cloudData.seriesNames[1]]['format'];
      coordY = cloudData.minY + pos.y * (cloudData.maxY - cloudData.minY) / size;
      if (cloudData.scaleY == data.SCALE_LOG) {
        coordY = 10 ** coordY;
      }
      coordY = Formatter.formatCoord(coordY, formatY);
      // Z coord
      const formatZ = this.#series[cloudData.seriesNames[2]]['format'];
      coordZ = cloudData.minZ + pos.z * (cloudData.maxZ - cloudData.minZ) / size;
      if (cloudData.scaleZ == data.SCALE_LOG) {
        coordZ = 10 ** coordZ;
      }
      coordZ = Formatter.formatCoord(coordZ, formatZ);
      // Displays coordinates
      this.#coords[0].set({content: coordX});
      this.#coords[1].set({content: coordY});
      this.#coords[2].set({content: coordZ});
      // Resets chronometer
      this.#positionRefreshCumulWait = 0;
    }
  }

  /*
   * Dispose the object 
   */
  dispose() {
    // Resets the references to others objects
    this.world3d = null;
    this.hud = null;
    this.#speed = null;
    this.#speedUnit = null;
    this.#speedModes = [];
    
    this.#series = null;
    this.#axisLabels = [];
    this.#coords = [];
  }

}

export { HUDRightScreen };
