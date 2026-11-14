"use client";
import { memo, use, useMemo } from "react";
import type { Palette } from "../../archi/Architecture";
import type { Piece } from "../../archi/build";
import { Place } from "../../archi/Place";
import { AVENUE, CITY_BACK, cityBuilt, CROSS_STREETS } from "../../places/redcity";
import { usePreview } from "../../PortalWindow";
import { Pieces, seeded } from "../props";

const PALETTE: Palette = {
  surfaces: { concrete: "#6a4440", "floor:concrete": "#a0726a" },
  trim: "#1a0b0b",
  rail: "#1a0b0b",
  panel: "#ff6a4a",
  light: "#ff4a2a",
  intensity: 0,
  range: 10,
};
const AIR = "#2a0806";

/** Towers on every block, every window lit red (a few orange, a few cold). */
function Towers() {
  const { towers, windows, warm } = useMemo(() => {
    const r = seeded(404);
    const towers: Piece[] = [];
    const windows: Piece[] = [];
    const warm: Piece[] = [];
    const rows = [6, ...CROSS_STREETS.map((z) => z - 14), -128];
    for (const side of [-1, 1]) for (const z0 of rows) for (let k = 0; k < 3; k++) {
      const x = side * (AVENUE.w / 2 + 6 + k * 16 + r() * 4);
      const z = z0 - r() * 6;
      const w = 8 + r() * 6;
      const h = 18 + r() * 50;
      towers.push({ x, y: 0, z, w, h, d: 9 });
      const face = x > 0 ? x - w / 2 - 0.03 : x + w / 2 + 0.03;
      for (let y = 2; y < h - 1; y += 1.7) for (let t = -3.4; t <= 3.4; t += 1.4) if (r() < 0.7) (r() < 0.86 ? windows : warm).push({ x: face, y, z: z + t, w: 0.04, h: 0.9, d: 0.8 });
    }
    return { towers, windows, warm };
  }, []);
  return (
    <>
      <Pieces pieces={towers} color="#140808" roughness={1} />
      <Pieces pieces={windows} color="#e0453a" glow />
      <Pieces pieces={warm} color="#ffb07a" glow />
    </>
  );
}

/** Street lamps down both pavements: the heads glow, the nearest ones really light the wet road. */
function Lamps() {
  const { poles, heads } = useMemo(() => {
    const poles: Piece[] = [];
    const heads: Piece[] = [];
    for (let z = -4; z > -128; z -= 14) for (const s of [-1, 1]) {
      const x = s * (AVENUE.w / 2 - 0.6);
      poles.push({ x, y: 0, z: z + s * 3, w: 0.16, h: 5.2, d: 0.16 }, { x: x - s * 0.6, y: 5.1, z: z + s * 3, w: 1.3, h: 0.1, d: 0.12 });
      heads.push({ x: x - s * 1.1, y: 4.95, z: z + s * 3, w: 0.5, h: 0.12, d: 0.3 });
    }
    return { poles, heads };
  }, []);
  return (
    <>
      <Pieces pieces={poles} color="#1a0a0a" metalness={0.4} roughness={0.6} />
      <Pieces pieces={heads} color="#ff8a5a" glow />
      {heads.slice(0, 8).map((h, i) => (
        <pointLight key={i} position={[h.x, 4.6, h.z]} intensity={40} distance={18} decay={1.6} color="#ff7a48" />
      ))}
    </>
  );
}

/** The elevated line over the avenue: a deck on pillars, cross braces. */
function Viaduct() {
  const pieces = useMemo(() => {
    const p: Piece[] = [{ x: 0, y: 8, z: -66, w: 8, h: 1.2, d: 140 }];
    for (let z = -2; z > -132; z -= 12) for (const s of [-1, 1]) {
      p.push({ x: s * 4.6, y: 0, z, w: 0.9, h: 8, d: 0.9 });
      p.push({ x: s * 4.6, y: 3.5, z: z - 3, w: 0.25, h: 7, d: 0.25, a: 0, });
    }
    return p;
  }, []);
  return <Pieces pieces={pieces} color="#1d0909" metalness={0.3} roughness={0.8} />;
}

function RedCity() {
  const built = use(cityBuilt(!usePreview())); // urgent when standing in it, not through a doorway
  return (
    <Place built={built} palette={PALETTE} air={AIR} density={0.028} hemi={0.7}>
      <Towers />
      <Viaduct />
      <Lamps />
      {[-10, -40, -70, -100].map((z) => (
        <pointLight key={z} position={[0, 6.5, z]} intensity={14} distance={22} decay={1.4} color="#ff3a20" />
      ))}
      {/* the stairwell home: a white light at the end of the avenue */}
      <mesh position={[CITY_BACK.x, 1.1, CITY_BACK.z - 0.1]}>
        <planeGeometry args={[1.1, 2.2]} />
        <meshBasicMaterial color="#fff1e6" toneMapped={false} />
      </mesh>
    </Place>
  );
}

export default memo(RedCity);
