"use client";
import { useMemo, useRef, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import { Color, DoubleSide, ShaderMaterial, UniformsLib, UniformsUtils } from "three";
import Atmosphere from "../Atmosphere";
import Architecture, { type Palette } from "./Architecture";
import type { Built } from "./build";

/** The common frame of a built place: its air (background, fog), its ambient light, its architecture, its props. */
export function Place({ built, palette, air, density, hemi = 0.3, flicker, children }: {
  built: Built;
  palette: Palette;
  air: string;
  density: number;
  hemi?: number;
  flicker?: number;
  children?: ReactNode;
}) {
  return (
    <>
      <Atmosphere background={air} fog={air} density={density} />
      <hemisphereLight args={[palette.light, "#1a1712", hemi]} />
      <Architecture built={built} palette={palette} flicker={flicker} />
      {children}
    </>
  );
}

const waterVertex = /* glsl */ `
varying vec3 vWorld;
#include <common>
#include <fog_pars_vertex>
void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  vec4 mvPosition = viewMatrix * world;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;

const waterFragment = /* glsl */ `
uniform float uTime;
uniform vec3 uColor;
uniform vec3 uGlint;
uniform float uOpacity;
varying vec3 vWorld;
#include <common>
#include <fog_pars_fragment>
void main() {
  vec2 p = vWorld.xz;
  // slow interfering ripples: their slopes light up like caustics on the surface
  float h = sin(p.x * 1.7 + uTime * 0.9) * 0.5 + sin(p.y * 2.3 - uTime * 0.7) * 0.5
          + sin((p.x + p.y) * 3.1 + uTime * 1.3) * 0.25 + sin((p.x - p.y) * 4.7 - uTime * 1.1) * 0.15;
  float glint = pow(max(0.0, sin(h * 3.0 + uTime * 0.5)), 12.0);
  vec3 c = uColor + uGlint * glint * 0.8;
  gl_FragColor = vec4(c, uOpacity + glint * 0.2);
  #include <colorspace_fragment>
  #include <fog_fragment>
}`;

/** Still, shallow water: a translucent sheet with moving glints. Hidden wherever the floor is higher. */
export function Water({ y, x = 0, z = 0, w = 300, d = 300, color = "#2fb3b0", glint = "#e8fffb", opacity = 0.62 }: { y: number; x?: number; z?: number; w?: number; d?: number; color?: string; glint?: string; opacity?: number }) {
  const mat = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: waterVertex,
        fragmentShader: waterFragment,
        transparent: true,
        depthWrite: false,
        side: DoubleSide,
        fog: true,
        uniforms: UniformsUtils.merge([UniformsLib.fog, { uTime: { value: 0 }, uColor: { value: new Color(color) }, uGlint: { value: new Color(glint) }, uOpacity: { value: opacity } }]),
      }),
    [color, glint, opacity],
  );
  const ref = useRef(mat);
  ref.current = mat;
  useFrame(({ clock }) => {
    ref.current.uniforms.uTime.value = clock.elapsedTime;
  });
  return (
    <mesh position={[x, y, z]} rotation={[-Math.PI / 2, 0, 0]} material={mat}>
      <planeGeometry args={[w, d]} />
    </mesh>
  );
}
