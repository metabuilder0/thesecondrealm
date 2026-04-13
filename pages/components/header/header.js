const headerScript = {
  pages: ['#home', '#explore', '#configurator', '#tell', '#shape', '#atlas'],

  initComponent: () => {
    // Sets the event handlers
    for (let page of headerScript.pages) {
      const link = page + '-link';
      document.querySelector(link).addEventListener('click', (e) => {
        e.preventDefault();
        goToPage(page);
      });
    }
  },

  /*
   * Refreshes the component when active page change
   */
  refresh: () => {
    const activePage = sessionStorage.getItem('activePage');
    // Don't display the header on the home page
    if (activePage == '#home' || activePage == '#world3d') {
      document.querySelector('#header').setAttribute('hidden', '');
    } else {
      document.querySelector('#header').removeAttribute('hidden');
    }
    // Hide the link corresponding to the active page
    for (let page of headerScript.pages) {
      const link = page + '-link';
      if (activePage == page) {
        document.querySelector(link).setAttribute('hidden', '');
      } else {
        document.querySelector(link).removeAttribute('hidden');
      }
    }
  },
};

componentScripts.set('#header', headerScript);

waitForElement('#shape-link', 1000)
  .then(() => {
    headerScript.initComponent();
  })
  .catch(() => {});
