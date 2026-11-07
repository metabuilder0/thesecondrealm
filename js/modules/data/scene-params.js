import { fromB58, toB58 } from "../utils/base58.js";


class SceneParams {

  /*
   * Constants 
   */

  static MODE_BUILDER = 0;
  static MODE_EXPLORER = 1;

  /*
   * Attributes 
   */

  mode = SceneParams.MODE_BUILDER;

  name = '';

  seriesX = null;
  seriesY = null;
  seriesZ = null;
  
  scaleX = null;
  scaleY = null;
  scaleZ = null;
  
  position = [];
  rotation = [];

  song = null;
  tour = null;
  timelapseMode = false;
  boundaries = true;

  filterMinH = Number.NEGATIVE_INFINITY;
  filterMaxH = Number.POSITIVE_INFINITY;
  filterMinX = Number.NEGATIVE_INFINITY;
  filterMaxX = Number.POSITIVE_INFINITY;
  filterMinY = Number.NEGATIVE_INFINITY;
  filterMaxY = Number.POSITIVE_INFINITY;
  filterMinZ = Number.NEGATIVE_INFINITY;
  filterMaxZ = Number.POSITIVE_INFINITY;


  /*
   * Constructor
   */
  constructor(obj) {
    if (obj.mode != null)
      this.mode = obj.mode;

    if (obj.name != null)
      this.name = obj.name;

    if (obj.seriesX != null)
      this.seriesX = obj.seriesX;
    if (obj.seriesY!= null)
      this.seriesY = obj.seriesY;
    if (obj.seriesZ != null)
      this.seriesZ = obj.seriesZ;
    
    if (obj.scaleX != null)
      this.scaleX = obj.scaleX;
    if (obj.scaleY != null)
      this.scaleY = obj.scaleY;
    if (obj.scaleZ != null)
      this.scaleZ = obj.scaleZ;
    
    if (obj.position != null)
      this.position = obj.position;
    if (obj.rotation != null)
      this.rotation = obj.rotation;

    if (obj.song != null)
      this.song = obj.song;
    if (obj.tour != null)
      this.tour = obj.tour;
    if (obj.timelapseMode != null)
      this.timelapseMode = obj.timelapseMode;
    if (obj.boundaries != null)
      this.boundaries = obj.boundaries;

    if (obj.filterMinH != null)
      this.filterMinH = obj.filterMinH;
    if (obj.filterMaxH != null)
      this.filterMaxH = obj.filterMaxH;
    if (obj.filterMinX != null)
      this.filterMinX = obj.filterMinX;
    if (obj.filterMaxX != null)
      this.filterMaxX = obj.filterMaxX;
    if (obj.filterMinY != null)
      this.filterMinY = obj.filterMinY;
    if (obj.filterMaxY != null)
      this.filterMaxY = obj.filterMaxY;
    if (obj.filterMinZ != null)
      this.filterMinZ = obj.filterMinZ;
    if (obj.filterMaxZ != null)
      this.filterMaxZ = obj.filterMaxZ;
  }

  // Serialize the SceneParams object in JSON format
  toJSON(space=null) {
    return JSON.stringify({
      'mode': this.mode,
      'name': this.name,
      'seriesX': this.seriesX,
      'seriesY': this.seriesY,
      'seriesZ': this.seriesZ,
      'scaleX': this.scaleX,
      'scaleY': this.scaleY,
      'scaleZ': this.scaleZ,
      'position': this.position,
      'rotation': this.rotation,
      'song': this.song,
      'tour': this.tour,
      'timelapseMode': this.timelapseMode,
      'boundaries': this.boundaries,
      'filterMinH': this.filterMinH,
      'filterMaxH': this.filterMaxH,
      'filterMinX': this.filterMinX,
      'filterMaxX': this.filterMaxX,
      'filterMinY': this.filterMinY,
      'filterMaxY': this.filterMaxY,
      'filterMinZ': this.filterMinZ,
      'filterMaxZ': this.filterMaxZ,
    }, null, space);
  }

  // Build a SceneParams object from a JSON string
  static fromJSON(data) {
    try {
      const obj = JSON.parse(data);
      return new SceneParams(obj);
    } catch {
      return null;
    }
  }

  // Serialize the SceneParams object in a format used in URLs
  serialize() {
    // Warning: Order matters!
    // Add new entries to the end of the array
    const properties = [
      this.name,
      this.seriesX,
      this.seriesY,
      this.seriesZ,
      this.scaleX,
      this.scaleY,
      this.scaleZ,
      this.position,
      this.rotation,
      this.song,
      this.tour,
      this.timelapseMode,
      this.filterMinH,
      this.filterMaxH,
      this.filterMinX,
      this.filterMaxX,
      this.filterMinY,
      this.filterMaxY,
      this.filterMinZ,
      this.filterMaxZ,
      this.boundaries
    ];
    const json = JSON.stringify(properties);
    const encoded = new TextEncoder().encode(json);
    return toB58(encoded);
  }

  static unserialize(b58) {
    const encoded = fromB58(b58);
    const json = new TextDecoder().decode(encoded);
    const obj = JSON.parse(json);
    return new SceneParams({
      'name': obj[0],
      'seriesX': obj[1],
      'seriesY': obj[2],
      'seriesZ': obj[3],
      'scaleX': obj[4],
      'scaleY': obj[5],
      'scaleZ': obj[6],
      'position': obj[7],
      'rotation': obj[8],
      'song': obj[9],
      'tour': obj[10],
      'timelapseMode': obj[11],
      'filterMinH': obj[12],
      'filterMaxH': (obj[13] == null) ? Number.POSITIVE_INFINITY : obj[13],
      'filterMinX': (obj[14] == null) ? Number.NEGATIVE_INFINITY : obj[14],
      'filterMaxX': (obj[15] == null) ? Number.POSITIVE_INFINITY : obj[15],
      'filterMinY': (obj[16] == null) ? Number.NEGATIVE_INFINITY : obj[16],
      'filterMaxY': (obj[17] == null) ? Number.POSITIVE_INFINITY : obj[17],
      'filterMinZ': (obj[18] == null) ? Number.NEGATIVE_INFINITY : obj[18],
      'filterMaxZ': (obj[19] == null) ? Number.POSITIVE_INFINITY : obj[19],
      'boundaries': obj[20]
    });
  }
}

export { SceneParams };
