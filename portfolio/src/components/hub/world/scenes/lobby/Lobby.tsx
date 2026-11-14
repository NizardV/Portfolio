"use client";
import { memo, useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Color, InstancedMesh, MeshBasicMaterial, Object3D, PlaneGeometry, type PointLight, type Texture } from "three";
import { ARRIVAL_DOOR, EXITS, HALL, HALL_PILLARS, HOLES, HOLE_SQUARES, HALF, WELL, type Exit } from "../../lobby";
import { LightOpening } from "../parts";
import { boxesGeometry, buildLobby, quadsGeometry, TILE, type Piece } from "./geometry";
import { useLobbyTextures, usePlateTexture } from "./textures";

const FOG = "#2a2412";

/* ---------- small helpers ---------- */

function Boxes({ pieces, color, tile = 1, map }: { pieces: Piece[]; color?: string; tile?: number; map?: Texture }) {
  const geo = useMemo(() => boxesGeometry(pieces, tile), [pieces, tile]);
  useEffect(() => () => geo?.dispose(), [geo]);
  if (!geo) return null;
  return (
    <mesh geometry={geo}>
      <meshStandardMaterial map={map} color={color ?? "#ffffff"} roughness={0.92} />
    </mesh>
  );
}

/** Ceiling lights as one instanced mesh; a few separate ones flicker. */
function Panels({ panels }: { panels: ReturnType<typeof buildLobby>["panels"] }) {
  const mesh = useMemo(() => {
    const m = new InstancedMesh(new PlaneGeometry(1, 1), new MeshBasicMaterial({ toneMapped: false }), panels.length);
    const o = new Object3D();
    const col = new Color();
    panels.forEach((p, i) => {
      o.position.set(p.x, p.y, p.z);
      o.rotation.set(Math.PI / 2, 0, p.ry);
      o.scale.set(p.big ? 1.6 : 1.2, p.big ? 1.6 : 0.6, 1);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
      m.setColorAt(i, col.set(p.tint));
    });
    return m;
  }, [panels]);
  useEffect(() => () => {
    mesh.geometry.dispose();
    (mesh.material as MeshBasicMaterial).dispose();
    mesh.dispose();
  }, [mesh]);
  return <primitive object={mesh} />;
}

function Flicker({ position, color = "#fff4d0", strength = 1.6, speed = 1 }: { position: [number, number, number]; color?: string; strength?: number; speed?: number }) {
  const mat = useRef<MeshBasicMaterial>(null);
  const light = useRef<PointLight>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime * speed;
    const off = Math.sin(t * 13.1) * Math.sin(t * 3.7) > 0.78 || Math.sin(t * 0.9) > 0.985;
    mat.current?.color.setScalar(off ? 0.2 : 1);
    if (light.current) light.current.intensity = off ? 0.1 : strength;
  });
  return (
    <group position={position}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1.2, 0.6]} />
        <meshBasicMaterial ref={mat} color="#fffbe8" toneMapped={false} />
      </mesh>
      <pointLight ref={light} position={[0, -0.5, 0]} intensity={strength} distance={9} decay={1.6} color={color} />
    </group>
  );
}

/* ---------- the big hall: 10 m high, a gallery nobody can reach ---------- */

function Hall({ wallpaper }: { wallpaper: Texture }) {
  const { x0, x1, z0, z1, ledgeY, ledgeD } = HALL;
  const w = x1 - x0;
  const d = z1 - z0;
  const ledges: Piece[] = [
    { x: (x0 + x1) / 2, y: ledgeY, z: z0 + ledgeD / 2, w, h: 0.3, d: ledgeD },
    { x: (x0 + x1) / 2, y: ledgeY, z: z1 - ledgeD / 2, w, h: 0.3, d: ledgeD },
    { x: x0 + ledgeD / 2, y: ledgeY, z: (z0 + z1) / 2, w: ledgeD, h: 0.3, d: d - ledgeD * 2 },
    { x: x1 - ledgeD / 2, y: ledgeY, z: (z0 + z1) / 2, w: ledgeD, h: 0.3, d: d - ledgeD * 2 },
  ];
  const rails: Piece[] = [
    { x: (x0 + x1) / 2, y: ledgeY + 0.3, z: z0 + ledgeD, w: w - ledgeD * 2, h: 1, d: 0.06 },
    { x: (x0 + x1) / 2, y: ledgeY + 0.3, z: z1 - ledgeD, w: w - ledgeD * 2, h: 1, d: 0.06 },
    { x: x0 + ledgeD, y: ledgeY + 0.3, z: (z0 + z1) / 2, w: 0.06, h: 1, d: d - ledgeD * 2 },
    { x: x1 - ledgeD, y: ledgeY + 0.3, z: (z0 + z1) / 2, w: 0.06, h: 1, d: d - ledgeD * 2 },
  ];
  // doorways to nowhere along the gallery: dark recesses, one of them lit
  const recesses: Piece[] = [];
  for (let k = x0 + 3; k < x1 - 2; k += 4) {
    recesses.push({ x: k, y: ledgeY + 0.3, z: z0 + 0.14, w: 1.3, h: 2.3, d: 0.04 });
    recesses.push({ x: k, y: ledgeY + 0.3, z: z1 - 0.14, w: 1.3, h: 2.3, d: 0.04 });
  }
  return (
    <group>
      <Boxes pieces={ledges} map={wallpaper} tile={TILE.wallpaper} color="#e8dca8" />
      <Boxes pieces={rails} color="#3a3320" />
      <Boxes pieces={recesses} color="#14110a" />
      <mesh position={[x0 + 7, ledgeY + 1.45, z0 + 0.17]}>
        <planeGeometry args={[1.25, 2.25]} />
        <meshBasicMaterial color="#ffe9a8" toneMapped={false} />
      </mesh>
      {HALL_PILLARS.map(([x, z]) => (
        <mesh key={`${x}:${z}`} position={[x, 5, z]}>
          <cylinderGeometry args={[0.45, 0.5, 10, 20]} />
          <meshStandardMaterial map={wallpaper} color="#e0d39a" roughness={0.9} />
        </mesh>
      ))}
      <pointLight position={[(x0 + x1) / 2, 8.5, (z0 + z1) / 2]} intensity={14} distance={30} decay={1.4} color="#ffe9b8" />
      <pointLight position={[(x0 + x1) / 2, ledgeY + 2, z0 + 1]} intensity={4} distance={14} decay={1.6} color="#ffd98a" />
    </group>
  );
}

/* ---------- the pit's well: shelves going down into the dark ---------- */

function Well({ wallpaper }: { wallpaper: Texture }) {
  const { x, z, size, depth } = WELL;
  const top = -2.2;
  const half = size / 2;
  const shafts: Piece[] = [
    { x, y: top - depth, z: z - half, w: size, h: depth, d: 0.1 },
    { x, y: top - depth, z: z + half, w: size, h: depth, d: 0.1 },
    { x: x - half, y: top - depth, z, w: 0.1, h: depth, d: size },
    { x: x + half, y: top - depth, z, w: 0.1, h: depth, d: size },
  ];
  const shelves: Piece[] = [];
  for (let y = top - 0.9; y > top - depth; y -= 0.9) {
    shelves.push({ x, y, z: z - half + 0.2, w: size - 0.2, h: 0.05, d: 0.35 });
    shelves.push({ x, y, z: z + half - 0.2, w: size - 0.2, h: 0.05, d: 0.35 });
    shelves.push({ x: x - half + 0.2, y, z, w: 0.35, h: 0.05, d: size - 0.6 });
    shelves.push({ x: x + half - 0.2, y, z, w: 0.35, h: 0.05, d: size - 0.6 });
  }
  const books: Piece[] = [];
  let s = 11;
  const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (const sh of shelves) {
    const along = sh.w > sh.d;
    const len = along ? sh.w : sh.d;
    for (let t = -len / 2 + 0.1; t < len / 2 - 0.1; t += 0.12) if (r() < 0.7) {
      const hb = 0.25 + r() * 0.3;
      books.push(along ? { x: sh.x + t, y: sh.y + 0.05, z: sh.z, w: 0.08, h: hb, d: 0.25 } : { x: sh.x, y: sh.y + 0.05, z: sh.z + t, w: 0.25, h: hb, d: 0.08 });
    }
  }
  return (
    <group>
      <Boxes pieces={shafts} map={wallpaper} tile={TILE.wallpaper} color="#a89c68" />
      <Boxes pieces={shelves} color="#5a4224" />
      <Boxes pieces={books} color="#7a6a4a" />
    </group>
  );
}

/* ---------- the hole field: under the floor, another Lobby ---------- */

function HoleField({ wallpaper, carpet }: { wallpaper: Texture; carpet: Texture }) {
  const { x0, z0, size, step, depth } = HOLES;
  const shafts: Piece[] = HOLE_SQUARES.flatMap(([x, z]) => [
    { x, y: -depth, z: z - step / 2, w: step, h: depth, d: 0.06 },
    { x, y: -depth, z: z + step / 2, w: step, h: depth, d: 0.06 },
    { x: x - step / 2, y: -depth, z, w: 0.06, h: depth, d: step },
    { x: x + step / 2, y: -depth, z, w: 0.06, h: depth, d: step },
  ]);
  const lower = useMemo(() => quadsGeometry([{ x0, x1: x0 + size, z0, z1: z0 + size, y: -depth }], TILE.carpet, "up"), [x0, z0, size, depth]);
  useEffect(() => () => lower?.dispose(), [lower]);
  return (
    <group>
      <Boxes pieces={shafts} map={wallpaper} tile={TILE.wallpaper} color="#b7a866" />
      {lower && (
        <mesh geometry={lower}>
          <meshStandardMaterial map={carpet} roughness={1} />
        </mesh>
      )}
      <pointLight position={[x0 + size / 2, -2.2, z0 + size / 2]} intensity={6} distance={10} decay={1.5} color="#fff1c2" />
    </group>
  );
}

/* ---------- thresholds of the branches: closed for now ---------- */

function Frame({ w, h, color }: { w: number; h: number; color: string }) {
  return (
    <>
      <mesh position={[-w / 2 - 0.08, h / 2, 0.06]}>
        <boxGeometry args={[0.16, h + 0.16, 0.12]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[w / 2 + 0.08, h / 2, 0.06]}>
        <boxGeometry args={[0.16, h + 0.16, 0.12]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[0, h + 0.08, 0.06]}>
        <boxGeometry args={[w + 0.32, 0.16, 0.12]} />
        <meshStandardMaterial color={color} />
      </mesh>
    </>
  );
}

function Glow({ w, h, color, z = 0.02, opacity = 1 }: { w: number; h: number; color: string; z?: number; opacity?: number }) {
  return (
    <mesh position={[0, h / 2, z]}>
      <planeGeometry args={[w, h]} />
      <meshBasicMaterial color={color} toneMapped={false} transparent={opacity < 1} opacity={opacity} />
    </mesh>
  );
}

function Plate({ text, color, y }: { text: string; color: string; y: number }) {
  const map = usePlateTexture(text, color);
  return (
    <mesh position={[0, y, 0.04]}>
      <planeGeometry args={[0.8, 0.2]} />
      <meshBasicMaterial map={map} toneMapped={false} />
    </mesh>
  );
}

function ExitThreshold({ exit }: { exit: Exit }) {
  const { kind, color } = exit;
  return (
    <group position={[exit.x + Math.sin(exit.angle) * 0.14, exit.y, exit.z + Math.cos(exit.angle) * 0.14]} rotation={[0, exit.angle, 0]}>
      {kind === "sealed" && (
        <>
          <Frame w={1.2} h={2.2} color="#4a4126" />
          <mesh position={[0, 1.1, 0.04]}>
            <boxGeometry args={[1.2, 2.2, 0.08]} />
            <meshStandardMaterial color="#6b5d2a" metalness={0.4} roughness={0.6} />
          </mesh>
          {[0.5, 1.1, 1.7].map((y) => (
            <mesh key={y} position={[0, y, 0.1]}>
              <boxGeometry args={[1.3, 0.08, 0.06]} />
              <meshStandardMaterial color="#3a3320" metalness={0.5} roughness={0.5} />
            </mesh>
          ))}
          <Flicker position={[0, 2.18, 0.6]} color="#ffd25a" strength={2.4} speed={1.7} />
        </>
      )}
      {kind === "grate" && (
        <>
          <Glow w={2.2} h={2.4} color="#bff6f2" z={-0.05} />
          <Frame w={2.2} h={2.4} color="#d9ecea" />
          {Array.from({ length: 12 }, (_, k) => (
            <mesh key={k} position={[-1.05 + k * 0.19, 1.2, 0.08]}>
              <boxGeometry args={[0.04, 2.4, 0.04]} />
              <meshStandardMaterial color="#56606a" metalness={0.6} roughness={0.4} />
            </mesh>
          ))}
          <pointLight position={[0, 1.6, 1.4]} intensity={5} distance={10} decay={1.5} color={color} />
        </>
      )}
      {kind === "elevator" && (
        <>
          <Frame w={1.7} h={2.3} color="#6e757b" />
          {[-0.425, 0.425].map((x) => (
            <mesh key={x} position={[x, 1.15, 0.05]}>
              <boxGeometry args={[0.84, 2.3, 0.05]} />
              <meshStandardMaterial color="#9aa1a7" metalness={0.75} roughness={0.35} />
            </mesh>
          ))}
          <Plate text="▲  BUREAUX" color={color} y={2.6} />
          <mesh position={[1.15, 1.2, 0.06]}>
            <circleGeometry args={[0.05, 16]} />
            <meshBasicMaterial color={color} toneMapped={false} />
          </mesh>
          <pointLight position={[0, 2.2, 1.2]} intensity={4} distance={9} decay={1.6} color={color} />
        </>
      )}
      {kind === "glass" && (
        <>
          <Glow w={2} h={2.3} color="#ffd1dc" z={-0.06} opacity={0.9} />
          <Frame w={2} h={2.3} color="#2c2c30" />
          {[-0.5, 0.5].map((x) => (
            <mesh key={x} position={[x, 1.15, 0.05]}>
              <boxGeometry args={[0.98, 2.3, 0.03]} />
              <meshStandardMaterial color="#d8e4ec" transparent opacity={0.25} roughness={0.1} />
            </mesh>
          ))}
          <mesh position={[0, 1.05, 0.12]}>
            <boxGeometry args={[1.6, 0.05, 0.05]} />
            <meshStandardMaterial color="#c9ccd0" metalness={0.8} roughness={0.3} />
          </mesh>
          <pointLight position={[0, 1.6, 1.2]} intensity={4} distance={9} decay={1.6} color={color} />
        </>
      )}
      {kind === "velvet" && (
        <>
          <Glow w={2.6} h={2.8} color="#ff9a7a" z={-0.05} />
          <Frame w={2.6} h={2.8} color="#5a3220" />
          <Plate text="HÔTEL  ↑" color="#f2c9a0" y={3.15} />
          {[-0.9, 0.9].map((x) => (
            <mesh key={x} position={[x, 0.5, 0.7]}>
              <cylinderGeometry args={[0.05, 0.08, 1, 12]} />
              <meshStandardMaterial color="#c9a24a" metalness={0.8} roughness={0.3} />
            </mesh>
          ))}
          <mesh position={[0, 0.88, 0.7]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.035, 0.035, 1.8, 10]} />
            <meshStandardMaterial color="#8a1f24" roughness={0.8} />
          </mesh>
          <pointLight position={[0, 1.8, 1.4]} intensity={5} distance={10} decay={1.5} color={color} />
        </>
      )}
    </group>
  );
}

/* ---------- the way back to the meadow ---------- */

function WayOut() {
  const { x, width, height } = ARRIVAL_DOOR;
  return (
    <group>
      <LightOpening position={[x, 0, HALF + 0.3]} rotationY={Math.PI} width={width} height={height} />
      <group position={[x, 0, HALF - 0.14]} rotation={[0, Math.PI, 0]}>
        <Frame w={width} h={height} color="#f2f1ea" />
      </group>
      <pointLight position={[x, 1.6, HALF - 1.2]} intensity={4} distance={8} decay={1.5} color="#ffffff" />
    </group>
  );
}

/* ---------- scene ---------- */

function Lobby() {
  const tex = useLobbyTextures();
  const geo = useMemo(buildLobby, []);
  const floors = useMemo(
    () => (["carpet", "stain", "tile", "concrete"] as const).map((m) => ({ m, g: quadsGeometry(geo.floors[m], TILE[m], "up") })),
    [geo],
  );
  const ceiling = useMemo(() => quadsGeometry(geo.ceilings, TILE.ceiling, "down"), [geo]);
  useEffect(() => () => {
    floors.forEach((f) => f.g?.dispose());
    ceiling?.dispose();
  }, [floors, ceiling]);

  return (
    <>
      <color attach="background" args={[FOG]} />
      <fog attach="fog" args={[FOG, 6, 40]} />
      <ambientLight intensity={0.55} color="#fff2c4" />
      <hemisphereLight args={["#fff6d0", "#5a4a1c", 0.6]} />

      {floors.map(({ m, g }) =>
        g ? (
          <mesh key={m} geometry={g}>
            <meshStandardMaterial map={tex[m]} roughness={1} />
          </mesh>
        ) : null,
      )}
      {ceiling && (
        <mesh geometry={ceiling}>
          <meshStandardMaterial map={tex.ceiling} roughness={1} />
        </mesh>
      )}
      <Boxes pieces={geo.walls.wallpaper} map={tex.wallpaper} tile={TILE.wallpaper} />
      <Boxes pieces={geo.walls.tile} map={tex.tile} tile={TILE.tile} />
      <Boxes pieces={geo.walls.concrete} map={tex.concrete} tile={TILE.concrete} />
      <Boxes pieces={geo.steps} map={tex.concrete} tile={TILE.concrete} color="#b8b2a0" />
      <Boxes pieces={geo.rails} color="#3a3320" />
      <Panels panels={geo.panels} />

      <Hall wallpaper={tex.wallpaper} />
      <Well wallpaper={tex.wallpaper} />
      <HoleField wallpaper={tex.wallpaper} carpet={tex.carpet} />
      {EXITS.map((e) => (
        <ExitThreshold key={e.id} exit={e} />
      ))}
      <WayOut />

      {/* a few tubes that never settle */}
      <Flicker position={[-17.5, 2.97, 22.5]} />
      <Flicker position={[12.5, 2.97, 2.5]} speed={0.7} />
      <Flicker position={[-27.5, 2.17, -12.5]} strength={1.2} speed={1.3} />
      <pointLight position={[15, 0.6, -20]} intensity={3} distance={12} decay={1.6} color="#cfd8e6" />
    </>
  );
}

// memo: the World re-renders often (prompts, toasts); the Lobby itself never needs to, and its geometry is costly
export default memo(Lobby);
