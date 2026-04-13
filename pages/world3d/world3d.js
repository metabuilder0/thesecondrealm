import * as data from '/js/modules/data/data-constants.js';
import { World3D } from '/js/modules/3d/world3d.js';
import { PointsCloudData } from '/js/modules/data/points-cloud-data.js';
import { SceneParams } from '/js/modules/data/scene-params.js';
import { getRandomSong } from '/js/modules/data/music-constants.js'


const world3dScript = {

  /*
   * Attributes
   */

  // Mapping Id Series => label series
  series: {},
  
  // World3D component
  world3d: null,

  // Tour type
  tourType: null,


  /*
   * Initialize the page
   */
  initPage: () => {
    // Sets the event handlers

    // Buttons
    document.querySelector('#start-immersion-btn').addEventListener(
      'click', async () => { await world3dScript.confirmImmersion(); }
    );

    document.querySelector('#cancel-btn').addEventListener(
      'click', () => { window.location.href='https://www.federalreserve.gov/'; }
    );

    document.querySelector('#back-btn').addEventListener(
      'click', () => { window.history.back(); }
    );

    document.querySelector('#back-btn2').addEventListener(
      'click', () => { window.history.back(); }
    );
  },

  /**
   * Prepare the page
   */
  preparePage: async () => {
    // Checks if webxr is supported by the browser
    if (!navigator.xr) {
      world3dScript.showDiv('#webxr-not-suppported');
      return;
    }
    // Retrieves the scene params
    const sceneParams = SceneParams.fromJSON(sessionStorage.getItem('sceneParams'));
    if (sceneParams == null) return;
    // Displays a loading message 
    world3dScript.setLoadingMessage('LOADING');
    world3dScript.showDiv('#loading');
    // Preloads the data series
    await world3dScript.loadDataSeries(sceneParams);
    // Checks the active mode (builder/explorer)
    // and starts the immersion or asks for a confirmation
    if (sceneParams.mode == SceneParams.MODE_BUILDER) {
      await world3dScript.confirmImmersion();
    } else {
      world3dScript.setLocationName(sceneParams.name);
      world3dScript.showDiv('#confirm-teleport');
    }
  },

  /*
   * Start the immersion
   */
  startImmersion: async () => {
    // Displays a loading message
    world3dScript.setLoadingMessage('LOADING SCENE PARAMETERS');
    world3dScript.showDiv('#loading');
    // Loads scene parameters from session
    const sceneParams = SceneParams.fromJSON(sessionStorage.getItem('sceneParams'));
    if (sceneParams == null) return;
    // Initializes the tour type
    world3dScript.tourType = await world3dScript.getTourType(sceneParams);
    // Initializes a World component
    world3dScript.showDiv('#container');
    let gridContainer = document.getElementById('container');
    world3dScript.world3d = new World3D(
      gridContainer, 
      world3dScript.tourType,
      sceneParams.boundaries
    );
    world3dScript.world3d.xrManager.addEventListener(
      'sessionend', 
      world3dScript.endImmersion.bind(world3dScript)
    );
    // Loads the World3d
    world3dScript.loadScene(sceneParams);
  },

  /*
   * Extracts the tourType from sceneParams
   */
  getTourType: async (sceneParams) => {
    let tourType = null;
    if (sceneParams.tour) {
      const tourDescriptor = await dataStore.getTourDescriptorFile(sceneParams.tour);
      if (tourDescriptor) {
        tourType = tourDescriptor['type'];
      }
    }
    return tourType
  },

  /*
   * Confirm immersion 
   * (wrapper for startImmersion() in explorer mode)
   */
  confirmImmersion: async () => {
    world3dScript.setLocationName('');
    await world3dScript.startImmersion();
  },


  /* 
   * Load initial data
   */
  loadDataSeries: async (sceneParams) => {
    try {
      world3dScript.setLoadingMessage('LOADING DATA SERIES');
      return Promise.all([
        dataStore.getSeries('index'),
        dataStore.getSeries('time'),
        dataStore.getSeries(sceneParams.seriesX),
        dataStore.getSeries(sceneParams.seriesY),
        dataStore.getSeries(sceneParams.seriesZ)
      ]);
    } catch (e) {
      if (!(e instanceof Error)) {
        e = new Error(e);
      }
      world3dScript.setErrorMessage(`${e.message}`);
      world3dScript.showDiv('#error');
      throw e;
    }
  },


  /*
   * Load the 3d scene
   */
  loadScene: async (sceneParams) => {
    let seriesH, seriesT, seriesX, seriesY, seriesZ;

    const song = (sceneParams.song != 'null') ? sceneParams.song : getRandomSong();

    const displayMode = sceneParams.timelapseMode ? World3D.DISPLAY_MODE_ANIMATION : World3D.DISPLAY_MODE_STATIC;

    [seriesH, seriesT, seriesX, seriesY, seriesZ] = await world3dScript.loadDataSeries(sceneParams);
    
    const pointsCloudData = new PointsCloudData(
      sceneParams.seriesX, sceneParams.seriesY, sceneParams.seriesZ,
      seriesH, seriesT, seriesX, seriesY, seriesZ,
      sceneParams.scaleX, sceneParams.scaleY, sceneParams.scaleZ,
      sceneParams.filterMinH, sceneParams.filterMaxH,
      sceneParams.filterMinX, sceneParams.filterMaxX,
      sceneParams.filterMinY, sceneParams.filterMaxY,
      sceneParams.filterMinZ, sceneParams.filterMaxZ,
    );
    
    world3dScript.world3d.displayPointsCloud(pointsCloudData, displayMode);
    
    if (sceneParams.mode == SceneParams.MODE_BUILDER) {
    //if (true) {
      world3dScript.world3d.immersionModeActivated = true;     
      
      world3dScript.world3d.camera.moveTo(
        sceneParams.position, 
        sceneParams.rotation
      );

      world3dScript.world3d.hud.activate();
      
      world3dScript.world3d.soundSystem.loadMusic(song);

      if (sceneParams.tour) {
        world3dScript.world3d.initTour();
        world3dScript.world3d.startTour(sceneParams.tour);
      }

    } else {
      await world3dScript.world3d.soundSystem.playIntro(async () => {
        world3dScript.world3d.immersionModeActivated = true;

        world3dScript.world3d.camera.moveTo(
          sceneParams.position, 
          sceneParams.rotation
        );

        world3dScript.world3d.hud.activate();

        setTimeout(() => {
          world3dScript.world3d.soundSystem.loadMusic(song);
          
          if (sceneParams.tour) {
            world3dScript.world3d.initTour();
            world3dScript.world3d.startTour(sceneParams.tour);
          }
        }, 20); 
      });
    }
  },

  /*
   * End the immersion
   */
  endImmersion: () => {
    world3dScript.world3d.xrManager.removeEventListener(
      'sessionend', 
      world3dScript.endImmersion.bind(world3dScript)
    );
    world3dScript.world3d.dispose();
    world3dScript.world3d = null;
    goToPage('#configurator');
  },

  /*
   * Show a specific div
   */
  showDiv: (div) => {
    const divs = [
      '#container',
      '#loading',
      '#confirm-teleport',
      '#webxr-not-suppported',
      '#error'
    ]
    for (let d of divs) {
      document.querySelector(d).setAttribute('hidden', '');
      document.querySelector(d).style.display = 'none';
    }
    document.querySelector(div).removeAttribute('hidden');
    document.querySelector(div).style.display = (div != '#container') ? 'flex' : 'block';
  },

  /*
   * Set location name
   */
  setLocationName: (name) => {
    document.querySelector('#location-span').textContent = name;
  },

  /*
   * Set loading message
   */
  setLoadingMessage: (msg) => {
    document.querySelector('#loading-span').textContent = msg;
  },

  /*
   * Set error message
   */
  setErrorMessage: (msg) => {
    document.querySelector('#error-span').textContent = msg;
  },


};

pageScripts.set('#world3d', world3dScript);
