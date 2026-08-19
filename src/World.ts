import { Mesh, MeshBasicMaterial, PlaneGeometry, type Scene } from "three";
import Bottle from "./Bottle";

export default class World {
  bottle;

  constructor(scene: Scene) {
    this.bottle = new Bottle();

    scene.add(this.bottle.liquidBody);
    scene.add(this.bottle.liquidSurface);

    const ground = new Mesh(
      new PlaneGeometry(100, 100).rotateX(-Math.PI / 2),
      new MeshBasicMaterial({
        color: "#212121",
      }),
    );

    ground.translateY(-1.7);
    scene.add(ground);
  }
}
