"use client";
import { useMemo } from "react";
import { BufferAttribute, Color, DoubleSide, LatheGeometry, RepeatWrapping, Shape, ShapeGeometry, Vector2 } from "three";
import { MEADOW_HOLE, MEADOW_HOUSES, holeDrop, meadowHeight } from "../../terrain";
import { useCanvas } from "../props";

type House = (typeof MEADOW_HOUSES)[number];
const T = 0.2; // wall thickness, as in the colliders (zones.ts)
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
  const { x, z, w, d, h, color, roof } = house;
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
    <group position={[x, y, z]}>
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

/** The hole: a soft lip of bare earth that rolls over into a black shaft. */
function Hole() {
  const geometry = useMemo(() => {
    const { x, z, r, rim } = MEADOW_HOLE;
    const top = meadowHeight(x + rim + 0.5, z) + holeDrop(rim + 0.5); // ground level around it, before the drop
    const pts: Vector2[] = [];
    for (let k = 0; k <= 24; k++) {
      const rr = rim + 0.3 - ((rim + 0.3 - r) * k) / 24;
      pts.push(new Vector2(rr, top - holeDrop(rr) + 0.03));
    }
    for (let k = 1; k <= 12; k++) pts.push(new Vector2(r - 0.15 * Math.min(1, k / 4), top - holeDrop(r) - k * 2.2));
    pts.reverse();
    const g = new LatheGeometry(pts, 64);
    // the lip follows the real ground (it is not quite level around the hole), the shaft hangs below it
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const px = p.getX(i);
      const pz = p.getZ(i);
      if (Math.hypot(px, pz) >= r - 0.01) p.setY(i, meadowHeight(x + px, z + pz) + 0.03);
    }
    // grass at the rim, earth on the lip, darkness down the shaft
    const pos = g.attributes.position;
    const col = new Float32Array(pos.count * 3);
    const grass = new Color("#4f8a2a");
    const earth = new Color("#5a4632");
    const c = new Color();
    for (let i = 0; i < pos.count; i++) {
      const depth = top - pos.getY(i);
      c.copy(grass).lerp(earth, Math.min(1, depth / 0.35)).multiplyScalar(Math.max(0, 1 - Math.max(0, depth - 0.5) / 1.4));
      col.set([c.r, c.g, c.b], i * 3);
    }
    g.setAttribute("color", new BufferAttribute(col, 3));
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
export function RoadSign({ x, z, ry = 0, lines }: { x: number; z: number; ry?: number; lines: string[] }) {
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
    <group position={[x, y, z]} rotation={[0, ry, 0]}>
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
      <RoadSign x={MEADOW_HOLE.x + 4.5} z={MEADOW_HOLE.z + 2.5} ry={0.5} lines={["WATCH", "YOUR", "STEP"]} />
    </>
  );
}
