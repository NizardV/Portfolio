"use client";
import { memo, use, useMemo } from "react";
import type { Palette } from "../../archi/Architecture";
import type { Piece } from "../../archi/build";
import { Place, Water } from "../../archi/Place";
import { COURTYARD, HALL_A, poolsBuilt, WATER } from "../../places/pools";
import { Pieces } from "../props";

const PALETTE: Palette = {
  surfaces: { tile: "#eef6f4", "floor:tile": "#dfeeea", "ceil:tile": "#e6f1ef", concrete: "#a9b1ad" },
  trim: "#9fb4b0",
  rail: "#8a9a98",
  panel: "#effffc",
  light: "#e2fffa",
  intensity: 12,
  range: 16,
  roughness: 0.35,
};
const AIR = "#0c1a17";

/** Round windows blazing white in hall A, and the light they throw into the damp air. */
function Windows() {
  const items = [-5, -1.7, 1.7, 5].map((dz) => [HALL_A.x - HALL_A.w / 2 + 0.05, 2.6, HALL_A.z + dz] as const);
  return (
    <>
      {items.map(([x, y, z], i) => (
        <group key={i}>
          <mesh position={[x, y, z]} rotation={[0, Math.PI / 2, 0]}>
            <circleGeometry args={[0.7, 32]} />
            <meshBasicMaterial color="#ffffff" toneMapped={false} />
          </mesh>
          {/* a shaft of light: a long translucent beam, slanting down into the pool */}
          <mesh position={[x + 2.4, y - 1.1, z]} rotation={[0, 0, -0.55]}>
            <boxGeometry args={[5, 1.2, 1.2]} />
            <meshBasicMaterial color="#e8fffb" transparent opacity={0.06} depthWrite={false} toneMapped={false} />
          </mesh>
        </group>
      ))}
    </>
  );
}

/** The courtyard: façades with dark windows all around, a dead tree in its round pool. */
function Courtyard() {
  const facade = useMemo(() => {
    const p: Piece[] = [];
    for (let y = 3; y < 18; y += 2.6) for (let k = -6; k <= 6; k += 2.4) {
      p.push({ x: COURTYARD.x + k, y, z: COURTYARD.z - 7.9, w: 1.2, h: 1.5, d: 0.05 });
      p.push({ x: COURTYARD.x - 7.9, y, z: COURTYARD.z + k, w: 0.05, h: 1.5, d: 1.2 });
    }
    return p;
  }, []);
  const tree = useMemo<Piece[]>(() => [
    { x: COURTYARD.x, y: -0.4, z: COURTYARD.z, w: 0.3, h: 3.2, d: 0.3 },
    { x: COURTYARD.x + 0.5, y: 2.2, z: COURTYARD.z, w: 1.4, h: 0.12, d: 0.12, a: 0.6 },
    { x: COURTYARD.x - 0.4, y: 1.8, z: COURTYARD.z + 0.3, w: 1.2, h: 0.1, d: 0.1, a: -0.9 },
    { x: COURTYARD.x, y: 2.6, z: COURTYARD.z - 0.4, w: 0.1, h: 0.1, d: 1.3, a: 0.2 },
  ], []);
  return (
    <>
      <Pieces pieces={facade} color="#1d2427" />
      <Pieces pieces={tree} color="#3a3330" roughness={1} />
      <hemisphereLight args={["#cfe6f2", "#2a3a38", 0.25]} position={[COURTYARD.x, 20, COURTYARD.z]} />
    </>
  );
}

function Pools() {
  const built = use(poolsBuilt());
  return (
    <Place built={built} palette={PALETTE} air={AIR} density={0.03} hemi={0.4} flicker={0.03}>
      <Water y={WATER} color="#2fb3b0" />
      <Windows />
      <Courtyard />
      {/* the night pool glows blue from below */}
      <pointLight position={[-24, -0.2, -66]} intensity={10} distance={14} decay={1.4} color="#2f7dff" />
    </Place>
  );
}

export default memo(Pools);
