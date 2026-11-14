"use client";
import { useMemo } from "react";
import { ExtrudeGeometry, Path, Shape, ShapeGeometry, Vector2 } from "three";
import type { Piece } from "../../archi/build";
import { GARDEN, PLAY } from "../../places/dreamcore";
import { Pieces, seeded, useCanvas } from "../props";
import { Balls, Carousel, CartoonTree, HangingCloud, Sign, Tree, WallLetters } from "./Kit";
import { House, Turbine } from "./Outdoors";

/** The ball pit, to wade through, and the carousel turning in it. */
export function BallPit() {
  const { pit, carousel, pitRoom } = PLAY;
  return (
    <>
      <Balls
        count={1700}
        seed={9}
        place={(r) => {
          let x = 0;
          let z = 0;
          do {
            x = pit.x + (r() - 0.5) * pit.w * 0.97;
            z = pit.z + (r() - 0.5) * pit.d * 0.95;
          } while (Math.hypot(x - carousel.x, z - carousel.z) < carousel.r + 0.1);
          return [x, -0.32 + r() * 0.36, z];
        }}
      />
      <Carousel x={carousel.x} y={-0.4} z={carousel.z} r={carousel.r - 0.1} />
      <WallLetters x={-6} y={4.4} z={pitRoom.z - pitRoom.d / 2 + 0.06} ry={0} text="ABC" />
      <WallLetters x={pitRoom.w / 2 - 0.06} y={4.2} z={-24} ry={-Math.PI / 2} text="123" />
      <HangingCloud x={-5} y={5.2} z={-22} top={7} ry={0.3} />
      <HangingCloud x={5.5} y={5.6} z={-29} top={7} ry={-0.4} s={0.8} />
      <Sign x={8.5} z={-20} ry={-0.6} tilt={-0.07} lines={["NO", "DIVING"]} />
    </>
  );
}

/** The bed in its alcove: a white frame, a green striped blanket, a small night light. */
export function Bed() {
  const { x, z, w } = PLAY.bed;
  const stripes = useCanvas(128, 128, (ctx) => {
    for (let i = 0; i < 8; i++) {
      ctx.fillStyle = i % 2 ? "#3f9a4a" : "#a9dc8c";
      ctx.fillRect(0, i * 16, 128, 16);
    }
  });
  const frame = useMemo<Piece[]>(
    () => [
      { x: x + 1.2, y: 0, z, w: 2.1, h: 0.35, d: 1.5 },
      { x: x + w / 2 - 0.35, y: 0, z, w: 0.12, h: 1.1, d: 1.6 },
      { x: x - 0.1, y: 0, z, w: 0.1, h: 0.7, d: 1.6 },
    ],
    [x, z, w],
  );
  return (
    <>
      <Pieces pieces={frame} color="#f4f1ea" />
      <mesh position={[x + 1.15, 0.5, z]}>
        <boxGeometry args={[2, 0.3, 1.45]} />
        <meshStandardMaterial map={stripes} roughness={0.95} />
      </mesh>
      <mesh position={[x + 2.05, 0.72, z]}>
        <boxGeometry args={[0.4, 0.14, 1]} />
        <meshStandardMaterial color="#ffffff" roughness={1} />
      </mesh>
      <mesh position={[x - 1.6, 0.8, z - 2.3]}>
        <sphereGeometry args={[0.16, 16, 12]} />
        <meshBasicMaterial color="#ffd9a0" toneMapped={false} />
      </mesh>
      <pointLight position={[x - 1.6, 1.1, z - 2]} intensity={2.5} distance={7} decay={1.6} color="#ffcf8a" />
    </>
  );
}

/** The white bench in its niche of sky. */
export function Bench() {
  const { x, z, w } = PLAY.bench;
  const pieces = useMemo<Piece[]>(() => {
    const bx = x - w / 2 + 0.55;
    return [
      { x: bx, y: 0.42, z, w: 0.5, h: 0.06, d: 2.2 },
      { x: bx - 0.24, y: 0.5, z, w: 0.06, h: 0.55, d: 2.2 },
      ...[-0.95, 0.95].map((dz) => ({ x: bx, y: 0, z: z + dz, w: 0.46, h: 0.42, d: 0.08 })),
    ];
  }, [x, z, w]);
  return <Pieces pieces={pieces} color="#f6f6f2" roughness={0.5} />;
}

/** The purple room: dark, on two levels, lit by hanging round lights. */
export function PurpleRoom() {
  const { x, z } = PLAY.purple;
  const globes = useMemo(() => {
    const r = seeded(21);
    return Array.from({ length: 9 }, () => ({ x: x + (r() - 0.5) * 10, y: 3.5 + r() * 4.5, z: z + (r() - 0.5) * 11, s: 0.18 + r() * 0.2 }));
  }, [x, z]);
  return (
    <>
      {globes.map((g, k) => (
        <mesh key={k} position={[g.x, g.y, g.z]}>
          <sphereGeometry args={[g.s, 16, 12]} />
          <meshBasicMaterial color={k % 3 ? "#f2e8ff" : "#c9a8ff"} toneMapped={false} />
        </mesh>
      ))}
      <pointLight position={[x - 1, 6, z - 2]} intensity={14} distance={18} decay={1.4} color="#a98cff" />
      <pointLight position={[x + 3, 3, z + 4]} intensity={4} distance={10} decay={1.6} color="#e6dcff" />
    </>
  );
}

/** The dome tunnel: a round dark hole at the end, and a river of balls pouring out of it towards the pit. */
export function Tunnel() {
  const { tunnel, mouth } = PLAY;
  const end = tunnel.z - tunnel.d / 2;
  const rim = useMemo(() => {
    const outline = new Shape();
    outline.absarc(0, 0, 2.5, 0, Math.PI * 2, false);
    outline.holes.push(new Path([new Vector2(-mouth.w / 2, -1.6), new Vector2(mouth.w / 2, -1.6), new Vector2(mouth.w / 2, mouth.h - 1.6), new Vector2(-mouth.w / 2, mouth.h - 1.6)]));
    return new ShapeGeometry(outline, 48);
  }, [mouth.w, mouth.h]);
  return (
    <>
      <mesh geometry={rim} position={[mouth.x, 1.6, end + 0.04]}>
        <meshBasicMaterial color="#05060a" />
      </mesh>
      <Balls
        count={1300}
        seed={4}
        place={(r) => {
          const t = r();
          const z = end + 0.4 + t * (tunnel.d - 3);
          const cx = Math.sin(t * 5.5) * 1.6 * t;
          const w = 1.1 + t * 1.2;
          return [cx + (r() - 0.5) * w * 2, 0.1 + r() * 0.12 * (1 - t), z];
        }}
      />
      <Sign x={-2.6} z={end + 6} ry={0.5} tilt={0.18} lines={["FLOOD", "ZONE"]} />
      <CartoonTree x={-2.8} z={tunnel.z + 6} s={0.8} seed={5} />
      <HangingCloud x={1.5} y={4} z={tunnel.z + 2} top={tunnel.ceil} s={0.7} />
      <HangingCloud x={-1.8} y={4.3} z={tunnel.z - 5} top={tunnel.ceil} s={0.6} ry={0.6} />
    </>
  );
}

/** Wooden palisades, trees and signs on the stage, like the corners of a play set. */
export function StageExtras() {
  const { stage } = PLAY;
  const palisade = useMemo<Piece[]>(() => {
    const p: Piece[] = [];
    for (let k = 0; k < 7; k++) p.push({ x: -7.5 + k * 0.18, y: 0, z: stage.z + 3.5 + Math.sin(k) * 0.05, w: 0.16, h: 1.9 + (k % 2) * 0.1, d: 0.06, a: 0.4 });
    for (let k = 0; k < 6; k++) p.push({ x: -6.2 + k * 0.17, y: 0, z: stage.z + 2.6, w: 0.15, h: 1.8, d: 0.06, a: -0.5 });
    return p;
  }, [stage.z]);
  return (
    <>
      <Pieces pieces={palisade} color="#b98a5a" surfaceKey="wood" tile={1.2} />
      <CartoonTree x={-8.5} z={stage.z - 3} seed={2} />
      <CartoonTree x={9} z={stage.z - 5} s={0.75} seed={8} />
      <Sign x={-3.5} z={stage.z + 4.5} ry={0.3} tilt={0.05} lines={["HILL", "BLOCKS", "VIEW"]} />
      <Sign x={-9.2} z={stage.z - 1} ry={0.9} tilt={-0.1} lines={["SCENIC", "ROUTE"]} scale={0.8} />
      <HangingCloud x={-4} y={5.6} z={stage.z + 1} top={8} ry={0.2} />
      <HangingCloud x={4.5} y={5.2} z={stage.z + 3} top={8} ry={-0.3} s={0.8} />
    </>
  );
}

/** The great hall: a ring up on pillars, carrying tiny yellow houses, trees and turbines; light from above. */
export function Hall() {
  const { hall, ring } = PLAY;
  const deck = useMemo(() => {
    const outline = new Shape();
    outline.absarc(0, 0, ring.outer, 0, Math.PI * 2, false);
    const hole = new Path();
    hole.absarc(0, 0, ring.inner, 0, Math.PI * 2, true);
    outline.holes.push(hole);
    const g = new ExtrudeGeometry(outline, { depth: 0.5, bevelEnabled: false, curveSegments: 64 });
    g.rotateX(Math.PI / 2);
    return g;
  }, [ring.outer, ring.inner]);
  const fence = useMemo<Piece[]>(() => {
    const p: Piece[] = [];
    for (let k = 0; k < 120; k++) {
      const a = (k / 120) * Math.PI * 2;
      p.push({ x: hall.x + Math.sin(a) * (ring.outer - 0.15), y: ring.y, z: hall.z + Math.cos(a) * (ring.outer - 0.15), w: 0.06, h: 0.7, d: 0.03, a });
    }
    return p;
  }, [hall.x, hall.z, ring.outer, ring.y]);
  return (
    <>
      <mesh geometry={deck} position={[hall.x, ring.y, hall.z]}>
        <meshStandardMaterial color="#f4f1ea" roughness={0.9} />
      </mesh>
      <mesh position={[hall.x, ring.y + 0.01, hall.z]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[ring.inner, ring.outer - 0.05, 64]} />
        <meshStandardMaterial color="#5a9a3a" roughness={1} />
      </mesh>
      <Pieces pieces={fence} color="#ffffff" />
      {[0.3, 1.9, 3.4, 4.9].map((a, k) => (
        <House key={a} x={hall.x + Math.sin(a) * 8.5} y={ring.y} z={hall.z + Math.cos(a) * 8.5} w={1.8} d={1.6} h={1.5} color="#efd27a" roof="#7a5a48" lit={k % 2 ? "#fff1c0" : undefined} ry={a} />
      ))}
      {[1.1, 2.6, 4.2, 5.7].map((a, k) => (
        <Tree key={a} x={hall.x + Math.sin(a) * 8.6} y={ring.y} z={hall.z + Math.cos(a) * 8.6} s={0.6} seed={k + 11} />
      ))}
      {[2.2, 5.1].map((a) => (
        <Turbine key={a} x={hall.x + Math.sin(a) * 9} y={ring.y} z={hall.z + Math.cos(a) * 9} s={0.11} />
      ))}
      <Sign x={hall.x + 4} z={hall.z + 15} ry={-0.3} tilt={0.09} lines={["EXIT", "ONLY"]} />
      <Tree x={hall.x - 15} z={hall.z + 4} seed={31} />
      <Tree x={hall.x + 14} z={hall.z - 6} s={1.2} seed={32} />
      <pointLight position={[hall.x, hall.ceil - 1, hall.z]} intensity={40} distance={34} decay={1.2} color="#fff4e0" />
      <pointLight position={[hall.x, 2.5, hall.z]} intensity={12} distance={14} decay={1.4} color="#fff4e0" />
    </>
  );
}

/** The long garden: picket fence, trees in white planters, turbines indoors, arches, sconces, a bench. */
export function Garden() {
  const { garden } = PLAY;
  const { fence, planters, turbines, arches } = GARDEN;
  const pickets = useMemo<Piece[]>(() => {
    const p: Piece[] = [];
    for (let z = fence.z0; z > fence.z1; z -= 0.22) p.push({ x: fence.x, y: 0, z, w: 0.04, h: 0.95 + (Math.round(z / 0.22) % 2) * 0.05, d: 0.09 });
    for (const y of [0.3, 0.75]) p.push({ x: fence.x + 0.04, y, z: (fence.z0 + fence.z1) / 2, w: 0.03, h: 0.07, d: fence.z0 - fence.z1 });
    return p;
  }, [fence]);
  const boxes = useMemo<Piece[]>(
    () => [
      ...planters.map((p) => ({ x: p.x, y: 0, z: p.z, w: 1.6, h: 0.45, d: 1.6 })),
      // a bench against the left wall, beyond the fence
      { x: -garden.w / 2 + 0.6, y: 0.42, z: -113, w: 0.5, h: 0.06, d: 1.8 },
      { x: -garden.w / 2 + 0.36, y: 0.48, z: -113, w: 0.06, h: 0.5, d: 1.8 },
    ],
    [planters, garden.w],
  );
  const archShape = useMemo(() => {
    const s = new Shape();
    s.moveTo(-0.9, 0);
    s.lineTo(-0.9, 1.6);
    s.absarc(0, 1.6, 0.9, Math.PI, 0, true);
    s.lineTo(0.9, 0);
    return new ShapeGeometry(s, 24);
  }, []);
  return (
    <>
      <Pieces pieces={pickets} color="#f8f8f4" />
      <Pieces pieces={boxes} color="#f2efe8" roughness={0.7} />
      {planters.map((p, k) => (
        <group key={p.z}>
          <mesh position={[p.x, 0.47, p.z]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[1.4, 1.4]} />
            <meshStandardMaterial color="#4f7f2e" roughness={1} />
          </mesh>
          <Tree x={p.x} y={0.45} z={p.z} s={1.3} seed={40 + k} />
        </group>
      ))}
      {turbines.map((t) => (
        <Turbine key={t.z} x={t.x} z={t.z} s={0.24} />
      ))}
      {arches.map((z) => (
        <mesh key={z} geometry={archShape} position={[garden.w / 2 - 0.03, 0, z]} rotation={[0, -Math.PI / 2, 0]}>
          <meshBasicMaterial color="#0d0d0f" />
        </mesh>
      ))}
      {[-106, -114, -122, -130].map((z) => (
        <mesh key={z} position={[-garden.w / 2 + 0.12, 2.6, z]}>
          <sphereGeometry args={[0.13, 12, 10]} />
          <meshBasicMaterial color="#fff2d6" toneMapped={false} />
        </mesh>
      ))}
      {/* skylights: long strips of daylight across the ceiling */}
      {[-104, -112, -120, -128].map((z) => (
        <mesh key={z} position={[0, garden.ceil - 0.02, z]} rotation={[Math.PI / 2, 0, 0]}>
          <planeGeometry args={[garden.w - 3, 2.2]} />
          <meshBasicMaterial color="#f6f2e6" toneMapped={false} />
        </mesh>
      ))}
      <pointLight position={[-garden.w / 2 + 1, 2.8, -110]} intensity={5} distance={12} decay={1.5} color="#ffe2b0" />
      <pointLight position={[0, garden.ceil - 1, -108]} intensity={26} distance={26} decay={1.2} color="#fff4e0" />
      <pointLight position={[0, garden.ceil - 1, -126]} intensity={26} distance={26} decay={1.2} color="#fff4e0" />
      <Sign x={2} z={-132} ry={0.4} tilt={-0.06} lines={["DETOUR"]} />
    </>
  );
}
