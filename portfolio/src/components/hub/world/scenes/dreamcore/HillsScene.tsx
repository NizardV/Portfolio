"use client";
import { memo, use, useMemo } from "react";
import type { Palette } from "../../archi/Architecture";
import { Place } from "../../archi/Place";
import { HILLS, hillsBuilt } from "../../places/dreamcore";
import Sky from "../meadow/Sky";
import { Pieces, seeded } from "../props";
import { usePreview } from "../../PortalWindow";
import { Hills, House, Turbine } from "./Outdoors";

const PALETTE: Palette = {
  surfaces: { carpet: "#6aa045" },
  trim: "#ffffff",
  rail: "#ffffff",
  panel: "#ffffff",
  light: "#fff6e0",
  intensity: 0,
  range: 1,
};
const AIR = "#bcd8f2";

/** Les collines: bright, too green, small yellow houses alone on the slopes, white fences, turbines. */
function HillsScene() {
  const built = use(hillsBuilt(!usePreview())); // urgent when standing in it, not through a doorway
  const h = HILLS.house;
  const fences = useMemo(() => {
    const r = seeded(5);
    const p = [];
    let x = -40;
    let z = 30;
    for (let k = 0; k < 120; k++) {
      x += 1.2;
      z += Math.sin(k * 0.12) * 0.9 - 0.25 + r() * 0.1;
      p.push({ x, y: 0, z, w: 0.08, h: 1, d: 0.08 });
    }
    return p;
  }, []);
  return (
    <Place built={built} palette={PALETTE} air={AIR} density={0.006} hemi={1.1}>
      <Sky horizon={AIR} mid="#7fb5ee" zenith="#2f6fd0" />
      <directionalLight position={[40, 60, 20]} intensity={2.2} color="#fff4dc" />
      <Hills flat={HILLS.r} color="#6aa045" stripe="#5e9440" />
      {/* the house with no floor: three walls, a doorway, the black hole inside */}
      <House x={h.x} z={h.z} w={h.w} d={h.d} h={3.6} color="#f2d06b" roof="#8a7a70" />
      <mesh position={[h.x, 1.1, h.z + h.d / 2 + 0.03]}>
        <planeGeometry args={[1.6, 2.2]} />
        <meshBasicMaterial color="#000000" />
      </mesh>
      {[[-70, -80, 9], [80, -60, 14], [-110, 20, 12], [60, 90, 8], [-30, -130, 22]].map(([x, z, y], i) => (
        <House key={i} x={x} y={y} z={z} w={5} d={5} h={3.2} color="#f2d06b" roof="#8a7a70" ry={i} />
      ))}
      <Pieces pieces={fences} color="#ffffff" />
      <Turbine x={-60} z={-120} y={18} />
      <Turbine x={30} z={-150} y={22} s={1.2} />
      <Turbine x={110} z={-90} y={14} s={0.9} />
    </Place>
  );
}

export default memo(HillsScene);
