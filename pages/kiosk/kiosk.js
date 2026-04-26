const kioskScript = {

  /*
   * Constants
   */

  NB_CARDS_PER_ROW: 3,


  /**
   * Init the page
   */
  initPage: () => {
    //
  },

  /**
   * Prepare the page
   */
  preparePage: async () => {
    // Sets app mode to kiosk
    sessionStorage.setItem('appMode', APP_MODE_KIOSK);
    // Uses default kiosk if no kiosk defined
    if (!sessionStorage.getItem('urlKiosk')) {
      sessionStorage.setItem('urlKiosk', '/static/kiosks/default.json');
    }
    // Loads the kiosk
    await kioskScript.loadKiosk();
  },

  /**
   * Load the kiosk
   */
  loadKiosk: async () => {
    const kioskUrl = sessionStorage.getItem('urlKiosk');
    if (!kioskUrl) return;
    
    const kioskDescriptor = await dataStore.getKioskDescriptorFile(kioskUrl);
    if (!kioskDescriptor) return;

    const realms = kioskDescriptor['realms'];
    if (realms.length == 0) return;

    document.querySelector('#title-h1').innerHTML = kioskDescriptor['title'];
    document.querySelector('#desc-p').innerHTML = kioskDescriptor['text_intro'];
    document.querySelector('#kiosk-section1').style.backgroundImage = `url(${kioskDescriptor['visual']})`;

    const nbLines = Math.floor(realms.length / kioskScript.NB_CARDS_PER_ROW);
    const nbRealmsLastLine = realms.length % kioskScript.NB_CARDS_PER_ROW;

    // Adds nbLines lines of realms
    for (let i=0; i < nbLines; i++) {
      const rowDiv = document.createElement('div');
      rowDiv.setAttribute('class', 'row');
      for (let j=0; j < kioskScript.NB_CARDS_PER_ROW; j++) {
        const idxRealm = i * kioskScript.NB_CARDS_PER_ROW + j;
        const realm = realms[idxRealm];
        const cardDiv = kioskScript.createCard(
          realm['name'],
          realm['desc'],
          realm['url'],
          realm['visual']
        );
        rowDiv.appendChild(cardDiv);
      }
      document.querySelector('#kiosk-section2').appendChild(rowDiv);
    }
    
    // Adds the last line of realms
    if (nbRealmsLastLine > 0) {
      const rowDiv = document.createElement('div');
      rowDiv.setAttribute('class', 'row');
      for (let j=0; j < nbRealmsLastLine; j++) {
        const idxRealm = nbLines * kioskScript.NB_CARDS_PER_ROW + j;
        const realm = realms[idxRealm];
        const cardDiv = kioskScript.createCard(
          realm['name'],
          realm['desc'],
          realm['url'],
          realm['visual']
        );
        rowDiv.appendChild(cardDiv);
      }
      document.querySelector('#kiosk-section2').appendChild(rowDiv);
    }
  },

  createCard: (name, desc, url, visual) => {
    const cardDiv = document.createElement('div');
    cardDiv.setAttribute('class', 'card');

    const visualDiv = document.createElement('div');
    visualDiv.setAttribute('class', 'visual');
    visualDiv.style.backgroundImage = `url(${visual})`;
    
    const hlink = document.createElement('a');
    hlink.setAttribute('href', url);
    hlink.innerHTML = name;
    visualDiv.appendChild(hlink);
    
    const descDiv = document.createElement('div');
    descDiv.setAttribute('class', 'desc');
    descDiv.innerHTML = desc;
    
    cardDiv.appendChild(visualDiv);
    cardDiv.appendChild(descDiv);
    return cardDiv
  }

};

pageScripts.set('#kiosk', kioskScript);
