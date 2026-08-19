import {
  Object3D,
  PerspectiveCamera,
  Raycaster,
  Vector2,
  type Intersection,
} from "three";
import type Bottle from "./Bottle";

export default class RaycastController {
  readonly ndc = new Vector2();
  currentHit: Intersection<Object3D> | null = null;

  private raycaster = new Raycaster();

  constructor(
    private canvas: HTMLCanvasElement,
    private camera: PerspectiveCamera,
    private bottle: Bottle,
  ) {
    canvas.addEventListener("pointermove", (e) => this.onPointerMove(e));
  }

  private onPointerMove(e: PointerEvent) {
    const ndc = this.getNormalizedDeviceCoordinates(e.clientX, e.clientY);
    this.ndc.x = ndc.x;
    this.ndc.y = ndc.y;

    this.raycaster.setFromCamera(this.ndc, this.camera);
    const hit = this.raycaster.intersectObject(this.bottle.liquidBody)[0];
    this.currentHit = hit ?? null;
  }

  private getNormalizedDeviceCoordinates(x: number, y: number) {
    const rect = this.canvas.getBoundingClientRect();
    return new Vector2(
      ((x - rect.left) / rect.width) * 2 - 1,
      -(((y - rect.top) / rect.height) * 2 - 1),
    );
  }
}
