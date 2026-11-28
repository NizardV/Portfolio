"use client";
import { memo, use, useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { BackSide, CanvasTexture, MeshBasicMaterial, SRGBColorSpace, Vector3, type Group, type Mesh, type PointLight } from "three";
import Architecture, { type Palette } from "../../archi/Architecture";
import Atmosphere from "../../Atmosphere";
import { piecesGeometry, type Piece } from "../../archi/build";
import { surface } from "../../archi/materials";
import { geomDist } from "../../archi/sdf";
import type { Panel } from "../../archi/build";
import { ARRIVAL_WALL, EXITS, HALL, LOBBY_ARRIVAL, LOBBY_SPACE, lobbyBuilt, memoryId, RED_CITY_LAST, SLICE0, SLICE0_MEMORIES, SLICE0_READY, WELL, type Exit, type Memory } from "../../lobby";
import { useWorldState } from "../../state";
import { useSkin } from "../../archi/Skin";
import { usePreview } from "../../PortalWindow";
import { usePlateTexture } from "./textures";

/** Dirty mono-yellow, dim, heavy: pools of tube light in a sea of brownish dark. */
export const LOBBY_PALETTE: Palette = {
  surfaces: {
    wallpaper: "#d9c160",
    carpet: "#b39c4c",
    stain: "#a48d42",
    ceiling: "#d8cfa4",
    concrete: "#a59f88",
    tile: "#d9ece8",
    void: "#6b5f33",
    "ceil:tile": "#cfe3df",
  },
  trim: "#4a3e1e",
  rail: "#3a3320",
  panel: "#fff3d2",
  light: "#ffe7a8",
  intensity: 5, // the live lights only light the objects now: walls, floors and ceilings carry their baked light
  range: 15,
  roughness: 0.95,
};
const FOG = "#1d180a";

/* ---------- the hall's gallery: 6 m up, along the walls, unreachable ---------- */

function Gallery() {
  const geo = useMemo(() => {
    if (HALL.kind !== "box") return null;
    const a = HALL.a ?? 0;
    const y = 6;
    const D = 1.8;
    const at = (lx: number, lz: number): [number, number] => [HALL.cx + lx * Math.cos(a) + lz * Math.sin(a), HALL.cz - lx * Math.sin(a) + lz * Math.cos(a)];
    const pieces: Piece[] = [];
    const hw = HALL.w / 2;
    const hd = HALL.d / 2;
    for (const s of [-1, 1]) {
      const [x1, z1] = at(0, s * (hd - D / 2));
      pieces.push({ x: x1, y, z: z1, w: HALL.w, h: 0.3, d: D, a });
      const [x2, z2] = at(s * (hw - D / 2), 0);
      pieces.push({ x: x2, y, z: z2, w: D, h: 0.3, d: HALL.d - D * 2, a });
      const [x3, z3] = at(0, s * (hd - D));
      pieces.push({ x: x3, y: y + 0.3, z: z3, w: HALL.w - D * 2, h: 1, d: 0.06, a });
      const [x4, z4] = at(s * (hw - D), 0);
      pieces.push({ x: x4, y: y + 0.3, z: z4, w: 0.06, h: 1, d: HALL.d - D * 2, a });
    }
    return piecesGeometry(pieces, 2);
  }, []);
  const doors = useMemo(() => {
    if (HALL.kind !== "box") return null;
    const a = HALL.a ?? 0;
    const pieces: Piece[] = [];
    for (let lx = -HALL.w / 2 + 3; lx < HALL.w / 2 - 2; lx += 4.2) for (const s of [-1, 1]) {
      const lz = s * (HALL.d / 2 - 0.16);
      pieces.push({ x: HALL.cx + lx * Math.cos(a) + lz * Math.sin(a), y: 6.3, z: HALL.cz - lx * Math.sin(a) + lz * Math.cos(a), w: 1.3, h: 2.3, d: 0.05, a });
    }
    return piecesGeometry(pieces);
  }, []);
  // a frame round each of them: doors (closed off), not holes in the wall
  const frames = useMemo(() => {
    if (HALL.kind !== "box") return null;
    const a = HALL.a ?? 0;
    const pieces: Piece[] = [];
    const at = (lx: number, lz: number) => [HALL.cx + lx * Math.cos(a) + lz * Math.sin(a), HALL.cz - lx * Math.sin(a) + lz * Math.cos(a)];
    for (let lx = -HALL.w / 2 + 3; lx < HALL.w / 2 - 2; lx += 4.2) for (const s of [-1, 1]) {
      const lz = s * (HALL.d / 2 - 0.2);
      for (const sx of [-1, 1]) {
        const [x, z] = at(lx + sx * 0.71, lz);
        pieces.push({ x, y: 6.3, z, w: 0.12, h: 2.42, d: 0.1, a });
      }
      const [x, z] = at(lx, lz);
      pieces.push({ x, y: 8.66, z, w: 1.54, h: 0.12, d: 0.1, a });
    }
    return piecesGeometry(pieces);
  }, []);
  const wall = surface("wallpaper");
  return (
    <>
      {geo && (
        <mesh geometry={geo}>
          {/* unlit + the hall's even light: the place's live lights only touch objects now, too dim for a 6 m gallery */}
          <meshBasicMaterial map={wall.map} color="#c9ad58" />
        </mesh>
      )}
      {/* doorways to nowhere along the gallery; nothing behind them */}
      {frames && (
        <mesh geometry={frames}>
          <meshBasicMaterial color="#3d321a" />
        </mesh>
      )}
      {doors && (
        <mesh geometry={doors}>
          <meshBasicMaterial color="#2b2215" />
        </mesh>
      )}
    </>
  );
}

/* ---------- the rotunda's well: shelves of books going down for 40 m ---------- */

function Well() {
  const geo = useMemo(() => {
    const pieces: Piece[] = [];
    let s = 17;
    const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let y = -4; y > WELL.floor + 1; y -= 0.95) {
      for (let k = 0; k < 10; k++) {
        const a = (k / 10) * Math.PI * 2;
        const rr = WELL.r - 0.22;
        const x = WELL.x + Math.cos(a) * rr;
        const z = WELL.z + Math.sin(a) * rr;
        pieces.push({ x, y, z, w: 1.25, h: 0.05, d: 0.36, a: -a + Math.PI / 2 });
        for (let b = -0.5; b < 0.5; b += 0.12) if (r() < 0.75) {
          const bx = x + Math.cos(a + Math.PI / 2) * b * 1.1;
          const bz = z + Math.sin(a + Math.PI / 2) * b * 1.1;
          pieces.push({ x: bx, y: y + 0.05, z: bz, w: 0.08, h: 0.25 + r() * 0.3, d: 0.26, a: -a + Math.PI / 2 });
        }
      }
    }
    return piecesGeometry(pieces);
  }, []);
  return geo ? (
    <mesh geometry={geo}>
      <meshBasicMaterial color="#4a3a22" />
    </mesh>
  ) : null;
}

/* ---------- thresholds of the branches ---------- */

function Frame({ w, h, color }: { w: number; h: number; color: string }) {
  return (
    <>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * (w / 2 + 0.08), h / 2, 0.06]}>
          <boxGeometry args={[0.16, h + 0.16, 0.12]} />
          <meshStandardMaterial color={color} />
        </mesh>
      ))}
      <mesh position={[0, h + 0.08, 0.06]}>
        <boxGeometry args={[w + 0.32, 0.16, 0.12]} />
        <meshStandardMaterial color={color} />
      </mesh>
    </>
  );
}
/**
 * Something is wrong over there: shards of colour flash around the far door, its double slips sideways for a few
 * frames, its light stutters. Random, in bursts, never for long.
 */
function Glitch({ w, h, color }: { w: number; h: number; color: string }) {
  const shards = useRef<(Mesh | null)[]>([]);
  const ghost = useRef<Group>(null);
  const light = useRef<PointLight>(null);
  const next = useRef(0);
  const burst = useRef(0);
  const COLORS = [color, "#4fd1c5", "#e0453a", "#f4f1e8", "#7a5cff"];
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (t > next.current) {
      // between bursts: quiet for a while; during one: new shards every few frames
      if (burst.current <= 0) {
        burst.current = Math.random() < 0.5 ? 2 + Math.floor(Math.random() * 10) : 0;
        next.current = t + (burst.current ? 0.05 : 0.6 + Math.random() * 2.4);
      } else {
        burst.current--;
        next.current = t + 0.04 + Math.random() * 0.09;
      }
      const on = burst.current > 0;
      shards.current.forEach((m, k) => {
        if (!m) return;
        m.visible = on && Math.random() < 0.7;
        m.position.set((Math.random() - 0.5) * (w + 1.6), Math.random() * (h + 0.8), 0.12 + Math.random() * 0.3);
        m.scale.set(0.1 + Math.random() * (k % 3 === 0 ? 1.4 : 0.5), 0.02 + Math.random() * 0.12, 1);
      });
      if (ghost.current) {
        ghost.current.visible = on && Math.random() < 0.6;
        ghost.current.position.x = (Math.random() - 0.5) * 0.5;
      }
      if (light.current) light.current.intensity = on ? 1 + Math.random() * 5 : 2.2;
    }
  });
  return (
    <>
      {COLORS.flatMap((c) => [0, 1, 2].map((k) => (
        <mesh key={c + k} ref={(m) => { shards.current[COLORS.indexOf(c) * 3 + k] = m; }} visible={false}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial color={c} toneMapped={false} transparent opacity={0.85} />
        </mesh>
      )))}
      <group ref={ghost} visible={false}>
        <mesh position={[0, h / 2, 0.14]}>
          <planeGeometry args={[w, h]} />
          <meshBasicMaterial color={color} transparent opacity={0.25} toneMapped={false} />
        </mesh>
      </group>
      <pointLight ref={light} position={[0, 2, 0.8]} intensity={2.2} distance={8} decay={1.6} color={color} />
    </>
  );
}

function Plate({ text, color, at }: Readonly<{ text: string; color: string; at: [number, number, number] }>) {
  const map = usePlateTexture(text, color);
  const placed = { position: at };
  return (
    <mesh {...placed}>
      <planeGeometry args={[0.8, 0.2]} />
      <meshBasicMaterial map={map} toneMapped={false} />
    </mesh>
  );
}

/** the shop's glass doors: tinted, see-through (they used to read as white slabs) */
const SHOP_GLASS = { color: "#8fb0bf", transparent: true, opacity: 0.16, roughness: 0.35, metalness: 0.1, depthWrite: false } as const;
/** the light of a threshold, a hint of the place behind */
const WELCOME_LIGHT = { intensity: 1.4, distance: 6, decay: 1.6 } as const;

/**
 * Where a threshold's sign can be seen, in the threshold's own frame (+z into the Lobby): on the front of the low box
 * the landing makes over the doorway, centred in it; where that box is too thin for it (the hotel), beside the door at
 * eye height. (Signs used to sit above the landing's ceiling, inside that box: nobody ever saw them.)
 */
function signSpot(exit: Exit): [number, number, number] {
  const { anchor, size } = exit;
  const fx = -Math.sin(anchor.yaw);
  const fz = -Math.cos(anchor.yaw);
  const ceil = (d: number) => LOBBY_SPACE.ceiling(anchor.x - fx * d, anchor.z - fz * d);
  const low = ceil(0.1);
  for (let d = 0.1; d < 2; d += 0.02) {
    const high = ceil(d);
    if (high > low + 0.35) return [0, (low + high) / 2 - anchor.y, d - 0.06 + 0.015];
  }
  return [size[0] / 2 + 0.55, 1.7, 0.04];
}

/** The thresholds of the branches. Open ones are only a frame: the place behind is seen through them, live. */
function ExitThreshold({ exit }: { exit: Exit }) {
  const { kind, color, anchor, size } = exit;
  const [w, h] = size;
  const a = anchor.yaw; // +z faces into the Lobby (the side you come from: walking through goes along -z)
  const fx = -Math.sin(anchor.yaw);
  const fz = -Math.cos(anchor.yaw);
  return (
    <group position={[anchor.x - fx * 0.06, anchor.y, anchor.z - fz * 0.06]} rotation={[0, a, 0]}>
      {kind === "sealed" && (
        <>
          <Frame w={w} h={h} color="#4a4126" />
          <mesh position={[0, h / 2, 0.04]}>
            <boxGeometry args={[w, h, 0.08]} />
            <meshStandardMaterial color="#6b5d2a" metalness={0.4} roughness={0.6} />
          </mesh>
          {[0.5, 1.05, 1.6].map((y) => (
            <mesh key={y} position={[0, y, 0.1]}>
              <boxGeometry args={[w + 0.1, 0.08, 0.06]} />
              <meshStandardMaterial color="#3a3320" metalness={0.5} roughness={0.5} />
            </mesh>
          ))}
          <Glitch w={w} h={h} color={color} />
        </>
      )}
      {kind === "grate" && <Frame w={w} h={h} color="#d9ecea" />}
      {kind === "elevator" && (
        <>
          <Frame w={w} h={h} color="#6e757b" />
          <Plate text="▲  BUREAUX" color={color} at={signSpot(exit)} />
          {[-1, 1].map((sd) => (
            <mesh key={sd} position={[sd * (w / 2 + 0.55), h / 2, 0.02]}>
              <boxGeometry args={[0.84, h, 0.05]} />
              <meshStandardMaterial color="#9aa1a7" metalness={0.25} roughness={0.45} />
            </mesh>
          ))}
        </>
      )}
      {kind === "glass" && (
        <>
          <Frame w={w} h={h} color="#2c2c30" />
          {[-1, 1].map((sd) => (
            <mesh key={sd} position={[sd * (w / 2 + 0.5), h / 2, 0.05]}>
              <boxGeometry args={[0.98, h, 0.03]} />
              <meshStandardMaterial {...SHOP_GLASS} />
            </mesh>
          ))}
        </>
      )}
      {kind === "velvet" && (
        <>
          <Frame w={w} h={h} color="#5a3220" />
          <Plate text="HÔTEL  ↑" color="#f2c9a0" at={signSpot(exit)} />
          {[-1, 1].map((sd) => (
            <mesh key={sd} position={[sd * (w / 2 + 0.4), 0.5, 0.5]}>
              <cylinderGeometry args={[0.05, 0.08, 1, 12]} />
              <meshStandardMaterial color="#c9a24a" metalness={0.3} roughness={0.4} />
            </mesh>
          ))}
        </>
      )}
      {kind === "service" && (
        <>
          <Frame w={w} h={h} color="#55585a" />
          <Plate text="SERVICE" color="#c9ccc4" at={signSpot(exit)} />
        </>
      )}
      {kind === "secret" && <Frame w={w} h={h} color="#3a3320" />}
      {/* a hint of the place behind, on the Lobby side (it used to shine beyond the door) */}
      {kind !== "sealed" && kind !== "secret" && <pointLight position={[0, h * 0.8, 0.8]} {...WELCOME_LIGHT} color={color} />}
    </group>
  );
}

/* ---------- slice 0: where its memories will be (greybox markers, the real objects come with the art pass) ---------- */

const MARK: Record<Memory["kind"], { color: string; size: [number, number]; flat: boolean }> = {
  trace: { color: "#e07a3a", size: [0.3, 0.42], flat: false },
  objet: { color: "#e07a3a", size: [0.1, 0.12], flat: true },
  evenement: { color: "#8a5cd6", size: [1.2, 1.2], flat: true },
  change: { color: "#3aa66a", size: [0.5, 0.7], flat: false },
};

/**
 * The arrival room's frame: blank at first; once the Polaroid is found, the house in the meadow at dusk, its window dark;
 * once the Red City's last memory is found too, the window lit (the owner's call, 2026-11-23). Drawn on a canvas until
 * the art pass.
 */
function frameTexture(stage: 0 | 1 | 2) {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 358;
  const g = c.getContext("2d")!;
  g.fillStyle = "#e9e3d2";
  g.fillRect(0, 0, c.width, c.height);
  if (stage > 0) {
    const sky = g.createLinearGradient(0, 30, 0, 220);
    sky.addColorStop(0, "#2b3550");
    sky.addColorStop(1, "#b7876a");
    g.fillStyle = sky;
    g.fillRect(24, 24, 208, 200);
    g.fillStyle = "#3e4a2a";
    g.fillRect(24, 224, 208, 110);
    // the house, small, at the far end of the meadow
    g.fillStyle = "#1d1c1f";
    g.fillRect(150, 172, 44, 34);
    g.beginPath();
    g.moveTo(144, 174);
    g.lineTo(172, 150);
    g.lineTo(200, 174);
    g.fill();
    g.fillStyle = stage === 2 ? "#ffd37a" : "#2a2a30";
    g.fillRect(166, 182, 10, 10);
  }
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}

function ArrivalFrame({ m }: { m: Memory }) {
  const { used } = useWorldState();
  let stage: 0 | 1 | 2 = 0;
  if (used.has(memoryId("polaroid"))) stage = used.has(RED_CITY_LAST) ? 2 : 1;
  const texture = useMemo(() => frameTexture(stage), [stage]);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <group position={[m.x, m.y, m.z]} rotation={[0, m.ry, 0]}>
      <mesh position={[0, 0, 0.012]}>
        <planeGeometry args={[0.56, 0.76]} />
        <meshBasicMaterial color="#3a2f1c" />
      </mesh>
      <mesh position={[0, 0, 0.02]}>
        <planeGeometry args={[0.5, 0.7]} />
        <meshBasicMaterial map={texture} toneMapped={false} />
      </mesh>
    </group>
  );
}

function MemoryMarkers() {
  const { used } = useWorldState();
  return (
    <>
      {SLICE0_MEMORIES.map((m) => {
        if (m.kind === "change") return <ArrivalFrame key={m.id} m={m} />;
        // the event happens on its own: nothing to see on the floor; a picked-up object is gone
        if (m.kind === "evenement" || (m.kind === "objet" && used.has(memoryId(m.id)))) return null;
        const k = MARK[m.kind];
        return (
          <mesh key={m.id} position={[m.x, m.y, m.z]} rotation={k.flat ? [-Math.PI / 2, 0, m.ry] : [0, m.ry, 0]}>
            <planeGeometry args={k.size} />
            <meshBasicMaterial color={k.color} toneMapped={false} />
          </mesh>
        );
      })}
    </>
  );
}

/**
 * Memory 3, the event (slice 0): standing in the pentagon and turning back to the long corridor, its lights go out one
 * by one, the far end first, coming towards you; the corridor stays dark from then on (found for good). The corridor's
 * light is baked, so a tube going out is drawn: a dead tile over it, and a veil of dark over its stretch of corridor.
 */
const EVENT_SPOT = SLICE0_MEMORIES.find((m) => m.id === "lumieres");
const LOOK = new Vector3();
const STEPS = 7;
const VEIL = new MeshBasicMaterial({ color: "#040302", transparent: true, opacity: 0.6, depthWrite: false, side: BackSide });
const NONE = new MeshBasicMaterial({ visible: false });

/** the corridor's own stretch (where no other room takes over), cut in STEPS pieces, the far end from the spot first */
function corridorPieces() {
  const c = LOBBY_SPACE.shapes[SLICE0[3]];
  if (c.kind !== "box" || !EVENT_SPOT) return null;
  const a = c.a ?? 0;
  const [ux, uz] = [Math.cos(a), -Math.sin(a)];
  let u0 = Infinity;
  let u1 = -Infinity;
  for (let u = -c.w / 2; u <= c.w / 2; u += 0.25) if (LOBBY_SPACE.ownerIndex(c.x + ux * u, c.z + uz * u) === SLICE0[3]) [u0, u1] = [Math.min(u0, u), Math.max(u1, u)];
  if (!Number.isFinite(u0)) return null;
  const len = (u1 - u0) / STEPS;
  const pieces = Array.from({ length: STEPS }, (_, k) => {
    const u = u0 + len * (k + 0.5);
    return { x: c.x + ux * u, z: c.z + uz * u, first: k === 0, last: k === STEPS - 1 };
  });
  const far = Math.hypot(pieces[0].x - EVENT_SPOT.x, pieces[0].z - EVENT_SPOT.z) > Math.hypot(pieces[STEPS - 1].x - EVENT_SPOT.x, pieces[STEPS - 1].z - EVENT_SPOT.z);
  if (!far) pieces.reverse();
  return { pieces, len, width: c.d - 0.04, height: c.ceil - 0.02, a };
}

function LightsEvent({ panels }: { panels: Panel[] }) {
  const { used, mark } = useWorldState();
  const { camera } = useThree();
  const done = used.has(memoryId("lumieres"));
  const geo = useMemo(corridorPieces, []);
  // each tube of the corridor goes out with the piece of corridor it lights
  const tubes = useMemo(() => {
    if (!geo) return [];
    const corridor = LOBBY_SPACE.shapes[SLICE0[3]];
    return panels
      .filter((p) => !p.dead && geomDist(corridor, p.x, p.z) < -0.2)
      .map((p) => ({ p, step: geo.pieces.reduce((best, q, k) => (Math.hypot(q.x - p.x, q.z - p.z) < Math.hypot(geo.pieces[best].x - p.x, geo.pieces[best].z - p.z) ? k : best), 0) }));
  }, [panels, geo]);
  const out = useRef(done ? STEPS : 0);
  const started = useRef<number | null>(null);
  const veils = useRef<(Mesh | null)[]>([]);
  const covers = useRef<(Mesh | null)[]>([]);
  useFrame(({ clock }) => {
    if (!geo || !EVENT_SPOT) return;
    const t = clock.elapsedTime;
    if (started.current === null && !done) {
      // in the pentagon, near the spot, looking back down the corridor
      if (Math.hypot(camera.position.x - EVENT_SPOT.x, camera.position.z - EVENT_SPOT.z) > 3.5) return;
      camera.getWorldDirection(LOOK);
      const far = geo.pieces[0];
      const dx = far.x - camera.position.x;
      const dz = far.z - camera.position.z;
      if ((LOOK.x * dx + LOOK.z * dz) / (Math.hypot(LOOK.x, LOOK.z) * Math.hypot(dx, dz) || 1) < 0.85) return;
      started.current = t;
    }
    const n = done ? STEPS : Math.min(STEPS, Math.floor((t - (started.current ?? t)) / 0.6) + 1);
    if (n !== out.current) {
      out.current = n;
      if (n === STEPS && !done) mark?.([memoryId("lumieres")]);
    }
    veils.current.forEach((m, k) => {
      if (m) m.visible = k < out.current;
    });
    covers.current.forEach((m, k) => {
      if (m) m.visible = tubes[k].step < out.current;
    });
  });
  if (!geo) return null;
  return (
    <>
      {geo.pieces.map((q, k) => (
        // the dark, inside the corridor: its walls, floor and ceiling seen through it; caps only at the corridor's ends
        <mesh key={k} ref={(m) => { veils.current[k] = m; }} visible={done} position={[q.x, geo.height / 2, q.z]} rotation={[0, geo.a, 0]} material={[q.first || q.last ? VEIL : NONE, q.first || q.last ? VEIL : NONE, VEIL, VEIL, VEIL, VEIL]}>
          <boxGeometry args={[geo.len + 0.01, geo.height, geo.width]} />
        </mesh>
      ))}
      {tubes.map(({ p }, k) => (
        // the tube, dead: an unlit grey tile just under it
        <mesh key={`${p.x},${p.z}`} ref={(m) => { covers.current[k] = m; }} visible={done} position={[p.x, p.y - 0.006, p.z]} rotation={[Math.PI / 2, 0, -p.a]}>
          <planeGeometry args={[p.size[0] + 0.01, p.size[1] + 0.01]} />
          <meshBasicMaterial color="#5d5a52" side={2} />
        </mesh>
      ))}
    </>
  );
}

/* ---------- scene ---------- */

function Lobby() {
  const built = use(lobbyBuilt(!usePreview())); // urgent when standing in it, not through a doorway
  // drawn by its Blender model; the kit adds the railings, and lights the tiles the model lit
  const skin = useSkin("lobby", LOBBY_PALETTE);
  const lit = useMemo(() => ({ ...built, panels: [...built.panels, ...skin.panels] }), [built, skin.panels]);
  return (
    <>
      <Atmosphere background={FOG} fog={FOG} density={0.042} />
      <hemisphereLight args={["#fff2c4", "#3a3016", 0.38]} />
      <Architecture built={lit} palette={LOBBY_PALETTE} flicker={0.06} />
      <primitive object={skin.model} />
      {SLICE0_READY && <MemoryMarkers />}
      {SLICE0_READY && <LightsEvent panels={skin.panels} />}
      <Gallery />
      <Well />
      {/* the way back to the meadow: the same white door frame as out there */}
      <group position={[LOBBY_ARRIVAL.x, 0, ARRIVAL_WALL]} rotation={[0, Math.PI, 0]}>
        {/* as tall as the doorway it frames (2.25 m: the meadow's door showed above a 2.02 m frame) */}
        <Frame w={1.3} h={2.25} color="#efe9da" />
      </group>
      {EXITS.map((e) => (
        <ExitThreshold key={e.id} exit={e} />
      ))}
    </>
  );
}

// memo: the World re-renders often (prompts, toasts); the Lobby itself never needs to
export default memo(Lobby);
