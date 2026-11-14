import { BoxGeometry, BufferAttribute, BufferGeometry, ShapeUtils, Vector2 } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { contourSetSteps, contourSteps, loopArea, pointInLoop, type Pt } from "./contour";
import { drain, sliced, type Budget, type Steps } from "./slice";
import { floorAt, geomBounds, geomDist, type Geom, type Space, type Surface, type WallSurface } from "./sdf";

/** world-metre size of one texture repeat, per material */
export const TILE: Record<string, number> = {
  wallpaper: 2, tile: 0.9, concrete: 3, plaster: 3, panel: 1.2, sky: 7, lawn: 5,
  carpet: 3, stain: 3, wood: 2.4, marble: 2.5, void: 3, ceiling: 1.2, trim: 1,
};

const STEP = 0.4; // contour resolution, metres
const EPS = 0.05;

/** growable geometry buffers for one material */
class Builder {
  pos: number[] = [];
  nor: number[] = [];
  uv: number[] = [];
  col: number[] = [];
  idx: number[] = [];
  vert(x: number, y: number, z: number, nx: number, ny: number, nz: number, u: number, v: number, c = 1) {
    this.pos.push(x, y, z);
    this.nor.push(nx, ny, nz);
    this.uv.push(u, v);
    this.col.push(c, c, c);
    return this.pos.length / 3 - 1;
  }
  quad(a: number, b: number, c: number, d: number) {
    this.idx.push(a, b, c, a, c, d);
  }
  geometry(): BufferGeometry | null {
    if (!this.idx.length) return null;
    const g = new BufferGeometry();
    g.setAttribute("position", new BufferAttribute(new Float32Array(this.pos), 3));
    g.setAttribute("normal", new BufferAttribute(new Float32Array(this.nor), 3));
    g.setAttribute("uv", new BufferAttribute(new Float32Array(this.uv), 2));
    g.setAttribute("color", new BufferAttribute(new Float32Array(this.col), 3));
    g.setIndex(this.idx);
    g.computeBoundingSphere();
    return g;
  }
}

class Bins {
  private map = new Map<string, Builder>();
  get(k: string) {
    let b = this.map.get(k);
    if (!b) this.map.set(k, (b = new Builder()));
    return b;
  }
  geometries() {
    const out = new Map<string, BufferGeometry>();
    for (const [k, b] of this.map) {
      const g = b.geometry();
      if (g) out.set(k, g);
    }
    return out;
  }
}

/**
 * A vertical strip between two points, from y0 to y1 (both may vary along the strip), facing normal (nx, nz).
 * Shaded darker at its foot and its top: cheap ambient occlusion baked in vertex colours.
 */
function strip(b: Builder, ax: number, az: number, bx: number, bz: number, ya: [number, number], yb: [number, number], nx: number, nz: number, u0: number, u1: number, tile: number, ao = true) {
  const rows = ao ? [0, 0.6, -0.5, 1] : [0, 1];
  const ys = (lo: number, hi: number) =>
    rows.map((r, k) => (k === 0 ? lo : k === rows.length - 1 ? hi : r > 0 ? Math.min(hi, lo + r) : Math.max(lo, hi + r)));
  const shade = ao ? [0.5, 1, 1, 0.78] : [1, 1];
  const yA = ys(ya[0], ya[1]);
  const yB = ys(yb[0], yb[1]);
  const ia: number[] = [];
  const ib: number[] = [];
  for (let k = 0; k < rows.length; k++) {
    ia.push(b.vert(ax, yA[k], az, nx, 0, nz, u0, yA[k] / tile, shade[k]));
    ib.push(b.vert(bx, yB[k], bz, nx, 0, nz, u1, yB[k] / tile, shade[k]));
  }
  // winding so the face points along (nx, nz)
  // (a0, b0, b1) has normal (-dz, dx): keep that order when it matches (nx, nz), reverse it otherwise
  const facing = (bx - ax) * nz - (bz - az) * nx;
  for (let k = 0; k < rows.length - 1; k++) {
    if (facing > 0) b.quad(ia[k], ib[k], ib[k + 1], ia[k + 1]);
    else b.quad(ib[k], ia[k], ia[k + 1], ib[k + 1]);
  }
}

/** Oriented thin boxes merged together (railings, posts, ledges). */
export type Piece = { x: number; y: number; z: number; w: number; h: number; d: number; a?: number };
export function piecesGeometry(pieces: Piece[], tile = 1): BufferGeometry | null {
  if (!pieces.length) return null;
  const parts = pieces.map(({ x, y, z, w, h, d, a }) => {
    const g = new BoxGeometry(w, h, d);
    const uv = g.attributes.uv;
    const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
    for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) uv.setXY(f * 4 + k, (uv.getX(f * 4 + k) * dims[f][0]) / tile, (uv.getY(f * 4 + k) * dims[f][1]) / tile);
    g.deleteAttribute("color");
    if (a) g.rotateY(a);
    g.translate(x, y + h / 2, z);
    return g;
  });
  const merged = mergeGeometries(parts);
  parts.forEach((p) => p.dispose());
  return merged;
}

export type Panel = { x: number; y: number; z: number; a: number; size: [number, number]; dead: boolean };

export type Built = {
  walls: Map<string, BufferGeometry>; // by wall surface
  trim: BufferGeometry | null;
  floors: Map<string, BufferGeometry>; // by floor surface
  ceilings: Map<string, BufferGeometry>; // by ceiling surface
  rails: BufferGeometry | null;
  panels: Panel[];
};

const ceilingSurface = (s: Surface | undefined) => (s === "tile" ? "tile" : s === "concrete" ? "concrete" : s === "marble" ? "plaster" : "ceiling");

/** a wall face with its baseboard, a hair in front of it */
function wallFace(b: Builder, trim: Builder, ax: number, az: number, bx: number, bz: number, ya: [number, number], yb: [number, number], nx: number, nz: number, u: number, tile: number) {
  const len = Math.hypot(bx - ax, bz - az);
  strip(b, ax, az, bx, bz, ya, yb, nx, nz, u / tile, (u + len) / tile, tile);
  strip(trim, ax + nx * 0.015, az + nz * 0.015, bx + nx * 0.015, bz + nz * 0.015, [ya[0], ya[0] + 0.12], [yb[0], yb[0] + 0.12], nx, nz, u, u + len, 1, false);
}

/** the exact outline of a solid, as a convex polygon (circles and capsule ends with enough sides to look round) */
export function solidOutline(g: Geom): Pt[] {
  const turn = (lx: number, lz: number, a: number, x: number, z: number): Pt => {
    const c = Math.cos(a);
    const s = Math.sin(a);
    return [x + lx * c + lz * s, z - lx * s + lz * c];
  };
  switch (g.kind) {
    case "box":
      return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sz]) => turn((sx * g.w) / 2, (sz * g.d) / 2, g.a ?? 0, g.x, g.z));
    case "circle": {
      const n = Math.max(12, Math.min(40, Math.round(g.r * 24)));
      return Array.from({ length: n }, (_, k) => [g.x + g.r * Math.cos((k * 2 * Math.PI) / n), g.z + g.r * Math.sin((k * 2 * Math.PI) / n)] as Pt);
    }
    case "ngon":
      return Array.from({ length: g.n }, (_, k) => {
        const t = (2 * k * Math.PI) / g.n; // the corners of the distance function above
        return turn(g.r * Math.sin(t), g.r * Math.cos(t), g.a ?? 0, g.x, g.z);
      });
    case "capsule": {
      const a = Math.atan2(g.bz - g.az, g.bx - g.ax);
      const pts: Pt[] = [];
      for (let k = 0; k <= 8; k++) pts.push([g.bx + g.r * Math.cos(a - Math.PI / 2 + (k * Math.PI) / 8), g.bz + g.r * Math.sin(a - Math.PI / 2 + (k * Math.PI) / 8)]);
      for (let k = 0; k <= 8; k++) pts.push([g.ax + g.r * Math.cos(a + Math.PI / 2 + (k * Math.PI) / 8), g.az + g.r * Math.sin(a + Math.PI / 2 + (k * Math.PI) / 8)]);
      return pts;
    }
  }
}

/** Everything visible of a place, derived from its distance field. Pure: run once, cache the result. */
export function buildSpace(space: Space): Built {
  return drain(buildSteps(space));
}

/** the same, a few milliseconds per frame: the dream keeps running while a place is being built */
export function buildSpaceAsync(space: Space, budget?: Budget): Promise<Built> {
  return sliced(buildSteps(space), budget);
}

function* buildSteps(space: Space): Steps<Built> {
  const walls = new Bins();
  const flats = new Bins(); // floors "f:<surface>", ceilings "c:<surface>"
  const trim = new Builder();
  const rails: Piece[] = [];
  const panels: Panel[] = [];
  const [bx0, bz0, bx1, bz1] = space.bounds;
  const inward = (x: number, z: number, nx: number, nz: number) => [x + nx * 0.15, z + nz * 0.15] as const;

  /**
   * One wall face from a to b, facing (nx, nz), following the floor and ceiling of the rooms it faces. Where it runs
   * along two rooms of different heights, it goes in short pieces, each from the lower floor up to the higher
   * ceiling: a top interpolated from one height to the other would leave a triangle open onto the void.
   */
  const side = (ax: number, az: number, bx: number, bz: number, nx: number, nz: number, u: number, look: (owner: number) => WallSurface, cap?: number) => {
    const len = Math.hypot(bx - ax, bz - az);
    const ends = (x: number, z: number) => {
      // the room this end faces; at a bevelled corner the first sample may still fall outside, so look further in
      let px = x;
      let pz = z;
      let o = -1;
      for (const d of [0.15, 0.35, 0.6]) {
        px = x + nx * d;
        pz = z + nz * d;
        o = space.ownerIndex(px, pz);
        if (o >= 0) break;
      }
      if (o < 0) return null;
      const lo = space.ground(px, pz);
      let hi = space.ceiling(px, pz);
      if (space.shapes[o].open) hi = Math.max(hi, lo + 8);
      if (cap !== undefined) hi = Math.min(hi, lo + cap);
      return { o, lo, hi };
    };
    // a metre at a time (a long straight wall may run along several rooms), a quarter where the room changes
    const cuts: number[] = [];
    const coarse = Math.max(1, Math.ceil(len));
    for (let c = 0; c < coarse; c++) {
      const t0 = c / coarse;
      const t1 = (c + 1) / coarse;
      const e0 = ends(ax + (bx - ax) * t0, az + (bz - az) * t0);
      const e1 = ends(ax + (bx - ax) * t1, az + (bz - az) * t1);
      const mid = ends(ax + (bx - ax) * ((t0 + t1) / 2), az + (bz - az) * ((t0 + t1) / 2));
      const same = e0 && e1 && mid && e0.o === e1.o && mid.o === e0.o;
      const fine = same ? 1 : Math.max(1, Math.ceil((len / coarse) / 0.25));
      for (let f = 0; f < fine; f++) cuts.push(t0 + ((t1 - t0) * f) / fine);
    }
    cuts.push(1);
    for (let p = 0; p < cuts.length - 1; p++) {
      const x0 = ax + (bx - ax) * cuts[p];
      const z0 = az + (bz - az) * cuts[p];
      const x1 = ax + (bx - ax) * cuts[p + 1];
      const z1 = az + (bz - az) * cuts[p + 1];
      const a = ends(x0, z0);
      const b = ends(x1, z1);
      const u0 = u + len * cuts[p];
      if (!a && !b) continue;
      let ya: [number, number];
      let yb: [number, number];
      if (a && b && a.o === b.o) {
        ya = [a.lo, a.hi];
        yb = [b.lo, b.hi];
      } else {
        const ends2 = [a, b].filter((e) => e !== null);
        const lo = Math.min(...ends2.map((e) => e.lo));
        const hi = Math.max(...ends2.map((e) => e.hi));
        ya = [lo, hi];
        yb = [lo, hi];
      }
      const wall = look((a ?? b)!.o);
      wallFace(walls.get(wall), trim, x0, z0, x1, z1, ya, yb, nx, nz, u0, TILE[wall]);
    }
  };
  const roomWall = (o: number): WallSurface => space.shapes[o].wall ?? "wallpaper";

  /* ---- outer walls: the outline of the rooms (solids are drawn from their exact shape below) ---- */
  const outline = space.walls ? yield* contourSteps((x, z) => space.roomDist(x, z), bx0, bz0, bx1, bz1, STEP) : [];
  yield;
  for (const loop of outline) {
    let u = 0;
    for (let k = 0; k < loop.length; k++) {
      const [ax, az] = loop[k];
      const [bx, bz] = loop[(k + 1) % loop.length];
      const len = Math.hypot(bx - ax, bz - az);
      if (len < 1e-4) continue;
      side(ax, az, bx, bz, (bz - az) / len, -(bx - ax) / len, u, roomWall); // inside is on (dz, -dx)
      u += len;
    }
  }

  /* ---- solids (pillars, partitions, houses): their exact outline, so what you see is what stops you ---- */
  for (const so of space.solids) {
    yield;
    if (so.ghost) continue;
    const poly = solidOutline(so);
    const others = space.solids.filter((o) => o !== so);
    let u = 0;
    for (let k = 0; k < poly.length; k++) {
      const [x0, z0] = poly[k];
      const [x1, z1] = poly[(k + 1) % poly.length];
      const len = Math.hypot(x1 - x0, z1 - z0);
      if (len < 1e-4) continue;
      let nx = (z1 - z0) / len;
      let nz = -(x1 - x0) / len;
      if (geomDist(so, (x0 + x1) / 2 + nx * 0.05, (z0 + z1) / 2 + nz * 0.05) < 0) { nx = -nx; nz = -nz; } // face outwards
      // in pieces of a metre at most: each follows the floor and ceiling of the room it faces, and hidden ones go
      const pieces = Math.max(1, Math.ceil(len / 1));
      for (let p = 0; p < pieces; p++) {
        const ax = x0 + ((x1 - x0) * p) / pieces;
        const az = z0 + ((z1 - z0) * p) / pieces;
        const bx = x0 + ((x1 - x0) * (p + 1)) / pieces;
        const bz = z0 + ((z1 - z0) * (p + 1)) / pieces;
        const [mx, mz] = inward((ax + bx) / 2, (az + bz) / 2, nx, nz);
        // hidden: outside the rooms, or inside another solid that goes all the way up (a low partition hides nothing above it)
        if (space.roomDist(mx, mz) >= 0 || others.some((o) => o.h === undefined && !o.ghost && geomDist(o, mx, mz) < 0)) { u += len / pieces; continue; }
        side(ax, az, bx, bz, nx, nz, u, (o) => so.mat ?? roomWall(o), so.h);
        u += len / pieces;
      }
    }
    if (so.h === undefined) continue;
    // a solid that stops below the ceiling gets a top
    const wall = so.mat ?? "wallpaper";
    const tile = TILE[wall];
    const [cx, cz] = poly.reduce(([x, z], [px, pz]) => [x + px / poly.length, z + pz / poly.length], [0, 0]);
    const y = space.ground(cx, cz) + so.h;
    const b = walls.get(wall);
    const idx = poly.map(([x, z]) => b.vert(x, y, z, 0, 1, 0, x / tile, z / tile, 0.9));
    for (let k = 1; k < poly.length - 1; k++) {
      const [ax, az] = poly[0];
      const [px, pz] = poly[k];
      const [qx, qz] = poly[k + 1];
      const up = (px - ax) * (qz - az) - (pz - az) * (qx - ax) < 0;
      b.idx.push(idx[0], up ? idx[k] : idx[k + 1], up ? idx[k + 1] : idx[k]);
    }
  }

  /* ---- each shape's own floor and ceiling, cut where later shapes take over ---- */
  for (let i = 0; i < space.shapes.length; i++) {
    const s = space.shapes[i];
    yield;
    const [x0, z0, x1, z1] = geomBounds(s);
    // the shape, plus a 12 cm band beyond the outer walls (hidden behind them: no crack of void at the foot of a wall,
    // where the outline of the rooms and this shape's own outline are traced a little apart), minus later shapes
    // Three fields over the same grid, sampled in one pass (each neighbouring room measured once):
    // [0] the shape's own region (for its boundary faces);
    // [1] its floor, [2] its ceiling: the same, but running 10 cm on under a higher floor (above a lower ceiling) of
    //     the next room, hidden there, so no hairline crack of void is left where two rooms of different heights
    //     meet. That band sits 4 mm back, so where both are at the same height the later room stays on top.
    const BAND = 0.1;
    const fl = (x: number, z: number) => floorAt(s.floor, x, z);
    const fields = (x: number, z: number, out: number[]) => {
      const d = geomDist(s, x, z);
      const f = fl(x, z);
      let room = 10;
      let later = 10;
      let under = 10;
      let notUnder = 10;
      let above = 10;
      let notAbove = 10;
      for (const j of space.nearShapes(x, z)) {
        const o = space.shapes[j];
        const dj = j === i ? d : geomDist(o, x, z);
        if (dj < room) room = dj;
        if (j <= i) continue;
        if (dj < later) later = dj;
        if (floorAt(o.floor, x, z) >= f - 0.01) under = Math.min(under, dj);
        else notUnder = Math.min(notUnder, dj);
        if (o.open || o.ceil <= s.ceil + 0.01) above = Math.min(above, dj);
        else notAbove = Math.min(notAbove, dj);
      }
      // the shape, plus a 12 cm band beyond the outer walls (hidden behind them: no crack at the foot of a wall)
      const base = Math.min(d, Math.max(d - 0.12, -room));
      out[0] = Math.max(base, -later);
      out[1] = Math.max(base, -notUnder, -under - BAND);
      out[2] = Math.max(base, -notAbove, -above - BAND);
    };
    const [loops, floorLoops, ceilLoops] = yield* contourSetSteps(fields, 3, x0 - STEP * 2, z0 - STEP * 2, x1 + STEP * 2, z1 + STEP * 2, STEP);
    if (!loops.length) continue;
    const surface = (outline: Pt[][], b: Builder, y: (x: number, z: number) => number, ny: number, tile: number) => {
      const outers = outline.filter((l) => loopArea(l) < 0);
      const holes = outline.filter((l) => loopArea(l) >= 0);
      for (const outer of outers) {
        const mine = holes.filter((h) => pointInLoop(h[0], outer));
        const tris = ShapeUtils.triangulateShape(outer.map(([x, z]) => new Vector2(x, z)), mine.map((h) => h.map(([x, z]) => new Vector2(x, z))));
        const all = [...outer, ...mine.flat()];
        const idx = all.map(([x, z]) => b.vert(x, y(x, z) - (space.laterDist(i, x, z) < -0.005 ? ny * 0.004 : 0), z, 0, ny, 0, x / tile, z / tile));
        for (const [a, c, d] of tris) {
          // facing up (floors) or down (ceilings)
          const [ax, az] = all[a];
          const [cx, cz] = all[c];
          const [dx, dz] = all[d];
          const up = (cx - ax) * (dz - az) - (cz - az) * (dx - ax) < 0;
          b.idx.push(idx[a], up === ny > 0 ? idx[c] : idx[d], up === ny > 0 ? idx[d] : idx[c]);
        }
      }
    };
    surface(floorLoops, flats.get(`f:${s.mat ?? "carpet"}`), fl, 1, TILE[s.mat ?? "carpet"]);
    const ck = s.ceilMat ?? ceilingSurface(s.mat);
    if (!s.open) surface(ceilLoops, flats.get(`c:${ck}`), () => s.ceil, -1, TILE[ck]);

    /* ---- where a later shape takes over: soffits, risers, railings ---- */
    for (const loop of loops) {
      // in pieces of a metre at most: a long straight side may border several rooms, each with its own heights
      const pieces: [number, number, number, number][] = [];
      for (let k = 0; k < loop.length; k++) {
        const [ax, az] = loop[k];
        const [bx, bz] = loop[(k + 1) % loop.length];
        const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az)));
        for (let p = 0; p < n; p++) pieces.push([ax + ((bx - ax) * p) / n, az + ((bz - az) * p) / n, ax + ((bx - ax) * (p + 1)) / n, az + ((bz - az) * (p + 1)) / n]);
      }
      for (const [x0, z0, x1, z1] of pieces) {
        const len = Math.hypot(x1 - x0, z1 - z0);
        if (len < 1e-4) continue;
        const mx = (x0 + x1) / 2;
        const mz = (z0 + z1) / 2;
        const nx = (z1 - z0) / len; // pointing into this shape's region
        const nz = -(x1 - x0) / len;
        // another room on the other side? (also along the shape's own outline: the outlines of neighbouring rooms are
        // traced separately and may lie a little apart, so both sides draw their faces, a centimetre into their own room)
        const j = space.ownerIndex(mx - nx * 0.15, mz - nz * 0.15);
        if (j < 0 || j === i || space.dist(mx - nx * 0.15, mz - nz * 0.15) > -0.02) continue;
        const own = geomDist(s, mx, mz) > -EPS;
        const ax = x0 + nx * 0.01;
        const az = z0 + nz * 0.01;
        const bx = x1 + nx * 0.01;
        const bz = z1 + nz * 0.01;
        const o = space.shapes[j];
        const fi = (x: number, z: number) => floorAt(s.floor, x, z);
        const fj = (x: number, z: number) => floorAt(o.floor, x, z);
        const wall = s.wall ?? "wallpaper";
        const tile = TILE[wall];
        // ceilings: a vertical face from the lower ceiling to the higher one, facing the taller room
        if (!s.open && !o.open && Math.abs(s.ceil - o.ceil) > 0.02) {
          const lo = Math.min(s.ceil, o.ceil);
          const hi = Math.max(s.ceil, o.ceil);
          const sign = s.ceil > o.ceil ? 1 : -1;
          strip(walls.get(wall), ax, az, bx, bz, [lo, hi], [lo, hi], nx * sign, nz * sign, 0, len / tile, tile, false);
        } else if (s.open !== o.open) {
          // open sky next to a ceiling: the wall goes on above the roofed side, like the outer walls of an open room
          const roofed = s.open ? o : s;
          const sky = s.open ? s : o;
          const lo = roofed.ceil;
          const hi = Math.max(lo, floorAt(sky.floor, mx, mz) + 8);
          const sign = s.open ? 1 : -1;
          strip(walls.get(wall), ax, az, bx, bz, [lo, hi], [lo, hi], nx * sign, nz * sign, 0, len / tile, tile, false);
        }
        // floors: a riser facing the lower side, and a railing on the higher side for real drops
        const ha = [fi(ax, az), fj(ax, az)];
        const hb = [fi(bx, bz), fj(bx, bz)];
        if (Math.abs(ha[0] - ha[1]) > 0.04 || Math.abs(hb[0] - hb[1]) > 0.04) {
          const sign = ha[0] < ha[1] ? 1 : -1;
          strip(walls.get(o.wall ?? wall), ax, az, bx, bz, [Math.min(...ha), Math.max(...ha)], [Math.min(...hb), Math.max(...hb)], nx * sign, nz * sign, 0, len / tile, tile, false);
          const drop = Math.max(Math.abs(ha[0] - ha[1]), Math.abs(hb[0] - hb[1]));
          if (drop > 0.6 && !own) {
            const top = Math.max(...ha, ...hb);
            const a = Math.atan2(-(bz - az), bx - ax);
            rails.push({ x: mx, y: top + 0.92, z: mz, w: len, h: 0.06, d: 0.06, a });
            rails.push({ x: mx, y: top, z: mz, w: len, h: 0.07, d: 0.05, a });
            for (let t = 0.2; t < len; t += 1.2) rails.push({ x: ax + ((bx - ax) * t) / len, y: top, z: az + ((bz - az) * t) / len, w: 0.05, h: 0.95, d: 0.05 });
          }
        }
      }
    }

    /* ---- ceiling lights, aligned with the shape ---- */
    if (s.lights && !s.open) {
      const a = "a" in s && s.a ? s.a : s.kind === "capsule" ? Math.atan2(-(s.bz - s.az), s.bx - s.ax) : 0;
      const spacing = s.lights;
      const cx = s.kind === "capsule" ? (s.ax + s.bx) / 2 : s.x;
      const cz = s.kind === "capsule" ? (s.az + s.bz) / 2 : s.z;
      const reach = Math.hypot(x1 - x0, z1 - z0) / 2;
      const c = Math.cos(a);
      const sn = Math.sin(a);
      let seed = (i + 1) * 9301;
      const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
      for (let u = -reach; u <= reach; u += spacing) for (let v = -reach; v <= reach; v += spacing) {
        const x = cx + u * c + v * sn;
        const z = cz - u * sn + v * c;
        if (space.ownerIndex(x, z) !== i || !space.fits(x, z, 0.7)) continue;
        const big = s.ceil > 6;
        panels.push({ x, y: s.ceil - 0.02, z, a, size: big ? [1.6, 1.6] : [1.2, 0.6], dead: rnd() < (s.dead ?? 0.12) });
      }
    }
  }

  const flat = [...flats.geometries()];
  return {
    walls: walls.geometries(),
    trim: trim.geometry(),
    floors: new Map(flat.filter(([k]) => k.startsWith("f:")).map(([k, g]) => [k.slice(2), g])),
    ceilings: new Map(flat.filter(([k]) => k.startsWith("c:")).map(([k, g]) => [k.slice(2), g])),
    rails: piecesGeometry(rails),
    panels,
  };
}

export type { Pt };
