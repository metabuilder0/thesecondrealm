import {
  Points,
  Float32BufferAttribute,
  BufferGeometry,
  PointsMaterial,
  Color
} from 'three';

import * as data from '/js/modules/data/data-constants.js';


class PointsCloud extends Points {

  /*
   * Constants
   */
  static POINT_SIZE = 0.01;
  static ALPHA = 0.7;
  static ALPHA_INVISIBLE = 0;

  // HSL factors
  static FACTOR_H = 0;
  static FACTOR_S = 0;
  static FACTOR_L = 0;

  /**
   * Attributes
   */
  
  world3d = null;
  cloudData = null;
  planeSize = 0;
  highlightFrom = 1;
  highlightTo = 10000000;

  // Data cached for animations
  animIdx = 0;
  nbPoints = 0;

  // Incremental filter job (processed in update() to keep the UI responsive)
  #filterJob = null;


  /*
   * Constructor
   */
  constructor(world3d, nbPoints, planeSize) {
    PointsCloud.FACTOR_H = 0.75 / planeSize;
    PointsCloud.FACTOR_S = 1 / (2 * planeSize);
    PointsCloud.FACTOR_L = 1 / (3 * planeSize);

    const positions = new Float32Array(nbPoints*4);
    const colors = new Float32Array(nbPoints*4);
    
    let geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(positions, 4));
    geometry.setAttribute('color', new Float32BufferAttribute(colors, 4));
    
    let material = new PointsMaterial({ 
      size: PointsCloud.POINT_SIZE, 
      vertexColors: true,
      opacity: 0.7,
      transparent: true
    });
    
    super(geometry, material);
    this.planeSize = planeSize;
    this.world3d = world3d;
  }

  /*
   * Show the PointsCloud
   */
  showPointsCloud(cloudData) {
    this.cloudData = cloudData;
    // Registers the bounds for highlighting of blocks
    this.highlightFrom = (!cloudData.minH) ? 1 : cloudData.minH;
    this.highlightTo = (!cloudData.maxH) ? Number.POSITIVE_INFINITY : cloudData.maxH;
    // Computes homothety factors
    const [factorX, factorY, factorZ] = this.getHomothetyFactors();
    // Computes the attributes of the geometry associated to the PointsCloud
    const posAttribute = this.geometry.getAttribute('position');
    const colorAttribute = this.geometry.getAttribute('color');
    for (let i=0; i < cloudData.dataPoints.length; i++) {
      let x = factorX * (cloudData.dataPoints[i]['x'] - this.cloudData.minX),
          y = factorY * (cloudData.dataPoints[i]['y'] - this.cloudData.minY),
          z = factorZ * (cloudData.dataPoints[i]['z'] - this.cloudData.minZ),
          key = cloudData.dataPoints[i]['key'],
          color = this.#computeColor(x, y, z, key),
          alpha = (color.r == 0 && color.g == 0 && color.b == 0)
            ? PointsCloud.ALPHA_INVISIBLE
            : PointsCloud.ALPHA;
      colorAttribute.setXYZW(i, color.r, color.g, color.b, alpha);
      posAttribute.setXYZW(i, x, y, z, key);
    }
    this.geometry.getAttribute('position').needsUpdate = true;
    this.geometry.getAttribute('color').needsUpdate = true;
    this.animIdx = cloudData.dataPoints.length;
    this.world3d.selectionHelper.onPointsCloudLoaded();
  }

  /*
   * Prepare the animation of the PointCloud
   */
  prepareAnimation(cloudData) {
    this.cloudData = cloudData;
    this.animIdx = 0;
    this.nbPoints = cloudData.dataPoints.length;
    // Registers the bounds for highlighting of blocks
    this.highlightFrom = (!cloudData.minH) ? 1 : cloudData.minH;
    this.highlightTo = (!cloudData.maxH) ? Number.POSITIVE_INFINITY : cloudData.maxH;
    // Computes homothety factors
    const [factorX, factorY, factorZ] = this.getHomothetyFactors();
    // Precomputes positions of points and cache them
    const posAttribute = this.geometry.getAttribute('position');
    const colorAttribute = this.geometry.getAttribute('color');
    let color = new Color();
    color.setHSL(0.5, 1, 0.75);
    for (let i=0; i<this.nbPoints; i++) {
      const x = factorX * (cloudData.dataPoints[i]['x'] - this.cloudData.minX),
            y = factorY * (cloudData.dataPoints[i]['y'] - this.cloudData.minY),
            z = factorZ * (cloudData.dataPoints[i]['z'] - this.cloudData.minZ),
            key = cloudData.dataPoints[i]['key'];
      posAttribute.setXYZW(i, x, y, z, key);
      colorAttribute.setXYZW(i, color.r, color.g, color.b, 0);
    }
    this.geometry.getAttribute('position').needsUpdate = true;
    this.geometry.getAttribute('color').needsUpdate = true;
  }

  /*
   * Animate the PointCLoud
   */
  update(delta) {
    this.#processFilterChunk();
    this.#processAnimation();
  }

  /*
   * Compute the color of a point
   */
  #computeColor(x, y, z, key) {
    let color = new Color();
    // Checks coordinates are valid integers
    if (isNaN(x)) { x = 0; }
    if (isNaN(y)) { y = 0; }
    if (isNaN(z)) { z = 0; }
    if ( (key >= this.highlightFrom) && (key <= this.highlightTo) ) {
      // Visible vertex
      color.setHSL(
        0.75 - Math.max(0, y) * PointsCloud.FACTOR_H, 
        0.5  + Math.max(0, z) * PointsCloud.FACTOR_S, 
        0.33 + Math.max(0, x) * PointsCloud.FACTOR_L
      );
    } else {
      // "Invisible" point
      color.setHSL(0, 0, 0);
    }
    return color;
  }

  /*
   * Process the animation of the PointsCloud
   */
  #processAnimation() {
    const animLag = 2016;
    const iterSize = 18;
    
    if (this.animIdx >= this.nbPoints + animLag)
      return

    const colorAttribute = this.geometry.getAttribute('color');
      
    // Adds new points to the cloud
    if (this.animIdx < this.nbPoints) {
      let currIterSize = 
        (this.animIdx+iterSize >= this.nbPoints) 
        ? this.nbPoints - this.animIdx - 1
        : iterSize;
      
      let color = new Color();
      color.setHSL(0.5, 1, 0.75);
      
      for (let i=0; i<currIterSize; i++) {
        const idx = this.animIdx + i;
        colorAttribute.setXYZW(idx, color.r, color.g, color.b,  PointsCloud.ALPHA);
      }
    }

    if ((this.animIdx >= animLag) && (this.animIdx < this.nbPoints + animLag)) {
      const posAttribute = this.geometry.getAttribute('position');
      
      let currIterSize = iterSize;
      if (this.animIdx - animLag + iterSize > this.nbPoints)
        currIterSize = this.nbPoints + animLag - this.animIdx;
      
      for (let i=0; i<currIterSize; i++) {
        const idx = this.animIdx - animLag + i;
        const x = posAttribute.getX(idx),
              y = posAttribute.getY(idx),
              z = posAttribute.getZ(idx),
              key = posAttribute.getW(idx);
        const color = this.#computeColor(x, y, z, key);
        const alpha = PointsCloud.ALPHA;
        this.geometry.getAttribute('color').setXYZW(idx, color.r, color.g, color.b, alpha);
      }
    }

    this.geometry.getAttribute('color').needsUpdate = true;
   
    this.animIdx += iterSize;
  }

  /**
   * Filter the points cloud to keep only the points within bounds defined by a collection of filters.
   * Starts (or replaces) an incremental job processed in update() so the main thread can keep rendering.
   */
  filterPointsCloud(filters) {
    if (!this.cloudData) return;
    this.#filterJob = {
      filters,
      index: 0,
      total: this.cloudData.dataPoints.length
    };
  }

  /*
   * Apply the current filter to a time-sliced batch of points.
   * ~6ms per frame leaves room for XR rendering and HUD updates.
   */
  #processFilterChunk() {
    const job = this.#filterJob;
    if (!job) return;

    const colorAttribute = this.geometry.getAttribute('color');
    const deadline = performance.now() + 6;

    while (job.index < job.total && performance.now() < deadline) {
      const i = job.index++;
      const alpha = this.#isPointHidden(i, job.filters)
        ? PointsCloud.ALPHA_INVISIBLE
        : PointsCloud.ALPHA;
      colorAttribute.setW(i, alpha);
    }

    colorAttribute.needsUpdate = true;

    if (job.index >= job.total) {
      this.#filterJob = null;
    }
  }

  /*
   * Check if a point is hidden by a collection of filters
   */
  #isPointHidden(idx, filters) {
    if (filters == null || filters.length == 0)
      return false;

    for (let i=0; i < filters.length; i++) {
      let hidden = false;

      for (let j=0; j < filters[i].length; j++) {
      
        const isLogScale = (this.cloudData.scaleX == data.SCALE_LOG && filters[i][j][0] == 'x') 
          || (this.cloudData.scaleY == data.SCALE_LOG && filters[i][j][0] == 'y') 
          || (this.cloudData.scaleZ == data.SCALE_LOG && filters[i][j][0] == 'z');
      
        let lowerBound = isLogScale ? Math.log10(filters[i][j][1]) : filters[i][j][1];
        let upperBound = isLogScale ? Math.log10(filters[i][j][2]) : filters[i][j][2];       
        let value = this.cloudData.dataPoints[idx][filters[i][j][0]];

        if (value < lowerBound || value > upperBound) {
          hidden = true;
        }
      }

      if (!hidden) {
        return false;
      }

    }

    return true;
  }

  /*
   * Dispose elements of the PointsCloud
   */
  dispose() {
    this.world3d = null;
    this.cloudData = null;
  }

  /*
   * Return the 3D coordinates corresponding
   * to the location of point associated to 
   * a given blok height
   * Block must be part of the PointCloud
   */
  heightToCoords3d(height) {
    const res = this.cloudData.dataPoints.filter(p => p.key == height);
    if (res.length != 1)
      return null;
    return this.dataToCoords3d(res[0]);
  }

  /*
   * Return the 3D coordinates corresponding
   * to the coordinates expressed in data values
   */
  rawDataToCoords3d(dataPoint) {
    return this.dataToCoords3d({
      x: (this.cloudData.scaleX == data.SCALE_LOG) ? Math.log10(dataPoint[0]) : dataPoint[0],
      y: (this.cloudData.scaleY == data.SCALE_LOG) ? Math.log10(dataPoint[1]) : dataPoint[1],
      z: (this.cloudData.scaleZ == data.SCALE_LOG) ? Math.log10(dataPoint[2]) : dataPoint[2]
    });
  }

  dataToCoords3d(dataPoint) {
    const [factorX, factorY, factorZ] = this.getHomothetyFactors();
    let x = factorX * (dataPoint.x - this.cloudData.minX),
        y = factorY * (dataPoint.y - this.cloudData.minY),
        z = factorZ * (dataPoint.z - this.cloudData.minZ);
    return [x, y, z];
  }

  /*
   * Compute 3 factors for a homothety from
   * the data world to the World3D 
   */
  getHomothetyFactors() {
    const diffX = this.cloudData.maxX - this.cloudData.minX,
          diffY = this.cloudData.maxY - this.cloudData.minY,
          diffZ = this.cloudData.maxZ - this.cloudData.minZ;

    const factorX = (diffX == 0) ? 0 : this.planeSize / diffX,
          factorY = (diffY == 0) ? 0 : this.planeSize / diffY,
          factorZ = (diffZ == 0) ? 0 : this.planeSize / diffZ;
    
          return [factorX, factorY, factorZ];
  }

  /*
   * Dispose the points cloud 
   */
  dispose() {
    // Resets the references to others objects
    this.cloudData = null;
  }

}

export { PointsCloud };
