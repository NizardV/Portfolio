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

/* ---------- Dreamcore, inside: the playful zone, then the peaceful one ---------- */
/*
 * Playful (night-blue painted sky on every wall and ceiling): the stage set where you land, a bed in an alcove,
 * a bench in a niche of sky; through the painted backdrop, the ball pit and its carousel; a purple room on two
 * levels off to the side; the dome tunnel where a river of balls pours out of a round hole.
 * Peaceful (white walls, grass, daylight from above): a great hall with wavy walls and a ring of tiny houses up on a
 * mezzanine; a long indoor garden with a picket fence, turbines and trees in planters; a small room with the hole.
 */
export const PLAY = {
  stage: { x: 0, z: -10, w: 22, d: 16 },
  pitRoom: { x: 0, z: -26, w: 24, d: 16.6 },
  pit: { x: 0, z: -26, w: 15, d: 10 },
  carousel: { x: 0, z: -26, r: 1.9 },
  bed: { x: 13.6, z: -8, w: 5.8, d: 6 },
  bench: { x: -12.9, z: -13, w: 4.4, d: 4 },
  purple: { x: -23, z: -27, w: 12.6, d: 14, ceil: 10, up: 2.4 },
  tunnel: { x: 0, z: -45, w: 8, d: 22, ceil: 5.5 },
  mouth: { x: 0, z: -58.2, w: 3, d: 5, h: 3 },
  hall: { x: 0, z: -80, r: 13, lobe: 7.5, ceil: 8 },
  ring: { inner: 6.5, outer: 10.5, y: 4.4 },
  garden: { x: 0, z: -116.5, w: 14, d: 37, ceil: 9 },
  green: { x: 0, z: -140.7, w: 12, d: 12 },
  hole: { x: 0, z: -142.2, r: 1.6 },
};
/** the painted sky closes the stage: a doorway in it (and a gap in the fence before it) leads to the ball pit */
export const BACKDROP = { z: PLAY.stage.z - PLAY.stage.d / 2 + 0.05, gate: { w: 2.6, h: 3 }, fence: PLAY.stage.z - PLAY.stage.d / 2 + 0.9 };

const sky = { wall: "sky", ceilMat: "sky", lights: 0 } as const;
const white = { wall: "plaster", ceilMat: "plaster" } as const;
const { stage, pitRoom, pit, purple, tunnel, mouth, hall, garden, green, hole } = PLAY;
const playShapes: Shape[] = [
  // playful
  room(stage.x, stage.z, stage.w, stage.d, { ceil: 8, mat: "lawn", ...sky }),
  room(PLAY.bed.x, PLAY.bed.z, PLAY.bed.w, PLAY.bed.d, { ceil: 3, mat: "wood", wall: "wallpaper", ceilMat: "sky", lights: 0 }),
  room(PLAY.bench.x, PLAY.bench.z, PLAY.bench.w, PLAY.bench.d, { ceil: 3.2, mat: "lawn", ...sky }),
  room(pitRoom.x, pitRoom.z, pitRoom.w, pitRoom.d, { ceil: 7, mat: "wood", ...sky }),
  room(pit.x, pit.z, pit.w, pit.d, { floor: -0.4, ceil: 7, mat: "void", ...sky }),
  room(-14.4, -27, 5.4, 3.2, { ceil: 3, mat: "carpet", wall: "panel", ceilMat: "concrete", lights: 0 }),
  room(purple.x, purple.z, purple.w, purple.d, { ceil: purple.ceil, mat: "carpet", wall: "panel", ceilMat: "concrete", lights: 0 }),
  room(-19.9, -31.6, 4.4, 2.4, { ceil: purple.ceil, mat: "carpet", wall: "panel", ceilMat: "concrete", lights: 0, floor: { ax: -17.9, az: -31.6, bx: -21.9, bz: -31.6, ha: 0, hb: purple.up } }),
  room(-25.5, -31, 7.6, 6, { floor: purple.up, ceil: purple.ceil, mat: "carpet", wall: "panel", ceilMat: "concrete", lights: 0 }),
  room(tunnel.x, tunnel.z, tunnel.w, tunnel.d, { ceil: tunnel.ceil, mat: "lawn", ...sky }),
  // the round hole at the end of the tunnel opens on a short passage, and the light changes
  room(mouth.x, mouth.z, mouth.w, mouth.d, { ceil: mouth.h, mat: "lawn", ...white, lights: 0 }),
  // peaceful: the great hall, a ring of lobes around a round floor (wavy walls)
  { kind: "circle", x: hall.x, z: hall.z, r: hall.r + 1, ceil: hall.ceil, mat: "lawn", ...white, lights: 5.5 },
  ...Array.from({ length: 12 }, (_, k): Shape => ({
    kind: "circle",
    x: hall.x + Math.sin((k * Math.PI) / 6) * hall.r,
    z: hall.z + Math.cos((k * Math.PI) / 6) * hall.r,
    r: hall.lobe,
    ceil: hall.ceil,
    mat: "lawn",
    ...white,
    lights: 0,
  })),
  room(garden.x, garden.z, garden.w, garden.d, { ceil: garden.ceil, mat: "lawn", ...white, lights: 0 }),
  room(green.x, green.z, green.w, green.d, { ceil: 3.4, mat: "lawn", ...white, lights: 3.2 }),
  { kind: "circle", x: hole.x, z: hole.z, r: hole.r, floor: -0.35, ceil: 3.4, mat: "void", ...white, lights: 0 },
];
const half = (stage.w + 0.2) / 2;
const side = (half - BACKDROP.gate.w / 2) / 2 + BACKDROP.gate.w / 2;
/** where the garden's fence runs, and its trees in planters */
export const GARDEN = { arches: [-108, -117, -126], fence: { x: -3.2, z0: -104, z1: -128 }, planters: [-108, -116, -124].map((z) => ({ x: 3, z })), turbines: [-110, -125].map((z) => ({ x: -5, z })) };
export const RING_PILLARS = Array.from({ length: 8 }, (_, k) => ({ x: hall.x + Math.sin((k * Math.PI) / 4 + 0.39) * 8.5, z: hall.z + Math.cos((k * Math.PI) / 4 + 0.39) * 8.5 }));
const playSolids: Solid[] = [
  ...[-1, 1].flatMap((s) => [
    { kind: "box" as const, x: s * side, z: BACKDROP.z - 0.08, w: half - BACKDROP.gate.w / 2, d: 0.1, mat: "sky" as const }, // the painted wall
    { kind: "box" as const, x: s * side, z: BACKDROP.fence, w: half - BACKDROP.gate.w / 2, d: 0.1, h: 0.95, ghost: true }, // the fence (drawn by the scene)
  ]),
  { kind: "circle", x: PLAY.carousel.x, z: PLAY.carousel.z, r: PLAY.carousel.r, ghost: true },
  ...RING_PILLARS.map((p): Solid => ({ kind: "circle", x: p.x, z: p.z, r: 0.45, mat: "plaster", h: PLAY.ring.y })),
  { kind: "box", x: GARDEN.fence.x, z: (GARDEN.fence.z0 + GARDEN.fence.z1) / 2, w: 0.1, d: GARDEN.fence.z0 - GARDEN.fence.z1, h: 1, ghost: true },
  ...GARDEN.planters.map((p): Solid => ({ kind: "box", x: p.x, z: p.z, w: 1.6, d: 1.6, h: 0.45, ghost: true })),
  ...GARDEN.turbines.map((p): Solid => ({ kind: "circle", x: p.x, z: p.z, r: 0.3, ghost: true })),
];
export const PLAY_SPACE = new Space(playShapes, playSolids);
export const playBuilt = lazyBuilt(PLAY_SPACE);
export const PLAY_SPAWN = { x: 0, z: -4, yaw: 0 };
/** falling: stepping into the rabbit hole */
export const PLAY_FALL = box(hole.x, hole.z, 1.4, 1.4);

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
