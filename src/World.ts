import { Mesh, MeshBasicMaterial, PlaneGeometry, type Scene } from "three";
import Bottle from "./Bottle";

export default class World {
  bottle;

  constructor(scene: Scene) {
    const { bottle } = this.init(scene);

    this.bottle = bottle;
  }

  private init(scene: Scene) {
    const bottle = new Bottle();

    scene.add(bottle.liquidBody);
    scene.add(bottle.liquidSurface);

    const ground = new Mesh(
      new PlaneGeometry(100, 100).rotateX(-Math.PI / 2),
      new MeshBasicMaterial({
        color: "#212121",
      }),
    );

    ground.translateY(-1.7);
    scene.add(ground);

    return {
      bottle,
    };
  }
}
