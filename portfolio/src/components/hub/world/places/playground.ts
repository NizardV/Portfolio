import { box } from "../collision";
import { Space, type Shape, type Solid } from "../archi/sdf";
import { lazyBuilt, room } from "./common";

/**
 * Dreamcore inside (plan: claude.ai/artifact/5fMWeqvH3Nt6mZrCgbwYsv). Plan x, y (metres) map to the game as
 * x - 50, -y for the play room, and x - 63, -84 - y for the gardens below it.
 *
 * Zone 1, la salle de jeux, under a painted night sky: the stage you land on, with three ways out (the gate in the
 * painted backdrop, a corridor to the giant bedroom, a corridor to the block corner); the ball pit and its carousel in
 * the middle; the purple room on two levels, whose balcony slides back down into the pit; the sky tunnel and its river
 * of balls. Hidden: the backstage (a slit at the end of the backdrop), a small door behind the night table (crouch),
 * a vent behind the toppled blocks (crouch), which leads all the way to the lookout of the gardens.
 *
 * Zone 2, les jardins intérieurs, white walls, grass, light from above: the rotunda and its raised ring of little
 * houses, the long garden and its lone turbine, a calm pool, a maze of white rooms (a phone rings somewhere; a window
 * looks onto the meadow), the lookout (a window onto Motion's hills), and the room of the hole.
 */

/* ---------- zone 1 ---------- */
export const PLAY = {
  stage: { x: 0, z: -15, w: 30, d: 20, ceil: 8 },
  backstage: { x: -8.4, z: -27.5, w: 13.2, d: 4 },
  bedroom: { x: 34, z: -19, w: 24, d: 25.8, ceil: 9 },
  bed: { x: 38.5, z: -14, w: 6, d: 9, top: 1.26 },
  steps: [{ x: 32.8, z: -14, h: 0.42 }, { x: 34.4, z: -14, h: 0.84 }],
  table: { x: 36.2, z: -29.6, w: 1.9, d: 1.7, h: 2.2 },
  nightlight: { x: 30, z: -25 },
  blocks: { x: -32, z: -44, w: 24, d: 24 },
  tower: { x: -27, z: -38, r: 0.85 },
  vent: { x: -44, z: -52 },
  pit: { x: 0, z: -45, w: 34, d: 26, round: 9 },
  carousel: { x: 0, z: -45, r: 2.4 },
  clouds: { x: 33.5, z: -41.2, w: 7, d: 18.4 },
  purple: { x: 34, z: -63, w: 24, d: 26, ceil: 10 },
  balcony: { x: 25, z: -62, w: 6, d: 24, h: 3 },
  slide: { z: -54, x0: 23.5, x1: 14.5 },
  tunnel: { x: 0, z: -69.75, w: 8, d: 24.5, ceil: 5.5 },
};
/** the painted sky closes the stage: a gate in it (a gap in the fence before it) and, at its left end, a slit */
export const BACKDROP = {
  z: PLAY.stage.z - PLAY.stage.d / 2 + 0.05,
  gate: { w: 2.6, h: 3 },
  slit: { x: -13.6, w: 0.8, h: 2.2 },
  fence: PLAY.stage.z - PLAY.stage.d / 2 + 0.9,
};

/* ---------- zone 2 ---------- */
export const GARDENS = {
  mouth: { x: 0, z: -87, w: 3, d: 10.8 },
  rotunda: { x: -1, z: -112, r: 13, lobe: 7.5, ceil: 9 },
  ring: { r: 8.5, width: 4, h: 4.4, from: 50, to: 310 },
  garden: { x: 1, z: -157.2, w: 18, d: 54.4, ceil: 9 },
  turbine: { x: 1, z: -157 },
  pool: { x: 37, z: -112, w: 28, d: 24 },
  basin: { x: 37, z: -112, w: 18, d: 13 },
  white: { x: 40, z: -158, w: 38, d: 40 },
  lookout: { x: -44, z: -113, w: 26, d: 22, h: 3 },
  hole: { x: 1, z: -190, r: 1.6 },
  holeRoom: { x: 1, z: -189, w: 20, d: 12 },
  phone: { x: 54, z: -176.6 },
  meadowWindow: { x: 25.75, z: -138, w: 1.4, h: 1.6 },
  hillsWindow: { x: -57, z: -113, w: 12, h: 4.6 },
};

const sky = { wall: "sky", ceilMat: "sky", lights: 0 } as const;
const white = { wall: "plaster", ceilMat: "plaster" } as const;
const P = PLAY;
const G = GARDENS;

/** a box rotated so that its length runs along the direction from a to b */
const along = (ax: number, az: number, bx: number, bz: number, width: number, extra: Partial<Shape> & { ceil: number }): Shape => ({
  kind: "box",
  x: (ax + bx) / 2,
  z: (az + bz) / 2,
  w: Math.hypot(bx - ax, bz - az),
  d: width,
  a: Math.atan2(-(bz - az), bx - ax),
  ...extra,
}) as Shape;

/** the raised ring of the rotunda: short boxes around the circle (its top is walkable, its sides are white walls) */
function ring(): Shape[] {
  const { r, width, h, from, to } = G.ring;
  const n = 11;
  const out: Shape[] = [];
  for (let k = 0; k < n; k++) {
    const a = ((from + ((to - from) * (k + 0.5)) / n) * Math.PI) / 180;
    const len = (2 * r * Math.sin((((to - from) / n) * Math.PI) / 360)) + 0.6;
    out.push({ kind: "box", x: G.rotunda.x + Math.sin(a) * r, z: G.rotunda.z + Math.cos(a) * r, w: len, d: width, a, floor: h, ceil: G.rotunda.ceil, mat: "lawn", wall: "plaster", lights: 0 });
  }
  // the ramp up: tangent to the circle where the ring starts
  const a0 = (from * Math.PI) / 180;
  const px = G.rotunda.x + Math.sin(a0) * r;
  const pz = G.rotunda.z + Math.cos(a0) * r;
  const tx = Math.cos(a0);
  const tz = -Math.sin(a0);
  const sx = px - tx * 10;
  const sz = pz - tz * 10;
  out.unshift(along(sx, sz, px + tx * 0.8, pz + tz * 0.8, 2.6, { ceil: G.rotunda.ceil, mat: "lawn", wall: "plaster", lights: 0, floor: { ax: sx, az: sz, bx: px, bz: pz, ha: 0, hb: h } }));
  return out;
}

/** the white rooms: a 4 × 4 maze of partitions; door = a gap in the middle, wall = closed, none = no partition */
type Seg = "door" | "wall" | "none";
const MAZE = {
  cols: [30.5, 40, 49.5] as const,
  rows: [-148, -158, -168] as const,
  v: [["door", "wall", "door", "door"], ["wall", "door", "wall", "door"], ["door", "door", "wall", "wall"]] as Seg[][],
  h: [["wall", "door", "door", "wall"], ["door", "wall", "door", "door"], ["door", "door", "wall", "door"]] as Seg[][],
};
function partitions(): Solid[] {
  const out: Solid[] = [];
  const x0 = G.white.x - G.white.w / 2;
  const z0 = G.white.z + G.white.d / 2;
  const cell = { w: G.white.w / 4, d: G.white.d / 4 };
  const wall = (cx: number, cz: number, w: number, d: number) => out.push({ kind: "box", x: cx, z: cz, w, d, mat: "plaster" });
  MAZE.cols.forEach((x, i) =>
    MAZE.v[i].forEach((seg, k) => {
      const za = z0 - k * cell.d;
      const zb = za - cell.d;
      if (seg === "wall") wall(x, (za + zb) / 2, 0.2, cell.d + 0.2);
      else if (seg === "door") {
        const half = (cell.d - 1.3) / 2;
        wall(x, za - half / 2, 0.2, half + 0.2);
        wall(x, zb + half / 2, 0.2, half + 0.2);
      }
    }),
  );
  MAZE.rows.forEach((z, i) =>
    MAZE.h[i].forEach((seg, k) => {
      const xa = x0 + k * cell.w;
      const xb = xa + cell.w;
      if (seg === "wall") wall((xa + xb) / 2, z, cell.w + 0.2, 0.2);
      else if (seg === "door") {
        const half = (cell.w - 1.3) / 2;
        wall(xa + half / 2, z, half + 0.2, 0.2);
        wall(xb - half / 2, z, half + 0.2, 0.2);
      }
    }),
  );
  return out;
}

const shapes: Shape[] = [
  /* corridors first: rooms placed after them win where they overlap */
  room(-26, -17, 22.6, 4, { ceil: 3, mat: "carpet", wall: "wallpaper", ceilMat: "sky", lights: 3.6, dead: 0.3 }), // stage -> blocks
  room(-33, -25, 4, 20.4, { ceil: 3, mat: "carpet", wall: "wallpaper", ceilMat: "sky", lights: 3.6, dead: 0.3 }),
  room(18.5, -17, 8, 4, { ceil: 3, mat: "carpet", wall: "wallpaper", ceilMat: "sky", lights: 3, dead: 0.2 }), // stage -> bedroom
  room(-18.5, -44, 4.4, 4, { ceil: 3, mat: "carpet", wall: "wallpaper", ceilMat: "sky", lights: 0 }), // blocks -> pit
  room(52, -72, 12.6, 3, { ceil: 3, mat: "stain", ...white, lights: 4, dead: 0.25 }), // route B: purple room -> white rooms
  room(58, -105, 3, 67, { ceil: 3, mat: "stain", ...white, lights: 4, dead: 0.3 }),
  { kind: "box", x: -46.5, z: P.vent.z, w: 6, d: 1.3, ceil: 1.1, mat: "concrete", wall: "concrete", ceilMat: "concrete", lights: 0 }, // the vent (crawl)
  room(-50.3, -79, 2.4, 56, { ceil: 5.6, mat: "concrete", wall: "concrete", ceilMat: "concrete", lights: 6, dead: 0.5, floor: { ax: -50.3, az: -60, bx: -50.3, bz: -100, ha: 0, hb: G.lookout.h } }), // route C
  room(G.mouth.x, G.mouth.z, G.mouth.w, G.mouth.d, { ceil: 3, mat: "lawn", ...white, lights: 0 }), // route A: the round hole
  room(20, -111.5, 7, 4, { ceil: 2.2, mat: "tile", wall: "tile", ceilMat: "tile", lights: 0 }), // low passage to the pool
  room(15.5, -163, 12, 4, { ceil: 2.8, mat: "stain", ...white, lights: 3 }), // garden -> white rooms
  room(26, -179.5, 3, 4, { ceil: 2.8, mat: "stain", ...white, lights: 0 }), // white rooms -> hole room
  room(17, -181.5, 18, 4, { ceil: 2.8, mat: "stain", ...white, lights: 3 }),
  room(-26, -113.5, 12, 5, { ceil: 6, mat: "lawn", ...white, lights: 0, floor: { ax: -20, az: -113.5, bx: -32, bz: -113.5, ha: 0, hb: G.lookout.h } }), // up to the lookout

  /* zone 1 */
  room(P.stage.x, P.stage.z, P.stage.w, P.stage.d, { ceil: P.stage.ceil, mat: "lawn", ...sky }),
  room(P.backstage.x, P.backstage.z, P.backstage.w, P.backstage.d, { ceil: 7, mat: "wood", wall: "panel", ceilMat: "concrete", lights: 0 }),
  // the slit and the gate: a piece as high as the stage first (so the drop in the ceiling hides behind the cloth)
  room(BACKDROP.slit.x, P.stage.z - P.stage.d / 2, BACKDROP.slit.w, 0.8, { ceil: P.stage.ceil, mat: "lawn", ...sky }),
  room(BACKDROP.slit.x, -25.75, BACKDROP.slit.w, 1.3, { ceil: BACKDROP.slit.h, mat: "wood", wall: "panel", ceilMat: "concrete", lights: 0 }),
  room(0, P.stage.z - P.stage.d / 2, BACKDROP.gate.w + 0.4, 0.8, { ceil: P.stage.ceil, mat: "lawn", ...sky }),
  room(0, -28.85, BACKDROP.gate.w + 0.4, 7.7, { ceil: BACKDROP.gate.h, mat: "wood", ...sky }), // through the gate to the pit
  room(P.bedroom.x, P.bedroom.z, P.bedroom.w, P.bedroom.d, { ceil: P.bedroom.ceil, mat: "wood", wall: "wallpaper", ceilMat: "sky", lights: 0 }),
  { kind: "box", x: 33.5, z: -32.1, w: 1.1, d: 1.6, ceil: 1.1, mat: "wood", wall: "wallpaper", ceilMat: "sky", lights: 0 }, // the little door (crawl)
  ...P.steps.map((s): Shape => ({ kind: "box", x: s.x, z: s.z, w: 1.6, d: 1.6, floor: s.h, ceil: P.bedroom.ceil, mat: "wood", wall: "panel", rails: false, lights: 0 })),
  room(P.bed.x, P.bed.z, P.bed.w, P.bed.d, { floor: P.bed.top, ceil: P.bedroom.ceil, mat: "carpet", wall: "panel", rails: false, lights: 0 }),
  room(P.blocks.x, P.blocks.z, P.blocks.w, P.blocks.d, { ceil: 7, mat: "lawn", ...sky }),
  { kind: "box", x: P.pit.x, z: P.pit.z, w: P.pit.w, d: P.pit.d, round: P.pit.round, floor: -0.4, ceil: 7, mat: "void", ...sky, slow: 0.45, drop: true },
  room(P.clouds.x, P.clouds.z, P.clouds.w, P.clouds.d, { ceil: 3.2, mat: "carpet", ...sky }),
  room(P.purple.x, P.purple.z, P.purple.w, P.purple.d, { ceil: P.purple.ceil, mat: "carpet", wall: "panel", ceilMat: "concrete", lights: 0 }),
  room(34, -73.5, 14, 3, { ceil: P.purple.ceil, mat: "carpet", wall: "panel", ceilMat: "concrete", lights: 0, floor: { ax: 41, az: -73.5, bx: 27, bz: -73.5, ha: 0, hb: P.balcony.h } }),
  room(P.balcony.x, P.balcony.z, P.balcony.w, P.balcony.d, { floor: P.balcony.h, ceil: P.purple.ceil, mat: "carpet", wall: "panel", ceilMat: "concrete", lights: 0 }),
  room((P.slide.x0 + P.slide.x1) / 2, P.slide.z, P.slide.x0 - P.slide.x1, 2.4, { ceil: 5.6, mat: "wood", wall: "panel", ceilMat: "concrete", lights: 0, rails: false, floor: { ax: P.slide.x0, az: P.slide.z, bx: P.slide.x1 + 1, bz: P.slide.z, ha: P.balcony.h, hb: 0.6 } }),
  room(P.tunnel.x, P.tunnel.z, P.tunnel.w, P.tunnel.d, { ceil: P.tunnel.ceil, mat: "lawn", ...sky }),

  /* zone 2 */
  { kind: "circle", x: G.rotunda.x, z: G.rotunda.z, r: G.rotunda.r + 1, ceil: G.rotunda.ceil, mat: "lawn", ...white, lights: 5.5 },
  ...Array.from({ length: 12 }, (_, k): Shape => ({
    kind: "circle",
    x: G.rotunda.x + Math.sin((k * Math.PI) / 6) * G.rotunda.r,
    z: G.rotunda.z + Math.cos((k * Math.PI) / 6) * G.rotunda.r,
    r: G.rotunda.lobe,
    ceil: G.rotunda.ceil,
    mat: "lawn",
    ...white,
    lights: 0,
  })),
  ...ring(),
  room(G.garden.x, G.garden.z, G.garden.w, G.garden.d, { ceil: G.garden.ceil, mat: "lawn", ...white, lights: 0 }),
  room(G.pool.x, G.pool.z, G.pool.w, G.pool.d, { ceil: 6, mat: "tile", wall: "tile", ceilMat: "tile", lights: 0 }),
  room(G.basin.x, G.basin.z, G.basin.w, G.basin.d, { floor: -0.4, ceil: 6, mat: "tile", wall: "tile", ceilMat: "tile", lights: 0, slow: 0.6 }),
  room(G.white.x, G.white.z, G.white.w, G.white.d, { ceil: 2.9, mat: "stain", ...white, lights: 3.2, dead: 0.25 }),
  room(G.lookout.x, G.lookout.z, G.lookout.w, G.lookout.d, { floor: G.lookout.h, ceil: G.lookout.h + 6, mat: "wood", ...white, lights: 4.5 }),
  room(G.holeRoom.x, G.holeRoom.z, G.holeRoom.w, G.holeRoom.d, { ceil: 3.4, mat: "lawn", ...white, lights: 3.2 }),
  { kind: "circle", x: G.hole.x, z: G.hole.z, r: G.hole.r, floor: -0.35, ceil: 3.4, mat: "void", ...white, lights: 0 },
];

const solids: Solid[] = [
  // the fence before the backdrop (drawn by the scene), with a gap at the gate
  ...[-1, 1].map((s): Solid => {
    const inner = BACKDROP.gate.w / 2;
    const outer = 12.5;
    return { kind: "box", x: s * (inner + outer) / 2, z: BACKDROP.fence, w: outer - inner, d: 0.1, h: 0.95, ghost: true };
  }),
  { kind: "circle", x: P.carousel.x, z: P.carousel.z, r: P.carousel.r, ghost: true },
  { kind: "box", x: P.table.x, z: P.table.z, w: P.table.w, d: P.table.d, h: P.table.h, ghost: true },
  { kind: "circle", x: P.tower.x, z: P.tower.z, r: P.tower.r, ghost: true },
  // toppled blocks in the corner, half hiding the vent
  { kind: "box", x: -42.4, z: -50, w: 1.6, d: 1.6, a: 0.4, h: 1.5, ghost: true },
  { kind: "box", x: -41.6, z: -54.4, w: 1.6, d: 1.6, a: -0.3, h: 1.5, ghost: true },
  { kind: "box", x: -38, z: -36, w: 1.6, d: 1.6, a: 0.7, h: 1.5, ghost: true },
  { kind: "box", x: -24.5, z: -50.5, w: 1.6, d: 1.6, a: 0.2, h: 1.5, ghost: true },
  { kind: "circle", x: G.turbine.x, z: G.turbine.z, r: 0.35, ghost: true },
  // the lookout's big window: glass you cannot walk through
  { kind: "box", x: G.hillsWindow.x + 0.2, z: G.hillsWindow.z, w: 0.3, d: G.hillsWindow.w, ghost: true },
  ...partitions(),
];

export const PLAY_SPACE = new Space(shapes, solids);
export const playBuilt = lazyBuilt(PLAY_SPACE);
export const PLAY_SPAWN = { x: 0, z: -8, yaw: 0 };
/** falling: stepping into the rabbit hole, at the far end of the gardens */
export const PLAY_FALL = box(G.hole.x, G.hole.z, 1.4, 1.4);
/** where each part sounds different (Zone.ambienceAt) */
export function playAmbience(x: number, z: number) {
  if (z > -86) {
    if (x > 21 && z < -49) return "purple" as const;
    if (x < -2 && z < -25.3 && z > -29.8) return "quiet" as const;
    return undefined; // the nursery
  }
  if (x > 20.5 && z > -126 && z < -98) return "water" as const;
  if (x > 9 && z < -136) return "quiet" as const;
  return "garden" as const;
}
export const PLAY_IDS = { nightlight: "dc-nightlight", phone: "dc-phone" };
