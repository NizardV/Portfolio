import { murets } from "./archi/murets";
import { RECESS_DEAD_ENDS, RECESS_FILLS } from "./lobby-recesses";
import { geomBounds, geomDist, Space, type Shape, type Solid } from "./archi/sdf";
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

/**
 * The ceiling of every ordinary room and corridor: low and the same everywhere, as on Level 0. Only landmarks rise above
 * it. (Each room used to draw its own height: wherever two of them overlap, and they always do, a soffit hung in the
 * middle of a room, the boxes floating over open floor that hub:audit now calls « floating » / « hanging ».)
 */
export const STD_CEIL = 2.75;

/* ---------- landmarks ---------- */
type Room = Shape & { cx: number; cz: number };
const room = (s: Shape): Room => ({ ...s, cx: "x" in s ? s.x : (s.ax + s.bx) / 2, cz: "z" in s ? s.z : (s.az + s.bz) / 2 });

/** walking in from the meadow: the doorway plane is at z = 76, looking north (-z) */
export const LOBBY_ARRIVAL: { x: number; z: number; y: number; yaw: number } = { x: 0, z: 76, y: 0, yaw: 0 };
/** where the meadow's doorway opens into the Lobby (the mouth of its little vestibule): a white frame stands there */
export const ARRIVAL_MOUTH = 75.2;

export const HALL = room({ kind: "box", x: -6, z: 16, w: 34, d: 26, a: 0.17, ceil: 12, mat: "stain", lights: 4.2, dead: 0.2, tag: "hall" });
export const ROTUNDA = room({ kind: "ngon", x: 34, z: -20, r: 13, n: 8, a: Math.PI / 8, ceil: 10, lights: 3.4, tag: "rotunda" });
const TRIANGLE = room({ kind: "ngon", x: -44, z: -6, r: 14, n: 3, a: 0.4, ceil: 4.4, lights: 3, mat: "stain" });
// the Lobby's own materials: in grey concrete, under the carpeted hall around it, it read as a texture bug (2026-11-22)
export const PLAZA = room({ kind: "box", x: 42, z: 34, w: 22, d: 18, a: -0.32, floor: -2.4, ceil: 5.4, lights: 3.6, dead: 0.25 });
export const STAGE = room({ kind: "box", x: -48, z: 38, w: 20, d: 14, a: 0.6, floor: 1.8, ceil: 5.6, lights: 3.2 });
export const HOLES_ROOM = room({ kind: "box", x: 8, z: -38, w: 18, d: 18, a: 0.1, ceil: 3.3, lights: 3, tag: "holes" });
const FOREST = room({ kind: "box", x: -28, z: -44, w: 26, d: 20, a: -0.08, ceil: 6.5, lights: 3.4, dead: 0.45, mat: "stain" });
const SHAFT = room({ kind: "box", x: 60, z: 2, w: 6, d: 14, a: 0.9, ceil: 18, lights: 2.4 });
const ARRIVAL_ROOM = room({ kind: "box", x: 0, z: 70, w: 8, d: 12, ceil: STD_CEIL, lights: 2.6, tag: "arrival" });
const LANDMARKS: Room[] = [HALL, ROTUNDA, TRIANGLE, PLAZA, STAGE, HOLES_ROOM, FOREST, SHAFT, ARRIVAL_ROOM];
/**
 * Balconies (2026-11-22): around the stage and the sunken plaza, a hall at floor level under their high ceiling, so every
 * corridor that reaches them opens under a tall space instead of a 1 m slot between a raised floor and a 2.75 m ceiling.
 * The level change is then a balcony edge, closed by a low wall (tools/blender/skin.py, murets). Placed before the stage
 * and the plaza, which keep their own footprint; not in ROOMS (the seeded layout must not move).
 */
const ring = (r: Room, margin: number, tag: string): Room =>
  r.kind === "box" ? room({ kind: "box", x: r.x, z: r.z, w: r.w + margin * 2, d: r.d + margin * 2, a: r.a, ceil: r.ceil, lights: 3.2, dead: 0.15, tag }) : r;
const STAGE_HALL = ring(STAGE, 5, "stage-hall");
const PLAZA_HALL = ring(PLAZA, 4, "plaza-hall");
/** in building order: the arrival room keeps its place (SLICE0 below counts on it) */
const PLACED: Room[] = [HALL, ROTUNDA, TRIANGLE, HOLES_ROOM, FOREST, SHAFT, STAGE_HALL, PLAZA_HALL, ARRIVAL_ROOM, PLAZA, STAGE];

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
  // still drawn, unused: the seeded layout must not move (each draw shifts every later one)
  if (tall) range(5, 8);
  else range(2.55, 3.4);
  const ceil = STD_CEIL;
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
  if (opts.ceil === undefined) range(2.55, 3.1); // still drawn, unused (see STD_CEIL)
  const ceil = opts.ceil ?? STD_CEIL;
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
  // one way up per side: a second ramp within 5 m of another one squeezed a paper-thin wall between the two
  // one way down per side: a second ramp within 9 m of another one (two ramps side by side, a V of low walls between
  // them) is left out; its corridor reaches the other ramp through the hall around the level
  if (ramps.some((o) => o.kind === "box" && Math.hypot(o.x - bx, o.z - bz) < 9)) return;
  ramps.push({ kind: "box", x: bx, z: bz, w: 8, d: 3.6, a: Math.atan2(-dz, dx), ceil: Math.max(3, r.ceil), lights: 2.4, dead: 0.1, mat: r.mat, wall: r.wall,
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
features.push({ kind: "circle", x: ROTUNDA_PIT.x, z: ROTUNDA_PIT.z, r: ROTUNDA_PIT.r, floor: ROTUNDA_PIT.floor, ceil: ROTUNDA.ceil, ceilMat: "ceiling" }); // the Lobby's carpet and wallpaper (grey concrete read as a bug)
features.push({ kind: "circle", x: WELL.x, z: WELL.z, r: WELL.r, floor: WELL.floor, ceil: ROTUNDA.ceil, mat: "void", wall: "wallpaper", ceilMat: "ceiling", tag: "well" });
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
    range(-0.3, 0.3); // (was a random tilt: drawn, kept so the rest of the layout stays the same)
    solids.push({ kind: "box", x, z, w: 0.7, d: 0.7, a: fa, mat: "wallpaper" });
  }
}

/* ---------- the way in and the thresholds of the branches ---------- */
const vestibules: Shape[] = [];
// the doorway from the meadow: a narrow throat that continues a little past the doorway plane
vestibules.push({ kind: "box", x: LOBBY_ARRIVAL.x, z: ARRIVAL_MOUTH + 1.2, w: 1.3, d: 2.4, ceil: 2.25, lights: 0 });

export const EXITS: Exit[] = [
  { id: "exit-backrooms", kind: "sealed", anchor: { x: -66, z: -77, y: 0, yaw: 0 }, color: "#e8c547", name: "La porte, là-bas", size: [1.2, 2.1], text: "Trop loin, de l'autre côté du vide. Elle grésille, comme si elle n'était pas tout à fait là." },
  { id: "exit-bassins", kind: "grate", anchor: { x: 22, z: -77, y: 0, yaw: 0 }, color: "#7fd6e0", name: "Les bassins", size: [2.2, 2.4] },
  { id: "exit-bureaux", kind: "elevator", anchor: { x: 77, z: -10, y: 0, yaw: -Math.PI / 2 }, color: "#4fd1c5", name: "Les bureaux", size: [1.7, 2.3] },
  { id: "exit-commerce", kind: "glass", anchor: { x: 77, z: 50, y: 0, yaw: -Math.PI / 2 }, color: "#e597a6", name: "Le centre commercial", size: [2, 2.3] },
  { id: "exit-hotel", kind: "velvet", anchor: { x: -77, z: 46, y: 1.8, yaw: Math.PI / 2 }, color: "#d0745f", name: "L'hôtel", size: [2.6, 2.8] },
  // ways back that nobody shows you: a service door (from the canals) and a door that should not be there (the red city)
  { id: "exit-canaux", kind: "service", anchor: { x: -77, z: -24, y: 0, yaw: Math.PI / 2 }, color: "#8c8f86", name: "Service", size: [1.1, 2.1] },
  { id: "exit-rouge", kind: "secret", anchor: { x: 50, z: 77, y: 0, yaw: Math.PI }, color: "#e0453a", name: "?", size: [1, 2] },
];
/** The sealed door stands out of reach: a hall split by a void, a ledge on our side, the door on a landing beyond. */
export const CHASM = { landing: 2.6, gap: 7, ledge: 4, width: 5, ceil: 6, floor: -40 };

for (const e of EXITS) {
  const { x, z, yaw } = e.anchor;
  const fx = -Math.sin(yaw);
  const fz = -Math.cos(yaw);
  const across = (along: number, w: number) => (Math.abs(fx) > 0.5 ? { w: along, d: w } : { w, d: along });
  if (e.kind === "sealed") {
    const { landing, gap, ledge, width, ceil, floor } = CHASM;
    const hall = landing + gap + ledge;
    vestibules.push({ kind: "box", x: x - (fx * hall) / 2, z: z - (fz * hall) / 2, ...across(hall, width), ceil, lights: 0, mat: "stain" });
    vestibules.push({ kind: "box", x: x - fx * (landing + gap / 2), z: z - fz * (landing + gap / 2), ...across(gap, width), ceil, floor, lights: 0, mat: "void" });
    const lx = x - fx * (landing + gap + ledge / 2);
    const lz = z - fz * (landing + gap + ledge / 2);
    vestibules.push({ kind: "box", x: lx, z: lz, ...across(ledge, width), ceil, lights: 2.2, dead: 0.5, mat: "stain" });
    const target = ROOMS.filter((r) => !raised(r)).reduce((a, b) => (Math.hypot(a.cx - lx, a.cz - lz) < Math.hypot(b.cx - lx, b.cz - lz) ? a : b), ROOMS[0]);
    corridor(lx, lz, target.cx, target.cz, { w: 2.1, ceil: 2.15, bend: true }); // the crawl
    continue;
  }
  // a vestibule in front of the door, then a corridor to the nearest room
  const vx = x - fx * 3;
  const vz = z - fz * 3;
  const special = e.kind === "grate" ? { mat: "tile" as const, wall: "tile" as const } : {};
  const isStage = e.kind === "velvet";
  vestibules.push({ kind: "box", x: vx, z: vz, w: Math.abs(fx) > 0.5 ? 6 : 4.4, d: Math.abs(fx) > 0.5 ? 4.4 : 6, ceil: (isStage ? 1.8 : 0) + 3, lights: 2.4, dead: 0, floor: isStage ? 1.8 : 0, ...special });
  const level = ROOMS.filter((r) => !raised(r));
  const nearest = level.reduce((a, b) => (Math.hypot(a.cx - vx, a.cz - vz) < Math.hypot(b.cx - vx, b.cz - vz) ? a : b), level[0]);
  const target = isStage ? STAGE : nearest;
  if (isStage) {
    const walk = { x: (vx + target.cx) / 2, z: (vz + target.cz) / 2, w: Math.hypot(target.cx - vx, target.cz - vz) + 3, a: Math.atan2(-(target.cz - vz), target.cx - vx) };
    vestibules.push({ kind: "box", ...walk, d: 3.2, floor: 1.8, ceil: 4, lights: 3 });
    // the walkway is a balcony too: a hall at floor level under the stage height all along it, built before the stage
    // from the middle of the door's vestibule to the stage: turned towards the stage, a hall reaching the door stuck its
    // corners out past the door's wall, which then stood alone, paper-thin
    const span = Math.hypot(target.cx - vx, target.cz - vz);
    PLACED.splice(PLACED.indexOf(PLAZA), 0, room({ kind: "box", x: (vx + target.cx) / 2, z: (vz + target.cz) / 2, w: span, d: 3.2 + 8, a: walk.a, ceil: STAGE.ceil, lights: 3.2, dead: 0.15, tag: "walk-hall" }));
    // and around the door's landing, square to the door: up to the door's plane, never past it
    const along = Math.abs(fx) > 0.5;
    // 9 m deep from the door, 16 m across: it overlaps the walkway hall well (a sliver of corridor left between the two
    // halls hung a wall from the ceiling in mid-air)
    PLACED.splice(PLACED.indexOf(PLAZA), 0, room({ kind: "box", x: x - fx * 4.5, z: z - fz * 4.5, w: along ? 9 : 16, d: along ? 16 : 9, ceil: STAGE.ceil, lights: 3.2, dead: 0.15, tag: "walk-hall" }));
  }
  else corridor(vx, vz, target.cx, target.cz, { bend: false });
  // open doorways: a passage on the far side, so walking through stays inside the Lobby until the swap
  // the passage behind the door in the door room's materials (behind the tiled grate, a band of wallpaper)
  if (!e.text) vestibules.push({ ...throat(back(e.anchor), e.size[0] + 0.1, e.size[1] + 0.05, 1.6, 0.02), ...special });
}

/* ---------- the place ---------- */
// order matters: later shapes win where they overlap (corridors < rooms < pits < vestibules < ramps). Ramps come last:
// a ramp always owns its footprint (a flat passage placed after one cut a cliff into the stage's ramp)
const allShapes: Shape[] = [...corridors, ...fillers, ...PLACED, ...features, ...vestibules, ...ramps];

/**
 * A connector (ramp, feature, vestibule) that lies mostly inside a taller room takes that room's ceiling: placed after
 * it, it would own the ceiling there and hang a slab in the middle of the room (the passages over the stage, the hotel's
 * landing). Door throats lie outside the rooms: they keep their height, a lintel in the wall.
 */
const gridOf = (o: Shape) => {
  if (o.grid) return o.grid;
  if (o.kind === "capsule") return { a: Math.atan2(-(o.bz - o.az), o.bx - o.ax), x: (o.ax + o.bx) / 2, z: (o.az + o.bz) / 2 };
  return { a: "a" in o && o.a ? o.a : 0, x: o.x, z: o.z };
};
for (let k = corridors.length + fillers.length + PLACED.length; k < allShapes.length; k++) {
  const s = allShapes[k];
  if (s.open) continue;
  const [x0, z0, x1, z1] = geomBounds(s);
  let inside = 0;
  let under = 0;
  let top = s.ceil;
  let host: Shape | null = null;
  let flush = 0;
  let flushHost: Shape | null = null;
  for (let x = x0 + 0.25; x < x1; x += 0.5) for (let z = z0 + 0.25; z < z1; z += 0.5) {
    if (geomDist(s, x, z) >= 0) continue;
    inside++;
    const level = allShapes.slice(0, k).find((o) => !o.open && Math.abs(o.ceil - s.ceil) < 0.05 && geomDist(o, x, z) < 0);
    if (level) {
      flush++;
      flushHost = level;
    }
    const higher = allShapes.slice(0, k).filter((o) => !o.open && o.ceil > s.ceil + 0.05 && geomDist(o, x, z) < 0);
    if (!higher.length) continue;
    under++;
    for (const o of higher) if (o.ceil >= top) {
      top = o.ceil;
      host = o;
    }
  }
  // and its tile grid: one ceiling, one grid, no seam (a ramp under the plaza traced its outline in beams)
  if (inside && under / inside > 0.5) allShapes[k] = { ...s, ceil: top, ...(host ? { grid: gridOf(host) } : {}) };
  // under a room's ceiling at the same height (the pits of the holes room): its grid, so its lights run on above
  else if (inside && flushHost && flush / inside > 0.5) allShapes[k] = { ...s, grid: gridOf(flushHost) };
}

/**
 * Slice 0, the first stretch rebuilt for realism (zone sheet: https://claude.ai/artifact/XX4DDwunTTo4mYESZPvp2H): the
 * arrival room, its slanted corridor, the stained room, the long corridor, the pentagon and the heptagon. Their walls,
 * floors and ceilings come with the rest of the Lobby from its Blender model (see below); this is where its memories are,
 * and its pillars. Indices into the seeded list, checked against the arrival room's tag: if the generator ever changes,
 * the slice's memories and pillars are left out instead of landing in the wrong rooms.
 */
export const SLICE0 = [149, 0, 133, 98, 137, 123];
export const SLICE0_READY = allShapes[149]?.tag === "arrival";

/**
 * A memory to find (bible: « Bible narrative — le hub, prologue du jeu » in Notion): trace = look at it a while,
 * objet = pick it up, evenement = witness it; change = what the world shows once a memory is back. ry: the way it faces.
 */
/** ids of the memories, as kept in the world state (used) and saved: "mem:<id>" */
export const memoryId = (id: string) => `mem:${id}`;
/** the last memory of the Red City (not built yet): with it, the arrival room's frame shows the lit window */
export const RED_CITY_LAST = memoryId("rouge-fin");
/**
 * The words of the memories you can find in slice 0. PROVISIONAL (2026-11-28): to be checked against the narrative bible
 * (Notion, « Design — Hub liminal v2 ») by the owner.
 */
const MEMORY_TEXTS: Record<string, { verb: string; title: string; text: string }> = {
  plan: { verb: "Regarder", title: "Un plan, dessiné à la main", text: "Des couloirs au crayon, et une pièce entourée deux fois. À côté, une flèche et un mot : « ici ». L'écriture te ressemble." },
  polaroid: { verb: "Ramasser", title: "Un Polaroid", text: "Une maison au bout d'une prairie, une fenêtre allumée. Au dos, une date que l'eau a effacée." },
};
export type Memory = { id: string; kind: "trace" | "objet" | "evenement" | "change"; x: number; y: number; z: number; ry: number };
export const SLICE0_MEMORIES: Memory[] = [];

/**
 * The whole Lobby is drawn by its Blender model (tools/blender/skin.py → public/hub/models/skins/lobby.glb), built from
 * this very plan: exact straight walls, clean joints between rooms, ceiling tiles and their lights on each room's grid,
 * baseboards. The kit only lays the railings; collisions come from here, as before.
 */
/**
 * Walls in line: two rooms whose walls run side by side a few cm apart (corridors overlapping a little askew) left a
 * jog where one ends, a notch in the wall and its baseboard. The later room's wall moves onto the earlier one's line
 * (boxes only; 2 to 60 cm; the layout keeps its shape, the building gets straight walls).
 */
function alignWalls(shapes: Shape[], movableBelow: number) {
  // only corridors and fillers move: rooms, vestibules and throats are tied to doors (a moved wall left a door frame
  // standing in the open), the slice's rooms to its memories
  const movable = (i: number) => i < movableBelow && !SLICE0.includes(i);
  type Side = { i: number; nx: number; nz: number; c: number; t0: number; t1: number; axis: "w" | "d" };
  const sidesOf = (s: Shape, i: number): Side[] => {
    if (s.kind !== "box" || s.open) return [];
    const a = s.a ?? 0;
    const [ux, uz, vx, vz] = [Math.cos(a), -Math.sin(a), Math.sin(a), Math.cos(a)];
    const at = (nx: number, nz: number, half: number, tx: number, tz: number, length: number, axis: "w" | "d"): Side => {
      const t = s.x * tx + s.z * tz;
      return { i, nx, nz, c: s.x * nx + s.z * nz + half, t0: t - length / 2, t1: t + length / 2, axis };
    };
    return [at(ux, uz, s.w / 2, vx, vz, s.d, "w"), at(-ux, -uz, s.w / 2, vx, vz, s.d, "w"), at(vx, vz, s.d / 2, ux, uz, s.w, "d"), at(-vx, -vz, s.d / 2, ux, uz, s.w, "d")];
  };
  let moved = 0;
  for (let j = 1; j < shapes.length; j++) {
    for (const B of sidesOf(shapes[j], j)) {
      for (let i = 0; i < j; i++) {
        const A = sidesOf(shapes[i], i).find((S) => S.nx * B.nx + S.nz * B.nz > Math.cos(0.03));
        if (!A) continue;
        const delta = A.c - B.c;
        if (Math.abs(delta) < 0.02 || Math.abs(delta) > 0.6) continue;
        if (A.t0 > B.t1 + 0.3 || B.t0 > A.t1 + 0.3) continue; // not side by side
        // the later one moves onto the earlier one's line, or the other way round when only the earlier one may move
        const [k, side, d] = movable(j) ? [j, B, delta] : [i, A, -delta];
        const s = shapes[k];
        if (!movable(k) || s.kind !== "box") continue;
        shapes[k] = { ...s, x: s.x + (side.nx * d) / 2, z: s.z + (side.nz * d) / 2, [side.axis]: s[side.axis] + d };
        moved++;
        break;
      }
    }
  }
  return moved;
}
alignWalls(allShapes, corridors.length + fillers.length);

/**
 * Ceilings a few cm apart where two rooms overlap left a sliver of wall across the ceiling (a 20 cm band of wallpaper,
 * askew): under 40 cm of difference, the later room takes the earlier one's height (2026-11-23).
 */
for (let j = 0; j < allShapes.length; j++) {
  const s = allShapes[j];
  if (s.open) continue;
  const [x0, z0, x1, z1] = geomBounds(s);
  for (let i = 0; i < j; i++) {
    const o = allShapes[i];
    const diff = Math.abs(o.ceil - s.ceil);
    if (o.open || diff < 0.02 || diff >= 0.4) continue;
    const [a0, b0, a1, b1] = geomBounds(o);
    if (a0 > x1 || a1 < x0 || b0 > z1 || b1 < z0) continue;
    let shared = false;
    for (let x = Math.max(x0, a0) + 0.25; x < Math.min(x1, a1) && !shared; x += 0.5) {
      for (let z = Math.max(z0, b0) + 0.25; z < Math.min(z1, b1) && !shared; z += 0.5) shared = geomDist(s, x, z) < -0.05 && geomDist(o, x, z) < -0.05;
    }
    if (!shared) continue;
    allShapes[j] = { ...s, ceil: o.ceil };
    break;
  }
}

// the corridors' recesses (lobby-recesses.ts, generated): filled, or made into dead ends
allShapes.push(...RECESS_DEAD_ENDS);
solids.push(...RECESS_FILLS);

// one carpet: the darker "stain" carpet stopped in a hard line at every room it covered (2026-11-22)
for (let k = 0; k < allShapes.length; k++) {
  const s = allShapes[k];
  allShapes[k] = { ...s, skin: "lobby", ...(s.mat === "stain" ? { mat: "carpet" as const } : {}) };
}

if (SLICE0_READY) {
  // no random partitions in the slice: what stands there is placed on purpose, on the tile grid
  for (let k = solids.length - 1; k >= 0; k--) {
    const so = solids[k];
    if (SLICE0.some((i) => geomDist(allShapes[i], so.kind === "capsule" ? (so.ax + so.bx) / 2 : so.x, so.kind === "capsule" ? (so.az + so.bz) / 2 : so.z) < 0)) solids.splice(k, 1);
  }
  // two pillars in the stained room, on its 60 cm ceiling grid, either side of the way through
  const stained = allShapes[133];
  if (stained.kind === "box") {
    const a = stained.a ?? 0;
    const across = { x: Math.sin(a), z: Math.cos(a) };
    for (const v of [-2.4, 2.4]) solids.push({ kind: "box", x: stained.x + v * across.x, z: stained.z + v * across.z, w: 0.4, d: 0.4, a, tag: "pillar" });
    // 1. the hand-drawn map, taped on the pillar's face that looks into the room
    const pillar = { x: stained.x - 2.4 * across.x, z: stained.z - 2.4 * across.z };
    SLICE0_MEMORIES.push({ id: "plan", kind: "trace", x: pillar.x + 0.21 * across.x, y: 1.45, z: pillar.z + 0.21 * across.z, ry: Math.atan2(across.x, across.z) });
  }
  SLICE0_MEMORIES.push(
    // 2. the Polaroid on the carpet of the long corridor, a third of the way along
    { id: "polaroid", kind: "objet", x: 12.6, y: 0.01, z: 50.4, ry: 0.4 },
    // 3. looking back from the pentagon: the corridor's lights die one by one
    { id: "lumieres", kind: "evenement", x: 22.5, y: 0.01, z: 37.3, ry: 0 },
    // the blank frame of the arrival room, on its west wall: it shows the house once the Polaroid is found
    { id: "cadre", kind: "change", x: LOBBY_ARRIVAL.x - 3.97, y: 1.6, z: 68, ry: Math.PI / 2 },
  );
}

// the random partitions of the old rooms that the balcony halls now cover: a 3 m partition standing alone in a 5.6 m
// hall read as a stray slab (pillars and placed pieces have a tag and stay)
const HALLS = allShapes.filter((s) => s.tag === "stage-hall" || s.tag === "plaza-hall" || s.tag === "walk-hall");
for (let k = solids.length - 1; k >= 0; k--) {
  const so = solids[k];
  if (so.tag || so.kind !== "box") continue;
  if (HALLS.some((h) => geomDist(h, so.x, so.z) < 0)) solids.splice(k, 1);
}

// low walls along the balcony edges: laid out on the plan, collision here, drawn by the Blender model
const MURETS = murets(new Space(allShapes, solids));
solids.push(...MURETS.solids);
export const LOBBY_SPACE = new Space(allShapes, solids);
LOBBY_SPACE.murets = MURETS.runs;

/** Geometry is derived once per visit (a few ms per frame, see slice.ts), then shared by the scene and the doorways. */
export const lobbyBuilt = lazyBuilt(LOBBY_SPACE);

/** the arrival room's back wall, where the meadow's doorway opens: its white frame hangs on it (75.2, the old mouth of a
 * little vestibule, left it standing 80 cm into the room once the room reached the wall) */
const ARRIVAL_SHAPE = allShapes.find((s) => s.tag === "arrival");
export const ARRIVAL_WALL = ARRIVAL_SHAPE?.kind === "box" ? ARRIVAL_SHAPE.z + ARRIVAL_SHAPE.d / 2 : ARRIVAL_MOUTH;

export const LOBBY_SPAWN = { x: LOBBY_ARRIVAL.x, z: LOBBY_ARRIVAL.z - 2.5, yaw: 0 };

// the memories you look at or pick up (the event and the frame happen on their own)
const MEMORY_INTERACTABLES: Interactable[] = SLICE0_MEMORIES.filter((m) => MEMORY_TEXTS[m.id]).map((m) => ({
  id: memoryId(m.id),
  x: m.x,
  z: m.z,
  radius: 1.8,
  verb: MEMORY_TEXTS[m.id].verb,
  memory: { title: MEMORY_TEXTS[m.id].title, text: MEMORY_TEXTS[m.id].text },
  sfx: "pickup" as const,
}));

export const LOBBY_INTERACTABLES: Interactable[] = [...MEMORY_INTERACTABLES, ...EXITS.filter((e) => e.text).map((e) => {
  // the sealed door is looked at from the edge of the void, across it
  const back = e.kind === "sealed" ? CHASM.landing + CHASM.gap + 0.8 : 0.6;
  return {
  id: e.id,
  x: e.anchor.x + Math.sin(e.anchor.yaw) * back,
  z: e.anchor.z + Math.cos(e.anchor.yaw) * back,
  radius: 2.4,
  verb: e.kind === "elevator" ? "Appeler l'ascenseur" : e.kind === "sealed" ? "Regarder" : "Ouvrir",
  locked: { name: e.name, text: e.text!, color: e.color },
  };
})];
