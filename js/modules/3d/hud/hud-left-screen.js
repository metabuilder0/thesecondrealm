import { 
  Color
} from 'three';

import ThreeMeshUI from '../../../libs/three-mesh-ui/three-mesh-ui.module.min.js';

import { Formatter } from '../../data/formatter.js';


class HUDLeftScreen extends ThreeMeshUI.Block {

  /*
   * Constants
   */
  static COLORS_PALETTE = [
    0x09595a,
    0x086c6c,
    0x007676,
    0x0a8990,
    0x0a9b9e,
    0x0aaeaf,
    0x09bbc7,
    0x05cbcc,
    0x06dbdf,
    0x01f0f7
  ];

  /*
   * Attributes 
   */

  world3d = null;
  hud = null;

  width = null;
  height = null;

  #subBlock1 = null;
  #subBlockMsgTitle = null;
  #subBlockMsgTitleText = null;
  #subBlockMsgContent1 = null;
  #subBlockMsgContent1Text = null;
  #subBlockMsgContent2 = null;
  #subBlockMsgContent2Text = null;

  #progressBars = [];
  #fromBlockText = null;
  #toBlockText = null;
  #fromBlockSet = false;
  #toBlockSet = false;
  #refreshCumulWait = 0;

  #counterLoadingText = 0;


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
      height: 2 * height / 3,
      margin: 0.005,
      padding: 0,
      offset: 0,
      justifyContent: 'center',
      alignItems: 'start',
      textAlign: 'center',
      backgroundOpacity: 0.5,
		  backgroundColor: new Color(0x000000),
      borderRadius: [0, 0, 0, 0],
      borderWidth: 0.005,
      borderColor: new Color(0x044b4f),
      borderOpacity: 1
    });
    this.add(this.#subBlock1);

    // Message Title Block
    this.#subBlockMsgTitle = new ThreeMeshUI.Block({
      width: this.width - 2 * 0.005,
      height: this.height / 6,
      interLine: 0,
      offset: 0,
      justifyContent: 'start',
      alignItems: 'start',
      textAlign: 'center',
      backgroundOpacity: 0,
      margin: 0,
      padding: 0.02,
      borderWidth: 0,
      contentDirection: 'column'
    });
    this.#subBlockMsgTitleText = new ThreeMeshUI.Text({
      content: '',
      offset: 0,
      fontSize: 0.01
    });
    this.#subBlockMsgTitle.add(this.#subBlockMsgTitleText);
    // Message Content 1 Block
    this.#subBlockMsgContent1 = new ThreeMeshUI.Block({
      width: this.width - 2 * 0.005,
      height: this.height / 3,
      interLine: 0,
      offset: 0,
      justifyContent: 'start',
      alignItems: 'start',
      textAlign: 'left',
      backgroundOpacity: 0,
      margin: 0,
      padding: 0.02,
      borderWidth: 0
    });
    this.#subBlockMsgContent1Text = new ThreeMeshUI.Text({
      content: '',
      offset: 0,
      fontSize: 0.006
    });
    this.#subBlockMsgContent1.add(this.#subBlockMsgContent1Text);
    // Message Content 2 Block
    this.#subBlockMsgContent2 = new ThreeMeshUI.Block({
      width: this.width - 2 * 0.005,
      height: this.height / 6,
      interLine: 0,
      offset: 0,
      justifyContent: 'start',
      alignItems: 'start',
      textAlign: 'left',
      backgroundOpacity: 0,
      margin: 0,
      padding: 0.02,
      borderWidth: 0
    });
    this.#subBlockMsgContent2Text = new ThreeMeshUI.Text({
      content: '',
      offset: 0,
      fontSize: 0.005
    });
    this.#subBlockMsgContent2.add(this.#subBlockMsgContent2Text);

    this.#subBlock1.add(this.#subBlockMsgTitle);
    this.#subBlock1.add(this.#subBlockMsgContent1);
    this.#subBlock1.add(this.#subBlockMsgContent2);

    // Chaintip block
    const subBlock2 = new ThreeMeshUI.Block({
      width: width - 2 * 0.005,
      height: height / 3,
      margin: 0.005,
      padding: 0,
      offset: 0,
      justifyContent: 'center',
      alignItems: 'center',
      textAlign: 'center',
      backgroundOpacity: 0.5,
		  backgroundColor: new Color(0x000000),
      borderRadius: [0, 0, 0, 0],
      borderWidth: 0.005,
      borderColor: new Color(0x044b4f),
      borderOpacity: 1
    });
    this.add(subBlock2);

    // Progress bar sub block
    const subBlock21 = new ThreeMeshUI.Block({
      width: width,
      height: height / 6,
      interLine: 0,
      offset: 0,
      justifyContent: 'center',
      alignItems: 'center',
      textAlign: 'center',
      backgroundOpacity: 0,
      margin: 0,
      padding: 0.008,
      borderWidth: 0,
      hiddenOverflow: true,
      contentDirection: 'row'
    });
    subBlock2.add(subBlock21);

    for (let i=0; i < 10; i++) {
      const bar = new ThreeMeshUI.Text({
        content: '',
        offset: 0,
        fontSize: 0.08
      });
      this.#progressBars.push(bar);

      const subBlock21x = new ThreeMeshUI.Block({
        width: width/12,
        height: height/8,
        interLine: 0,
        offset: 0,
        backgroundOpacity: 0,
        margin: 0,
        padding: 0,
        borderWidth: 0,
        fontColor: new Color(HUDLeftScreen.COLORS_PALETTE[i]),
      });
      subBlock21x.add(bar);
      subBlock21.add(subBlock21x);

    }

    // Boundaries sub block
    const subBlock22 = new ThreeMeshUI.Block({
      width: width,
      height: height / 6,
      interLine: 0,
      offset: 0,
      justifyContent: 'center',
      alignItems: 'center',
      textAlign: 'center',
      backgroundOpacity: 0,
      margin: 0,
      padding: 0,
      borderWidth: 0,
      contentDirection: 'row'
    });
    subBlock2.add(subBlock22);

    const subBlock221 = new ThreeMeshUI.Block({
      width: width / 2,
      height: height / 6,
      interLine: 0,
      offset: 0,
      justifyContent: 'center',
      alignItems: 'center',
      textAlign: 'left',
      backgroundOpacity: 0,
      margin: 0,
      padding: 0.02,
      borderWidth: 0
    });
    subBlock22.add(subBlock221);

    const fromBlock = new ThreeMeshUI.Text({
      content: '',
      offset: 0,
      fontSize: 0.005
    });
    this.#fromBlockText = fromBlock;
    subBlock221.add(fromBlock);

    const subBlock222 = new ThreeMeshUI.Block({
      width: width / 2,
      height: height / 6,
      interLine: 0,
      offset: 0,
      justifyContent: 'center',
      alignItems: 'center',
      textAlign: 'right',
      backgroundOpacity: 0,
      margin: 0,
      padding: 0.02,
      borderWidth: 0
    });
    subBlock22.add(subBlock222);
    
    const toBlock = new ThreeMeshUI.Text({
      content: '',
      offset: 0,
      fontSize: 0.005
    });
    this.#toBlockText = toBlock;
    subBlock222.add(toBlock);
  }

  /*
   * Code processed in the rendering loop
   */
  updateScreen(delta) {
    this.#refreshCumulWait += delta;
    if (this.#refreshCumulWait > 0.2) {
      if (this.world3d.immersionModeActivated) {
        this.updateProgressBar(delta);
        this.updateChainBoundaries(delta);
      } else {
        this.updateLoadingText(delta);
      }
      this.#refreshCumulWait = 0;
    }
  }

  updateProgressBar(delta) {
    if (this.world3d.pointsCloud == null) {
      return;
    }

    const cloudData = this.world3d.pointsCloud.cloudData;

    if (!this.#toBlockSet) {
      const nbBlocksPerBar = Math.floor((cloudData.maxH - cloudData.minH) / 10);
      const heightLastBlock = Math.min(this.world3d.pointsCloud.animIdx, cloudData.maxH);
      const nbBars = Math.floor((heightLastBlock - cloudData.minH) / nbBlocksPerBar);
      for (let i=0; i< nbBars; i++) {
        this.#progressBars[i].set({content: 'I'});
      }
    }
  }

  updateChainBoundaries(delta) {
    if (this.world3d.pointsCloud == null) {
      return;
    }  

    const cloudData = this.world3d.pointsCloud.cloudData;

    // Computes label for first block only once
    if (!this.#fromBlockSet) {
      const fromHeight = Formatter.numberWithCommas(cloudData.minH);
      const fromDate = Formatter.formatDate(cloudData.seriesT[cloudData.minH-1]);
      const fromBlockText = `FROM BLOCK #${fromHeight}\n(${fromDate})`;
      this.#fromBlockText.set({content: fromBlockText});
      this.#fromBlockSet = true;
    }

    // Refreshes label for last block loaded
    if (!this.#toBlockSet) {
      const heightLastBlock = Math.min(this.world3d.pointsCloud.animIdx, cloudData.maxH);
      const toHeight = Formatter.numberWithCommas(heightLastBlock);
      const toDate = Formatter.formatDate(cloudData.seriesT[heightLastBlock-1]);
      const toBlockText = `TO BLOCK #${toHeight}\n(${toDate})`;
      this.#toBlockText.set({content: toBlockText});
      if (heightLastBlock == cloudData.maxH) {
        this.#toBlockSet = true;
      }
    }
  }

  updateLoadingText(delta) {
    this.#counterLoadingText = (this.#counterLoadingText + 1) % 8;
    let title = '\n\nIMMERSION IN PROGRESS\n\n';
    title += '.'.repeat(this.#counterLoadingText);
    let label = '\n\nSTAND STILL\n\n';
    label += 'SIT UPRIGHT\n\n';
    label += 'LOOK STRAIGHT AHEAD\n\n';
    label += 'RECENTER THE VR HEADSET';
    this.#subBlockMsgTitleText.set({content: title});
    this.#subBlockMsgContent1.set({textAlign: 'center'});
    this.#subBlockMsgContent1Text.set({
      content: label,
      fontSize: 0.01
    });
  }

  clearLoadingText() {
    this.#subBlockMsgTitleText.set({content: ''});
    this.#subBlockMsgContent1.set({textAlign: 'left'});
    this.#subBlockMsgContent1Text.set({
      content: '',  
      fontSize: 0.006
    });
  }

  displayMessage(title='', content1='', content2='') {
    this.#subBlockMsgTitleText.set({content: title});
    this.#subBlockMsgContent1Text.set({content: content1});
    this.#subBlockMsgContent2Text.set({content: content2});
  }

  /*
   * Dispose the object 
   */
  dispose() {
    // Resets the references to others objects
    this.world3d = null;
    this.hud = null;
    this.#subBlock1 = null;
    this.#subBlockMsgContent1 = null;
    this.#subBlockMsgContent1Text = null;
    this.#subBlockMsgContent2 = null;
    this.#subBlockMsgContent2Text = null;
    this.#progressBars = [];
    this.#fromBlockText = null;
    this.#toBlockText = null;
  }

}

export { HUDLeftScreen };
