import {
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  Timer,
  Vector2,
  WebGLRenderer,
  type Scene,
} from "three";
import Graphics from "./Graphics";

import { clamp, damp } from "three/src/math/MathUtils.js";
import { OrbitControls } from "three/examples/jsm/Addons.js";
import Bottle from "./Bottle";
import Controls from "./Controls";

// export type Bottle = Mesh<CylinderGeometry, ShaderMaterial> & {
//   material: {
//     uniforms: {
//       uLevel: Uniform<number>;
//       uTime: Uniform<number>;
//       uVelocityCoeffX: Uniform<number>;
//       uVelocityCoeffZ: Uniform<number>;
//     };
//   };
// };

export default class Game {
  private prevRotation = new Vector2();

  private angularVelocity = new Vector2();

  private levelValue = 0;
  private levelVelocity = 0;

  private waveCoeff = new Vector2();
  private waveTarget = new Vector2();

  constructor(canvas: HTMLCanvasElement) {
    const { renderer, camera, scene } = new Graphics(canvas);

    const orbitControls = new OrbitControls(camera, canvas);

    this.setupCamera(camera);

    const bottle = this.createScene(scene);

    new Controls(canvas, camera, bottle, orbitControls);

    this.initRenderLoop(renderer, scene, camera, orbitControls, bottle);
  }

  private setupCamera(camera: PerspectiveCamera) {
    camera.position.z = 4;
    // camera.position.y = 3;
    // camera.lookAt(new Vector3())
  }

  private createScene(scene: Scene) {
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

    return bottle;
  }

  private updateLevel(bottle: Bottle, delta: number) {
    const stiffness = 45;
    const damping = 9;

    const force =
      (bottle.targetLevel - this.levelValue) * stiffness -
      this.levelVelocity * damping;

    this.levelVelocity += force * delta;
    this.levelValue += this.levelVelocity * delta;

    bottle.liquidBody.material.uniforms.uLevel.value = this.levelValue;
  }

  private updateWaves(bottle: Bottle, delta: number) {
    const deltaX = bottle.liquidBody.rotation.x - this.prevRotation.x;
    const deltaZ = bottle.liquidBody.rotation.z - this.prevRotation.y;

    this.prevRotation.set(
      bottle.liquidBody.rotation.x,
      bottle.liquidBody.rotation.z,
    );

    const isMoving = Math.abs(deltaX) > 0.00001 || Math.abs(deltaZ) > 0.00001;

    if (isMoving) {
      this.angularVelocity.set(deltaX / delta, deltaZ / delta);

      const sensitivity = 0.04;
      const maxWave = 0.3;

      this.waveTarget.set(
        clamp(this.angularVelocity.x * sensitivity, -maxWave, maxWave),
        clamp(this.angularVelocity.y * sensitivity, -maxWave, maxWave),
      );
    } else {
      this.angularVelocity.set(0, 0);

      // Бутылка перестала двигаться →
      // волны постепенно должны исчезнуть.
      this.waveTarget.set(0, 0);
    }

    const attack = 15;
    const decay = 2.5;

    const lambda = isMoving ? attack : decay;

    this.waveCoeff.x = damp(this.waveCoeff.x, this.waveTarget.x, lambda, delta);
    this.waveCoeff.y = damp(this.waveCoeff.y, this.waveTarget.y, lambda, delta);

    bottle.liquidBody.material.uniforms.uVelocityCoeffX.value =
      this.waveCoeff.x;
    bottle.liquidBody.material.uniforms.uVelocityCoeffZ.value =
      this.waveCoeff.y;
  }

  private initRenderLoop(
    renderer: WebGLRenderer,
    scene: Scene,
    camera: PerspectiveCamera,
    cameraControls: OrbitControls,
    bottle: Bottle,
  ) {
    const timer = new Timer();

    this.prevRotation.set(
      bottle.liquidBody.rotation.x,
      bottle.liquidBody.rotation.z,
    );

    this.levelValue = bottle.maxLevel;

    renderer.setAnimationLoop(() => {
      timer.update();

      const delta = Math.min(timer.getDelta(), 0.05);

      cameraControls.update(delta);
      this.updateWaves(bottle, delta);
      this.updateLevel(bottle, delta);

      bottle.liquidBody.material.uniforms.uTime.value = timer.getElapsed() * 5;

      bottle.liquidBody.updateMatrixWorld(true);
      bottle.bottleWorldInverse.value
        .copy(bottle.liquidBody.matrixWorld)
        .invert();

      renderer.render(scene, camera);
    });
  }
}
