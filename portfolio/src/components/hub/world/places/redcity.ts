import { Space, type Shape } from "../archi/sdf";
import { back, lazyBuilt, room, throat, type Anchor } from "./common";

/**
 * La ville rouge: night, under an elevated line, between towers whose windows are all lit red. Nobody.
 * Open air: the edges of the streets are invisible. At the end of the avenue, a lit stairwell leads back to the Lobby.
 */
export const CITY_ENTRY: Anchor = { x: 0, z: 0, y: 0, yaw: 0 }; // out of a stairwell, facing up the avenue
export const CITY_BACK: Anchor = { x: 0, z: -128, y: 0, yaw: 0 }; // the stairwell at the far end
export const AVENUE = { w: 12, len: 132 };
export const CROSS_STREETS = [-24, -52, -80, -108];

const asphalt = { mat: "concrete", wall: "concrete", open: true } as const;
const shapes: Shape[] = [
  throat(CITY_ENTRY, 2.4, 3),
  room(0, -AVENUE.len / 2, AVENUE.w, AVENUE.len, { ceil: 60, ...asphalt }),
  ...CROSS_STREETS.map((z, i) => room(0, z, 90, 9, { a: (i % 2 ? 1 : -1) * 0.04, ceil: 60, ...asphalt })),
  room(0, -66, 30, 20, { ceil: 60, ...asphalt }), // a square under the line
  throat(back(CITY_BACK), 2, 2.6),
];

export const CITY_SPACE = new Space(shapes, [], { walls: false });
export const cityBuilt = lazyBuilt(CITY_SPACE);
export const CITY_SPAWN = { x: 0, z: -3, yaw: 0 };
