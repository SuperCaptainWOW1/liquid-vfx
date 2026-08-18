import {
  Quaternion,
  Raycaster,
  Vector2,
  Vector3,
  type PerspectiveCamera,
} from "three";
import type { OrbitControls } from "three/examples/jsm/Addons.js";
import type Bottle from "./Bottle";

export default class Controls {
  private raycaster = new Raycaster();
  private reuseVector3 = new Vector3();

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

  private static readonly WORLD_UP = new Vector3(0, 1, 0);

  constructor(
    private canvas: HTMLCanvasElement,
    private camera: PerspectiveCamera,
    private bottle: Bottle,
    private cameraControls: OrbitControls,
  ) {
    canvas.addEventListener("pointerdown", (e) => this.onPointerDown(e));
    canvas.addEventListener("pointerup", () => this.onPointerUp());
    canvas.addEventListener("pointermove", (e) => this.onPointerMove(e));
  }

  private onPointerDown(e: PointerEvent) {
    this.raycaster.setFromCamera(
      this.getNormalizedDeviceCoordinates(e.clientX, e.clientY),
      this.camera,
    );
    const hit = this.raycaster.intersectObject(this.bottle.liquidBody)[0];
    if (!hit) return;

    this.bottle.liquidBody.getWorldPosition(this.center);

    this.right.setFromMatrixColumn(this.camera.matrixWorld, 0);
    this.up.setFromMatrixColumn(this.camera.matrixWorld, 1);
    this.toCamera.subVectors(this.camera.position, this.center).normalize();

    if (!this.bottle.liquidBody.geometry.boundingSphere)
      throw new Error("Failed to get bounding sphere");
    const worldRadius = this.bottle.liquidBody.geometry.boundingSphere.radius;

    this.centerScreen = this.worldToScreenPx(this.center);
    const edgeScreen = this.worldToScreenPx(
      this.center.clone().addScaledVector(this.right, worldRadius),
    );
    this.screenRadius = this.centerScreen.distanceTo(edgeScreen);

    const direction = this.getArcballDirection(e.clientX, e.clientY);
    if (!direction) return;

    this.prevDirection.copy(direction);

    this.cameraControls.enabled = false;
    this.isPointerDown = true;
  }

  private onPointerUp() {
    this.isPointerDown = false;
    this.cameraControls.enabled = true;
  }

  private onPointerMove(e: PointerEvent) {
    if (!this.isPointerDown) return;

    const direction = this.getArcballDirection(e.clientX, e.clientY);
    if (!direction) {
      this.isPointerDown = false;
      return;
    }

    // Accumulate per-move deltas instead of mapping start→current: the shortest
    // arc between two directions can never exceed 180°, which capped the drag.
    this.deltaQuaternion.setFromUnitVectors(this.prevDirection, direction);
    this.bottle.liquidBody.quaternion
      .premultiply(this.deltaQuaternion)
      .normalize();

    this.prevDirection.copy(direction);

    this.updateLevel(this.bottle);
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

  private updateLevel(bottle: Bottle) {
    this.reuseVector3
      .set(0, 1, 0)
      .applyQuaternion(bottle.liquidBody.quaternion);

    const tilt = this.reuseVector3.angleTo(Controls.WORLD_UP);
    const clampedTilt = Math.min(tilt, Math.PI / 2);

    bottle.targetLevel = (1 - clampedTilt / (Math.PI / 2)) * bottle.maxLevel;
  }

  private getNormalizedDeviceCoordinates(x: number, y: number) {
    const rect = this.canvas.getBoundingClientRect();
    return new Vector2(
      ((x - rect.left) / rect.width) * 2 - 1,
      -(((y - rect.top) / rect.height) * 2 - 1),
    );
  }
}
