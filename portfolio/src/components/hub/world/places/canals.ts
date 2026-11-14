import { Space, type Shape } from "../archi/sdf";
import { back, lazyBuilt, room, throat, type Anchor } from "./common";

/**
 * Les canaux: long low tunnels under the pools, a channel of green water between two walkways. At the far end,
 * stairs climb back into the Lobby through a service door; halfway, a crack in the wall that should not be there.
 */
export const CANALS_ENTRY: Anchor = { x: 0, z: 0, y: 0, yaw: 0 };
export const CANALS_UP: Anchor = { x: 0, z: -96, y: 3.4, yaw: 0 }; // top of the stairs: the Lobby's service door
export const CANALS_CRACK: Anchor = { x: -21, z: -58, y: 0, yaw: Math.PI / 2 }; // walking west into the crack
export const CHANNEL = { x: 1.5, z: -40, w: 2.4, d: 78, floor: -1.3, water: -0.7 }; // off-centre: a walkway on the left, a ledge on the right

const concrete = { mat: "concrete", wall: "concrete" } as const;
const shapes: Shape[] = [
  throat(CANALS_ENTRY, 2.2, 2.4),
  room(0, -41, 6.4, 84, { ceil: 3.4, ...concrete, lights: 4.2, dead: 0.2 }),
  room(CHANNEL.x, CHANNEL.z, CHANNEL.w, CHANNEL.d, { floor: CHANNEL.floor, ceil: 3.4, ...concrete, lights: 0 }),
  // a side chamber with pumps, and the crack beyond it
  room(-9, -58, 12, 8, { ceil: 3, ...concrete, lights: 3.4, dead: 0.5 }),
  room(-18, -58, 7, 0.95, { ceil: 2.4, ...concrete, lights: 0 }),
  throat(back(CANALS_CRACK), 1, 2.2),
  // a second tunnel crossing at an angle, dead end, water dripping
  room(-13, -30, 24, 3.4, { a: 0.5, ceil: 2.8, ...concrete, lights: 5, dead: 0.6 }),
  // the stairs up, then the landing
  room(0, -86, 3, 8, { ceil: 6.8, ...concrete, lights: 2.6, floor: { ax: 0, az: -82, bx: 0, bz: -90, ha: 0, hb: CANALS_UP.y } }),
  room(0, -93, 3, 7, { floor: CANALS_UP.y, ceil: CANALS_UP.y + 2.6, ...concrete, lights: 2.6 }),
  throat(back(CANALS_UP), 1.4, 2.3),
];

export const CANALS_SPACE = new Space(shapes);
export const canalsBuilt = lazyBuilt(CANALS_SPACE);
export const CANALS_SPAWN = { x: -1.2, z: -3, yaw: 0 };
