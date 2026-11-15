import { box } from "../collision";
import { Space, type Shape, type Solid } from "../archi/sdf";
import { lazyBuilt, room } from "./common";

/**
 * Dreamcore, in three places reached by falling:
 * - la salle de jeux: a children's stage set under a black ceiling (painted sky, a sun with a face, a real sunbeam),
 *   a ball pit to wade through, a corridor of painted clouds, a calm green room, and a hole in its floor;
 * - les collines: open air, rolling grass, small yellow houses; one of them has a hole for a floor;
 * - le lotissement: an empty suburb at dusk, every window lit; a crater at the end of the street.
 */

/* ---------- Dreamcore, inside: see places/playground.ts ---------- */
export { BACKDROP, GARDENS, PLAY, PLAY_FALL, PLAY_SPACE, PLAY_SPAWN, playBuilt } from "./playground";

/* ---------- les collines ---------- */
export const HILLS = { r: 58, house: { x: 24, z: -30, w: 6, d: 6 } };
const hillsShapes: Shape[] = [{ kind: "circle", x: 0, z: 0, r: HILLS.r, ceil: 60, open: true, mat: "carpet" }];
const h = HILLS.house;
// the yellow house: three walls and a doorway on the south side; inside, the floor is a hole
const hillsSolids: Solid[] = [
  { kind: "box", x: h.x, z: h.z - h.d / 2, w: h.w, d: 0.3 },
  { kind: "box", x: h.x - h.w / 2, z: h.z, w: 0.3, d: h.d },
  { kind: "box", x: h.x + h.w / 2, z: h.z, w: 0.3, d: h.d },
  { kind: "box", x: h.x - 1.9, z: h.z + h.d / 2, w: 2.2, d: 0.3 },
  { kind: "box", x: h.x + 1.9, z: h.z + h.d / 2, w: 2.2, d: 0.3 },
];
export const HILLS_SPACE = new Space(hillsShapes, hillsSolids, { walls: false });
export const hillsBuilt = lazyBuilt(HILLS_SPACE);
export const HILLS_SPAWN = { x: 0, z: 10, yaw: 0.6 };
export const HILLS_FALL = box(h.x, h.z - 0.5, 3.4, 3.4);

/* ---------- le lotissement ---------- */
export const SUBURB = { street: { w: 9, len: 110 }, lawns: 44, crater: { x: 0, z: -104, r: 7 } };
const suburbShapes: Shape[] = [
  room(0, -SUBURB.street.len / 2 + 4, SUBURB.lawns, SUBURB.street.len, { ceil: 60, open: true, mat: "carpet" }),
  { kind: "circle", x: SUBURB.crater.x, z: SUBURB.crater.z, r: SUBURB.crater.r + 3, ceil: 60, open: true, mat: "concrete" },
];
export const HOUSES: { x: number; z: number; side: number; lit: boolean }[] = [];
const suburbSolids: Solid[] = [];
for (let k = 0; k < 8; k++) for (const side of [-1, 1]) {
  const z = -8 - k * 11.5;
  const x = side * 15;
  HOUSES.push({ x, z, side, lit: (k * 7 + (side > 0 ? 3 : 0)) % 5 !== 0 });
  suburbSolids.push({ kind: "box", x, z, w: 9, d: 8 });
}
export const SUBURB_SPACE = new Space(suburbShapes, suburbSolids, { walls: false });
export const suburbBuilt = lazyBuilt(SUBURB_SPACE);
export const SUBURB_SPAWN = { x: 0, z: 2, yaw: 0 };
export const SUBURB_FALL = box(SUBURB.crater.x, SUBURB.crater.z, 4, 4);
