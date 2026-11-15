"use client";
import { memo, use, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { BackSide, Path, Shape, ShapeGeometry, Vector2, Vector3, type Group } from "three";
import type { Palette } from "../../archi/Architecture";
import type { Piece } from "../../archi/build";
import { Place } from "../../archi/Place";
import { BACKDROP, GARDENS, PLAY, playBuilt } from "../../places/playground";
import { usePreview } from "../../PortalWindow";
import { Pieces, useCanvas } from "../props";
import { CartoonTree, HangingCloud, Sign } from "./Kit";
import { Backstage, BallPit, Bedroom, BlockCorner, CalmPool, CloudCorridor, Garden, Lookout, PurpleRoom, Rotunda, Tunnel, WhiteRooms } from "./PlayParts";

const PALETTE: Palette = {
  surfaces: {
    sky: "#7f9fd6", "ceil:sky": "#4a64a0", wallpaper: "#a9cdea", lawn: "#e6f2dc", wood: "#d2a874",
    void: "#1d1d22", carpet: "#4b3c7c", panel: "#5a46a0", "ceil:concrete": "#241c40", plaster: "#f4f1ea", "ceil:plaster": "#fbf9f3",
    stain: "#dcd8cf", tile: "#e8eef0", concrete: "#9a9a96", "floor:concrete": "#7a7a76",
  },
  trim: "#e9e4d8",
  rail: "#ffffff",
  panel: "#fff8ea",
  light: "#fff1dc",
  intensity: 11,
  range: 16,
};
const AIR = "#0c1124";
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
    ctx.fillStyle = "#fff8e8";
    for (const x of [-26, 26]) { ctx.beginPath(); ctx.ellipse(x, -14, 12, 16, 0, 0, Math.PI * 2); ctx.fill(); }
    ctx.beginPath();
    ctx.arc(0, 12, 40, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.lineWidth = 8;
    ctx.strokeStyle = "#2a1a0c";
    ctx.stroke();
  });
  const z = BACKDROP.z;
  // the painted wall, with a doorway cut out of it (UVs stretched over the whole wall, so the painting is not cut)
  const wall = useMemo(() => {
    const W = stage.w - 0.4;
    const H = 7.8;
    const { w, h } = BACKDROP.gate;
    const outline = new Shape([new Vector2(-W / 2, 0), new Vector2(W / 2, 0), new Vector2(W / 2, H), new Vector2(-W / 2, H)]);
    outline.holes.push(new Path([new Vector2(-w / 2, 0.001), new Vector2(-w / 2, h), new Vector2(w / 2, h), new Vector2(w / 2, 0.001)]));
    // the slit at the left end, where the painted cloth does not quite meet the wall
    const { x: sx, w: sw, h: sh } = BACKDROP.slit;
    outline.holes.push(new Path([new Vector2(sx - sw / 2, 0.001), new Vector2(sx - sw / 2, sh), new Vector2(sx + sw / 2, sh), new Vector2(sx + sw / 2, 0.001)]));
    const g = new ShapeGeometry(outline);
    const pos = g.attributes.position;
    const uv = g.attributes.uv;
    for (let k = 0; k < uv.count; k++) uv.setXY(k, (pos.getX(k) + W / 2) / W, pos.getY(k) / H);
    return g;
  }, []);
  return (
    <>
      <mesh geometry={wall} position={[0, 0.1, z]}>
        <meshStandardMaterial map={sky} roughness={1} />
      </mesh>
      <mesh geometry={wall} position={[0, 0.1, z - 0.02]}>
        <meshStandardMaterial color="#8fa3b8" roughness={1} side={BackSide} />
      </mesh>
      <mesh position={[0, 5.6, z + 0.15]}>
        <planeGeometry args={[3, 3]} />
        <meshStandardMaterial map={sun} transparent roughness={0.8} />
      </mesh>
      <SunEyes z={z + 0.17} />
    </>
  );
}

const EYE = new Vector3();
/** The sun's pupils follow you around the stage, slowly. */
function SunEyes({ z }: { z: number }) {
  const eyes = useRef<(Group | null)[]>([]);
  useFrame(({ camera }, dt) => {
    eyes.current.forEach((g, k) => {
      if (!g) return;
      const cx = (k ? 1 : -1) * 0.3;
      EYE.set(camera.position.x - cx, camera.position.y - 5.76, camera.position.z - z).normalize();
      const tx = Math.max(-0.05, Math.min(0.05, EYE.x * 0.08));
      const ty = Math.max(-0.07, Math.min(0.05, EYE.y * 0.08));
      g.position.x += (cx + tx - g.position.x) * Math.min(1, dt * 1.5);
      g.position.y += (5.76 + ty - g.position.y) * Math.min(1, dt * 1.5);
    });
  });
  return (
    <>
      {[0, 1].map((k) => (
        <group key={k} ref={(g) => { eyes.current[k] = g; }} position={[(k ? 1 : -1) * 0.3, 5.76, z]}>
          <mesh scale={[1, 1.4, 1]}>
            <circleGeometry args={[0.065, 16]} />
            <meshBasicMaterial color="#2a1a0c" />
          </mesh>
        </group>
      ))}
    </>
  );
}

/** Props of the set: a fence, a fake river and its bridge, a seesaw, alphabet blocks. */
function SetPieces() {
  const fence = useMemo(() => {
    const p: Piece[] = [];
    const gap = BACKDROP.gate.w / 2;
    for (let x = -12.5; x < 12.5; x += 0.38) if (Math.abs(x) > gap) p.push({ x, y: 0, z: BACKDROP.fence, w: 0.08, h: 0.95, d: 0.05 });
    const rail = 12.5 - gap;
    for (const s of [-1, 1]) p.push({ x: s * (gap + rail / 2), y: 0.6, z: BACKDROP.fence - 0.02, w: rail, h: 0.08, d: 0.04 });
    return p;
  }, []);
  const toys = useMemo<Piece[]>(() => [
    { x: 0, y: 0.02, z: stage.z + 1.5, w: 1.4, h: 0.5, d: 3 }, // the bridge
    { x: 5, y: 0.35, z: stage.z - 1, w: 3, h: 0.14, d: 0.25 }, // seesaw
  ], []);
  const cubes: [number, number, number, string][] = [[7.4, 0, stage.z + 3, "#e8c547"], [8.2, 0, stage.z + 3, "#e53b3b"], [7.8, 0.75, stage.z + 3, "#2c6fd6"]];
  return (
    <>
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

/** Wooden palisades, trees and signs on the stage, like the corners of a play set. */
function StageExtras() {
  const palisade = useMemo<Piece[]>(() => {
    const p: Piece[] = [];
    for (let k = 0; k < 7; k++) p.push({ x: -9.5 + k * 0.18, y: 0, z: stage.z + 3.5 + Math.sin(k) * 0.05, w: 0.16, h: 1.9 + (k % 2) * 0.1, d: 0.06, a: 0.4 });
    for (let k = 0; k < 6; k++) p.push({ x: -8.2 + k * 0.17, y: 0, z: stage.z + 2.6, w: 0.15, h: 1.8, d: 0.06, a: -0.5 });
    return p;
  }, []);
  return (
    <>
      <Pieces pieces={palisade} color="#b98a5a" surfaceKey="wood" tile={1.2} />
      <CartoonTree x={-10.5} z={stage.z - 4} seed={2} />
      <CartoonTree x={11} z={stage.z - 6} s={0.75} seed={8} />
      <Sign x={-4.5} z={stage.z + 6} ry={0.3} tilt={0.05} lines={["HILL", "BLOCKS", "VIEW"]} />
      <Sign x={-12.5} z={stage.z + 1} ry={0.9} tilt={-0.1} lines={["SCENIC", "ROUTE"]} scale={0.8} />
      <HangingCloud x={-5} y={5.6} z={stage.z + 2} top={stage.ceil} ry={0.2} />
      <HangingCloud x={5.5} y={5.2} z={stage.z + 4} top={stage.ceil} ry={-0.3} s={0.8} />
    </>
  );
}

function Playroom() {
  const built = use(playBuilt(!usePreview())); // urgent when standing in it, not through a doorway
  return (
    <Place built={built} palette={PALETTE} air={AIR} density={0.014} hemi={1.15}>
      <Backdrop />
      <SetPieces />
      <StageExtras />
      <Backstage />
      <BallPit />
      <Bedroom />
      <BlockCorner />
      <CloudCorridor />
      <PurpleRoom />
      <Tunnel />
      <Rotunda />
      <Garden />
      <CalmPool />
      <WhiteRooms />
      <Lookout />
      {/* the rabbit hole: a perfectly black circle in the green room's floor */}
      <mesh position={[GARDENS.hole.x, -0.33, GARDENS.hole.z]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[GARDENS.hole.r - 0.05, 40]} />
        <meshBasicMaterial color="#000000" />
      </mesh>
    </Place>
  );
}

export default memo(Playroom);
