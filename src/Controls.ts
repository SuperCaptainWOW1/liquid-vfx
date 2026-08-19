import { Quaternion, Vector2, Vector3, type PerspectiveCamera } from "three";
import type { OrbitControls } from "three/examples/jsm/Addons.js";
import type Bottle from "./Bottle";
import type RaycastController from "./RaycastController";

export default class Controls {
  private isPointerDown = false;

  private center = new Vector3();
  private right = new Vector3();
  private up = new Vector3();
  private toCamera = new Vector3();
  private centerScreen = new Vector2();
  private screenRadius = 1;

  private prevDirection = new Vector3();
  private reuseDirection = new Vector3();
  private deltaQuaternion = new Quaternion();

  constructor(
    private canvas: HTMLCanvasElement,
    private camera: PerspectiveCamera,
    private bottle: Bottle,
    private cameraControls: OrbitControls,
    private raycastController: RaycastController,
    private dragRing: HTMLElement,
  ) {
    canvas.addEventListener("pointerdown", (e) => this.onPointerDown(e));
    canvas.addEventListener("pointerup", () => this.onPointerUp());
    canvas.addEventListener("pointermove", (e) => this.onPointerMove(e));
  }

  get isDragging() {
    return this.isPointerDown;
  }

  private onPointerDown(e: PointerEvent) {
    if (!this.raycastController.currentHit) return;

    this.bottle.liquidBody.getWorldPosition(this.center);

    this.right.setFromMatrixColumn(this.camera.matrixWorld, 0);
    this.up.setFromMatrixColumn(this.camera.matrixWorld, 1);
    this.toCamera.subVectors(this.camera.position, this.center).normalize();

    this.centerScreen = this.worldToScreenPx(this.center);
    const edgeScreen = this.worldToScreenPx(
      this.center.clone().addScaledVector(this.right, this.bottle.dragRadius),
    );
    this.screenRadius = this.centerScreen.distanceTo(edgeScreen);

    const direction = this.getArcballDirection(e.clientX, e.clientY);
    if (!direction) return;

    this.prevDirection.copy(direction);

    this.cameraControls.enabled = false;
    this.isPointerDown = true;

    this.showDragRing();
  }

  private onPointerUp() {
    this.isPointerDown = false;
    this.cameraControls.enabled = true;

    this.hideDragRing();
  }

  private onPointerMove(e: PointerEvent) {
    if (!this.isPointerDown) return;

    const direction = this.getArcballDirection(e.clientX, e.clientY);
    if (!direction) {
      this.isPointerDown = false;
      this.hideDragRing();
      return;
    }

    // Accumulate per-move deltas instead of mapping start→current: the shortest
    // arc between two directions can never exceed 180°, which capped the drag.
    this.deltaQuaternion.setFromUnitVectors(this.prevDirection, direction);
    this.bottle.liquidBody.quaternion
      .premultiply(this.deltaQuaternion)
      .normalize();

    this.prevDirection.copy(direction);
  }

  private showDragRing() {
    // centerScreen is relative to canvas, the ring is fixed to the viewport.
    const rect = this.canvas.getBoundingClientRect();
    const { style } = this.dragRing;
    const size = this.screenRadius * 2;

    style.width = `${size}px`;
    style.height = `${size}px`;
    style.left = `${rect.left + this.centerScreen.x}px`;
    style.top = `${rect.top + this.centerScreen.y}px`;
    style.opacity = "1";
  }

  private hideDragRing() {
    this.dragRing.style.opacity = "0";
  }

  private getArcballDirection(clientX: number, clientY: number) {
    const rect = this.canvas.getBoundingClientRect();
    const px = clientX - rect.left;
    const py = clientY - rect.top;

    const dx = (px - this.centerScreen.x) / this.screenRadius;
    const dy = (py - this.centerScreen.y) / this.screenRadius;

    // Outside the ball the arcball has no defined direction; caller ends the drag.
    const lenSq = dx * dx + dy * dy;
    if (lenSq > 1) return null;

    return this.reuseDirection
      .set(0, 0, 0)
      .addScaledVector(this.right, dx)
      .addScaledVector(this.up, -dy)
      .addScaledVector(this.toCamera, Math.sqrt(1 - lenSq))
      .normalize();
  }

  private worldToScreenPx(point: Vector3) {
    const rect = this.canvas.getBoundingClientRect();
    const ndc = point.clone().project(this.camera);
    return new Vector2(
      ((ndc.x + 1) / 2) * rect.width,
      ((1 - ndc.y) / 2) * rect.height,
    );
  }
}
