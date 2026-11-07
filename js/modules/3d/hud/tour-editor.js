class TourEditor {

  /*
   * Constants
   */

  static TOUR_TYPES = [
    'guided_tour',
    'guided_tour_autopilot',
    'autopilot'
  ];

  static COORD_DATA = 'data_series';
  static COORD_HEIGHT = 'block_height';


  /*
   * Attributes
   */

  descriptor = null;


  /*
   * Constructor
   */
  constructor(descriptor, sceneParams) {
    if (descriptor) {
      this.descriptor = TourEditor.clone(descriptor);
      if (!Array.isArray(this.descriptor.stages)) {
        this.descriptor.stages = [];
      }
    } else {
      this.descriptor = {
        version: '0.3.0',
        type: 'guided_tour',
        title: (sceneParams && sceneParams.name) ? sceneParams.name : 'Tour',
        lang: 'en',
        coords_type: TourEditor.COORD_DATA,
        stages: []
      };
    }
  }

  /*
   * Accessors
   */
  get stages() {
    return this.descriptor.stages;
  }

  get type() {
    return this.descriptor.type;
  }

  get coordsType() {
    return this.descriptor.coords_type;
  }

  /*
   * Cycle the tour type.
   * Returns the type now stored on the descriptor.
   */
  cycleType() {
    const index = TourEditor.TOUR_TYPES.indexOf(this.descriptor.type);
    const next = (index + 1) % TourEditor.TOUR_TYPES.length;
    this.descriptor.type = TourEditor.TOUR_TYPES[next];
    return this.descriptor.type;
  }

  setType(type) {
    this.descriptor.type = type;
  }

  /*
   * Append a stage.
   * worldPosition is the user's current position in world coordinates.
   * Returns false when the position cannot be converted.
   */
  addStage(title, worldPosition, pointsCloud) {
    const coords = this.#toDescriptorCoords(worldPosition, pointsCloud);
    if (coords == null) return false;
    this.descriptor.stages.push({
      coords: coords,
      title: title
    });
    return true;
  }

  removeStage(index) {
    if (index < 0 || index >= this.descriptor.stages.length) return;
    this.descriptor.stages.splice(index, 1);
  }

  moveUp(index) {
    if (index <= 0 || index >= this.descriptor.stages.length) return;
    const stages = this.descriptor.stages;
    const previous = stages[index - 1];
    stages[index - 1] = stages[index];
    stages[index] = previous;
  }

  moveDown(index) {
    if (index < 0 || index >= this.descriptor.stages.length - 1) return;
    const stages = this.descriptor.stages;
    const next = stages[index + 1];
    stages[index + 1] = stages[index];
    stages[index] = next;
  }

  /*
   * World position of a stage, or null when it cannot be resolved.
   */
  getStageWorldPosition(index, pointsCloud) {
    const stage = this.descriptor.stages[index];
    if (!stage) return null;
    return this.#coordsToWorld(stage.coords, pointsCloud);
  }

  /*
   * Descriptor ready to be exported or played.
   * guided_tour requires initial_pos: fall back to the first stage.
   */
  toJSON() {
    const out = TourEditor.clone(this.descriptor);
    if (
      out.initial_pos == null
      && out.type == 'guided_tour'
      && out.stages.length > 0
    ) {
      out.initial_pos = TourEditor.clone(out.stages[0].coords);
    }
    return out;
  }

  static clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  #toDescriptorCoords(worldPosition, pointsCloud) {
    if (!pointsCloud || worldPosition == null) return null;
    if (this.descriptor.coords_type == TourEditor.COORD_HEIGHT) {
      return pointsCloud.coords3dToHeight(worldPosition);
    }
    return pointsCloud.coords3dToRawData(worldPosition);
  }

  #coordsToWorld(coords, pointsCloud) {
    if (!pointsCloud || coords == null) return null;
    if (this.descriptor.coords_type == TourEditor.COORD_HEIGHT) {
      return pointsCloud.heightToCoords3d(coords);
    }
    return pointsCloud.rawDataToCoords3d(coords);
  }

}

export { TourEditor };
