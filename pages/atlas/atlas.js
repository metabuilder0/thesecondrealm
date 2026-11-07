const atlasScript = {

  initPage: () => {
    // Sets the event handlers
    document.querySelectorAll('#atlas-section2 .card[data-href]').forEach((card) => {
      card.addEventListener('click', () => {
        window.location.href = card.getAttribute('data-href');
      });
    });
  },

  preparePage: () => {
    // Sets default app mode to web
    sessionStorage.setItem('appMode', APP_MODE_WEB);
  },

};

pageScripts.set('#atlas', atlasScript);
