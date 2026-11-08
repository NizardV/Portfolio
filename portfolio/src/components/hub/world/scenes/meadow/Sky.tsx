"use client";
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { BackSide, CanvasTexture, Color, SRGBColorSpace, type Group } from "three";

export const HORIZON = "#d4e6f7"; // also the fog colour: distant hills melt into the sky
const MID = "#7fb5ee";
const ZENITH = "#2f6fd0";
export const SUN_DIR: [number, number, number] = [0.45, 0.6, 0.25];

const skyVertex = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const skyFragment = /* glsl */ `
uniform vec3 uHorizon;
uniform vec3 uMid;
uniform vec3 uZenith;
uniform vec3 uSun;
varying vec3 vDir;
#include <common>
void main() {
  vec3 dir = normalize(vDir); // per pixel: interpolated directions drew the sphere's facets around the sun
  float h = max(dir.y, 0.0);
  vec3 c = mix(uHorizon, uMid, smoothstep(0.0, 0.18, h));
  c = mix(c, uZenith, smoothstep(0.18, 0.85, h));
  float sun = max(dot(dir, normalize(uSun)), 0.0);
  c += vec3(1.0, 0.97, 0.88) * (pow(sun, 600.0) * 3.0 + pow(sun, 12.0) * 0.18); // sun disc + glow
  gl_FragColor = vec4(c, 1.0);
  #include <colorspace_fragment>
}`;

/** Soft cumulus puff, drawn once on a canvas (no network asset). */
function puffTexture() {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  for (let i = 0; i < 9; i++) {
    const x = size * (0.3 + Math.random() * 0.4);
    const y = size * (0.35 + Math.random() * 0.3);
    const r = size * (0.18 + Math.random() * 0.16);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, "rgba(255,255,255,0.55)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  }
  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  return tex;
}

type Puff = { position: [number, number, number]; scale: number; tint: string };

function useClouds(): Puff[] {
  return useMemo(() => {
    const puffs: Puff[] = [];
    for (let c = 0; c < 16; c++) {
      const angle = (c / 16) * Math.PI * 2 + Math.random() * 0.3;
      const dist = 220 + Math.random() * 200;
      const cx = Math.cos(angle) * dist;
      const cz = Math.sin(angle) * dist;
      const cy = 75 + Math.random() * 70;
      const size = 26 + Math.random() * 26;
      for (let i = 0; i < 7; i++) {
        const below = Math.random() < 0.4;
        puffs.push({
          position: [cx + (Math.random() - 0.5) * size * 1.6, cy + (Math.random() - 0.3) * size * 0.35, cz + (Math.random() - 0.5) * size * 0.8],
          scale: size * (0.6 + Math.random() * 0.6),
          tint: below ? "#e3ebf5" : "#ffffff", // slightly greyer undersides
        });
      }
    }
    return puffs;
  }, []);
}

export default function Sky() {
  const clouds = useRef<Group>(null);
  const puff = useMemo(puffTexture, []);
  const puffs = useClouds();
  const uniforms = useMemo(
    () => ({
      uHorizon: { value: new Color(HORIZON) },
      uMid: { value: new Color(MID) },
      uZenith: { value: new Color(ZENITH) },
      uSun: { value: SUN_DIR },
    }),
    [],
  );

  useFrame((_, dt) => {
    if (clouds.current) clouds.current.rotation.y += dt * 0.0025; // clouds drift, slowly
  });

  return (
    <>
      <mesh renderOrder={-1}>
        <sphereGeometry args={[560, 32, 16]} />
        <shaderMaterial vertexShader={skyVertex} fragmentShader={skyFragment} uniforms={uniforms} side={BackSide} depthWrite={false} fog={false} />
      </mesh>
      <group ref={clouds}>
        {puffs.map((p, i) => (
          <sprite key={i} position={p.position} scale={[p.scale, p.scale * 0.6, 1]}>
            <spriteMaterial map={puff} color={p.tint} transparent depthWrite={false} fog={false} />
          </sprite>
        ))}
      </group>
    </>
  );
}
