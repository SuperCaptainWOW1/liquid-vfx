import { PerspectiveCamera, Scene, WebGLRenderer } from "three";

export default class Graphics {
  readonly renderer;
  readonly scene;
  readonly camera;

  constructor(canvas: HTMLCanvasElement) {
    const { renderer, scene, camera } = this.init(canvas);

    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
  }

  private init(canvas: HTMLCanvasElement) {
    const renderer = new WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const scene = new Scene();

    const camera = new PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      30,
    );

    window.addEventListener("resize", () => {
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      camera.updateProjectionMatrix();
    });

    return {
      renderer,
      scene,
      camera,
    };
  }
}
