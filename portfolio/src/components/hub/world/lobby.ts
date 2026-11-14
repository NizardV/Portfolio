import { box, type Box } from "./collision";
import type { Interactable } from "./zones";

/**
 * The Lobby, as data: a 12 × 12 grid of 5 m cells carved into a maze, with special rooms that play with
 * height (a 10 m hall, a sunken pit, a raised platform, a floor full of holes) and the thresholds of the branches.
 * Everything is derived from one seeded generator: the scene draws it, the player walks it, collisions match.
 * Same seed = same Lobby for everyone.
 */
export const N = 12;
export const C = 5; // cell size, metres
export const HALF = (N * C) / 2; // the Lobby spans -30..30 on x and z
export const WALL_T = 0.25;
export const DOOR_W = 1.5;
export const DOOR_H = 2.3;

export type Mat = "carpet" | "stain" | "tile" | "concrete";
export type Stair = { axis: "x" | "z"; atMin: number; atMax: number };
export type Tag = "hall" | "pit" | "pitStairs" | "platform" | "platformStairs" | "holes" | "crawl" | "pool" | "arrival" | "elevator" | "mall";
export type Cell = { i: number; j: number; floor: number; ceil: number; mat: Mat; lights: number; stair?: Stair; tag?: Tag };
export type EdgeKind = "wall" | "door" | "open";
/** a cell side shared by two cells: `vertical` = a line of constant x */
export type Edge = { a: Cell; b: Cell; vertical: boolean; x: number; z: number; kind: EdgeKind; offset: number; blocked: boolean };
export type Exit = { id: string; kind: "sealed" | "elevator" | "grate" | "glass" | "velvet"; x: number; z: number; y: number; angle: number; color: string; name: string; text: string };

/* ---------- seeded randomness: the Lobby is the same for every visitor ---------- */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(1994);

export const cx = (i: number) => -HALF + C * (i + 0.5);
export const cz = (j: number) => -HALF + C * (j + 0.5);

/* ---------- cells ---------- */
export const CELLS: Cell[][] = Array.from({ length: N }, (_, i) =>
  Array.from({ length: N }, (_, j) => ({ i, j, floor: 0, ceil: 3, mat: "carpet" as Mat, lights: 2 })),
);
function area(i0: number, i1: number, j0: number, j1: number, patch: Partial<Cell>) {
  for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) Object.assign(CELLS[i][j], patch);
}
area(3, 6, 3, 6, { ceil: 10, tag: "hall", mat: "stain" });
area(8, 9, 1, 2, { floor: -2.2, ceil: 3, tag: "pit", mat: "concrete", lights: 1 });
area(8, 8, 3, 3, { ceil: 3, tag: "pitStairs", mat: "concrete", stair: { axis: "z", atMin: -2.2, atMax: 0 } });
area(0, 1, 7, 9, { floor: 1.4, ceil: 4.4, tag: "platform" });
area(2, 2, 8, 8, { ceil: 4.4, tag: "platformStairs", stair: { axis: "x", atMin: 1.4, atMax: 0 } });
area(9, 10, 7, 8, { tag: "holes" });
area(0, 0, 0, 4, { ceil: 2.2, tag: "crawl", mat: "stain", lights: 1 });
area(6, 7, 0, 0, { tag: "pool", mat: "tile" });
area(5, 6, 10, 11, { tag: "arrival" });
area(11, 11, 4, 4, { tag: "elevator", mat: "stain" });
area(11, 11, 9, 9, { tag: "mall" });
// stains here and there, and some dead lights: the place is not maintained
for (const col of CELLS) for (const c of col) {
  if (!c.tag && rnd() < 0.18) c.mat = "stain";
  if (!c.tag && rnd() < 0.14) c.lights = 0;
  // ceilings that do not agree with each other: a low room, then one much too tall
  const h = rnd();
  if (!c.tag && h < 0.14) c.ceil = 2.45;
  else if (!c.tag && h > 0.88) c.ceil = 5.5 + rnd() * 2;
}

export function cellAt(x: number, z: number): Cell | null {
  const i = Math.floor((x + HALF) / C);
  const j = Math.floor((z + HALF) / C);
  return i >= 0 && i < N && j >= 0 && j < N ? CELLS[i][j] : null;
}
function cellGround(c: Cell, x: number, z: number) {
  if (!c.stair) return c.floor;
  const t = c.stair.axis === "x" ? (x - (-HALF + c.i * C)) / C : (z - (-HALF + c.j * C)) / C;
  const k = Math.min(1, Math.max(0, t));
  return c.stair.atMin + (c.stair.atMax - c.stair.atMin) * k;
}
/** Floor height under the player. */
export function lobbyGround(x: number, z: number) {
  const c = cellAt(x, z);
  return c ? cellGround(c, x, z) : 0;
}

/* ---------- edges and the maze ---------- */
export const EDGES: Edge[] = [];
const edgeMap = new Map<string, Edge>();
const key = (a: Cell, b: Cell) => (a.i * N + a.j < b.i * N + b.j ? `${a.i},${a.j}|${b.i},${b.j}` : `${b.i},${b.j}|${a.i},${a.j}`);
for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
  const a = CELLS[i][j];
  if (i + 1 < N) {
    const e: Edge = { a, b: CELLS[i + 1][j], vertical: true, x: -HALF + C * (i + 1), z: cz(j), kind: "wall", offset: 0, blocked: false };
    EDGES.push(e);
    edgeMap.set(key(a, e.b), e);
  }
  if (j + 1 < N) {
    const e: Edge = { a, b: CELLS[i][j + 1], vertical: false, x: cx(i), z: -HALF + C * (j + 1), kind: "wall", offset: 0, blocked: false };
    EDGES.push(e);
    edgeMap.set(key(a, e.b), e);
  }
}
const edgeBetween = (a: Cell, b: Cell) => edgeMap.get(key(a, b));
const neighbours = (c: Cell) =>
  [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([di, dj]) => CELLS[c.i + di]?.[c.j + dj]).filter((n): n is Cell => !!n);
const openKind = (): EdgeKind => (rnd() < 0.45 ? "open" : "door");

// 1. a spanning maze from the arrival room (randomised depth-first)
{
  const start = CELLS[5][11];
  const seen = new Set([start]);
  const stack = [start];
  while (stack.length) {
    const c = stack[stack.length - 1];
    const next = neighbours(c).filter((n) => !seen.has(n));
    if (!next.length) {
      stack.pop();
      continue;
    }
    const n = next[Math.floor(rnd() * next.length)];
    edgeBetween(c, n)!.kind = openKind();
    seen.add(n);
    stack.push(n);
  }
}
// 2. loops, so it feels like rooms rather than a corridor maze
for (const e of EDGES) if (e.kind === "wall" && rnd() < 0.32) e.kind = openKind();
// 3. special rooms are fully open inside; stairs open at both ends and closed on their sides
const ROOMS: Tag[] = ["hall", "pit", "platform", "holes", "arrival", "pool"];
for (const e of EDGES) if (e.a.tag && e.a.tag === e.b.tag && ROOMS.includes(e.a.tag)) e.kind = "open";
for (const [a, b] of [[CELLS[8][3], CELLS[8][2]], [CELLS[8][3], CELLS[8][4]], [CELLS[2][8], CELLS[1][8]], [CELLS[2][8], CELLS[3][8]]]) edgeBetween(a, b)!.kind = "open";
for (const [a, b] of [[CELLS[8][3], CELLS[7][3]], [CELLS[8][3], CELLS[9][3]], [CELLS[2][8], CELLS[2][7]], [CELLS[2][8], CELLS[2][9]]]) edgeBetween(a, b)!.kind = "wall";

// 4. a height step across an open side is a ledge, not a passage
function edgeHeights(e: Edge): [number, number] {
  const n = 0.05;
  if (e.vertical) return [cellGround(e.a, e.x - n, e.z), cellGround(e.b, e.x + n, e.z)];
  return [cellGround(e.a, e.x, e.z - n), cellGround(e.b, e.x, e.z + n)];
}
const passable = (e: Edge) => e.kind !== "wall" && Math.abs(edgeHeights(e)[0] - edgeHeights(e)[1]) < 0.3;

// 5. every cell reachable on foot from the arrival: knock doors through where the maze left islands
for (let guard = 0; guard < N * N; guard++) {
  const reach = new Set<Cell>([CELLS[5][11]]);
  const queue = [CELLS[5][11]];
  while (queue.length) {
    const c = queue.shift()!;
    for (const n of neighbours(c)) if (!reach.has(n) && passable(edgeBetween(c, n)!)) {
      reach.add(n);
      queue.push(n);
    }
  }
  if (reach.size === N * N) break;
  let fixed = false;
  for (const c of reach) for (const n of neighbours(c)) {
    const e = edgeBetween(c, n)!;
    if (!fixed && !reach.has(n) && e.kind === "wall" && !n.stair && !c.stair && Math.abs(edgeHeights(e)[0] - edgeHeights(e)[1]) < 0.3) {
      e.kind = "door";
      fixed = true;
    }
  }
  if (!fixed) break;
}
for (const e of EDGES) {
  const [ha, hb] = edgeHeights(e);
  e.blocked = e.kind !== "wall" && Math.abs(ha - hb) >= 0.3;
  e.offset = e.kind === "door" ? (rnd() - 0.5) * (C - DOOR_W - 1) : 0;
}
export const edgeFloor = (e: Edge) => Math.min(...edgeHeights(e));
export const edgeTop = (e: Edge) => Math.max(e.a.ceil, e.b.ceil);
export const edgeHeightsOf = edgeHeights;

/* ---------- special features ---------- */
export const HALL = { x0: cx(3) - C / 2, x1: cx(6) + C / 2, z0: cz(3) - C / 2, z1: cz(6) + C / 2, ledgeY: 5.2, ledgeD: 1.6 };
export const HALL_PILLARS: [number, number][] = [[-10, -10], [0, -10], [-10, 0], [0, 0]];
export const WELL = { x: cx(8) + C / 2, z: cz(1) + C / 2, size: 3, depth: 16 };
export const HOLES = { x0: cx(9) - C / 2, z0: cz(7) - C / 2, size: 2 * C, step: 1.25, depth: 4.5 };
/** squares of the hole field (odd-odd positions on a 1.25 m grid): you see a second Lobby down there */
export const HOLE_SQUARES: [number, number][] = [];
for (let a = 1; a < 8; a += 2) for (let b = 1; b < 8; b += 2) HOLE_SQUARES.push([HOLES.x0 + (a + 0.5) * HOLES.step, HOLES.z0 + (b + 0.5) * HOLES.step]);
export const ARRIVAL_DOOR = { x: cx(5), z: HALF, width: 1.2, height: 2.2 };

export const EXITS: Exit[] = [
  { id: "exit-backrooms", kind: "sealed", x: cx(0), z: -HALF, y: 0, angle: 0, color: "#e8c547", name: "Backrooms", text: "La porte est scellée. Derrière, ça bourdonne : le jeu arrive un jour." },
  { id: "exit-bassins", kind: "grate", x: cx(6) + C / 2, z: -HALF, y: 0, angle: 0, color: "#7fd6e0", name: "Les bassins", text: "On entend l'eau derrière la grille. Elle ne s'ouvre pas, pas encore." },
  { id: "exit-bureaux", kind: "elevator", x: HALF, z: cz(4), y: 0, angle: -Math.PI / 2, color: "#4fd1c5", name: "Les bureaux", text: "L'ascenseur ne vient pas. Les bureaux isolés sont encore en travaux." },
  { id: "exit-commerce", kind: "glass", x: HALF, z: cz(9), y: 0, angle: -Math.PI / 2, color: "#e597a6", name: "Le centre commercial", text: "Les portes vitrées sont fermées à clé. Une musique très lointaine filtre." },
  { id: "exit-hotel", kind: "velvet", x: -HALF, z: cz(8), y: 1.4, angle: Math.PI / 2, color: "#d0745f", name: "L'hôtel", text: "Le grand escalier est barré d'un cordon de velours." },
];

/* ---------- collisions ---------- */
function edgeColliders(e: Edge): Box[] {
  if (e.kind === "open" && !e.blocked) return [];
  const along = (center: number, len: number) => (e.vertical ? box(e.x, center, WALL_T, len) : box(center, e.z, len, WALL_T));
  const mid = e.vertical ? e.z : e.x;
  if (e.kind === "door" && !e.blocked) {
    const g0 = mid + e.offset - DOOR_W / 2;
    const g1 = mid + e.offset + DOOR_W / 2;
    const s0 = mid - C / 2;
    const s1 = mid + C / 2;
    return [along((s0 + g0) / 2, g0 - s0), along((g1 + s1) / 2, s1 - g1)];
  }
  return [along(mid, C)];
}
const outer: Box[] = [
  box(0, -HALF - WALL_T / 2, C * N + 1, WALL_T),
  box(-HALF - WALL_T / 2, 0, WALL_T, C * N + 1),
  box(HALF + WALL_T / 2, 0, WALL_T, C * N + 1),
  // south wall, with the bright doorway back to the meadow
  box((-HALF + ARRIVAL_DOOR.x - ARRIVAL_DOOR.width / 2) / 2, HALF + WALL_T / 2, ARRIVAL_DOOR.x - ARRIVAL_DOOR.width / 2 + HALF, WALL_T),
  box((HALF + ARRIVAL_DOOR.x + ARRIVAL_DOOR.width / 2) / 2, HALF + WALL_T / 2, HALF - ARRIVAL_DOOR.x - ARRIVAL_DOOR.width / 2, WALL_T),
  box(ARRIVAL_DOOR.x, HALF + 0.9, ARRIVAL_DOOR.width + 0.6, 0.2),
];
export const LOBBY_COLLIDERS: Box[] = [
  ...EDGES.flatMap(edgeColliders),
  ...outer,
  ...HALL_PILLARS.map(([x, z]) => box(x, z, 1, 1)),
  box(WELL.x, WELL.z, WELL.size, WELL.size),
  ...HOLE_SQUARES.map(([x, z]) => box(x, z, HOLES.step, HOLES.step)),
];

export const LOBBY_INTERACTABLES: Interactable[] = EXITS.map((e) => ({
  id: e.id,
  x: e.x + Math.sin(e.angle) * 0.6,
  z: e.z + Math.cos(e.angle) * 0.6,
  radius: 2.4,
  verb: e.kind === "elevator" ? "Appeler l'ascenseur" : "Ouvrir",
  locked: { name: e.name, text: e.text, color: e.color },
}));

export const LOBBY_SPAWN = { x: ARRIVAL_DOOR.x, z: HALF - 2.5, yaw: 0 };
export const LOBBY_PORTAL_BOX = { minX: ARRIVAL_DOOR.x - ARRIVAL_DOOR.width / 2, maxX: ARRIVAL_DOOR.x + ARRIVAL_DOOR.width / 2, minZ: HALF + 0.05, maxZ: HALF + 0.75 };
