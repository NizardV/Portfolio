"use client";
import { memo, use, useMemo } from "react";
import type { Palette } from "../../archi/Architecture";
import type { Piece } from "../../archi/build";
import { Place, Water } from "../../archi/Place";
import { canalsBuilt, CHANNEL } from "../../places/canals";
import { Pieces } from "../props";

const PALETTE: Palette = {
  surfaces: { concrete: "#8f8f86", "floor:concrete": "#77786f", ceiling: "#9a9a92" },
  trim: "#3a3b36",
  rail: "#5a5d55",
  panel: "#ffe6a8",
  light: "#f2d38a",
  intensity: 8,
  range: 12,
};
const AIR = "#0a0c0a";

/** Pipes along both walls of the main tunnel. */
function Pipes() {
  const pieces = useMemo(() => {
    const p: Piece[] = [];
    for (const side of [-1, 1]) for (const y of [1.9, 2.4, 2.75]) p.push({ x: side * 3.05, y, z: -41, w: 0.16, h: 0.16, d: 84 });
    for (let z = -6; z > -80; z -= 9) p.push({ x: -3.05, y: 1.6, z, w: 0.3, h: 0.3, d: 0.3 }); // valves
    return p;
  }, []);
  return <Pieces pieces={pieces} color="#7c7f76" metalness={0.5} roughness={0.5} />;
}

function Canals() {
  const built = use(canalsBuilt());
  return (
    <Place built={built} palette={PALETTE} air={AIR} density={0.05} hemi={0.25} flicker={0.06}>
      <Water y={CHANNEL.water} x={CHANNEL.x} z={CHANNEL.z} w={CHANNEL.w + 0.4} d={CHANNEL.d} color="#2e5b45" glint="#c9f2b0" opacity={0.85} />
      <Pipes />
      {/* the crack: a sliver of red light where there should be wall */}
      <pointLight position={[-20, 1.2, -58]} intensity={5} distance={7} decay={1.5} color="#e0453a" />
    </Place>
  );
}

export default memo(Canals);
