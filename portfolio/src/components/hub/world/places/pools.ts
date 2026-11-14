import { Space, type Shape, type Solid } from "../archi/sdf";
import { lazyBuilt, room, throat, type Anchor } from "./common";

/**
 * Les bassins: a suite of pools you wade through, each with its own light: a white hall with round windows,
 * a dark vault on pillars, a night-blue pool, and a courtyard open to the sky in the middle of the building.
 * A drain at the back leads down to the canals.
 */
export const POOLS_ENTRY: Anchor = { x: 0, z: 0, y: 0, yaw: 0 };
export const POOLS_DRAIN: Anchor = { x: -47, z: -72, y: -1.2, yaw: Math.PI / 2 }; // walking west, into the drain
export const BASIN = -0.4; // one step down: you wade
export const WATER = -0.12;
export const COURTYARD = { x: 9, z: -66, r: 4.6 };
export const HALL_A = { x: 0, z: -25, w: 16, d: 22 };

const tile = { mat: "tile", wall: "tile" } as const;
const shapes: Shape[] = [
  throat(POOLS_ENTRY, 2.2, 2.6),
  room(0, -7.5, 3, 15, { ceil: 2.8, ...tile, lights: 2.4 }),
  // A: white and bright
  room(HALL_A.x, HALL_A.z, HALL_A.w, HALL_A.d, { ceil: 4.8, ...tile, lights: 3.4 }),
  room(0, -27, 11, 15, { floor: BASIN, ceil: 4.8, ...tile, lights: 3.4 }),
  // A → B
  room(-11, -33, 10, 3, { ceil: 2.6, ...tile, lights: 2.5 }),
  // B: a vault, dark, on pillars
  room(-21, -38, 12, 20, { a: 0.3, ceil: 6.5, ...tile, lights: 4.5, dead: 0.75 }),
  room(-21, -38, 8, 16, { a: 0.3, floor: BASIN, ceil: 6.5, ...tile, lights: 0 }),
  // B → C
  { kind: "capsule", ax: -25, az: -48, bx: -26, bz: -61, r: 1.5, ceil: 2.6, ...tile, lights: 2.5 },
  // C: night blue
  room(-24, -66, 20, 12, { a: -0.2, ceil: 3.2, ...tile, lights: 3.6, dead: 0.65 }),
  room(-24, -66, 16, 8, { a: -0.2, floor: BASIN, ceil: 3.2, ...tile, lights: 0 }),
  // C → D
  room(-6, -67, 18, 3, { a: 0.08, ceil: 2.6, ...tile, lights: 2.5 }),
  // D: a courtyard open to the sky, in the middle of the building
  room(COURTYARD.x, COURTYARD.z, 16, 16, { ceil: 30, ...tile, open: true }),
  { kind: "circle", x: COURTYARD.x, z: COURTYARD.z, r: COURTYARD.r, floor: BASIN, ceil: 30, ...tile, open: true },
  // the drain, under C, sloping down
  room(-40, -71, 14, 2.2, { a: 0.07, ceil: 2.2, ...tile, lights: 3, dead: 0.4, floor: { ax: -33, az: -70.5, bx: -47, bz: -71.5, ha: 0, hb: -1.2 } }),
  throat({ ...POOLS_DRAIN, yaw: POOLS_DRAIN.yaw + Math.PI }, 2, 2.2), // a little past the drain's mouth
];

const solids: Solid[] = [];
// the vault's pillars, two rows along its pool
for (let k = -3; k <= 3; k++) for (const s of [-1, 1]) {
  const lx = s * 5;
  const lz = k * 2.6;
  const a = 0.3;
  solids.push({ kind: "circle", x: -21 + lx * Math.cos(a) + lz * Math.sin(a), z: -38 - lx * Math.sin(a) + lz * Math.cos(a), r: 0.35, mat: "tile" });
}

export const POOLS_SPACE = new Space(shapes, solids);
export const poolsBuilt = lazyBuilt(POOLS_SPACE);
export const POOLS_SPAWN = { x: 0, z: -3, yaw: 0 };
