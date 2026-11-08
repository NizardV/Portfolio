"use client";
import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Color, DoubleSide, InstancedMesh, Matrix4, PlaneGeometry, Quaternion, ShaderMaterial, UniformsLib, UniformsUtils, Vector3, Vector4 } from "three";
import { byQuality, useQuality } from "../../settings";
import { MEADOW_HEIGHT_GLSL } from "../../terrain";

/**
 * Grass that follows the player. Each layer is a square patch of blades laid out once; the vertex shader wraps
 * every blade to the copy of the patch nearest the camera and plants it on the relief: fixed cost, grass
 * everywhere you walk. Two layers cross-fade so there is no visible ring:
 * - near: dense, fine blades around you;
 * - far: sparser, bigger blades out to ~90 m, so the hills keep their texture in the distance.
 */
const vertexShader = /* glsl */ `
uniform float uTime;
uniform vec2 uCenter;
uniform float uPatch;
uniform vec4 uFade; // fade in from x to y, fade out from z to w (metres from the player)
varying float vTip;
varying float vShade;
#include <common>
#include <fog_pars_vertex>
${MEADOW_HEIGHT_GLSL}
void main() {
  vec2 offset = instanceMatrix[3].xz;
  vec2 xz = offset + floor((uCenter - offset) / uPatch + 0.5) * uPatch;
  float d = length(xz - uCenter);
  float fade = smoothstep(uFade.x, uFade.y, d) * (1.0 - smoothstep(uFade.z, uFade.w, d));
  vec3 local = mat3(instanceMatrix) * position;
  local.y *= fade;
  float tip = uv.y;
  float wave = sin(uTime * 1.2 + xz.x * 0.16 + xz.y * 0.09) * 0.7 + sin(uTime * 2.9 + xz.x * 0.55 + xz.y * 0.3) * 0.25;
  vec3 world = vec3(xz.x + local.x, meadowHeight(xz) + local.y, xz.y + local.z);
  world.x += wave * tip * tip * 0.25 * fade;
  world.z += wave * tip * tip * 0.12 * fade;
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

type Layer = { count: number; patch: number; fade: [number, number, number, number]; width: number; height: [number, number] };

function useGrassLayer({ count, patch, fade, width, height }: Layer) {
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
          uPatch: { value: patch },
          uFade: { value: new Vector4(...fade) },
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
      s.set(width * (0.8 + Math.random() * 0.8), height[0] + Math.random() * (height[1] - height[0]), 1);
      p.set((Math.random() - 0.5) * patch, 0, (Math.random() - 0.5) * patch);
      blades.setMatrixAt(i, m.compose(p, q, s));
    }
    blades.frustumCulled = false; // positions are decided in the shader
    return blades;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- each layer's layout is constant; only the count changes
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

  return mesh;
}

export default function Grass() {
  const quality = useQuality();
  const near = useGrassLayer({
    count: byQuality(quality, { low: 9000, phone: 18000, desktop: 42000, high: 80000 }),
    patch: 44,
    fade: [-1, 0, 15, 21],
    width: 1,
    height: [0.2, 0.52],
  });
  const far = useGrassLayer({
    count: byQuality(quality, { low: 7000, phone: 14000, desktop: 30000, high: 50000 }),
    patch: 190,
    fade: [14, 20, 75, 92],
    width: 2.6,
    height: [0.35, 0.7],
  });
  return (
    <>
      <primitive object={near} />
      <primitive object={far} />
    </>
  );
}
