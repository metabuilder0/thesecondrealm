const exploreScript = {

  initPage: () => {
    // Sets the event handlers
    document.querySelector('#atlas-link2').addEventListener(
      'click', (e) => {
        e.preventDefault();
        goToPage('#atlas');
      }
    );
    document.querySelector('#atlas-link3').addEventListener(
      'click', (e) => {
        e.preventDefault();
        goToPage('#atlas');
      }
    );
  },

  preparePage: () => {
    //
  },

};

pageScripts.set('#explore', exploreScript);
