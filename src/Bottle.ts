import {
  CylinderGeometry,
  DoubleSide,
  Matrix4,
  Mesh,
  PlaneGeometry,
  ShaderMaterial,
  Uniform,
} from "three";

import liquidVertexShader from "./shaders/liquid/vertex.glsl";
import liquidFragmentShader from "./shaders/liquid/fragment.glsl";
import liquidSurfaceVertexShader from "./shaders/liquid-surface/vertex.glsl";
import liquidSurfaceFragmentShader from "./shaders/liquid-surface/fragment.glsl";

export default class Bottle {
  public readonly maxLevel = 0.6;
  public targetLevel = this.maxLevel;
  public readonly bottleWorldInverse;

  public readonly liquidSurface;
  public readonly liquidBody;

  private readonly radius = 0.5;
  private readonly halfHeight = 1.5;
  private readonly radialSegments = 32;

  constructor() {
    const liquidUniforms = {
      uLevel: new Uniform(this.maxLevel),
      uTime: new Uniform(0),
      uVelocityCoeffX: new Uniform(0),
      uVelocityCoeffZ: new Uniform(0),
    };

    this.liquidBody = new Mesh(
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

    const surfaceGeometry = new PlaneGeometry(4, 4, 32, 32);
    surfaceGeometry.rotateX(-Math.PI / 2);

    this.bottleWorldInverse = new Uniform(new Matrix4());

    this.liquidSurface = new Mesh(
      surfaceGeometry,
      new ShaderMaterial({
        vertexShader: liquidSurfaceVertexShader,
        fragmentShader: liquidSurfaceFragmentShader,
        uniforms: {
          ...liquidUniforms,
          uBottleWorldInverse: this.bottleWorldInverse,
          uRadius: new Uniform(this.radius),
          uHalfHeight: new Uniform(this.halfHeight),
        },
        side: DoubleSide,
      }),
    );
  }
}
