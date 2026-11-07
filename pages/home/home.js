const homeScript = {

  initPage: () => {
    // Sets the event handlers
    document.querySelector('#here-link').addEventListener(
      'click', (e) => {
        e.preventDefault();
        goToPage('#explore');
      }
    );

    document.querySelector('#explorer-link').addEventListener(
      'click', (e) => {
        e.preventDefault();
        goToPage('#explore');
      }
    );

    document.querySelector('#builder-link').addEventListener(
      'click', (e) => {
        e.preventDefault();
        goToPage('#configurator');
      }
    );

    document.querySelector('#teller-link').addEventListener(
      'click', (e) => {
        e.preventDefault();
        goToPage('#tell');
      }
    );

    document.querySelector('#landscaper-link').addEventListener(
      'click', (e) => {
        e.preventDefault();
        goToPage('#shape');
      }
    );

    document.querySelector('#geograph-link').addEventListener(
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

pageScripts.set('#home', homeScript);
