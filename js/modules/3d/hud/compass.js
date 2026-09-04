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


class Compass extends Group {

  /**
   * Attributes
   */
  world3d = null;
  hud = null;

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
    // Builds the sphere
    const geometry4 = new SphereGeometry(0.022, 64, 32); 
    let material4 = new MeshBasicMaterial({color: 0xffffff, opacity: 0.06, depthWrite: false});
    material4.transparent = true;
    const sphere = new Mesh(geometry4, material4);
    this.add(sphere);
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
  }

}

export { Compass };
