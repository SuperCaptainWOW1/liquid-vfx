import type { PerspectiveCamera } from "three";
import { OrbitControls } from "three/examples/jsm/Addons.js";

export default class CameraController {
  readonly cameraControls;

  constructor(camera: PerspectiveCamera, canvas: HTMLCanvasElement) {
    this.setupInitialPosition(camera);

    this.cameraControls = new OrbitControls(camera, canvas);
  }

  private setupInitialPosition(camera: PerspectiveCamera) {
    camera.position.z = 4;
  }
}
