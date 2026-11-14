import { geomDist, Space, type Shape, type Solid } from "./archi/sdf";
import { back, lazyBuilt, throat } from "./places/common";
import type { Interactable } from "./zones";

/**
 * The Lobby: the hub of the dream, about 160 × 160 m. Hand-placed landmark rooms (a tilted hall 12 m high,
 * an octagonal rotunda over a bottomless well, a triangular room, a sunken plaza, a raised stage, a forest of
 * pillars, a shaft far too tall) linked by corridors that bend and meet at odd angles, plus seeded filler rooms.
 * Same seed = same Lobby for everyone. Everything walkable and visible is derived from these shapes (archi/).
 */

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(2611);
const range = (a: number, b: number) => a + rnd() * (b - a);

export type Anchor = { x: number; z: number; y: number; yaw: number };
export type Exit = {
  id: string;
  kind: "sealed" | "elevator" | "grate" | "glass" | "velvet" | "service" | "secret";
  anchor: Anchor;
  color: string;
  name: string;
  /** open doorway size (w × h); a locked one has a text instead */
  size: [number, number];
  text?: string;
};

/* ---------- landmarks ---------- */
type Room = Shape & { cx: number; cz: number };
const room = (s: Shape): Room => ({ ...s, cx: "x" in s ? s.x : (s.ax + s.bx) / 2, cz: "z" in s ? s.z : (s.az + s.bz) / 2 });

/** walking in from the meadow: the doorway plane is at z = 76, looking north (-z) */
export const LOBBY_ARRIVAL: { x: number; z: number; y: number; yaw: number } = { x: 0, z: 76, y: 0, yaw: 0 };

export const HALL = room({ kind: "box", x: -6, z: 16, w: 34, d: 26, a: 0.17, ceil: 12, mat: "stain", lights: 4.2, dead: 0.2, tag: "hall" });
export const ROTUNDA = room({ kind: "ngon", x: 34, z: -20, r: 13, n: 8, a: Math.PI / 8, ceil: 10, lights: 3.4, tag: "rotunda" });
const TRIANGLE = room({ kind: "ngon", x: -44, z: -6, r: 14, n: 3, a: 0.4, ceil: 4.4, lights: 3, mat: "stain" });
export const PLAZA = room({ kind: "box", x: 42, z: 34, w: 22, d: 18, a: -0.32, floor: -2.4, ceil: 5.4, mat: "concrete", wall: "concrete", lights: 3.6, dead: 0.25 });
export const STAGE = room({ kind: "box", x: -48, z: 38, w: 20, d: 14, a: 0.6, floor: 1.8, ceil: 5.6, lights: 3.2 });
export const HOLES_ROOM = room({ kind: "box", x: 8, z: -38, w: 18, d: 18, a: 0.1, ceil: 3.3, lights: 3, tag: "holes" });
const FOREST = room({ kind: "box", x: -28, z: -44, w: 26, d: 20, a: -0.08, ceil: 6.5, lights: 3.4, dead: 0.45, mat: "stain" });
const SHAFT = room({ kind: "box", x: 60, z: 2, w: 6, d: 14, a: 0.9, ceil: 18, lights: 2.4 });
const ARRIVAL_ROOM = room({ kind: "box", x: 0, z: 70, w: 8, d: 12, ceil: 2.8, lights: 2.6, tag: "arrival" });
const LANDMARKS: Room[] = [HALL, ROTUNDA, TRIANGLE, PLAZA, STAGE, HOLES_ROOM, FOREST, SHAFT, ARRIVAL_ROOM];

/* ---------- seeded filler rooms ---------- */
const fillers: Room[] = [];
for (let tries = 0; fillers.length < 34 && tries < 900; tries++) {
  const x = range(-70, 70);
  const z = range(-70, 66);
  const size = range(7, 17);
  const all = [...LANDMARKS, ...fillers];
  if (all.some((r) => geomDist(r, x, z) < size * 0.35)) continue; // overlaps are fine, swallowing is not
  const t = rnd();
  const tall = rnd() < 0.14;
  const ceil = tall ? range(5, 8) : range(2.55, 3.4);
  const base = { ceil, lights: range(2.6, 3.4), dead: range(0.08, 0.3), mat: (rnd() < 0.3 ? "stain" : "carpet") as Shape["mat"] };
  const skew = rnd() < 0.35 ? range(-Math.PI, Math.PI) : range(-0.06, 0.06); // most rooms almost straight, some badly askew
  if (t < 0.55) fillers.push(room({ kind: "box", x, z, w: size, d: size * range(0.6, 1.4), a: skew, ...base }));
  else if (t < 0.75) fillers.push(room({ kind: "ngon", x, z, r: size * 0.6, n: 5 + Math.floor(rnd() * 3), a: rnd() * 3, ...base }));
  else if (t < 0.85) fillers.push(room({ kind: "circle", x, z, r: size * 0.5, ...base }));
  else {
    // an L: two boxes sharing a corner
    fillers.push(room({ kind: "box", x, z, w: size, d: size * 0.45, a: skew, ...base }));
    fillers.push(room({ kind: "box", x: x + Math.cos(skew) * size * 0.3, z: z - Math.sin(skew) * size * 0.3, w: size * 0.45, d: size, a: skew, ...base }));
  }
}
const ROOMS = [...LANDMARKS, ...fillers];

/* ---------- corridors: a spanning tree plus loops, some of them bent ---------- */
const corridors: Shape[] = [];
const ramps: Shape[] = [];
function corridor(ax: number, az: number, bx: number, bz: number, opts: { w?: number; ceil?: number; bend?: boolean } = {}) {
  const w = opts.w ?? range(2.3, 3.6);
  const ceil = opts.ceil ?? range(2.55, 3.1);
  const pts: [number, number][] = [[ax, az]];
  if (opts.bend ?? rnd() < 0.45) {
    const mx = (ax + bx) / 2;
    const mz = (az + bz) / 2;
    const len = Math.hypot(bx - ax, bz - az) || 1;
    const off = range(-0.35, 0.35) * len;
    pts.push([mx + (-(bz - az) / len) * off, mz + ((bx - ax) / len) * off]);
  }
  pts.push([bx, bz]);
  for (let k = 0; k < pts.length - 1; k++) {
    const [x0, z0] = pts[k];
    const [x1, z1] = pts[k + 1];
    const len = Math.hypot(x1 - x0, z1 - z0);
    corridors.push({ kind: "box", x: (x0 + x1) / 2, z: (z0 + z1) / 2, w: len + w, d: w, a: Math.atan2(-(z1 - z0), x1 - x0), ceil, lights: 3.2, dead: 0.18, mat: rnd() < 0.25 ? "stain" : "carpet" });
  }
  return pts;
}
/** where a corridor enters a raised or sunken room: a ramp, so it can be walked */
function rampInto(r: Room, pts: [number, number][]) {
  const [fx, fz] = pts[pts.length - 2];
  let bx = r.cx;
  let bz = r.cz;
  for (let t = 0; t <= 1; t += 0.01) {
    const x = fx + (r.cx - fx) * t;
    const z = fz + (r.cz - fz) * t;
    if (geomDist(r, x, z) < 0) { bx = x; bz = z; break; }
  }
  const len = Math.hypot(r.cx - fx, r.cz - fz) || 1;
  const dx = (r.cx - fx) / len;
  const dz = (r.cz - fz) / len;
  const h = typeof r.floor === "number" ? r.floor : 0;
  ramps.push({ kind: "box", x: bx, z: bz, w: 8, d: 3.6, a: Math.atan2(-dz, dx), ceil: Math.max(3, r.ceil), lights: 0, mat: r.mat, wall: r.wall,
    floor: { ax: bx - dx * 4, az: bz - dz * 4, bx: bx + dx * 4, bz: bz + dz * 4, ha: 0, hb: h } });
}
const raised = (r: Room) => typeof r.floor === "number" && r.floor !== 0;
const connect = (a: Room, b: Room) => {
  const pts = corridor(a.cx, a.cz, b.cx, b.cz);
  if (raised(b)) rampInto(b, pts);
  if (raised(a)) rampInto(a, [...pts].reverse());
};
{
  const inTree = new Set<Room>([ARRIVAL_ROOM]);
  while (inTree.size < ROOMS.length) {
    let best: [Room, Room, number] | null = null;
    for (const a of inTree) for (const b of ROOMS) if (!inTree.has(b)) {
      const d = Math.hypot(a.cx - b.cx, a.cz - b.cz);
      if (!best || d < best[2]) best = [a, b, d];
    }
    connect(best![0], best![1]);
    inTree.add(best![1]);
  }
  for (let i = 0; i < ROOMS.length; i++) for (let j = i + 1; j < ROOMS.length; j++) {
    const d = Math.hypot(ROOMS[i].cx - ROOMS[j].cx, ROOMS[i].cz - ROOMS[j].cz);
    if (d < 34 && rnd() < 0.18) connect(ROOMS[i], ROOMS[j]);
  }
}

/* ---------- special features: pits, the well, the hole field, pillars ---------- */
const features: Shape[] = [];
const solids: Solid[] = [];
// the rotunda's sunken ring and its bottomless well of shelves
export const ROTUNDA_PIT = { x: ROTUNDA.cx, z: ROTUNDA.cz, r: 6, floor: -3.2 };
export const WELL = { x: ROTUNDA.cx, z: ROTUNDA.cz, r: 2.2, floor: -42 };
features.push({ kind: "circle", x: ROTUNDA_PIT.x, z: ROTUNDA_PIT.z, r: ROTUNDA_PIT.r, floor: ROTUNDA_PIT.floor, ceil: ROTUNDA.ceil, mat: "concrete", wall: "concrete" });
features.push({ kind: "circle", x: WELL.x, z: WELL.z, r: WELL.r, floor: WELL.floor, ceil: ROTUNDA.ceil, mat: "void", wall: "wallpaper", tag: "well" });
// holes in the floor, over another lobby 6 m below
export const HOLE_DEPTH = -6;
{
  const a = HOLES_ROOM.kind === "box" ? HOLES_ROOM.a ?? 0 : 0;
  for (let u = -1; u <= 1; u++) for (let v = -1; v <= 1; v++) {
    const lx = u * 4.6;
    const lz = v * 4.6;
    features.push({ kind: "box", x: HOLES_ROOM.cx + lx * Math.cos(a) + lz * Math.sin(a), z: HOLES_ROOM.cz - lx * Math.sin(a) + lz * Math.cos(a), w: 2.2, d: 2.2, a, floor: HOLE_DEPTH, ceil: HOLES_ROOM.ceil, mat: "carpet" });
  }
}
// partitions: half-height and full walls standing inside the bigger rooms, never quite parallel to anything
for (const r of fillers) {
  if (r.kind !== "box" || Math.min(r.w, r.d) < 9) continue;
  const n = 1 + Math.floor(rnd() * 3);
  for (let k = 0; k < n; k++) {
    const a = (r.a ?? 0) + (rnd() < 0.7 ? 0 : range(-0.5, 0.5)) + (rnd() < 0.5 ? Math.PI / 2 : 0);
    solids.push({ kind: "box", x: r.cx + range(-r.w / 4, r.w / 4), z: r.cz + range(-r.d / 4, r.d / 4), w: range(3, Math.min(r.w, r.d) * 0.55), d: 0.25, a });
  }
}
// pillars: the hall's six, and a forest
export const HALL_PILLARS: [number, number][] = [];
{
  const a = HALL.kind === "box" ? HALL.a ?? 0 : 0;
  for (const lx of [-9, 0, 9]) for (const lz of [-6, 6]) {
    const x = HALL.cx + lx * Math.cos(a) + lz * Math.sin(a);
    const z = HALL.cz - lx * Math.sin(a) + lz * Math.cos(a);
    HALL_PILLARS.push([x, z]);
    solids.push({ kind: "circle", x, z, r: 0.75 });
  }
  const fa = FOREST.kind === "box" ? FOREST.a ?? 0 : 0;
  for (let lx = -10.5; lx <= 10.5; lx += 3) for (let lz = -7.5; lz <= 7.5; lz += 3) {
    if (rnd() < 0.2) continue;
    const x = FOREST.cx + lx * Math.cos(fa) + lz * Math.sin(fa) + range(-0.4, 0.4);
    const z = FOREST.cz - lx * Math.sin(fa) + lz * Math.cos(fa) + range(-0.4, 0.4);
    solids.push({ kind: "box", x, z, w: 0.7, d: 0.7, a: fa + range(-0.3, 0.3), mat: "wallpaper" });
  }
}

/* ---------- the way in and the thresholds of the branches ---------- */
const vestibules: Shape[] = [];
// the doorway from the meadow: a narrow throat that continues a little past the doorway plane
vestibules.push({ kind: "box", x: 0, z: 76.4, w: 1.3, d: 2.4, ceil: 2.25, lights: 0 });

export const EXITS: Exit[] = [
  { id: "exit-backrooms", kind: "sealed", anchor: { x: -66, z: -77, y: 0, yaw: 0 }, color: "#e8c547", name: "Backrooms", size: [1.2, 2.1], text: "La porte est scellée. Derrière, ça bourdonne : le jeu arrive un jour." },
  { id: "exit-bassins", kind: "grate", anchor: { x: 22, z: -77, y: 0, yaw: 0 }, color: "#7fd6e0", name: "Les bassins", size: [2.2, 2.4] },
  { id: "exit-bureaux", kind: "elevator", anchor: { x: 77, z: -10, y: 0, yaw: -Math.PI / 2 }, color: "#4fd1c5", name: "Les bureaux", size: [1.7, 2.3] },
  { id: "exit-commerce", kind: "glass", anchor: { x: 77, z: 50, y: 0, yaw: -Math.PI / 2 }, color: "#e597a6", name: "Le centre commercial", size: [2, 2.3] },
  { id: "exit-hotel", kind: "velvet", anchor: { x: -77, z: 46, y: 1.8, yaw: Math.PI / 2 }, color: "#d0745f", name: "L'hôtel", size: [2.6, 2.8] },
  // ways back that nobody shows you: a service door (from the canals) and a door that should not be there (the red city)
  { id: "exit-canaux", kind: "service", anchor: { x: -77, z: -24, y: 0, yaw: Math.PI / 2 }, color: "#8c8f86", name: "Service", size: [1.1, 2.1] },
  { id: "exit-rouge", kind: "secret", anchor: { x: 50, z: 77, y: 0, yaw: Math.PI }, color: "#e0453a", name: "?", size: [1, 2] },
];
for (const e of EXITS) {
  const { x, z, yaw } = e.anchor;
  const fx = -Math.sin(yaw);
  const fz = -Math.cos(yaw);
  // a vestibule in front of the door, then a corridor to the nearest room
  const vx = x - fx * 3;
  const vz = z - fz * 3;
  const special = e.kind === "grate" ? { mat: "tile" as const, wall: "tile" as const } : e.kind === "sealed" ? { mat: "stain" as const } : {};
  const isStage = e.kind === "velvet";
  vestibules.push({ kind: "box", x: vx, z: vz, w: Math.abs(fx) > 0.5 ? 6 : 4.4, d: Math.abs(fx) > 0.5 ? 4.4 : 6, ceil: e.kind === "sealed" ? 2.2 : 3, lights: 2.4, dead: 0.2, floor: isStage ? 1.8 : 0, ...special });
  const level = ROOMS.filter((r) => !raised(r));
  const nearest = level.reduce((a, b) => (Math.hypot(a.cx - vx, a.cz - vz) < Math.hypot(b.cx - vx, b.cz - vz) ? a : b), level[0]);
  const target = isStage ? STAGE : nearest;
  if (isStage) vestibules.push({ kind: "box", x: (vx + target.cx) / 2, z: (vz + target.cz) / 2, w: Math.hypot(target.cx - vx, target.cz - vz) + 3, d: 3.2, a: Math.atan2(-(target.cz - vz), target.cx - vx), floor: 1.8, ceil: 4, lights: 3 });
  else if (e.kind === "sealed") corridor(vx, vz, target.cx, target.cz, { w: 2.1, ceil: 2.15, bend: true }); // the crawl
  else corridor(vx, vz, target.cx, target.cz, { bend: false });
  // open doorways: a passage on the far side, so walking through stays inside the Lobby until the swap
  if (!e.text) vestibules.push(throat(back(e.anchor), e.size[0] + 0.1, e.size[1] + 0.05));
}

/* ---------- the place ---------- */
// order matters: later shapes win where they overlap (corridors < rooms < ramps and pits < vestibules)
export const LOBBY_SPACE = new Space([...corridors, ...fillers, ...LANDMARKS, ...ramps, ...features, ...vestibules], solids);

/** Geometry is derived once per visit (a few ms per frame, see slice.ts), then shared by the scene and the doorways. */
export const lobbyBuilt = lazyBuilt(LOBBY_SPACE);

export const LOBBY_SPAWN = { x: LOBBY_ARRIVAL.x, z: LOBBY_ARRIVAL.z - 2.5, yaw: 0 };

export const LOBBY_INTERACTABLES: Interactable[] = EXITS.filter((e) => e.text).map((e) => ({
  id: e.id,
  x: e.anchor.x + Math.sin(e.anchor.yaw) * 0.6,
  z: e.anchor.z + Math.cos(e.anchor.yaw) * 0.6,
  radius: 2.4,
  verb: e.kind === "elevator" ? "Appeler l'ascenseur" : "Ouvrir",
  locked: { name: e.name, text: e.text!, color: e.color },
}));
