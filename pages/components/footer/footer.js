const footerScript = {

  initComponent: () => {
    // Initializes event handlers
    document.querySelector('#credits-link').addEventListener(
      'click', (e) => {
        e.preventDefault();
        goToPage('#credits');
      }
    );
    // Displays version
    const version = sessionStorage.getItem('appVersion')
      ? sessionStorage.getItem('appVersion')
      : '0.1-a.1';
    document.querySelector('#version-span').textContent = `VERSION ${version}`;
    
  },

  /*
   * Refreshes the component when active page change
   */
  refresh: () => {},

};

componentScripts.set('#footer', footerScript);

waitForElement("#p2prights-link", 1000).then(() => {
  footerScript.initComponent();
}).catch(() => {});
