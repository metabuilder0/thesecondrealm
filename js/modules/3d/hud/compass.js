import { 
  Group,
  Mesh,
  Line,
  Color,
  Vector3,
  Quaternion,
  SphereGeometry,
  BufferGeometry,
  MeshBasicMaterial,
  LineBasicMaterial
} from 'three';

import ThreeMeshUI from '../../../libs/three-mesh-ui/three-mesh-ui.module.min.js';


class Compass extends Group {

  /**
   * Attributes
   */
  world3d = null;
  hud = null;
  axisLabels = [];

  /**
   * Constructor
   * @param {*} world3d 
   * @param {*} hud 
   */
  constructor(world3d, hud) {
    super();
    this.world3d = world3d;
    this.hud = hud;
    this.build();
  }

  /*
   * Build the compass
   */
  build() {
    // Builds the referential (spinning top)
    const points = [
      new Vector3(-0.02, 0, 0),
      new Vector3(0.02, 0, 0),
      new Vector3(0, 0, 0),
      new Vector3(0, -0.02, 0),
      new Vector3(0, 0.02, 0),
      new Vector3(0, 0, 0),
      new Vector3(0, 0, -0.02),
      new Vector3(0, 0, 0.02),
      new Vector3(0, 0, 0),
      new Vector3(-0.02, 0, 0),
      new Vector3(0, 0, -0.02),
      new Vector3(0.02, 0, 0),
      new Vector3(0, 0, 0.02),
      new Vector3(-0.02, 0, 0)
    ];
    const geometry = new BufferGeometry().setFromPoints(points);
    const material = new LineBasicMaterial({
      color: 0x10faef,
      opacity: 1
    });
    this.referential = new Line(geometry, material);
    this.add(this.referential);
    // Builds the horizontal support
    const points2a = [new Vector3(-0.02, 0, 0), new Vector3(-0.1, 0, 0)];
    const geometry2a = new BufferGeometry().setFromPoints(points2a);
    const material2 = new LineBasicMaterial({color: 0x044b4f, opacity: 1});
    const supportLeft = new Line(geometry2a, material2);
    this.add(supportLeft);
    const points2b = [new Vector3(0.02, 0, 0), new Vector3(0.1, 0, 0)];
    const geometry2b = new BufferGeometry().setFromPoints(points2b);
    const supportRight = new Line(geometry2b, material2);
    this.add(supportRight);
    // Builds the crosshair (half cube)
    const points3 = [
      new Vector3(0, 0, 0),
      new Vector3(0.02, 0, 0),
      new Vector3(0, 0, 0.02),
      new Vector3(0, 0, 0),
      new Vector3(0, 0.02, 0),
      new Vector3(0, 0, 0.02),
      new Vector3(0, 0.02, 0),
      new Vector3(0.02, 0, 0)
    ];
    const geometry3 = new BufferGeometry().setFromPoints(points3);
    const material3 = new LineBasicMaterial({
      color: 0xafafaf,
      opacity: 0.7
    });
    this.crosshair = new Line(geometry3, material3);
    this.add(this.crosshair);
    this.buildAxisLabels();
    // Builds the sphere
    const geometry4 = new SphereGeometry(0.022, 64, 32); 
    let material4 = new MeshBasicMaterial({color: 0xffffff, opacity: 0.06, depthWrite: false});
    material4.transparent = true;
    const sphere = new Mesh(geometry4, material4);
    this.add(sphere);
  }

  /*
   * Labels sitting on the positive tips of the crosshair axes.
   * They are parented to the crosshair so their position tracks the world
   * axes, then counter-rotated so they keep facing the camera.
   */
  buildAxisLabels() {
    const labelDistance = 0.032;
    const definitions = [
      { content: 'X', position: new Vector3(labelDistance, 0, 0) },
      { content: 'Y', position: new Vector3(0, labelDistance, 0) },
      { content: 'Z', position: new Vector3(0, 0, labelDistance) }
    ];
    const fontColor = new Color(0xafafaf);

    for (let i = 0; i < definitions.length; i++) {
      const definition = definitions[i];
      const label = new ThreeMeshUI.Block({
        width: 0.02,
        height: 0.02,
        padding: 0,
        margin: 0,
        offset: 0,
        interLine: 0,
        borderRadius: 0,
        borderWidth: 0,
        justifyContent: 'center',
        alignItems: 'center',
        textAlign: 'center',
        backgroundOpacity: 0,
        fontFamily: 'js/libs/three-mesh-ui/assets/Roboto-msdf.json',
        fontTexture: 'js/libs/three-mesh-ui/assets/Roboto-msdf.png',
        fontColor: fontColor
      });
      label.add(new ThreeMeshUI.Text({
        content: definition.content,
        fontSize: 0.006,
        offset: 0
      }));
      label.position.copy(definition.position);
      label.frame.visible = false;
      label.frame.castShadow = false;
      label.frame.receiveShadow = false;
      label.frame.material.depthWrite = false;
      this.crosshair.add(label);
      this.axisLabels.push(label);
    }
  }

  /*
   * Code processed in the rendering loop
   */
  update(delta) {
    const q = new Quaternion();
    this.getWorldQuaternion(q);
    q.normalize();
    q.invert();
    this.crosshair.setRotationFromQuaternion(q);
    // q is the inverse of the view orientation. Inverting it again aligns
    // each label with the camera while leaving its position on the axis.
    q.invert();
    for (let i = 0; i < this.axisLabels.length; i++) {
      this.axisLabels[i].quaternion.copy(q);
    }

    const origin = new Vector3();
    this.getWorldPosition(origin);
    const threshold = Math.sin(4*Math.PI/180);
    let vectX = new Vector3(1, 0, 0);
    this.localToWorld(vectX);
    vectX.sub(origin);
    let vectZ = new Vector3(0, 0, 1);
    this.localToWorld(vectZ);
    vectZ.sub(origin);

    const condX = (Math.abs(vectX.x) <= threshold) && (Math.abs(vectZ.x) <= threshold);
    const condY = (Math.abs(vectX.y) <= threshold) && (Math.abs(vectZ.y) <= threshold);
    const condZ = (Math.abs(vectX.z) <= threshold) && (Math.abs(vectZ.z) <= threshold);


    let vectY = new Vector3(0, 1, 0);
    this.localToWorld(vectY);
    vectY.sub(origin);

    if (condY && vectY.y > 0) {
      this.referential.material.color = new Color(0x10faef);
    } else if (condX || condY || condZ) {
      this.referential.material.color = new Color(0xff8c00);
    } else {
      this.referential.material.color = new Color(0xff0000);
    }
    
  }

  /*
   * Dispose the compass 
   */
  dispose() {    
    // Resets the references to others objects
    this.world3d = null;
    this.hud = null;
    this.axisLabels = [];
  }

}

export { Compass };
