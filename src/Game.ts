import { PerspectiveCamera, Timer, WebGLRenderer, type Scene } from "three";
import Graphics from "./Graphics";

import { OrbitControls } from "three/examples/jsm/Addons.js";
import Bottle from "./Bottle";
import Controls from "./Controls";
import CameraController from "./CameraController";
import World from "./World";
import RaycastController from "./RaycastController";
import GrabHighlighter from "./GrabHighlighter";

export default class Game {
  constructor(canvas: HTMLCanvasElement, dragRing: HTMLElement) {
    const { renderer, camera, scene } = new Graphics(canvas);

    const { cameraControls } = new CameraController(camera, canvas);

    const { bottle } = new World(scene);

    const raycastController = new RaycastController(canvas, camera, bottle);

    const controls = new Controls(
      canvas,
      camera,
      bottle,
      cameraControls,
      raycastController,
      dragRing,
    );

    new GrabHighlighter(canvas, raycastController, controls);

    this.initRenderLoop(
      renderer,
      scene,
      camera,
      cameraControls,
      bottle,
      controls,
    );
  }

  private initRenderLoop(
    renderer: WebGLRenderer,
    scene: Scene,
    camera: PerspectiveCamera,
    cameraControls: OrbitControls,
    bottle: Bottle,
    controls: Controls,
  ) {
    const timer = new Timer();

    renderer.setAnimationLoop(() => {
      timer.update();

      const delta = Math.min(timer.getDelta(), 0.05);

      cameraControls.update(delta);

      if (!controls.isDragging) bottle.returnToUpright(delta);

      // Runs after any rotation this frame so the waves pick it up as velocity.
      bottle.onRenderUpdate(delta);

      renderer.render(scene, camera);
    });
  }
}
