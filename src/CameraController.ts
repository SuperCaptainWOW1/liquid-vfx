import type { PerspectiveCamera } from "three";
import { OrbitControls } from "three/examples/jsm/Addons.js";

export default class CameraController {
  cameraControls;

  constructor(camera: PerspectiveCamera, canvas: HTMLCanvasElement) {
    camera.position.z = 4;

    this.cameraControls = new OrbitControls(camera, canvas);
  }
}
