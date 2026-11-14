"use client";
import { memo, use, useMemo } from "react";
import type { Palette } from "../../archi/Architecture";
import type { Piece } from "../../archi/build";
import { Place } from "../../archi/Place";
import { officesBuilt, SERVERS, SURVEILLANCE } from "../../places/offices";
import { Pieces, seeded, useCanvas } from "../props";

const PALETTE: Palette = {
  surfaces: { plaster: "#c9ccd0", panel: "#b9bec4", carpet: "#5f6b78", stain: "#56606b", ceiling: "#d9dad6", concrete: "#9a9a96", tile: "#c9cfd2" },
  trim: "#33383e",
  rail: "#2c3036",
  panel: "#f2f8ff",
  light: "#e6f0ff",
  intensity: 11,
  range: 14,
};
const AIR = "#0d1014";

/** A Vigil screen (a mock-up for now: the live data comes later, through Vigil's public read-only route). */
function useScreen(kind: number) {
  return useCanvas(256, 160, (ctx) => {
    ctx.fillStyle = "#06120f";
    ctx.fillRect(0, 0, 256, 160);
    const teal = "#4fd1c5";
    ctx.fillStyle = teal;
    ctx.font = "600 16px monospace";
    if (kind === 5) {
      ctx.fillStyle = "#3a4a46";
      ctx.font = "700 26px monospace";
      ctx.fillText("NO SIGNAL", 50, 90);
      return;
    }
    ctx.fillText(["VEILLE", "SÉCURITÉ", "VPS", "SANTÉ", "GITHUB"][kind % 5], 14, 26);
    ctx.globalAlpha = 0.85;
    for (let i = 0; i < 9; i++) {
      const h = 20 + ((i * 37 + kind * 13) % 80);
      ctx.fillRect(16 + i * 25, 140 - h, 16, h);
    }
    ctx.globalAlpha = 0.5;
    ctx.fillRect(14, 36, 228, 1);
  }, [kind]);
}

function Screen({ x, y, z, a, kind }: { x: number; y: number; z: number; a: number; kind: number }) {
  const map = useScreen(kind);
  return (
    <mesh position={[x, y, z]} rotation={[0, a, 0]}>
      <planeGeometry args={[1.3, 0.8]} />
      <meshBasicMaterial map={map} toneMapped={false} />
    </mesh>
  );
}

function Surveillance() {
  const { x, z, w, d } = SURVEILLANCE;
  const desk = useMemo<Piece[]>(() => [
    { x, y: 0, z: z + 0.2, w: w - 2, h: 0.75, d: 1, a: 0 },
    ...[-2.4, 0, 2.4].map((dx) => ({ x: x + dx, y: 0, z: z + 1.6, w: 0.55, h: 0.5, d: 0.55 })),
  ], [x, z, w]);
  const screens = [];
  for (let r = 0; r < 3; r++) for (let c = 0; c < 6; c++) screens.push({ x: x - 3.55 + c * 1.42, y: 0.9 + r * 0.86, z: z - d / 2 + 0.06, kind: (r * 6 + c) % 7 === 3 ? 5 : (r * 6 + c) % 5 });
  return (
    <>
      <Pieces pieces={desk} color="#23272c" />
      {screens.map((s, i) => <Screen key={i} x={s.x} y={s.y} z={s.z} a={0} kind={s.kind} />)}
      <pointLight position={[x, 1.6, z - d / 2 + 1.2]} intensity={6} distance={9} decay={1.6} color="#4fd1c5" />
    </>
  );
}

function ServerRoom() {
  const { x, z, d, floor } = SERVERS;
  const { racks, leds } = useMemo(() => {
    const r = seeded(77);
    const racks: Piece[] = [];
    const leds: Piece[] = [];
    for (let k = 0; k < 9; k++) for (const s of [-1, 1]) {
      const rx = x + s * 1.7;
      const rz = z - d / 2 + 1.2 + k * 1.3;
      racks.push({ x: rx, y: floor, z: rz, w: 1, h: 2.1, d: 1.1 });
      for (let n = 0; n < 7; n++) leds.push({ x: rx - s * 0.51, y: floor + 0.3 + r() * 1.6, z: rz - 0.4 + r() * 0.8, w: 0.02, h: 0.025, d: 0.04 });
    }
    return { racks, leds };
  }, [x, z, d, floor]);
  return (
    <>
      <Pieces pieces={racks} color="#141619" metalness={0.4} roughness={0.5} />
      <Pieces pieces={leds} color="#7ee081" glow />
      <pointLight position={[x, floor + 2.2, z]} intensity={3} distance={10} decay={1.5} color="#9fe8ff" />
    </>
  );
}

function Offices() {
  const built = use(officesBuilt());
  return (
    <Place built={built} palette={PALETTE} air={AIR} density={0.034} hemi={0.32} flicker={0.04}>
      <Surveillance />
      <ServerRoom />
    </Place>
  );
}

export default memo(Offices);
