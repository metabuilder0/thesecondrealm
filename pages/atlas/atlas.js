const atlasScript = {

  initPage: () => {
    //
  },

  preparePage: () => {
    // Sets default app mode to web
    sessionStorage.setItem('appMode', APP_MODE_WEB);
  },

};

pageScripts.set('#atlas', atlasScript);
