"use client";
import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Color, DoubleSide, InstancedMesh, Matrix4, PlaneGeometry, Quaternion, ShaderMaterial, UniformsLib, UniformsUtils, Vector3 } from "three";
import { byQuality, useQuality } from "../../settings";
import { MEADOW_HEIGHT_GLSL } from "../../terrain";

/**
 * Grass that follows the player: a square patch of blades is laid out once, and the vertex shader wraps every
 * blade to the copy of the patch nearest the camera, then plants it on the relief. Dense grass everywhere
 * you walk, at a fixed cost. Wind = travelling waves, stronger at the tip.
 */
const PATCH = 44; // metres, side of the patch around the player

const vertexShader = /* glsl */ `
uniform float uTime;
uniform vec2 uCenter;
varying float vTip;
varying float vShade;
#include <common>
#include <fog_pars_vertex>
${MEADOW_HEIGHT_GLSL}
void main() {
  vec2 offset = instanceMatrix[3].xz;
  vec2 xz = offset + floor((uCenter - offset) / ${PATCH.toFixed(1)} + 0.5) * ${PATCH.toFixed(1)};
  float d = length(xz - uCenter);
  float fade = 1.0 - smoothstep(${(PATCH / 2 - 6).toFixed(1)}, ${(PATCH / 2).toFixed(1)}, d); // no hard edge
  vec3 local = mat3(instanceMatrix) * position;
  local.y *= fade;
  float tip = uv.y;
  float wave = sin(uTime * 1.2 + xz.x * 0.16 + xz.y * 0.09) * 0.7 + sin(uTime * 2.9 + xz.x * 0.55 + xz.y * 0.3) * 0.25;
  vec3 world = vec3(xz.x + local.x, meadowHeight(xz) + local.y, xz.y + local.z);
  world.x += wave * tip * tip * 0.25;
  world.z += wave * tip * tip * 0.12;
  vec4 mvPosition = viewMatrix * vec4(world, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  vTip = tip;
  vShade = fract(sin(dot(offset, vec2(12.9898, 78.233))) * 43758.5453);
  #include <fog_vertex>
}`;

const fragmentShader = /* glsl */ `
uniform vec3 uBase;
uniform vec3 uTip;
varying float vTip;
varying float vShade;
#include <common>
#include <fog_pars_fragment>
void main() {
  vec3 color = mix(uBase, uTip, vTip) * (0.82 + vShade * 0.32);
  gl_FragColor = vec4(color, 1.0);
  #include <colorspace_fragment>
  #include <fog_fragment>
}`;

function bladeGeometry() {
  const geo = new PlaneGeometry(0.09, 1, 1, 3);
  geo.translate(0, 0.5, 0);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) pos.setX(i, pos.getX(i) * (1 - pos.getY(i) * 0.9)); // pointed tip
  return geo;
}

export default function Grass() {
  const quality = useQuality();
  const count = byQuality(quality, { low: 9000, phone: 18000, desktop: 42000, high: 80000 });

  const mesh = useMemo(() => {
    const material = new ShaderMaterial({
      vertexShader,
      fragmentShader,
      side: DoubleSide,
      fog: true,
      uniforms: UniformsUtils.merge([
        UniformsLib.fog,
        {
          uTime: { value: 0 },
          uCenter: { value: [0, 0] },
          uBase: { value: new Color("#2f6b1c") },
          uTip: { value: new Color("#8fcf4a") },
        },
      ]),
    });
    const blades = new InstancedMesh(bladeGeometry(), material, count);
    const m = new Matrix4();
    const q = new Quaternion();
    const up = new Vector3(0, 1, 0);
    const s = new Vector3();
    const p = new Vector3();
    for (let i = 0; i < count; i++) {
      q.setFromAxisAngle(up, Math.random() * Math.PI);
      const h = 0.2 + Math.random() * 0.32; // ankle to mid-calf: the flowers show above it
      s.set(0.8 + Math.random() * 0.8, h, 1);
      p.set((Math.random() - 0.5) * PATCH, 0, (Math.random() - 0.5) * PATCH);
      blades.setMatrixAt(i, m.compose(p, q, s));
    }
    blades.frustumCulled = false; // positions are decided in the shader
    return blades;
  }, [count]);

  useEffect(() => () => {
    mesh.geometry.dispose();
    (mesh.material as ShaderMaterial).dispose();
    mesh.dispose();
  }, [mesh]);

  useFrame(({ clock, camera }) => {
    const u = (mesh.material as ShaderMaterial).uniforms;
    u.uTime.value = clock.elapsedTime;
    u.uCenter.value = [camera.position.x, camera.position.z];
  });

  return <primitive object={mesh} />;
}
