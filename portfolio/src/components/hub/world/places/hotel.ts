import { Space, type Shape } from "../archi/sdf";
import { lazyBuilt, room, throat, type Anchor } from "./common";

/**
 * L'hôtel-atrium: you come out on the top floor of a hotel built around a square well. Corridors of red carpet
 * run round it; below, the same floor repeats, again and again, further than the light goes. Rooms open off the
 * corridors; only one of them is unlocked.
 */
export const HOTEL_ENTRY: Anchor = { x: 0, z: 0, y: 0, yaw: 0 };
export const WELL = { x: 0, z: -32, half: 11, depth: -60, floors: 14, storey: 3.4 };
const RING = { half: 15, w: 4 };

const hotel = { mat: "carpet", wall: "wallpaper" } as const;
const c = WELL.z;
const shapes: Shape[] = [
  throat(HOTEL_ENTRY, 3, 3),
  room(0, -5, 7, 10, { ceil: 4.2, ...hotel, lights: 3 }), // the landing at the top of the grand staircase
  room(0, -13, 4, 10, { ceil: 3.2, ...hotel, lights: 3 }),
  // the ring of corridors around the well
  room(0, c - RING.half + RING.w / 2, RING.half * 2, RING.w, { ceil: 3.2, ...hotel, lights: 3.4 }),
  room(0, c + RING.half - RING.w / 2, RING.half * 2, RING.w, { ceil: 3.2, ...hotel, lights: 3.4 }),
  room(-RING.half + RING.w / 2, c, RING.w, RING.half * 2, { ceil: 3.2, ...hotel, lights: 3.4 }),
  room(RING.half - RING.w / 2, c, RING.w, RING.half * 2, { ceil: 3.2, ...hotel, lights: 3.4 }),
  // the well: sixty metres down, a skylight high above
  room(0, c, WELL.half * 2, WELL.half * 2, { floor: WELL.depth, ceil: 14, ...hotel, lights: 0 }),
  // rooms off the corridors (doorways, then rooms); only one is lit
  ...[
    [-8, c - RING.half - 3.5, true],
    [8, c - RING.half - 3.5, false],
    [-RING.half - 3.5, c - 6, false],
    [-RING.half - 3.5, c + 7, false],
    [RING.half + 3.5, c + 2, false],
  ].flatMap(([x, z, lit]) => {
    const vertical = Math.abs(x as number) > RING.half;
    const door = vertical
      ? room((x as number) > 0 ? RING.half + 0.5 : -RING.half - 0.5, z as number, 1.6, 1.1, { ceil: 2.2, ...hotel, lights: 0 })
      : room(x as number, c - RING.half - 0.5, 1.1, 1.6, { ceil: 2.2, ...hotel, lights: 0 });
    return [door, room(x as number, z as number, 5, 5, { ceil: 2.7, mat: "carpet", wall: "wallpaper", lights: lit ? 2.4 : 0, tag: lit ? "open-room" : "room" })];
  }),
];

export const HOTEL_SPACE = new Space(shapes);
export const hotelBuilt = lazyBuilt(HOTEL_SPACE);
export const HOTEL_SPAWN = { x: 0, z: -3, yaw: 0 };
