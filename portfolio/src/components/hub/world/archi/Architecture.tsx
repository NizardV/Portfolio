"use client";
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Color, InstancedMesh, MeshBasicMaterial, Object3D, PlaneGeometry, Vector3, type Group, type PointLight } from "three";
import { byQuality, useQuality } from "../settings";
import { TILE, type Built } from "./build";
import { surface, type SurfaceKey } from "./materials";

/** How a place colours the neutral surfaces, and its light. */
export type Palette = {
  surfaces: Partial<Record<string, string>>; // tint per surface key (wallpaper, carpet, ceiling…)
  trim: string;
  rail: string;
  panel: string; // colour of the lit tubes
  light: string; // colour of the light they cast
  intensity: number;
  range: number;
  roughness?: number;
};

const UP = new Object3D();
const EYE = new Vector3();

function Surface({ geometry, kind, tint, roughness = 0.9, side }: { geometry: import("three").BufferGeometry; kind: string; tint?: string; roughness?: number; side?: 0 | 1 | 2 }) {
  const tex = surface((kind === "trim" ? "plaster" : kind) as SurfaceKey);
  return (
    <mesh geometry={geometry} dispose={null}>
      <meshStandardMaterial map={tex.map} bumpMap={tex.bump} bumpScale={kind === "carpet" || kind === "stain" ? 1.6 : 0.8} color={tint ?? "#ffffff"} roughness={roughness} vertexColors side={side} />
    </mesh>
  );
}

/**
 * Renders a built place. Lighting is the costly part of a huge interior, so: every tube is an emissive instance
 * (bloom makes it glow), and only a small pool of real lights follows the player, sitting on the nearest live tubes.
 */
export default function Architecture({ built, palette, flicker = 0.05 }: { built: Built; palette: Palette; flicker?: number }) {
  const quality = useQuality();
  const pool = byQuality(quality, { low: 3, phone: 4, desktop: 8, high: 10 });
  const lights = useRef<(PointLight | null)[]>([]);
  const t0 = useRef(0);
  const root = useRef<Group>(null);

  const { mesh, live, flickers } = useMemo(() => {
    const m = new InstancedMesh(new PlaneGeometry(1, 1), new MeshBasicMaterial({ toneMapped: false }), Math.max(1, built.panels.length));
    const on = new Color(palette.panel).multiplyScalar(1.6); // > 1: picked up by bloom
    const off = new Color("#6f6c63"); // a dead tube: an unlit diffuser, grey, not a hole in the ceiling
    const liveIdx: number[] = [];
    built.panels.forEach((p, i) => {
      UP.position.set(p.x, p.y, p.z);
      UP.rotation.set(Math.PI / 2, 0, p.a);
      UP.scale.set(p.size[0], p.size[1], 1);
      UP.updateMatrix();
      m.setMatrixAt(i, UP.matrix);
      m.setColorAt(i, p.dead ? off : on);
      if (!p.dead) liveIdx.push(i);
    });
    m.count = built.panels.length;
    let seed = built.panels.length * 31 + 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    return { mesh: m, live: liveIdx, flickers: new Set(liveIdx.filter(() => rnd() < flicker)) };
  }, [built, palette.panel, flicker]);

  const on = useMemo(() => new Color(palette.panel).multiplyScalar(1.6), [palette.panel]);
  const dim = useMemo(() => new Color(palette.panel).multiplyScalar(0.12), [palette.panel]);

  useFrame(({ camera, clock }) => {
    const t = clock.elapsedTime;
    // flickering tubes
    if (flickers.size) {
      for (const i of flickers) {
        const off = Math.sin(t * 13.1 + i) * Math.sin(t * 3.7 + i * 0.3) > 0.72 || Math.sin(t * 0.9 + i) > 0.98;
        mesh.setColorAt(i, off ? dim : on);
      }
      mesh.instanceColor!.needsUpdate = true;
    }
    // the light pool: re-pick the nearest live tubes a few times per second
    if (t - t0.current > 0.2) {
      t0.current = t;
      // the camera in this place's own frame (it may be seen through a doorway, moved and turned)
      EYE.copy(camera.position);
      root.current?.worldToLocal(EYE);
      const cx = EYE.x;
      const cz = EYE.z;
      const nearest = live
        .map((i) => ({ i, d: (built.panels[i].x - cx) ** 2 + (built.panels[i].z - cz) ** 2 + (built.panels[i].y - EYE.y) ** 2 * 0.3 }))
        .sort((a, b) => a.d - b.d)
        .slice(0, pool);
      lights.current.forEach((l, k) => {
        if (!l) return;
        const n = nearest[k];
        if (!n) { l.intensity = 0; return; }
        const p = built.panels[n.i];
        l.position.set(p.x, p.y - 0.35, p.z);
        l.userData.panel = n.i;
        l.userData.base = palette.intensity * (p.size[0] > 1.4 ? 1.8 : 1);
      });
    }
    lights.current.forEach((l) => {
      if (!l || l.userData.panel === undefined) return;
      const flick = flickers.has(l.userData.panel) ? (Math.sin(t * 13.1 + l.userData.panel) * Math.sin(t * 3.7 + l.userData.panel * 0.3) > 0.72 ? 0.08 : 1) : 1;
      l.intensity += (l.userData.base * flick - l.intensity) * 0.25; // ease, so swaps never pop
    });
  });

  const tint = (k: string) => palette.surfaces[k];
  return (
    <group ref={root} name="archi">
      {[...built.walls].map(([k, g]) => <Surface key={`w${k}`} geometry={g} kind={k} tint={tint(k)} roughness={palette.roughness} side={2} />)}
      {[...built.floors].map(([k, g]) => <Surface key={`f${k}`} geometry={g} kind={k} tint={tint(`floor:${k}`) ?? tint(k)} roughness={k === "tile" || k === "marble" ? 0.35 : 0.95} />)}
      {[...built.ceilings].map(([k, g]) => <Surface key={`c${k}`} geometry={g} kind={k} tint={tint(`ceil:${k}`) ?? tint(k)} />)}
      {built.trim && (
        <mesh geometry={built.trim} dispose={null}>
          <meshStandardMaterial color={palette.trim} roughness={0.6} side={2} />
        </mesh>
      )}
      {built.rails && (
        <mesh geometry={built.rails} dispose={null}>
          <meshStandardMaterial color={palette.rail} roughness={0.5} metalness={0.4} />
        </mesh>
      )}
      <primitive object={mesh} dispose={null} />
      {Array.from({ length: pool }, (_, k) => (
        <pointLight key={k} ref={(l) => { lights.current[k] = l; }} intensity={0} distance={palette.range} decay={1.7} color={palette.light} />
      ))}
    </group>
  );
}

export { TILE };
