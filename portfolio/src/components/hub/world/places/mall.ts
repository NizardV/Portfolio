import { Space, type Shape, type Solid } from "../archi/sdf";
import { lazyBuilt, room, throat, type Anchor } from "./common";

/**
 * Le centre commercial: a dead mall shaped like a star: a round atrium two storeys high under a skylight,
 * six galleries of shut shops radiating out, all of different lengths. One gallery ends at a record shop (the
 * future Music zone); another, through a service door, opens onto a hangar with a whole house built inside it.
 */
export const MALL_ENTRY: Anchor = { x: 0, z: 0, y: 0, yaw: 0 };
export const ATRIUM = { x: 0, z: -26, r: 14 };
export const ARMS = [0, 1, 2, 3, 4, 5].map((k) => {
  const a = (k / 6) * Math.PI * 2; // no gallery runs straight back towards the entrance
  const len = [22, 30, 18, 34, 26, 20][k];
  const dx = Math.cos(a);
  const dz = Math.sin(a);
  return { a, len, x: ATRIUM.x + dx * (ATRIUM.r - 2 + len / 2), z: ATRIUM.z + dz * (ATRIUM.r - 2 + len / 2), dx, dz };
});
const end = (k: number, extra = 0) => ({ x: ATRIUM.x + ARMS[k].dx * (ATRIUM.r - 2 + ARMS[k].len + extra), z: ATRIUM.z + ARMS[k].dz * (ATRIUM.r - 2 + ARMS[k].len + extra) });
export const RECORDS = { ...end(1, 4), a: ARMS[1].a };
export const HANGAR = { ...end(3, 22), w: 34, d: 24 };
export const HOUSE = { x: HANGAR.x, z: HANGAR.z, w: 8, d: 7, h: 4.6 };

const marble = { mat: "marble", wall: "plaster" } as const;
const shapes: Shape[] = [
  throat(MALL_ENTRY, 3, 3),
  room(0, -7, 9, 14, { ceil: 3.4, ...marble, lights: 2.8 }),
  { kind: "circle", x: ATRIUM.x, z: ATRIUM.z, r: ATRIUM.r, ceil: 13, ...marble, lights: 4 },
  ...ARMS.map((m) => room(m.x, m.z, m.len, 8, { a: -m.a, ceil: 6.5, ...marble, lights: 3.4, dead: 0.25 })),
  // the record shop at the end of gallery 1
  room(RECORDS.x, RECORDS.z, 10, 9, { a: -RECORDS.a, ceil: 3, mat: "wood", wall: "panel", lights: 2.6 }),
  // gallery 3 → a service corridor → the hangar
  room(end(3, 9).x, end(3, 9).z, 20, 2.6, { a: -ARMS[3].a, ceil: 2.6, mat: "concrete", wall: "concrete", lights: 3, dead: 0.4 }),
  room(HANGAR.x, HANGAR.z, HANGAR.w, HANGAR.d, { a: -ARMS[3].a, ceil: 9, mat: "concrete", wall: "plaster", lights: 4.2, dead: 0.35 }),
];
const solids: Solid[] = [{ kind: "box", x: HOUSE.x, z: HOUSE.z, w: HOUSE.w, d: HOUSE.d, a: -ARMS[3].a, h: HOUSE.h, mat: "plaster", tag: "house" }];

export const MALL_SPACE = new Space(shapes, solids);
export const mallBuilt = lazyBuilt(MALL_SPACE);
export const MALL_SPAWN = { x: 0, z: -4, yaw: 0 };
