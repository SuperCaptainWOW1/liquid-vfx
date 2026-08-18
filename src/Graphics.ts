import { PerspectiveCamera, Scene, WebGLRenderer } from "three";

export default class Graphics {
  public renderer;
  public scene;
  public camera;

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

    const scene = new Scene();

    const camera = new PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      30,
    );

    return {
      renderer,
      scene,
      camera,
    };
  }
}
