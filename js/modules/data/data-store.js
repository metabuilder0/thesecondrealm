import '/js/libs/d3/d3.v7.min.js';


class DataStore {

  /*
   * Constants
   */

  static URI_DATA_SOURCE = 'https://thesecondrealm.is/static/data/';

  /*
   * Attributes 
   */

  // Size of the cache
  #cacheSize = 3;

  // Cache storing downloaded data series
  #cache = {};

  // Queue storing the ids of the cached items
  #queue = [];


  /*
   * Constructor
   */
  constructor(cacheSize) {
    if (cacheSize) {
      this.#cacheSize = cacheSize;
    }
  }

  /* 
   * Get a data series
   */
  async getSeries(seriesName) {
    // Checks if series already in cache
    if (seriesName in this.#cache)
      return this.#cache[seriesName];
    // Load the series
    const filename = 'series_blocks_' + seriesName + '.csv';
    const path = DataStore.URI_DATA_SOURCE + filename;
    const loaderFn = d3.csv.bind(this);
    return loaderFn(path).then(rows => {
      // Processes the series
      let values = [];
      for (let i = 0; i < rows.length; i++) {
        values.push(+rows[i][seriesName]);
      }
      // Stores the series in cache
      this.#cache[seriesName] = values;
      this.#queue.push(seriesName);
      // Checks the cache size
      if (this.#cache.length > this.#cacheSize) {
        const toDelete = this.#queue.shift();
        delete this.#cache[toDelete];
      }
      return values;
    });
  }

  /**
   * Get the descriptor file 
   * of an organized tour
   */
  async getTourDescriptorFile(url) {
    const loaderFn = d3.json.bind(this);
    return loaderFn(url);
  }

  /**
   * Get the descriptor file 
   * of a kiosk
   */
  async getKioskDescriptorFile(url) {
    const loaderFn = d3.json.bind(this);
    return loaderFn(url);
  }
  
}

export { DataStore };
