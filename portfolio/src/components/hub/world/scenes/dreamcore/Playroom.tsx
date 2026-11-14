"use client";
import { memo, use, useMemo } from "react";
import { Color, InstancedMesh, MeshStandardMaterial, Object3D, SphereGeometry } from "three";
import type { Palette } from "../../archi/Architecture";
import type { Piece } from "../../archi/build";
import { Place } from "../../archi/Place";
import { PLAY, playBuilt } from "../../places/dreamcore";
import { Pieces, seeded, useCanvas } from "../props";

const PALETTE: Palette = {
  surfaces: { plaster: "#8fbbe6", carpet: "#3f7a3a", wallpaper: "#a9d2f2", void: "#c9c3b8", "ceil:ceiling": "#121212", ceiling: "#121212" },
  trim: "#e9e4d8",
  rail: "#ffffff",
  panel: "#fff8ea",
  light: "#fff1dc",
  intensity: 9,
  range: 12,
};
const AIR = "#08080a";
const { stage } = PLAY;

/** The painted sky on the back wall, and a cut-out sun that smiles (too much). */
function Backdrop() {
  const sky = useCanvas(512, 256, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, "#5f9be0");
    g.addColorStop(1, "#bcdcf5");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 512, 256);
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    for (const [x, y, s] of [[80, 60, 1], [260, 40, 1.3], [420, 90, 0.9], [170, 150, 0.8], [360, 170, 1.1]]) {
      for (const [dx, dy, r] of [[0, 0, 22], [22, -8, 18], [-20, 4, 16], [10, 10, 18]]) {
        ctx.beginPath();
        ctx.arc(x + dx * s, y + dy * s, r * s, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  });
  const sun = useCanvas(256, 256, (ctx) => {
    ctx.translate(128, 128);
    ctx.fillStyle = "#f28c28";
    for (let k = 0; k < 12; k++) {
      ctx.rotate(Math.PI / 6);
      ctx.beginPath();
      ctx.moveTo(-14, -70);
      ctx.lineTo(0, -122);
      ctx.lineTo(14, -70);
      ctx.fill();
    }
    ctx.fillStyle = "#f6a93a";
    ctx.beginPath();
    ctx.arc(0, 0, 74, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#2a1a0c";
    for (const x of [-26, 26]) { ctx.beginPath(); ctx.ellipse(x, -14, 9, 13, 0, 0, Math.PI * 2); ctx.fill(); }
    ctx.beginPath();
    ctx.arc(0, 12, 40, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.lineWidth = 8;
    ctx.strokeStyle = "#2a1a0c";
    ctx.stroke();
  });
  const z = stage.z - stage.d / 2 + 0.05;
  return (
    <>
      <mesh position={[0, 4, z]}>
        <planeGeometry args={[stage.w - 0.4, 7.8]} />
        <meshStandardMaterial map={sky} roughness={1} />
      </mesh>
      <mesh position={[0, 5.6, z + 0.15]}>
        <planeGeometry args={[3, 3]} />
        <meshStandardMaterial map={sun} transparent roughness={0.8} />
      </mesh>
    </>
  );
}

/** Props of the set: wooden clouds on strings, a fence, a fake river and its bridge, a seesaw, alphabet blocks. */
function SetPieces() {
  const clouds = useMemo<Piece[]>(() => [[-7, 6.2], [-3, 6.6], [3.5, 6.3], [7.5, 6.7]].flatMap(([x, y]) => [
    { x, y, z: stage.z - 2, w: 2.4, h: 0.9, d: 0.3 },
    { x, y: y + 0.9, z: stage.z - 2, w: 0.02, h: 1.3, d: 0.02 },
  ]), []);
  const fence = useMemo(() => {
    const p: Piece[] = [];
    for (let x = -stage.w / 2 + 0.6; x < stage.w / 2 - 0.4; x += 0.38) p.push({ x, y: 0, z: stage.z - stage.d / 2 + 0.9, w: 0.08, h: 0.95, d: 0.05 });
    p.push({ x: 0, y: 0.6, z: stage.z - stage.d / 2 + 0.88, w: stage.w - 1, h: 0.08, d: 0.04 });
    return p;
  }, []);
  const toys = useMemo<Piece[]>(() => [
    { x: 0, y: 0.02, z: stage.z + 1.5, w: 1.4, h: 0.5, d: 3 }, // the bridge
    { x: 5, y: 0.35, z: stage.z - 1, w: 3, h: 0.14, d: 0.25 }, // seesaw
  ], []);
  const cubes: [number, number, number, string][] = [[7.4, 0, stage.z + 3, "#e8c547"], [8.2, 0, stage.z + 3, "#e53b3b"], [7.8, 0.75, stage.z + 3, "#2c6fd6"]];
  return (
    <>
      <Pieces pieces={clouds} color="#f4f4f0" roughness={0.9} />
      <Pieces pieces={fence} color="#f6f6f2" />
      <Pieces pieces={toys} color="#9b5a2c" />
      {cubes.map(([x, y, z, c], i) => (
        <mesh key={i} position={[x, y + 0.36, z]}>
          <boxGeometry args={[0.72, 0.72, 0.72]} />
          <meshStandardMaterial color={c} roughness={0.7} />
        </mesh>
      ))}
      <mesh position={[-4, 0.03, stage.z + 1.5]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[12, 2.4]} />
        <meshStandardMaterial color="#2c6fd6" roughness={0.3} />
      </mesh>
      {/* a high window, and a spot of sun across the fake world */}
      <mesh position={[stage.w / 2 - 0.05, 5.4, stage.z + 2]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[2.6, 2]} />
        <meshBasicMaterial color="#ffd58a" toneMapped={false} />
      </mesh>
      <spotLight position={[stage.w / 2 - 0.5, 5.4, stage.z + 2]} target-position={[-2, 0, stage.z]} intensity={22} angle={0.7} penumbra={1} distance={30} color="#ffcf8a" />
      <pointLight position={[0, 6, stage.z]} intensity={4} distance={20} decay={1.2} color="#bcd8ff" />
    </>
  );
}

/** The ball pit, to wade through. */
function BallPit() {
  const mesh = useMemo(() => {
    const r = seeded(9);
    const cols = ["#e53b3b", "#2c6fd6", "#e8c547", "#3aa65a", "#f28c28"].map((c) => new Color(c));
    const n = 900;
    const m = new InstancedMesh(new SphereGeometry(0.11, 8, 6), new MeshStandardMaterial({ roughness: 0.35 }), n);
    const o = new Object3D();
    for (let i = 0; i < n; i++) {
      o.position.set(PLAY.pit.x + (r() - 0.5) * PLAY.pit.w * 0.96, -0.32 + r() * 0.34, PLAY.pit.z + (r() - 0.5) * PLAY.pit.d * 0.92);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
      m.setColorAt(i, cols[i % cols.length]);
    }
    return m;
  }, []);
  return <primitive object={mesh} />;
}

function Playroom() {
  const built = use(playBuilt());
  return (
    <Place built={built} palette={PALETTE} air={AIR} density={0.03} hemi={0.65}>
      <Backdrop />
      <SetPieces />
      <BallPit />
      {/* the rabbit hole: a perfectly black circle in the green room's floor */}
      <mesh position={[PLAY.hole.x, -0.33, PLAY.hole.z]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[PLAY.hole.r - 0.05, 40]} />
        <meshBasicMaterial color="#000000" />
      </mesh>
    </Place>
  );
}

export default memo(Playroom);
