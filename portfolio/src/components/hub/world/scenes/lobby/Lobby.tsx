"use client";
import { memo, useMemo } from "react";
import Architecture, { type Palette } from "../../archi/Architecture";
import Atmosphere from "../../Atmosphere";
import { piecesGeometry, type Piece } from "../../archi/build";
import { surface } from "../../archi/materials";
import { EXITS, HALL, lobbyBuilt, WELL, type Exit } from "../../lobby";
import { usePlateTexture } from "./textures";

/** Dirty mono-yellow, dim, heavy: pools of tube light in a sea of brownish dark. */
export const LOBBY_PALETTE: Palette = {
  surfaces: {
    wallpaper: "#d9c160",
    carpet: "#b39c4c",
    stain: "#a48d42",
    ceiling: "#d8cfa4",
    concrete: "#a59f88",
    tile: "#d9ece8",
    void: "#6b5f33",
    "ceil:tile": "#cfe3df",
  },
  trim: "#4a3e1e",
  rail: "#3a3320",
  panel: "#fff3d2",
  light: "#ffe7a8",
  intensity: 13,
  range: 15,
  roughness: 0.95,
};
const FOG = "#1d180a";

/* ---------- the hall's gallery: 6 m up, along the walls, unreachable ---------- */

function Gallery() {
  const geo = useMemo(() => {
    if (HALL.kind !== "box") return null;
    const a = HALL.a ?? 0;
    const y = 6;
    const D = 1.8;
    const at = (lx: number, lz: number): [number, number] => [HALL.cx + lx * Math.cos(a) + lz * Math.sin(a), HALL.cz - lx * Math.sin(a) + lz * Math.cos(a)];
    const pieces: Piece[] = [];
    const hw = HALL.w / 2;
    const hd = HALL.d / 2;
    for (const s of [-1, 1]) {
      const [x1, z1] = at(0, s * (hd - D / 2));
      pieces.push({ x: x1, y, z: z1, w: HALL.w, h: 0.3, d: D, a });
      const [x2, z2] = at(s * (hw - D / 2), 0);
      pieces.push({ x: x2, y, z: z2, w: D, h: 0.3, d: HALL.d - D * 2, a });
      const [x3, z3] = at(0, s * (hd - D));
      pieces.push({ x: x3, y: y + 0.3, z: z3, w: HALL.w - D * 2, h: 1, d: 0.06, a });
      const [x4, z4] = at(s * (hw - D), 0);
      pieces.push({ x: x4, y: y + 0.3, z: z4, w: 0.06, h: 1, d: HALL.d - D * 2, a });
    }
    return piecesGeometry(pieces, 2);
  }, []);
  const doors = useMemo(() => {
    if (HALL.kind !== "box") return null;
    const a = HALL.a ?? 0;
    const pieces: Piece[] = [];
    for (let lx = -HALL.w / 2 + 3; lx < HALL.w / 2 - 2; lx += 4.2) for (const s of [-1, 1]) {
      const lz = s * (HALL.d / 2 - 0.16);
      pieces.push({ x: HALL.cx + lx * Math.cos(a) + lz * Math.sin(a), y: 6.3, z: HALL.cz - lx * Math.sin(a) + lz * Math.cos(a), w: 1.3, h: 2.3, d: 0.05, a });
    }
    return piecesGeometry(pieces);
  }, []);
  const wall = surface("wallpaper");
  return (
    <>
      {geo && (
        <mesh geometry={geo}>
          <meshStandardMaterial map={wall.map} bumpMap={wall.bump} color="#cdb65c" roughness={0.95} />
        </mesh>
      )}
      {/* doorways to nowhere along the gallery; nothing behind them */}
      {doors && (
        <mesh geometry={doors}>
          <meshBasicMaterial color="#0c0a04" />
        </mesh>
      )}
    </>
  );
}

/* ---------- the rotunda's well: shelves of books going down for 40 m ---------- */

function Well() {
  const geo = useMemo(() => {
    const pieces: Piece[] = [];
    let s = 17;
    const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let y = -4; y > WELL.floor + 1; y -= 0.95) {
      for (let k = 0; k < 10; k++) {
        const a = (k / 10) * Math.PI * 2;
        const rr = WELL.r - 0.22;
        const x = WELL.x + Math.cos(a) * rr;
        const z = WELL.z + Math.sin(a) * rr;
        pieces.push({ x, y, z, w: 1.25, h: 0.05, d: 0.36, a: -a + Math.PI / 2 });
        for (let b = -0.5; b < 0.5; b += 0.12) if (r() < 0.75) {
          const bx = x + Math.cos(a + Math.PI / 2) * b * 1.1;
          const bz = z + Math.sin(a + Math.PI / 2) * b * 1.1;
          pieces.push({ x: bx, y: y + 0.05, z: bz, w: 0.08, h: 0.25 + r() * 0.3, d: 0.26, a: -a + Math.PI / 2 });
        }
      }
    }
    return piecesGeometry(pieces);
  }, []);
  return geo ? (
    <mesh geometry={geo}>
      <meshStandardMaterial color="#5e4a2c" roughness={0.9} />
    </mesh>
  ) : null;
}

/* ---------- thresholds of the branches ---------- */

function Frame({ w, h, color }: { w: number; h: number; color: string }) {
  return (
    <>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * (w / 2 + 0.08), h / 2, 0.06]}>
          <boxGeometry args={[0.16, h + 0.16, 0.12]} />
          <meshStandardMaterial color={color} />
        </mesh>
      ))}
      <mesh position={[0, h + 0.08, 0.06]}>
        <boxGeometry args={[w + 0.32, 0.16, 0.12]} />
        <meshStandardMaterial color={color} />
      </mesh>
    </>
  );
}
function Plate({ text, color, y }: { text: string; color: string; y: number }) {
  const map = usePlateTexture(text, color);
  return (
    <mesh position={[0, y, 0.04]}>
      <planeGeometry args={[0.8, 0.2]} />
      <meshBasicMaterial map={map} toneMapped={false} />
    </mesh>
  );
}

/** The thresholds of the branches. Open ones are only a frame: the place behind is seen through them, live. */
function ExitThreshold({ exit }: { exit: Exit }) {
  const { kind, color, anchor, size } = exit;
  const [w, h] = size;
  const a = anchor.yaw + Math.PI; // the frame faces into the Lobby
  const fx = -Math.sin(anchor.yaw);
  const fz = -Math.cos(anchor.yaw);
  return (
    <group position={[anchor.x - fx * 0.06, anchor.y, anchor.z - fz * 0.06]} rotation={[0, a, 0]}>
      {kind === "sealed" && (
        <>
          <Frame w={w} h={h} color="#4a4126" />
          <mesh position={[0, h / 2, 0.04]}>
            <boxGeometry args={[w, h, 0.08]} />
            <meshStandardMaterial color="#6b5d2a" metalness={0.4} roughness={0.6} />
          </mesh>
          {[0.5, 1.05, 1.6].map((y) => (
            <mesh key={y} position={[0, y, 0.1]}>
              <boxGeometry args={[w + 0.1, 0.08, 0.06]} />
              <meshStandardMaterial color="#3a3320" metalness={0.5} roughness={0.5} />
            </mesh>
          ))}
          <pointLight position={[0, 2, 0.8]} intensity={2.5} distance={6} decay={1.6} color={color} />
        </>
      )}
      {kind === "grate" && <Frame w={w} h={h} color="#d9ecea" />}
      {kind === "elevator" && (
        <>
          <Frame w={w} h={h} color="#6e757b" />
          <Plate text="▲  BUREAUX" color={color} y={h + 0.3} />
          {[-1, 1].map((sd) => (
            <mesh key={sd} position={[sd * (w / 2 + 0.55), h / 2, 0.02]}>
              <boxGeometry args={[0.84, h, 0.05]} />
              <meshStandardMaterial color="#9aa1a7" metalness={0.75} roughness={0.35} />
            </mesh>
          ))}
        </>
      )}
      {kind === "glass" && (
        <>
          <Frame w={w} h={h} color="#2c2c30" />
          {[-1, 1].map((sd) => (
            <mesh key={sd} position={[sd * (w / 2 + 0.5), h / 2, 0.05]}>
              <boxGeometry args={[0.98, h, 0.03]} />
              <meshStandardMaterial color="#d8e4ec" transparent opacity={0.25} roughness={0.1} />
            </mesh>
          ))}
        </>
      )}
      {kind === "velvet" && (
        <>
          <Frame w={w} h={h} color="#5a3220" />
          <Plate text="HÔTEL  ↑" color="#f2c9a0" y={h + 0.35} />
          {[-1, 1].map((sd) => (
            <mesh key={sd} position={[sd * (w / 2 + 0.4), 0.5, 0.5]}>
              <cylinderGeometry args={[0.05, 0.08, 1, 12]} />
              <meshStandardMaterial color="#c9a24a" metalness={0.8} roughness={0.3} />
            </mesh>
          ))}
        </>
      )}
      {kind === "service" && (
        <>
          <Frame w={w} h={h} color="#55585a" />
          <Plate text="SERVICE" color="#c9ccc4" y={h + 0.25} />
        </>
      )}
      {kind === "secret" && <Frame w={w} h={h} color="#3a3320" />}
      {kind !== "sealed" && kind !== "secret" && <pointLight position={[0, h * 0.8, 1]} intensity={3} distance={8} decay={1.6} color={color} />}
    </group>
  );
}

/* ---------- scene ---------- */

function Lobby() {
  const built = useMemo(lobbyBuilt, []);
  return (
    <>
      <Atmosphere background={FOG} fog={FOG} density={0.042} />
      <hemisphereLight args={["#fff2c4", "#3a3016", 0.38]} />
      <Architecture built={built} palette={LOBBY_PALETTE} flicker={0.06} />
      <Gallery />
      <Well />
      {EXITS.map((e) => (
        <ExitThreshold key={e.id} exit={e} />
      ))}
    </>
  );
}

// memo: the World re-renders often (prompts, toasts); the Lobby itself never needs to
export default memo(Lobby);
