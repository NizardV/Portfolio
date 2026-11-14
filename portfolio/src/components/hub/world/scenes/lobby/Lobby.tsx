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
const Glow = ({ w, h, color, z = 0.02, opacity = 1 }: { w: number; h: number; color: string; z?: number; opacity?: number }) => (
  <mesh position={[0, h / 2, z]}>
    <planeGeometry args={[w, h]} />
    <meshBasicMaterial color={color} toneMapped={false} transparent={opacity < 1} opacity={opacity} />
  </mesh>
);
function Plate({ text, color, y }: { text: string; color: string; y: number }) {
  const map = usePlateTexture(text, color);
  return (
    <mesh position={[0, y, 0.04]}>
      <planeGeometry args={[0.8, 0.2]} />
      <meshBasicMaterial map={map} toneMapped={false} />
    </mesh>
  );
}

function ExitThreshold({ exit }: { exit: Exit }) {
  const { kind, color, anchor } = exit;
  const a = anchor.yaw;
  return (
    <group position={[anchor.x + Math.sin(a) * 0.14, anchor.y, anchor.z + Math.cos(a) * 0.14]} rotation={[0, a, 0]}>
      {kind === "sealed" && (
        <>
          <Frame w={1.2} h={2.1} color="#4a4126" />
          <mesh position={[0, 1.05, 0.04]}>
            <boxGeometry args={[1.2, 2.1, 0.08]} />
            <meshStandardMaterial color="#6b5d2a" metalness={0.4} roughness={0.6} />
          </mesh>
          {[0.5, 1.05, 1.6].map((y) => (
            <mesh key={y} position={[0, y, 0.1]}>
              <boxGeometry args={[1.3, 0.08, 0.06]} />
              <meshStandardMaterial color="#3a3320" metalness={0.5} roughness={0.5} />
            </mesh>
          ))}
          <pointLight position={[0, 2, 0.8]} intensity={2.5} distance={6} decay={1.6} color={color} />
        </>
      )}
      {kind === "grate" && (
        <>
          <Glow w={2.2} h={2.4} color="#bff6f2" z={-0.05} />
          <Frame w={2.2} h={2.4} color="#d9ecea" />
          {Array.from({ length: 12 }, (_, k) => (
            <mesh key={k} position={[-1.05 + k * 0.19, 1.2, 0.08]}>
              <boxGeometry args={[0.04, 2.4, 0.04]} />
              <meshStandardMaterial color="#56606a" metalness={0.6} roughness={0.4} />
            </mesh>
          ))}
          <pointLight position={[0, 1.6, 1.4]} intensity={5} distance={10} decay={1.5} color={color} />
        </>
      )}
      {kind === "elevator" && (
        <>
          <Frame w={1.7} h={2.3} color="#6e757b" />
          {[-0.425, 0.425].map((x) => (
            <mesh key={x} position={[x, 1.15, 0.05]}>
              <boxGeometry args={[0.84, 2.3, 0.05]} />
              <meshStandardMaterial color="#9aa1a7" metalness={0.75} roughness={0.35} />
            </mesh>
          ))}
          <Plate text="▲  BUREAUX" color={color} y={2.6} />
          <pointLight position={[0, 2.2, 1.2]} intensity={4} distance={9} decay={1.6} color={color} />
        </>
      )}
      {kind === "glass" && (
        <>
          <Glow w={2} h={2.3} color="#ffd1dc" z={-0.06} opacity={0.9} />
          <Frame w={2} h={2.3} color="#2c2c30" />
          {[-0.5, 0.5].map((x) => (
            <mesh key={x} position={[x, 1.15, 0.05]}>
              <boxGeometry args={[0.98, 2.3, 0.03]} />
              <meshStandardMaterial color="#d8e4ec" transparent opacity={0.25} roughness={0.1} />
            </mesh>
          ))}
          <pointLight position={[0, 1.6, 1.2]} intensity={4} distance={9} decay={1.6} color={color} />
        </>
      )}
      {kind === "velvet" && (
        <>
          <Glow w={2.6} h={2.8} color="#ff9a7a" z={-0.05} />
          <Frame w={2.6} h={2.8} color="#5a3220" />
          <Plate text="HÔTEL  ↑" color="#f2c9a0" y={3.15} />
          {[-0.9, 0.9].map((x) => (
            <mesh key={x} position={[x, 0.5, 0.7]}>
              <cylinderGeometry args={[0.05, 0.08, 1, 12]} />
              <meshStandardMaterial color="#c9a24a" metalness={0.8} roughness={0.3} />
            </mesh>
          ))}
          <mesh position={[0, 0.88, 0.7]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.035, 0.035, 1.8, 10]} />
            <meshStandardMaterial color="#8a1f24" roughness={0.8} />
          </mesh>
          <pointLight position={[0, 1.8, 1.4]} intensity={5} distance={10} decay={1.5} color={color} />
        </>
      )}
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
