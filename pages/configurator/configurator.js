import '/js/libs/plotly/plotly-2.29.1.min.js';
import * as data from '/js/modules/data/data-constants.js';
import { SceneParams } from '/js/modules/data/scene-params.js';
import { POS_PREDEFINED } from '/js/modules/data/positions-constants.js';
import { SONGS } from '/js/modules/data/music-constants.js'


const configScript = {

  /*
   * Constants
   */

  // Social networks
  TWITTER: 0,
  FACEBOOK: 1,
  REDDIT: 2,

  // Axes
  X_AXIS: 'X',
  Y_AXIS: 'Y',
  Z_AXIS: 'Z',


  /**
   * Attributes 
   */
  
  seriesList: [],


  /*
   * Page initialization
   */
  initPage: () => {

    // Initializes the drop-downs listing data series
    configScript.seriesList = data.initializeSeriesOptions();

    const selectsList = [
      document.querySelector('#seriesX-select'),
      document.querySelector('#seriesY-select'),
      document.querySelector('#seriesZ-select')
    ];

    for (let serie of configScript.seriesList) {
      for (let select of selectsList) {
        const option = document.createElement('option');
        option.value = serie.value;
        option.text = serie.text;
        if (serie.value == data.DATA_NONE) {
          option.disabled = true;
        }
        select.appendChild(option);
      }
    }

    // Initializes the drop-downs listing the scales for each axis
    const scalesList = [
      document.querySelector('#scaleX-select'),
      document.querySelector('#scaleY-select'),
      document.querySelector('#scaleZ-select')
    ];

    for (let select of scalesList) {
      const option = document.createElement('option');
      option.value = data.SCALE_LIN;
      option.text = data.SERIES_LABELS[data.SCALE_LIN];
      select.appendChild(option);

      const option2 = document.createElement('option');
      option2.value = data.SCALE_LOG;
      option2.text = data.SERIES_LABELS[data.SCALE_LOG];
      select.appendChild(option2);
    }

    // Initializes the drop-downs listing the predefined positions
    const positionSelect = document.querySelector('#position-select');
    Object.keys(POS_PREDEFINED).forEach( (k, _) => {
      const option = document.createElement('option');
      option.value = k;
      option.text = k;
      positionSelect.appendChild(option);
    });

    // Initializes the drop-downs listing the songs
    const musicSelect = document.querySelector('#music-select');
    Object.keys(SONGS).forEach( (k, _) => {
      const option = document.createElement('option');
      option.value = SONGS[k];
      option.text = k;
      musicSelect.appendChild(option);
    });

    // Sets the event handlers

    // Buttons
    document.querySelector('#enter-vr-btn').addEventListener(
      'click', () => { configScript.openVR(); }
    );

    document.querySelector('#shift-axes-btn').addEventListener(
      'click', () => { configScript.shiftAxesOrder(); }
    );

    document.querySelector('#random-metrics-btn').addEventListener(
      'click', () => { configScript.selectRandomMetrics(); }
    );

    document.querySelector('#generate-url-btn').addEventListener(
      'click', () => { configScript.copyUrlToClipboard(); }
    );

    document.querySelector('#twitter-btn').addEventListener(
      'click', () => { configScript.shareOnSocialNetwork(configScript.TWITTER); }
    );

    document.querySelector('#facebook-btn').addEventListener(
      'click', () => { configScript.shareOnSocialNetwork(configScript.FACEBOOK); }
    );

    document.querySelector('#reddit-btn').addEventListener(
      'click', () => { configScript.shareOnSocialNetwork(configScript.REDDIT); }
    );
    
    // Drop-down lists
    document.querySelector('#seriesX-select').addEventListener(
      'change', () => { configScript.onSeriesChange(configScript.X_AXIS); }
    );

    document.querySelector('#seriesY-select').addEventListener(
      'change', () => { configScript.onSeriesChange(configScript.Y_AXIS); }
    );
    
    document.querySelector('#seriesZ-select').addEventListener(
      'change', () => { configScript.onSeriesChange(configScript.Z_AXIS); }
    );

    document.querySelector('#scaleX-select').addEventListener(
      'change', () => { configScript.onSeriesChange(configScript.X_AXIS); }
    );

    document.querySelector('#scaleY-select').addEventListener(
      'change', () => { configScript.onSeriesChange(configScript.Y_AXIS); }
    );
    
    document.querySelector('#scaleZ-select').addEventListener(
      'change', () => { configScript.onSeriesChange(configScript.Z_AXIS); }
    );

    document.querySelector('#music-select').addEventListener(
      'change', () => { configScript.onMusicChange(); }
    );

    document.querySelector('#position-select').addEventListener(
      'change', () => { configScript.onPositionChange(); }
    );
  },

  /*
   * Page preparation
   */
  preparePage: () => {
    // Loads SceneParams attributes in UI
    const sceneParams = SceneParams.fromJSON(sessionStorage.getItem('sceneParams'));
    if (sceneParams != null) {
      configScript.loadSceneParamsToUI(sceneParams);
      document.querySelector('#build-section2').scrollIntoView();
    }
  },

  /*
   * Enter the VR scene 
   */
  openVR: () => {
    // Stores the parameters of the scene in session
    let sceneParams = configScript.buildSceneParamsObject();
    sceneParams.mode = SceneParams.MODE_BUILDER;
    sessionStorage.setItem('sceneParams', sceneParams.toJSON());
    goToPage('#world3d');
  },

  /**
   * Build a SceneParams object
   * with parameters selected by the user
   */
  buildSceneParamsObject: () => {
    const name = document.querySelector('#name-input').value;

    const serieX = document.querySelector('#seriesX-select').value;
    const serieY = document.querySelector('#seriesY-select').value;
    const serieZ = document.querySelector('#seriesZ-select').value;
    
    const scaleX = document.querySelector('#scaleX-select').value;
    const scaleY = document.querySelector('#scaleY-select').value;
    const scaleZ = document.querySelector('#scaleZ-select').value;

    let filterMinH = Number.NEGATIVE_INFINITY,
        filterMaxH = Number.POSITIVE_INFINITY,
        filterMinX = 0,
        filterMaxX = Number.POSITIVE_INFINITY,
        filterMinY = 0,
        filterMaxY = Number.POSITIVE_INFINITY,
        filterMinZ = 0,
        filterMaxZ = Number.POSITIVE_INFINITY;
    
    const minH = document.querySelector('#filterMinH-input').value;
    if (configScript.isInt(minH)) {
      filterMinH = parseInt(minH);
    }

    const maxH = document.querySelector('#filterMaxH-input').value;
    if (configScript.isInt(maxH)) {
      filterMaxH = parseInt(maxH);
    }

    if (document.querySelector('#histogramX-div').layout) {
      filterMinX = document.querySelector('#histogramX-div').layout.xaxis.range[0];
      filterMaxX = document.querySelector('#histogramX-div').layout.xaxis.range[1];
    }

    if (document.querySelector('#histogramY-div').layout) {
      filterMinY = document.querySelector('#histogramY-div').layout.xaxis.range[0];
      filterMaxY = document.querySelector('#histogramY-div').layout.xaxis.range[1];
    }
    
    if (document.querySelector('#histogramZ-div').layout) {
      filterMinZ = document.querySelector('#histogramZ-div').layout.xaxis.range[0];
      filterMaxZ = document.querySelector('#histogramZ-div').layout.xaxis.range[1];
    }
    
    const selectedPosition = document.querySelector('#position-select').value;
    let position = [0,0,0];
    let rotation = [0,0,0];

    if (selectedPosition == null) {
      selectedPosition = 'ORIGIN';
      position = POS_PREDEFINED[selectedPosition][0];
      rotation = POS_PREDEFINED[selectedPosition][1];
    }

    try {
      position = document.querySelector('#position-input').value.split(',').map(
        (content, _) => {
          const coord = parseFloat(content.trim());
          if (isNaN(coord)) {
            throw 'coordinate is not a number';
          } else {
            return coord;
          }    
        });
      rotation = document.querySelector('#rotation-input').value.split(',').map(
        (content, _) => {
          const coord = parseFloat(content.trim());
          if (isNaN(coord)) {
            throw 'coordinate is not a number';
          } else {
            return coord;
          }   
        });
    } catch (e) {
      // Invalid position or rotation => Default to origin
      position = POS_PREDEFINED['ORIGIN'][0];
      rotation = POS_PREDEFINED['ORIGIN'][1];
    }

    let selectedSong = document.querySelector('#music-select').value;
    if (selectedSong == 'other') {
      const urlOtherSong = document.querySelector('#music-input').value;
      selectedSong = urlOtherSong ? urlOtherSong : 'null';
    }

    let organizedTourURL = document.querySelector('#organized-tour-url-input').value;
    if (!organizedTourURL) {
      organizedTourURL = '';
    }

    const timelapseMode = document.querySelector('#activate-timelapse-radio').checked;

    const boundaries = document.querySelector('#activate-boundaries-radio').checked;

    const sceneParams = new SceneParams({
      'name': name,
      'seriesX': serieX,
      'seriesY': serieY,
      'seriesZ': serieZ,
      'scaleX': scaleX,
      'scaleY': scaleY,
      'scaleZ': scaleZ,
      'filterMinH': filterMinH,
      'filterMaxH': filterMaxH,
      'filterMinX': filterMinX,
      'filterMaxX': filterMaxX,
      'filterMinY': filterMinY,
      'filterMaxY': filterMaxY,
      'filterMinZ': filterMinZ,
      'filterMaxZ': filterMaxZ,
      'position': position,
      'rotation': rotation, 
      'song': selectedSong,
      'tour': organizedTourURL,
      'timelapseMode': timelapseMode,
      'boundaries': boundaries
    });

    return sceneParams;
  },

  /**
   * Shift the order of the axes
   */
  shiftAxesOrder: () => {
    const seriesX = document.querySelector('#seriesX-select');
    const seriesY = document.querySelector('#seriesY-select');
    const seriesZ = document.querySelector('#seriesZ-select');
    
    const scaleX = document.querySelector('#scaleX-select');
    const scaleY = document.querySelector('#scaleY-select');
    const scaleZ = document.querySelector('#scaleZ-select');

    const tmpSeriesX = seriesX.value,
          tmpScaleX = scaleX.value;
    
    seriesX.value = seriesY.value;
    scaleX.value = scaleY.value;

    seriesY.value = seriesZ.value;
    scaleY.value = scaleZ.value;
    
    seriesZ.value = tmpSeriesX;
    scaleZ.value = tmpScaleX;

    // Refreshes the histograms
    configScript.onSeriesChange(configScript.X_AXIS);
    configScript.onSeriesChange(configScript.Y_AXIS);
    configScript.onSeriesChange(configScript.Z_AXIS);
  },

  /*
   * Select a random metric and a random scale for each axis
   */
  selectRandomMetrics: () => {
    const selectsList = [
      document.querySelector('#seriesX-select'),
      document.querySelector('#seriesY-select'),
      document.querySelector('#seriesZ-select')
    ];
    for (let select of selectsList) {
      let idx;
      do {
        idx = Math.floor(Math.random() * select.options.length); 
        select.selectedIndex = idx;
      } while (select.options[idx].value == data.DATA_NONE);
    }
    configScript.selectedSeriesX = selectsList[0].selectedIndex;
    configScript.selectedSeriesY = selectsList[1].selectedIndex;
    configScript.selectedSeriesZ = selectsList[2].selectedIndex;

    const scalesList = [
      document.querySelector('#scaleX-select'),
      document.querySelector('#scaleY-select'),
      document.querySelector('#scaleZ-select')
    ];
    for (let select of scalesList) {
      const idx = Math.floor(Math.random() * select.options.length); 
      select.selectedIndex = idx;
    }
    configScript.scaleX = scalesList[0].selectedIndex;
    configScript.scaleY = scalesList[1].selectedIndex;
    configScript.scaleZ = scalesList[2].selectedIndex;
    // Refreshes the histograms
    configScript.onSeriesChange(configScript.X_AXIS);
    configScript.onSeriesChange(configScript.Y_AXIS);
    configScript.onSeriesChange(configScript.Z_AXIS);
  },

  /*
   * Copy the URL of the configured scene into the clipboard 
   */
  copyUrlToClipboard: () => {
    const sceneParams = configScript.buildSceneParamsObject();
    if (sceneParams != null) {
      const r = sceneParams.serialize();
      const url = `${window.location.origin}/index.html?r=${r}`;
      navigator.clipboard.writeText(url);
      alert('URL of this realm copied into the clipboard');
    }
  },

  /*
   * Share this realm on Twitter 
   */
  shareOnSocialNetwork: (network) => {
    const sceneParams = configScript.buildSceneParamsObject();
    if (sceneParams != null) {
      const r = sceneParams.serialize();
      const url = `https://thesecondrealm.is/index.html?r=${r}`;
      const text = `ENTER THE SECOND REAM AND COME VISIT ${sceneParams.name.toUpperCase()}`;
      const linkTarget = '_blank';
      const windowOptions = 'menubar=no,status=no,height=750,width=500';
      let targetUrl = '';
      if (network == configScript.TWITTER) {
        targetUrl = `https://twitter.com/intent/tweet/?text=${text}&url=${url}&`;
      } else if (network == configScript.FACEBOOK) {
        targetUrl = `https://www.facebook.com/sharer.php?t=${text}&u=${url}&`;
      } else {
        targetUrl = `https://www.reddit.com/submit?url=${url}&title=${text}&`;
      }
      window.open(targetUrl, linkTarget, windowOptions);
    }
  },

  /*
   * Set the UI with values of a SceneParams object
   */
  loadSceneParamsToUI: (sceneParams) => {
    if (sceneParams != null) {
      document.querySelector('#name-input').value = sceneParams.name;

      document.querySelector('#seriesX-select').value = sceneParams.seriesX;
      document.querySelector('#seriesY-select').value = sceneParams.seriesY;
      document.querySelector('#seriesZ-select').value = sceneParams.seriesZ;

      document.querySelector('#scaleX-select').value = sceneParams.scaleX;
      document.querySelector('#scaleY-select').value = sceneParams.scaleY;
      document.querySelector('#scaleZ-select').value = sceneParams.scaleZ;

      if (sceneParams.position == null) {
        document.querySelector('#position-select').selectedIndex = 0;
      } else {
        let found = false;
        Object.keys(POS_PREDEFINED).forEach(k => {
          if (POS_PREDEFINED[k][0][0] == sceneParams.position[0]
            && POS_PREDEFINED[k][0][1] == sceneParams.position[1]
            && POS_PREDEFINED[k][0][2] == sceneParams.position[2]
            && POS_PREDEFINED[k][1][0] == sceneParams.rotation[0]
            && POS_PREDEFINED[k][1][1] == sceneParams.rotation[1]
            && POS_PREDEFINED[k][1][2] == sceneParams.rotation[2]) {
            document.querySelector('#position-select').value = k;
            found = true;
          }
        });
        if (!found) {
          document.querySelector('#position-select').value = 'OTHER';
          document.querySelector('#position-div').removeAttribute('hidden');
        }
        document.querySelector('#position-input').value = `${sceneParams.position[0]}, ${sceneParams.position[1]}, ${sceneParams.position[2]}`;
        document.querySelector('#rotation-input').value = `${sceneParams.rotation[0]}, ${sceneParams.rotation[1]}, ${sceneParams.rotation[2]}`;
      }

      if (configScript.isInt(sceneParams.filterMinH)) {
        document.querySelector('#filterMinH-input').value = sceneParams.filterMinH;
      }

      if (configScript.isInt(sceneParams.filterMaxH)) {
        document.querySelector('#filterMaxH-input').value = sceneParams.filterMaxH;
      }

      configScript.onSeriesChange(
        configScript.X_AXIS,
        sceneParams.filterMinX,
        sceneParams.filterMaxX
      );

      configScript.onSeriesChange(
        configScript.Y_AXIS,
        sceneParams.filterMinY,
        sceneParams.filterMaxY
      );

      configScript.onSeriesChange(
        configScript.Z_AXIS,
        sceneParams.filterMinZ,
        sceneParams.filterMaxZ
      );

      document.querySelector('#music-select').value = 'null';
      document.querySelector('#music-input').value = '';
      if (sceneParams.song != 'null') {
        Object.keys(SONGS).forEach( (k, _) => {
          if (SONGS[k] == sceneParams.song) {
            document.querySelector('#music-select').value = sceneParams.song;
          }
        });
        if (document.querySelector('#music-select').value == 'null') {
          document.querySelector('#music-select').value = 'other';
          document.querySelector('#music-input').value = sceneParams.song;
          document.querySelector('#music-input').removeAttribute('hidden');
        }
      }
      
      if (sceneParams.tour != null) {
        document.querySelector('#organized-tour-url-input').value = sceneParams.tour;
      }

      if (sceneParams.timelapseMode != null) {
        if (sceneParams.timelapseMode) {
          document.querySelector('#activate-timelapse-radio').checked = true;
        } else {
          document.querySelector('#deactivate-timelapse-radio').checked = true;
        }
      }

      if (sceneParams.boundaries != null) {
        if (sceneParams.boundaries) {
          document.querySelector('#activate-boundaries-radio').checked = true;
        } else {
          document.querySelector('#deactivate-boundaries-radio').checked = true;
        }
      }
    }
  },

  onSeriesChange: async (axis, minRange=null, maxRange=null) => {
    const seriesFieldName = `#series${axis}-select`;
    const scaleFieldName = `#scale${axis}-select`;
    const divName = `histogram${axis}-div`;

    const series = document.querySelector(seriesFieldName).value;
    const scale = document.querySelector(scaleFieldName).value;
    const seriesData = (await dataStore.getSeries(series)).slice();
    let seriesDataFiltered = [];
    
    if (scale == data.SCALE_LIN) {
      seriesDataFiltered = seriesData;
    } else {
      for (let i in seriesData) {
        if (seriesData[i] != 0) {
          seriesDataFiltered.push(Math.log10(seriesData[i]));
        }
      }
    }
    
    const trace = {
      x: seriesDataFiltered,
      nbinsx: 200, 
      type: 'histogram',
    };
    
    const layout = {
      showlegend: false,
      margin: { b: 0, l: 0, r: 0, t: 0 },
      plot_bgcolor: '#12171a',
      paper_bgcolor: '#12171a',
      colorway: ['#025452', '#02b9b7', '#0eb1c0', '#0d9595', '#0b5556'],
      xaxis: {
        rangeslider: {},
        range: [minRange, maxRange]
      },
    };
    
    const config = { displayModeBar: false };

    try {
      Plotly.deleteTraces(divName, 0);
    } catch {}

    Plotly.newPlot(divName, [trace], layout, config);
  },

  /*
   * Check if a given value represents an integer
   */
  isInt: (value) => {
    return !isNaN(value) && 
      parseInt(Number(value)) == value && 
      !isNaN(parseInt(value, 10));
  },

  onMusicChange: () => {
    const selectedSong = document.querySelector('#music-select').value;
    if (selectedSong == 'other') {
      document.querySelector('#music-input').removeAttribute('hidden');
    } else {
      document.querySelector('#music-input').setAttribute('hidden', '');
    }
  },

  onPositionChange: () => {
    const selectedPosition = document.querySelector('#position-select').value;
    if (selectedPosition == 'OTHER') {
      document.querySelector('#position-input').value = '';
      document.querySelector('#rotation-input').value = '';
      document.querySelector('#position-div').removeAttribute('hidden');
    } else {
      document.querySelector('#position-div').setAttribute('hidden', '');
      document.querySelector('#position-input').value = POS_PREDEFINED[selectedPosition][0];
      document.querySelector('#rotation-input').value = POS_PREDEFINED[selectedPosition][1];
    }
  },

}

pageScripts.set('#configurator', configScript);

