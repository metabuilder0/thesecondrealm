import { SceneParams } from "/js/modules/data/scene-params.js"; 
import { DataStore } from "/js/modules/data/data-store.js";


/*
 * Directly load a World3d passed in URL params 
 */
function openWorld3d(param) {
  let sceneParams = SceneParams.unserialize(param);
  sceneParams.mode = SceneParams.MODE_EXPLORER;
  if (sceneParams != null) {
    sessionStorage.setItem('sceneParams', sceneParams.toJSON());
    goToPage('#world3d');
  }
}

/*
 * UI INITIALIZATION
 */

function _initPages() {
  document.querySelector('#top-container').removeAttribute('hidden');
}

function initPages() {
  includeHTML(_initPages);
}



(() => {
  console.log('Start initialization');
  // Initializes the DataStore (global variable)
  dataStore = new DataStore();
  // Compares app version of loaded html with cached version
  const cachedVersion = sessionStorage.getItem('appVersion');
  if (cachedVersion != appVersion) {
    // Different versions => Clears the cache and reloads the app
    sessionStorage.setItem('appVersion', appVersion);
    window.location.reload(true);
  }
  // Sets default page
  sessionStorage.setItem('activePage', '#home');
  // Resets the scene params stored in session
  sessionStorage.setItem('sceneParams', null);
  // Inits the pages
  initPages();
  // Detects URL parameter
  const urlParams = new URLSearchParams(window.location.search);
  const p = urlParams.get('p');
  const r = urlParams.get('r');
  if (r != null) {
    openWorld3d(r);
  } else if (p != null) {
    goToPage('#'+p);
  } else {
    goToPage('#home');
  }
  console.log('End initialization');
})();
