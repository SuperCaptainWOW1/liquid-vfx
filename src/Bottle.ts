import {
  CylinderGeometry,
  DoubleSide,
  Matrix4,
  Mesh,
  PlaneGeometry,
  Quaternion,
  ShaderMaterial,
  Uniform,
  Vector2,
  Vector3,
} from "three";

import liquidVertexShader from "./shaders/liquid/vertex.glsl";
import liquidFragmentShader from "./shaders/liquid/fragment.glsl";
import liquidSurfaceVertexShader from "./shaders/liquid-surface/vertex.glsl";
import liquidSurfaceFragmentShader from "./shaders/liquid-surface/fragment.glsl";
import { clamp, damp } from "three/src/math/MathUtils.js";

export default class Bottle {
  readonly maxLevel = 0.6;
  readonly bottleWorldInverse;

  readonly liquidSurface;
  readonly liquidBody;
  readonly dragRadius;

  targetLevel = this.maxLevel;

  private static readonly WORLD_UP = new Vector3(0, 1, 0);
  private static readonly UPRIGHT = new Quaternion();

  // First sloshing mode: the surface tips like a pendulum instead of only rippling.
  private static readonly GRAVITY = 9.81;
  private static readonly SLOSH_FREQUENCY = 6;
  private static readonly SLOSH_DAMPING = 0.2;
  private static readonly ACCEL_SMOOTHING = 20;
  private static readonly MAX_TILT_SLOPE = 0.7;

  private readonly radius = 0.5;
  private readonly halfHeight = 1.5;
  private readonly radialSegments = 96;

  private prevQuaternion = new Quaternion();
  private deltaQuaternion = new Quaternion();

  private angularVelocity = new Vector3();
  private reuseVector3 = new Vector3();

  private levelValue = this.maxLevel;
  private levelVelocity = 0;

  private waveCoeff = new Vector2();
  private waveTarget = new Vector2();

  // Surface slope along world X and Z.
  private tilt = new Vector2();
  private tiltVelocity = new Vector2();
  private tiltTarget = new Vector2();

  private centroidOffset = new Vector3();
  private centroidVelocity = new Vector3();
  private prevCentroidVelocity = new Vector3();
  private centroidAcceleration = new Vector3();

  constructor() {
    const { liquidBody, liquidSurface, bottleWorldInverse, dragRadius } =
      this.init();

    this.liquidBody = liquidBody;
    this.liquidSurface = liquidSurface;
    this.bottleWorldInverse = bottleWorldInverse;
    this.dragRadius = dragRadius;

    this.prevQuaternion.copy(liquidBody.quaternion);
    this.levelValue = this.maxLevel;
  }

  onRenderUpdate(delta: number) {
    // Runs after any rotation this frame so the waves pick it up as velocity.
    this.updateTargetLevel();
    this.updateWaves(delta);
    this.updateLevel(delta);
    this.updateTilt(delta);

    this.liquidBody.material.uniforms.uTime.value += delta * 5;

    this.liquidBody.updateMatrixWorld(true);
    this.bottleWorldInverse.value.copy(this.liquidBody.matrixWorld).invert();
  }

  returnToUpright(delta: number) {
    const rate = 4;

    this.liquidBody.quaternion.slerp(
      Bottle.UPRIGHT,
      1 - Math.exp(-rate * delta),
    );
  }

  private init() {
    const liquidUniforms = {
      uLevel: new Uniform(this.maxLevel),
      uTime: new Uniform(0),
      uVelocityCoeffX: new Uniform(0),
      uVelocityCoeffZ: new Uniform(0),
      uTilt: new Uniform(this.tilt),
    };

    const liquidBody = new Mesh(
      new CylinderGeometry(
        this.radius,
        this.radius,
        this.halfHeight * 2,
        this.radialSegments,
      ),
      new ShaderMaterial({
        vertexShader: liquidVertexShader,
        fragmentShader: liquidFragmentShader,
        uniforms: liquidUniforms,
      }),
    );
    liquidBody.geometry.computeBoundingSphere();
    if (!liquidBody.geometry.boundingSphere)
      throw new Error("Failed to get bounding sphere");
    const dragRadius = liquidBody.geometry.boundingSphere.radius * 1.3;

    const surfaceGeometry = new PlaneGeometry(3.2, 3.2, 192, 192);
    surfaceGeometry.rotateX(-Math.PI / 2);

    const bottleWorldInverse = new Uniform(new Matrix4());

    const liquidSurface = new Mesh(
      surfaceGeometry,
      new ShaderMaterial({
        vertexShader: liquidSurfaceVertexShader,
        fragmentShader: liquidSurfaceFragmentShader,
        uniforms: {
          ...liquidUniforms,
          uBottleWorldInverse: bottleWorldInverse,
          uRadius: new Uniform(this.radius),
          uHalfHeight: new Uniform(this.halfHeight),
        },
        side: DoubleSide,
      }),
    );

    return {
      liquidBody,
      bottleWorldInverse,
      liquidSurface,
      dragRadius,
    };
  }

  private updateTargetLevel() {
    this.reuseVector3.set(0, 1, 0).applyQuaternion(this.liquidBody.quaternion);

    const tilt = this.reuseVector3.angleTo(Bottle.WORLD_UP);
    const clampedTilt = Math.min(tilt, Math.PI / 2);

    this.targetLevel = (1 - clampedTilt / (Math.PI / 2)) * this.maxLevel;
  }

  private updateLevel(delta: number) {
    const stiffness = 45;
    const damping = 9;

    const force =
      (this.targetLevel - this.levelValue) * stiffness -
      this.levelVelocity * damping;

    this.levelVelocity += force * delta;
    this.levelValue += this.levelVelocity * delta;

    this.liquidBody.material.uniforms.uLevel.value = this.levelValue;
  }

  private updateWaves(delta: number) {
    // World-space rotation this frame: q = Δ · qPrev  →  Δ = q · qPrev⁻¹
    this.deltaQuaternion
      .copy(this.prevQuaternion)
      .invert()
      .premultiply(this.liquidBody.quaternion);

    this.prevQuaternion.copy(this.liquidBody.quaternion);

    // q and -q are the same rotation; force w >= 0 or the sign of the velocity flips
    const sign = this.deltaQuaternion.w < 0 ? -1 : 1;
    const { x, y, z } = this.deltaQuaternion;

    // Rotation vector (axis × angle) / delta. Euler deltas would spike by ~π
    // per frame whenever rotation.y crosses ±π/2.
    const sinHalf = Math.sqrt(x * x + y * y + z * z);
    const angle = 2 * Math.atan2(sinHalf, sign * this.deltaQuaternion.w);
    // angle / sinHalf → 2 as sinHalf → 0
    const scale = (sign * (sinHalf > 1e-8 ? angle / sinHalf : 2)) / delta;

    const isMoving = angle > 0.00001;

    if (isMoving) {
      this.angularVelocity.set(x * scale, y * scale, z * scale);

      const sensitivity = 0.04;
      const maxWave = 0.3;

      this.waveTarget.set(
        clamp(this.angularVelocity.x * sensitivity, -maxWave, maxWave),
        clamp(this.angularVelocity.z * sensitivity, -maxWave, maxWave),
      );
    } else {
      this.angularVelocity.set(0, 0, 0);
      this.waveTarget.set(0, 0);
    }

    const attack = 15;
    const decay = 2.5;

    const lambda = isMoving ? attack : decay;

    this.waveCoeff.x = damp(this.waveCoeff.x, this.waveTarget.x, lambda, delta);
    this.waveCoeff.y = damp(this.waveCoeff.y, this.waveTarget.y, lambda, delta);

    this.liquidBody.material.uniforms.uVelocityCoeffX.value = this.waveCoeff.x;
    this.liquidBody.material.uniforms.uVelocityCoeffZ.value = this.waveCoeff.y;
  }

  private updateTilt(delta: number) {
    // Liquid centroid relative to the bottle pivot, in world space.
    this.centroidOffset
      .set(0, (this.levelValue - this.halfHeight) * 0.5, 0)
      .applyQuaternion(this.liquidBody.quaternion);

    // v = ω × r is exact, so acceleration needs only one finite difference.
    this.centroidVelocity.crossVectors(
      this.angularVelocity,
      this.centroidOffset,
    );

    this.reuseVector3
      .subVectors(this.centroidVelocity, this.prevCentroidVelocity)
      .divideScalar(delta);

    this.prevCentroidVelocity.copy(this.centroidVelocity);

    this.centroidAcceleration.lerp(
      this.reuseVector3,
      1 - Math.exp(-Bottle.ACCEL_SMOOTHING * delta),
    );

    const maxSlope = Bottle.MAX_TILT_SLOPE;

    // The surface sits normal to effective gravity g - a, so its slope is -a / g.
    this.tiltTarget.set(
      clamp(-this.centroidAcceleration.x / Bottle.GRAVITY, -maxSlope, maxSlope),
      clamp(-this.centroidAcceleration.z / Bottle.GRAVITY, -maxSlope, maxSlope),
    );

    const stiffness = Bottle.SLOSH_FREQUENCY * Bottle.SLOSH_FREQUENCY;
    const damping = 2 * Bottle.SLOSH_DAMPING * Bottle.SLOSH_FREQUENCY;

    // Damped harmonic oscillator: overshoots the target and rings out.
    this.tiltVelocity.x +=
      ((this.tiltTarget.x - this.tilt.x) * stiffness -
        this.tiltVelocity.x * damping) *
      delta;
    this.tiltVelocity.y +=
      ((this.tiltTarget.y - this.tilt.y) * stiffness -
        this.tiltVelocity.y * damping) *
      delta;

    this.tilt.x = clamp(
      this.tilt.x + this.tiltVelocity.x * delta,
      -maxSlope,
      maxSlope,
    );
    this.tilt.y = clamp(
      this.tilt.y + this.tiltVelocity.y * delta,
      -maxSlope,
      maxSlope,
    );
  }
}
