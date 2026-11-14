"use client";
import { useMemo } from "react";
import { BufferGeometry, Color, DoubleSide, Float32BufferAttribute, RepeatWrapping, Shape, ShapeGeometry, Vector2 } from "three";
import { HOLE_REACH, HOUSE_WALL, MEADOW_HOLE, MEADOW_HOUSES, holeDrop, meadowHeight } from "../../terrain";
import { grassTint } from "./tint";
import { useCanvas } from "../props";

type House = (typeof MEADOW_HOUSES)[number];
const T = HOUSE_WALL; // as in the colliders (zones.ts)
const GAP = 0.65; // half the front doorway of the house with the white door

/** Weatherboards: soft horizontal lines on the house colour, a board every 18 cm or so. */
function useBoards(color: string) {
  const t = useCanvas(16, 64, (ctx) => {
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 16, 64);
    ctx.fillStyle = "rgba(0,0,0,0.08)";
    for (let y = 0; y < 64; y += 8) ctx.fillRect(0, y + 6, 16, 2);
  }, [color]);
  t.wrapS = t.wrapT = RepeatWrapping;
  t.repeat.set(1, 2.2);
  return t;
}

function Window({ x, y, z, ry }: { x: number; y: number; z: number; ry: number }) {
  return (
    <group position={[x, y, z]} rotation={[0, ry, 0]}>
      <mesh position={[0, 0, 0.01]}>
        <planeGeometry args={[1, 1.2]} />
        <meshStandardMaterial color="#334255" roughness={0.15} metalness={0.3} />
      </mesh>
      {[[0, 0.62, 1.16, 0.08], [0, -0.62, 1.16, 0.08], [0.54, 0, 0.08, 1.3], [-0.54, 0, 0.08, 1.3], [0, 0, 1, 0.05], [0, 0, 0.05, 1.2]].map(([px, py, w, h], k) => (
        <mesh key={k} position={[px, py, 0.03]}>
          <boxGeometry args={[w, h, 0.05]} />
          <meshStandardMaterial color="#f7f6f0" />
        </mesh>
      ))}
    </group>
  );
}

/** A house of the meadow: weatherboarded walls, a gable roof, windows; the first one is open and holds the door. */
function MeadowHouse({ house }: { house: House }) {
  const { x, z, w, d, h, color, roof, lean } = house;
  const open = "door" in house && house.door;
  const boards = useBoards(color);
  const y = meadowHeight(x, z);
  const rise = 1.6;
  const gable = useMemo(() => new ShapeGeometry(new Shape([new Vector2(-w / 2, 0), new Vector2(w / 2, 0), new Vector2(0, rise)])), [w]);
  const walls: [number, number, number, number][] = open
    ? [
        [0, -d / 2 + T / 2, w, T],
        [-w / 2 + T / 2, 0, T, d],
        [w / 2 - T / 2, 0, T, d],
        [(-w / 2 - GAP) / 2, d / 2 - T / 2, w / 2 - GAP, T],
        [(w / 2 + GAP) / 2, d / 2 - T / 2, w / 2 - GAP, T],
      ]
    : [[0, 0, w, d]];
  const slope = Math.atan2(rise, w / 2);
  const span = Math.hypot(rise, w / 2) + 0.35;
  return (
    <group position={[x, y, z]} rotation={[0, 0, lean]}>
      {walls.map(([px, pz, ww, dd], k) => (
        <mesh key={k} position={[px, h / 2 - 0.3, pz]}>
          <boxGeometry args={[ww, h + 0.6, dd]} />
          <meshStandardMaterial map={boards} roughness={0.85} />
        </mesh>
      ))}
      {open && (
        <>
          {/* lintel over the doorway, the floor, the ceiling, a warm light inside */}
          <mesh position={[0, 2.3 + (h - 2.3) / 2, d / 2 - T / 2]}>
            <boxGeometry args={[GAP * 2, h - 2.3, T]} />
            <meshStandardMaterial map={boards} roughness={0.85} />
          </mesh>
          <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[w - T * 2, d - T * 2]} />
            <meshStandardMaterial color="#8a6a4a" roughness={0.8} />
          </mesh>
          <mesh position={[0, h - 0.01, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <planeGeometry args={[w - T * 2, d - T * 2]} />
            <meshBasicMaterial color="#d8d2c2" />
          </mesh>
          <mesh position={[0, -0.25 + 0.01, d / 2 + 0.6]}>
            <boxGeometry args={[1.6, 0.5, 1.2]} />
            <meshStandardMaterial color="#b9b4a8" roughness={1} />
          </mesh>
          <pointLight position={[0, h - 0.4, 0]} intensity={3} distance={8} decay={1.6} color="#ffe2b0" />
        </>
      )}
      {!open && (
        <mesh position={[w * 0.18, 1.05, d / 2 + 0.01]}>
          <planeGeometry args={[0.95, 2.1]} />
          <meshStandardMaterial color="#6d5a48" roughness={0.6} />
        </mesh>
      )}
      {/* windows on the long sides and beside the door */}
      <Window x={open ? -w / 4 - 0.4 : -w / 4} y={1.6} z={d / 2 + 0.02} ry={0} />
      {!open && <Window x={w / 4 + 0.9} y={1.6} z={d / 2 + 0.02} ry={0} />}
      {[-1, 1].map((s) => (
        <Window key={s} x={s * (w / 2 + 0.02)} y={1.6} z={0} ry={(s * Math.PI) / 2} />
      ))}
      {/* the roof: two slopes and their gables */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[(s * w) / 4, h + rise / 2, 0]} rotation={[0, 0, -s * slope]}>
          <boxGeometry args={[span, 0.18, d + 0.6]} />
          <meshStandardMaterial color={roof} roughness={0.8} />
        </mesh>
      ))}
      {[-1, 1].map((s) => (
        <mesh key={`g${s}`} geometry={gable} position={[0, h, (s * d) / 2]} rotation={[0, s > 0 ? 0 : Math.PI, 0]}>
          <meshStandardMaterial map={boards} roughness={0.85} side={DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}

/**
 * The hole, part of the ground itself: a polar patch of the real relief (same heights, same grass colour) that sags
 * into bare earth and curls over into a black shaft, ragged all round. It covers the coarse hills mesh, tucked below.
 */
function Hole() {
  const geometry = useMemo(() => {
    const { x, z } = MEADOW_HOLE;
    const A = 120; // around
    const OUT = 2.6; // beyond the widest rim, over the tucked hills mesh
    const LIP = 30; // rings from the inner edge out, denser near the edge
    const SHAFT = 14;
    const g = new BufferGeometry();
    const pos: number[] = [];
    const col: number[] = [];
    const idx: number[] = [];
    const c = new Color();
    const earth = new Color("#4a3a2a");
    const rows = LIP + SHAFT + 1;
    for (let k = 0; k <= A; k++) {
      const a = (k / A) * Math.PI * 2;
      const ca = Math.cos(a);
      const sa = Math.sin(a);
      // the inner edge along this direction: where the shaft starts
      let inner = MEADOW_HOLE.r * 0.7;
      while (holeDrop(inner * ca, inner * sa) > MEADOW_HOLE.depth + 0.2) inner += 0.01;
      const edgeY = meadowHeight(x + inner * ca, z + inner * sa);
      for (let j = 0; j < rows; j++) {
        let rr: number;
        let y: number;
        if (j <= SHAFT) {
          // down the shaft, from 25 m deep up to the edge, narrowing a little
          const t = j / SHAFT;
          rr = inner * (0.85 + 0.15 * t);
          y = edgeY - (1 - t) ** 1.5 * 25;
        } else {
          const t = (j - SHAFT) / LIP;
          rr = inner + (HOLE_REACH.rim + OUT - inner) * t ** 1.6;
          y = meadowHeight(x + rr * ca, z + rr * sa) + 0.04;
        }
        pos.push(rr * ca, y, rr * sa);
        const drop = holeDrop(rr * ca, rr * sa);
        grassTint(x + rr * ca, z + rr * sa, c);
        c.lerp(earth, Math.min(1, Math.max(0, (drop - 0.12) / 0.7)) * (0.8 + 0.2 * Math.sin(a * 13 + rr * 5)));
        c.multiplyScalar(Math.max(0, 1 - Math.max(0, drop - 1.1) / 1.8));
        if (j < SHAFT) c.setRGB(0, 0, 0);
        col.push(c.r, c.g, c.b);
      }
    }
    for (let k = 0; k < A; k++) {
      for (let j = 0; j < rows - 1; j++) {
        const p0 = k * rows + j;
        const p1 = (k + 1) * rows + j;
        idx.push(p0, p0 + 1, p1, p1, p0 + 1, p1 + 1);
      }
    }
    g.setAttribute("position", new Float32BufferAttribute(pos, 3));
    g.setAttribute("color", new Float32BufferAttribute(col, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  }, []);
  return (
    <mesh geometry={geometry} position={[MEADOW_HOLE.x, 0, MEADOW_HOLE.z]}>
      <meshLambertMaterial vertexColors side={DoubleSide} />
    </mesh>
  );
}

/** A yellow diamond road sign on its post. */
export function RoadSign({ x, z, ry = 0, tilt = 0.1, lines }: { x: number; z: number; ry?: number; tilt?: number; lines: string[] }) {
  const face = useCanvas(256, 256, (ctx) => {
    ctx.translate(128, 128);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = "#1a1a12";
    ctx.fillRect(-88, -88, 176, 176);
    ctx.fillStyle = "#f2c230";
    ctx.fillRect(-80, -80, 160, 160);
    ctx.strokeStyle = "#1a1a12";
    ctx.lineWidth = 5;
    ctx.strokeRect(-72, -72, 144, 144);
    ctx.rotate(-Math.PI / 4);
    ctx.fillStyle = "#1a1a12";
    ctx.font = "700 30px Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    lines.forEach((l, k) => ctx.fillText(l, 0, (k - (lines.length - 1) / 2) * 34));
  }, [lines.join("|")]);
  const y = meadowHeight(x, z);
  return (
    <group position={[x, y - 0.1, z]} rotation={[0.04, ry, tilt]}>
      <mesh position={[0, 1.1, 0]}>
        <cylinderGeometry args={[0.035, 0.035, 2.2, 8]} />
        <meshStandardMaterial color="#9a9c98" metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh position={[0, 2.25, 0.04]}>
        <planeGeometry args={[1.2, 1.2]} />
        <meshStandardMaterial map={face} transparent alphaTest={0.5} roughness={0.5} side={DoubleSide} />
      </mesh>
    </group>
  );
}

export default function Houses() {
  return (
    <>
      {MEADOW_HOUSES.map((h) => (
        <MeadowHouse key={`${h.x},${h.z}`} house={h} />
      ))}
      <Hole />
      <RoadSign x={MEADOW_HOLE.x + 5} z={MEADOW_HOLE.z - 3} ry={-0.9} tilt={0.14} lines={["WATCH", "YOUR", "STEP"]} />
      <RoadSign x={-30} z={48} ry={2.6} tilt={-0.08} lines={["NO", "OUTLET"]} />
    </>
  );
}
