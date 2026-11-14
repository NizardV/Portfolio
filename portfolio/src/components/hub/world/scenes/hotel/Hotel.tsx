"use client";
import { memo, use, useMemo } from "react";
import type { Palette } from "../../archi/Architecture";
import type { Piece } from "../../archi/build";
import { Place } from "../../archi/Place";
import { hotelBuilt, WELL } from "../../places/hotel";
import { usePreview } from "../../PortalWindow";
import { Pieces } from "../props";

const PALETTE: Palette = {
  surfaces: { wallpaper: "#ead8b4", carpet: "#8a2f2a", ceiling: "#efe6d2" },
  trim: "#3a2618",
  rail: "#2a1d14",
  panel: "#ffe9c4",
  light: "#ffd9a0",
  intensity: 10,
  range: 13,
};
const AIR = "#140d09";

/**
 * The floors below, seen down the well: the same ring of red carpet, rails and beige panels, every 3.4 m,
 * further than the light goes. Scenery only: you cannot reach them.
 */
function FloorsBelow() {
  const { slabs, rails, panels, lamps } = useMemo(() => {
    const slabs: Piece[] = [];
    const rails: Piece[] = [];
    const panels: Piece[] = [];
    const lamps: Piece[] = [];
    const h = WELL.half;
    const D = 1.8;
    for (let k = 1; k <= WELL.floors; k++) {
      const y = -k * WELL.storey;
      for (const s of [-1, 1]) {
        slabs.push({ x: WELL.x, y, z: WELL.z + s * (h - D / 2), w: h * 2, h: 0.3, d: D });
        slabs.push({ x: WELL.x + s * (h - D / 2), y, z: WELL.z, w: D, h: 0.3, d: h * 2 - D * 2 });
        rails.push({ x: WELL.x, y: y + 0.3, z: WELL.z + s * (h - D), w: h * 2 - D * 2, h: 1, d: 0.05 });
        rails.push({ x: WELL.x + s * (h - D), y: y + 0.3, z: WELL.z, w: 0.05, h: 1, d: h * 2 - D * 2 });
        for (let t = -h + 3; t < h - 2; t += 3) {
          panels.push({ x: WELL.x + t, y: y - 1.6, z: WELL.z + s * (h - D - 0.05), w: 1.3, h: 1.3, d: 0.04 });
          if (k % 2) lamps.push({ x: WELL.x + t, y: y - 0.05, z: WELL.z + s * (h - 1), w: 0.25, h: 0.04, d: 0.25 });
        }
      }
    }
    return { slabs, rails, panels, lamps };
  }, []);
  return (
    <>
      <Pieces pieces={slabs} color="#7e2a26" roughness={0.95} />
      <Pieces pieces={rails} color="#2a1d14" />
      <Pieces pieces={panels} color="#c9a96a" />
      <Pieces pieces={lamps} color="#ffe6b0" glow />
      <mesh position={[WELL.x, 13.9, WELL.z]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[WELL.half * 1.6, WELL.half * 1.6]} />
        <meshBasicMaterial color="#fff1d8" toneMapped={false} />
      </mesh>
      <pointLight position={[WELL.x, 10, WELL.z]} intensity={16} distance={30} decay={1.3} color="#ffe2b8" />
    </>
  );
}

function Hotel() {
  const built = use(hotelBuilt(!usePreview())); // urgent when standing in it, not through a doorway
  return (
    <Place built={built} palette={PALETTE} air={AIR} density={0.022} hemi={0.32} flicker={0.03}>
      <FloorsBelow />
    </Place>
  );
}

export default memo(Hotel);
