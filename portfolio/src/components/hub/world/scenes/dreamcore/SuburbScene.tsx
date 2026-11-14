"use client";
import { memo, use, useMemo } from "react";
import type { Palette } from "../../archi/Architecture";
import type { Piece } from "../../archi/build";
import { Place } from "../../archi/Place";
import { HOUSES, SUBURB, suburbBuilt } from "../../places/dreamcore";
import Sky from "../meadow/Sky";
import { Pieces } from "../props";
import { usePreview } from "../../PortalWindow";
import { Hills, House, Turbine } from "./Outdoors";

const PALETTE: Palette = {
  surfaces: { carpet: "#5d7448", concrete: "#6d6670" },
  trim: "#ffffff",
  rail: "#ffffff",
  panel: "#ffffff",
  light: "#ffd9cf",
  intensity: 0,
  range: 1,
};
const AIR = "#d6a3a8";
const COLORS = ["#f2d06b", "#e9e1cf", "#d7a6a0", "#c9d6e0"];

/** Le lotissement: dusk, pink and peach, an empty street, every window lit. A crater at the end. */
function SuburbScene() {
  const built = use(suburbBuilt(!usePreview())); // urgent when standing in it, not through a doorway
  const street = useMemo<Piece[]>(() => [
    { x: 0, y: -0.01, z: -SUBURB.street.len / 2 + 4, w: SUBURB.street.w, h: 0.02, d: SUBURB.street.len },
    ...[-1, 1].map((s) => ({ x: s * (SUBURB.street.w / 2 + 0.9), y: 0, z: -SUBURB.street.len / 2 + 4, w: 1.8, h: 0.12, d: SUBURB.street.len })),
  ], []);
  const poles = useMemo(() => {
    const p: Piece[] = [];
    for (let z = -4; z > -100; z -= 16) p.push({ x: 6.2, y: 0, z, w: 0.22, h: 8, d: 0.22 }, { x: 6.2, y: 7.4, z, w: 1.6, h: 0.12, d: 0.12 });
    for (const dx of [-0.6, 0.6]) p.push({ x: 6.2 + dx, y: 7.5, z: -52, w: 0.02, h: 0.02, d: 96 }); // wires
    return p;
  }, []);
  return (
    <Place built={built} palette={PALETTE} air={AIR} density={0.009} hemi={0.85}>
      <Sky horizon="#e9b3ac" mid="#c9a3c0" zenith="#7a6fa8" cloud="#f6d2c8" cloudUnder="#c99aa6" cloudCount={10} sun={[0.2, 0.08, -1]} />
      <directionalLight position={[20, 8, -80]} intensity={1.4} color="#ffc9a8" />
      <Hills flat={60} color="#5d7448" stripe="#57703f" height={10} seed={3} />
      <Pieces pieces={street} color="#4a454e" roughness={1} />
      {HOUSES.map((h, i) => (
        <House key={i} x={h.x} z={h.z} w={9} d={8} h={4.6} color={COLORS[i % COLORS.length]} roof="#6d6170" lit={h.lit ? "#ffd27a" : undefined} ry={h.side > 0 ? -Math.PI / 2 : Math.PI / 2} />
      ))}
      <Pieces pieces={poles} color="#5a4a40" />
      {/* the crater ("the pit"): a black disc with a rim of bare earth */}
      <mesh position={[SUBURB.crater.x, 0.02, SUBURB.crater.z]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[SUBURB.crater.r - 3, SUBURB.crater.r, 48]} />
        <meshStandardMaterial color="#8a6a58" roughness={1} />
      </mesh>
      <mesh position={[SUBURB.crater.x, 0.03, SUBURB.crater.z]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[SUBURB.crater.r - 3, 48]} />
        <meshBasicMaterial color="#000000" />
      </mesh>
      {/* far away on a hill: a tower without windows that never gets closer */}
      <mesh position={[30, 30, -260]}>
        <boxGeometry args={[14, 60, 14]} />
        <meshBasicMaterial color="#b08a92" />
      </mesh>
      <Turbine x={-50} z={-150} y={8} />
      {[-0.6, 0.6].map((dx) => (
        <mesh key={dx} position={[-16 + dx, 0.45, 8]}>
          <boxGeometry args={[0.55, 0.9, 0.55]} />
          <meshStandardMaterial color="#f4f4f0" />
        </mesh>
      ))}
    </Place>
  );
}

export default memo(SuburbScene);
