"use client";
import { memo, use, useMemo } from "react";
import type { Palette } from "../../archi/Architecture";
import type { Piece } from "../../archi/build";
import { Place } from "../../archi/Place";
import { ARMS, ATRIUM, HOUSE, mallBuilt, RECORDS } from "../../places/mall";
import { usePlateTexture } from "../lobby/textures";
import { at, Pieces, seeded } from "../props";

const PALETTE: Palette = {
  surfaces: { marble: "#ddd7ca", plaster: "#d4d0c6", "ceil:plaster": "#e2ded4", wood: "#8a6a48", panel: "#3b3530", concrete: "#9b978c" },
  trim: "#3a3631",
  rail: "#c9ccd0",
  panel: "#fff6e6",
  light: "#ffefd6",
  intensity: 11,
  range: 15,
  roughness: 0.6,
};
const AIR = "#141210";
const SIGNS = ["#f0c27a", "#e597a6", "#9fd3e0", "#c4e08a", "#f0c27a", "#d7a6e0"];

/** Shut shops along every gallery: dark glass, a lit sign, a half-lowered grille. */
function Shopfronts() {
  const { glass, signs, grilles } = useMemo(() => {
    const r = seeded(31);
    const glass: Piece[] = [];
    const signs: Piece[][] = SIGNS.map(() => []);
    const grilles: Piece[] = [];
    ARMS.forEach((m, k) => {
      for (let t = -m.len / 2 + 3; t < m.len / 2 - 2; t += 5.5) for (const side of [-1, 1]) {
        const [x, z] = at(m.x, m.z, t, side * 3.85, -m.a);
        glass.push({ x, y: 0, z, w: 4.6, h: 3.2, d: 0.06, a: -m.a });
        if (r() < 0.8) {
          const [sx, sz] = at(m.x, m.z, t, side * 3.8, -m.a);
          signs[(k + Math.floor(r() * 6)) % 6].push({ x: sx, y: 3.5, z: sz, w: 3, h: 0.35, d: 0.05, a: -m.a });
        }
        if (r() < 0.5) grilles.push({ x, y: 1.5 + r(), z, w: 4.6, h: 1.8, d: 0.08, a: -m.a });
      }
    });
    return { glass, signs, grilles };
  }, []);
  return (
    <>
      <Pieces pieces={glass} color="#0e1214" roughness={0.15} metalness={0.3} />
      <Pieces pieces={grilles} color="#5a5d60" metalness={0.6} roughness={0.5} />
      {signs.map((s, i) => (s.length ? <Pieces key={i} pieces={s} color={SIGNS[i]} glow /> : null))}
    </>
  );
}

/** The atrium: a balcony ring halfway up, two escalators frozen mid-way, a skylight. */
function Atrium() {
  const ring = useMemo(() => {
    const p: Piece[] = [];
    for (let k = 0; k < 24; k++) {
      const a = (k / 24) * Math.PI * 2;
      const r = ATRIUM.r - 1.1;
      p.push({ x: ATRIUM.x + Math.cos(a) * r, y: 5.2, z: ATRIUM.z + Math.sin(a) * r, w: 3.9, h: 0.35, d: 2.2, a: -a + Math.PI / 2 });
      p.push({ x: ATRIUM.x + Math.cos(a) * (r - 1.1), y: 5.55, z: ATRIUM.z + Math.sin(a) * (r - 1.1), w: 3.7, h: 1, d: 0.05, a: -a + Math.PI / 2 });
    }
    return p;
  }, []);
  const escalators = useMemo<Piece[]>(() => [-3, 3].map((dx) => ({ x: ATRIUM.x + dx, y: 2.3, z: ATRIUM.z + 2, w: 1.4, h: 0.45, d: 8.5, a: 0 })), []);
  return (
    <>
      <Pieces pieces={ring} color="#cfcac0" roughness={0.5} />
      {escalators.map((e, i) => (
        <mesh key={i} position={[e.x, e.y, e.z]} rotation={[0.6, 0, 0]}>
          <boxGeometry args={[e.w, e.h, e.d]} />
          <meshStandardMaterial color="#2a2a2e" metalness={0.5} roughness={0.4} />
        </mesh>
      ))}
      <mesh position={[ATRIUM.x, 12.9, ATRIUM.z]} rotation={[Math.PI / 2, 0, 0]}>
        <circleGeometry args={[7, 48]} />
        <meshBasicMaterial color="#e9f2ff" toneMapped={false} />
      </mesh>
      <pointLight position={[ATRIUM.x, 10, ATRIUM.z]} intensity={18} distance={30} decay={1.3} color="#dfeaff" />
    </>
  );
}

/** The record shop (the future Music zone) and the house in the hangar. */
function RecordsAndHouse() {
  const sign = usePlateTexture("DISQUES", "#f0c27a");
  const crates = useMemo(() => {
    const p: Piece[] = [];
    for (let k = -3; k <= 3; k++) for (const s of [-1, 1]) {
      const [x, z] = at(RECORDS.x, RECORDS.z, k * 1.2, s * 2.4, -RECORDS.a);
      p.push({ x, y: 0, z, w: 0.9, h: 0.8, d: 0.7, a: -RECORDS.a });
    }
    return p;
  }, []);
  const [sx, sz] = at(RECORDS.x, RECORDS.z, -5.4, 0, -RECORDS.a);
  const a = -ARMS[3].a;
  const roof = useMemo<Piece[]>(() => {
    const [r1x, r1z] = at(HOUSE.x, HOUSE.z, 0, -HOUSE.d / 4, a);
    const [r2x, r2z] = at(HOUSE.x, HOUSE.z, 0, HOUSE.d / 4, a);
    return [
      { x: r1x, y: HOUSE.h + 0.6, z: r1z, w: HOUSE.w + 0.6, h: 0.2, d: HOUSE.d / 1.6, a },
      { x: r2x, y: HOUSE.h + 0.6, z: r2z, w: HOUSE.w + 0.6, h: 0.2, d: HOUSE.d / 1.6, a },
    ];
  }, [a]);
  const [wx, wz] = at(HOUSE.x, HOUSE.z, 1.6, HOUSE.d / 2 + 0.02, a);
  return (
    <>
      <Pieces pieces={crates} color="#5a4026" />
      <mesh position={[sx, 2.5, sz]} rotation={[0, -RECORDS.a + Math.PI / 2, 0]}>
        <planeGeometry args={[1.6, 0.4]} />
        <meshBasicMaterial map={sign} toneMapped={false} />
      </mesh>
      {roof.map((p, i) => (
        <mesh key={i} position={[p.x, p.y, p.z]} rotation={[i ? -0.5 : 0.5, p.a ?? 0, 0, "YXZ"]}>
          <boxGeometry args={[p.w, p.h, p.d]} />
          <meshStandardMaterial color="#4d5560" />
        </mesh>
      ))}
      <mesh position={[wx, 1.7, wz]} rotation={[0, a, 0]}>
        <planeGeometry args={[1.1, 1]} />
        <meshBasicMaterial color="#ffd27a" toneMapped={false} />
      </mesh>
    </>
  );
}

function Mall() {
  const built = use(mallBuilt());
  return (
    <Place built={built} palette={PALETTE} air={AIR} density={0.026} hemi={0.35} flicker={0.04}>
      <Shopfronts />
      <Atrium />
      <RecordsAndHouse />
    </Place>
  );
}

export default memo(Mall);
