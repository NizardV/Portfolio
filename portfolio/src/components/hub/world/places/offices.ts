import { Space, type Shape, type Solid } from "../archi/sdf";
import { lazyBuilt, room, throat, type Anchor } from "./common";

/**
 * Les bureaux isolés: an office floor far too wide for its building, reached only by the Lobby's lift.
 * Vigil lives in two rooms: the surveillance room (wall of screens) and, down the service stairs, the server room.
 */
export const OFFICES_ENTRY: Anchor = { x: 0, z: 0, y: 0, yaw: 0 }; // stepping out of the lift, facing north
export const SURVEILLANCE = { x: 50, z: -46, w: 9, d: 7 };
export const SERVERS = { x: -63, z: -48, w: 10, d: 14, floor: -4.2 };
const PLAN = { x: 0, z: -34, w: 66, d: 46 };

const shapes: Shape[] = [
  throat(OFFICES_ENTRY, 1.8, 2.4), // the lift cabin
  room(0, -6, 6, 12, { ceil: 2.7, wall: "panel", mat: "carpet", lights: 2.6 }),
  room(PLAN.x, PLAN.z, PLAN.w, PLAN.d, { ceil: 2.85, wall: "plaster", mat: "carpet", lights: 3, dead: 0.5 }),
  // a meeting room wing, slightly askew
  room(-24, -60, 14, 10, { a: 0.12, ceil: 2.7, wall: "panel", mat: "stain", lights: 3, dead: 0.3 }),
  // to Vigil's surveillance room
  room(39, -46, 16, 3, { ceil: 2.6, wall: "panel", lights: 3 }),
  room(SURVEILLANCE.x, SURVEILLANCE.z, SURVEILLANCE.w, SURVEILLANCE.d, { ceil: 2.6, wall: "panel", mat: "carpet", lights: 0, tag: "surveillance" }),
  // service stairs down, the basement, the server room
  room(-37, -52, 10, 3.2, { ceil: 3, wall: "concrete", mat: "concrete", lights: 2.5, floor: { ax: -32, az: -52, bx: -42, bz: -52, ha: 0, hb: SERVERS.floor } }),
  room(-50, -52, 17, 5, { floor: SERVERS.floor, ceil: SERVERS.floor + 2.6, wall: "concrete", mat: "concrete", lights: 2.8, dead: 0.3 }),
  room(SERVERS.x, SERVERS.z, SERVERS.w, SERVERS.d, { floor: SERVERS.floor, ceil: SERVERS.floor + 2.8, wall: "concrete", mat: "tile", lights: 2.2, tag: "servers" }),
];

const solids: Solid[] = [];
for (let x = PLAN.x - 28; x <= PLAN.x + 28; x += 8) for (let z = PLAN.z - 18; z <= PLAN.z + 18; z += 8) solids.push({ kind: "box", x, z, w: 0.7, d: 0.7, mat: "plaster" });
// a few cubicle half-walls left standing, nothing else
for (const [x, z, w, a] of [[-14, -28, 6, 0], [-14, -24, 6, 0], [12, -40, 7, Math.PI / 2], [20, -22, 5, 0.05], [-4, -50, 8, 0]] as const)
  solids.push({ kind: "box", x, z, w, d: 0.12, a, h: 1.3, mat: "panel" });

export const OFFICES_SPACE = new Space(shapes, solids);
export const officesBuilt = lazyBuilt(OFFICES_SPACE);
export const OFFICES_SPAWN = { x: 0, z: -3, yaw: 0 };
