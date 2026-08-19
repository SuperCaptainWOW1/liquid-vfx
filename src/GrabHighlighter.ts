import type Controls from "./Controls";
import type RaycastController from "./RaycastController";

export default class GrabHighlighter {
  constructor(
    canvas: HTMLCanvasElement,
    private raycastController: RaycastController,
    private controls: Controls,
  ) {
    canvas.addEventListener("pointermove", () => this.onPointerMove());
  }

  private onPointerMove() {
    if (this.raycastController.currentHit || this.controls.isDragging) {
      document.body.style.cursor = "grab";
    } else {
      document.body.style.cursor = "auto";
    }
  }
}
