/**
 * GLOBAL VARIABLES
 */

// Ordered list of pages
var pages = [
  '#home',
  '#configurator',
  '#explore',
  '#tell',
  '#shape',
  '#atlas',
  '#world3d',
  '#credits'
];

var appVersion; 

var loadedPages = [];

var initializedPages = [];

// Mapping of scripts associated to pages
var pageScripts = new Map();

// Mapping of scripts associated to components
var componentScripts = new Map();

// DataStore
var dataStore = null;



/*
 * PAGES LOADING AND NAVIGATIONS
 */
function goToPage(page) {
  const activePage = sessionStorage.getItem('activePage');
  document.querySelector(activePage).classList.remove('active');
  sessionStorage.setItem('activePage', page);
  document.querySelector(page).classList.add('active');
  setPagesVisibility();
  const path = page.substring(1);
  if (path != 'world3d') {
    window.history.pushState({}, path, window.location.origin + '/' + 'index.html?p=' + path);        
  }
  includeHTML(() => {
    const pageScript = pageScripts.get(page);
    if (pageScript) {
      preparePage();
    }
  });
  window.scrollTo(0, 0);
}

function setPagesVisibility() {
  const activePage = sessionStorage.getItem('activePage');
  for (let idxPage in pages) {
    const page = pages[idxPage];
    if (page === activePage) {
      document.querySelector(page).removeAttribute('hidden');
    } else {
      document.querySelector(page).setAttribute('hidden', '');
    }
  }
}

function preparePage() {
  const activePage = sessionStorage.getItem('activePage');
  if (pageScripts.has(activePage)) {
    if (!initializedPages.includes(activePage)) {
      pageScripts.get(activePage).initPage();
      initializedPages.push(activePage);
    }
    pageScripts.get(activePage).preparePage();
  }
  for (let [_, componentScript] of componentScripts) {
    componentScript.refresh();
  } 
}

/*
 * Loads html code snippets
 */
async function includeHTML(cb) {
  const includes = document.querySelectorAll('[data-include-html]');
  const promises = [];
  for (const include of includes) {
    const file = include.getAttribute('data-include-html');
    if (file && !include.hidden && !loadedPages.includes(file)) {
      promises.push(
        fetch(file).then(response => {
          if (response.ok) {
            return response.text();
          }
          throw new Error('Received invalid response');
        }).then(fileContents => {
          loadedPages.push(file);
          include.innerHTML = fileContents;
          include.removeAttribute('data-include-html');
          return includeJs(include);
        })
      );
    }
  }
  await Promise.all(promises);
  if (cb) 
    cb();
}

/*
 * Loads js code snippets
 */
async function includeJs(element) {
  const includes = element.querySelectorAll('script[data-include-js]');
  const promises = [];
  for (const include of includes) {
    const file = include.getAttribute('data-include-js');
    if (file) {
      promises.push(
        import(file)
      );
    }
  }
  return await Promise.all(promises);
}

/*
 * Loads js code snippets
 */
function waitForElement(querySelector, timeout=0) {
  const startTime = new Date().getTime();
  return new Promise((resolve, reject) => {
    const timer = setInterval(() => {
      const now = new Date().getTime();
      if (document.querySelector(querySelector)) {
        clearInterval(timer);
        resolve();
      } else if (timeout && now - startTime >= timeout) {
        clearInterval(timer);
        reject();
      }
    }, 100);
  });
}
