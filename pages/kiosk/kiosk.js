const kioskScript = {

  /*
   * Constants
   */

  NB_CARDS_PER_ROW: 3,

  SECTIONS: [
    '#kiosk-div1',
    '#kiosk-div2',
    '#kiosk-div3',
    '#kiosk-div4'
  ],


  /*
   * Attributes
   */

  // Flag indicating if section 2 should be displayed
  _showIntroSection: false,

  // Flag indicating if section 3 should be displayed
  _showNavigationSection: false,

  // Timer id
  _timeoutId: null,


  /**
   * Init the page
   */
  initPage: () => {
    // Sets the event handlers
    document.querySelector('#enter-tsr-btn').addEventListener(
      'click', (e) => {
        e.preventDefault();
        if (kioskScript._showIntroSection) {
          kioskScript.goToSection('#kiosk-div2');
        } else if (kioskScript._showNavigationSection) {
          kioskScript.goToSection('#kiosk-div3');
        } else {
          kioskScript.goToSection('#kiosk-div4');
        }
      }
    );

    document.querySelector('#next-btn').addEventListener(
      'click', (e) => {
        e.preventDefault();
        if (kioskScript._showNavigationSection) {
          kioskScript.goToSection('#kiosk-div3');
        } else {
          kioskScript.goToSection('#kiosk-div4');
        }
      }
    );
    
    document.querySelector('#prev-btn').addEventListener(
      'click', (e) => {
        e.preventDefault();
        kioskScript.goToSection('#kiosk-div1');
      }
    );
    
    document.querySelector('#next2-btn').addEventListener(
      'click', (e) => {
        e.preventDefault();
        kioskScript.goToSection('#kiosk-div4');
      }
    );
    
    document.querySelector('#prev2-btn').addEventListener(
      'click', (e) => {
        e.preventDefault();
        if (kioskScript._showIntroSection) {
          kioskScript.goToSection('#kiosk-div2');
        } else {
          kioskScript.goToSection('#kiosk-div1');
        }
      }
    );
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
    // Sets the active section to home if no active section defined 
    if (!sessionStorage.getItem('sectionKiosk')) {
      sessionStorage.setItem('sectionKiosk', '#kiosk-div1');
    }
    // Shows home
    kioskScript.goToSection(sessionStorage.getItem('sectionKiosk'));
  },

  /**
   * Set section visibility
   */
  setSectionsVisibility: () => {
    const activeSection = sessionStorage.getItem('sectionKiosk');
    for (let idxSection in kioskScript.SECTIONS) {
      const section = kioskScript.SECTIONS[idxSection];
      if (section === activeSection) {
        document.querySelector(section).removeAttribute('hidden');
      } else {
        document.querySelector(section).setAttribute('hidden', '');
      }
    }
  },

  /**
   * Go to a section
   */
  goToSection: (section) => {
    sessionStorage.setItem('sectionKiosk', section);
    kioskScript.setSectionsVisibility();
    // Clears the timeout
    kioskScript.clearInactivityTimeout();
    // Sets the inactivity timeout
    if (section != '#kiosk-div1') {
      kioskScript._timeoutId = setTimeout(() => {
        kioskScript.goToSection('#kiosk-div1');
      }, 60000);
    }
  },

  /**
   * Clear inactivity timeout
   */
  clearInactivityTimeout: () => {
    if (kioskScript._timeoutId != null) {
      clearTimeout(kioskScript._timeoutId);
      kioskScript._timeoutId = null;
    }
  },

  /**
   * Load the kiosk
   */
  loadKiosk: async () => {
    const kioskUrl = sessionStorage.getItem('urlKiosk');
    if (!kioskUrl) return;
    
    const kioskDescriptor = await dataStore.getKioskDescriptorFile(kioskUrl);
    if (!kioskDescriptor) return;

    const collections = kioskDescriptor['collections'];
    if (collections.length == 0) return;

    document.querySelector('#title-h1').innerHTML = kioskDescriptor['title'];
    document.querySelector('#desc-p').innerHTML = kioskDescriptor['text_intro'];
    const bckgd = `url(${kioskDescriptor['visual']})`;
    document.querySelector('#kiosk-section2').style.backgroundImage = bckgd;
    document.querySelector('#kiosk-section3').style.backgroundImage = bckgd;
    document.querySelector('#kiosk-section4').style.backgroundImage = bckgd;

    if (Object.hasOwn(kioskDescriptor, 'show_introduction_page')) {
      kioskScript._showIntroSection = kioskDescriptor['show_introduction_page']
    }

    if (Object.hasOwn(kioskDescriptor, 'show_navigation_page')) {
      kioskScript._showNavigationSection = kioskDescriptor['show_navigation_page']
    }

    for (let collection of collections) {
      kioskScript.loadCollection(collection);
    }
  },


  loadCollection: (collection) => {
    const realms = collection['realms'];
    if (realms.length == 0) return;

    const nbLines = Math.floor(realms.length / kioskScript.NB_CARDS_PER_ROW);
    const nbRealmsLastLine = realms.length % kioskScript.NB_CARDS_PER_ROW;

    // Adds Title and description if needed
    if (Object.hasOwn(collection, 'title') || Object.hasOwn(collection, 'desc')) {
      const level1Div = document.createElement('div');
      level1Div.setAttribute('class', 'level1');
      
      if (Object.hasOwn(collection, 'title')) {
        const titleH2 = document.createElement('h2');
        titleH2.setAttribute('class', 'title');
        titleH2.innerHTML = collection['title'];
        level1Div.appendChild(titleH2);
      }

      if (Object.hasOwn(collection, 'desc')) {
        const descP = document.createElement('p');
        descP.setAttribute('class', 'note');
        descP.innerHTML = collection['desc'];
        level1Div.appendChild(descP);
      }
      document.querySelector('#kiosk-section4').appendChild(level1Div);
    }

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
      document.querySelector('#kiosk-section4').appendChild(rowDiv);
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
      for (let j=0; j < kioskScript.NB_CARDS_PER_ROW - nbRealmsLastLine; j++) {
        const cardDiv = document.createElement('div');
        cardDiv.setAttribute('class', 'card');
        cardDiv.style.visibility = 'hidden';
        rowDiv.appendChild(cardDiv);
      }

      document.querySelector('#kiosk-section4').appendChild(rowDiv);
    }
  },

  createCard: (name, desc, url, visual) => {
    const cardDiv = document.createElement('div');
    cardDiv.setAttribute('class', 'card');

    const visualDiv = document.createElement('div');
    visualDiv.setAttribute('class', 'visual');
    visualDiv.style.backgroundImage = `url(${visual})`;
    
    const hlink = document.createElement('a');
    hlink.addEventListener('click', () => {
      kioskScript.clearInactivityTimeout();
    });
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
