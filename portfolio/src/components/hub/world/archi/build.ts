import { BoxGeometry, BufferAttribute, BufferGeometry, ShapeUtils, Vector2 } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { contours, loopArea, pointInLoop, type Pt } from "./contour";
import { floorAt, geomBounds, geomDist, type Space, type Surface, type WallSurface } from "./sdf";

/** world-metre size of one texture repeat, per material */
export const TILE: Record<string, number> = {
  wallpaper: 2, tile: 0.9, concrete: 3, plaster: 3, panel: 1.2,
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

/** Everything visible of a place, derived from its distance field. Pure: run once, cache the result. */
export function buildSpace(space: Space): Built {
  const walls = new Bins();
  const flats = new Bins(); // floors "f:<surface>", ceilings "c:<surface>"
  const trim = new Builder();
  const rails: Piece[] = [];
  const panels: Panel[] = [];
  const [bx0, bz0, bx1, bz1] = space.bounds;
  const inward = (x: number, z: number, nx: number, nz: number) => [x + nx * 0.15, z + nz * 0.15] as const;

  /* ---- outer walls: the outline of the whole space ---- */
  for (const loop of contours((x, z) => space.dist(x, z), bx0, bz0, bx1, bz1, STEP)) {
    let u = 0;
    for (let k = 0; k < loop.length; k++) {
      const [ax, az] = loop[k];
      const [bx, bz] = loop[(k + 1) % loop.length];
      const len = Math.hypot(bx - ax, bz - az);
      if (len < 1e-4) continue;
      const nx = (bz - az) / len; // inside is on (dz, -dx)
      const nz = -(bx - ax) / len;
      const [pxa, pza] = inward(ax, az, nx, nz);
      const [pxb, pzb] = inward(bx, bz, nx, nz);
      const mi = space.ownerIndex((pxa + pxb) / 2, (pza + pzb) / 2);
      const wall: WallSurface = (mi >= 0 && space.shapes[mi].wall) || "wallpaper";
      const tile = TILE[wall];
      const ya: [number, number] = [space.ground(pxa, pza), space.ceiling(pxa, pza)];
      const yb: [number, number] = [space.ground(pxb, pzb), space.ceiling(pxb, pzb)];
      if (mi >= 0 && space.shapes[mi].open) { ya[1] = Math.max(ya[1], ya[0] + 8); yb[1] = Math.max(yb[1], yb[0] + 8); }
      strip(walls.get(wall), ax, az, bx, bz, ya, yb, nx, nz, u / tile, (u + len) / tile, tile);
      // baseboard, a hair in front of the wall
      strip(trim, ax + nx * 0.015, az + nz * 0.015, bx + nx * 0.015, bz + nz * 0.015, [ya[0], ya[0] + 0.12], [yb[0], yb[0] + 0.12], nx, nz, u, u + len, 1, false);
      u += len;
    }
  }

  /* ---- each shape's own floor and ceiling, cut where later shapes take over ---- */
  space.shapes.forEach((s, i) => {
    const [x0, z0, x1, z1] = geomBounds(s);
    const g = (x: number, z: number) => Math.max(geomDist(s, x, z), -space.laterDist(i, x, z));
    const loops = contours(g, x0 - STEP * 2, z0 - STEP * 2, x1 + STEP * 2, z1 + STEP * 2, STEP);
    if (!loops.length) return;
    const outers = loops.filter((l) => loopArea(l) < 0);
    const holes = loops.filter((l) => loopArea(l) >= 0);
    const floorKey = `f:${s.mat ?? "carpet"}`;
    const ceilKey = `c:${ceilingSurface(s.mat)}`;
    for (const outer of outers) {
      const mine = holes.filter((h) => pointInLoop(h[0], outer));
      const tris = ShapeUtils.triangulateShape(outer.map(([x, z]) => new Vector2(x, z)), mine.map((h) => h.map(([x, z]) => new Vector2(x, z))));
      const all = [...outer, ...mine.flat()];
      const fb = flats.get(floorKey);
      const ftile = TILE[s.mat ?? "carpet"];
      const fIdx = all.map(([x, z]) => fb.vert(x, floorAt(s.floor, x, z), z, 0, 1, 0, x / ftile, z / ftile));
      for (const [a, b, c] of tris) {
        // keep triangles facing up
        const [ax, az] = all[a];
        const [bx, bz] = all[b];
        const [cx, cz] = all[c];
        const up = (bx - ax) * (cz - az) - (bz - az) * (cx - ax) < 0;
        fb.idx.push(fIdx[a], up ? fIdx[b] : fIdx[c], up ? fIdx[c] : fIdx[b]);
      }
      if (!s.open) {
        const cb = flats.get(ceilKey);
        const ctile = TILE[ceilingSurface(s.mat)];
        const cIdx = all.map(([x, z]) => cb.vert(x, s.ceil, z, 0, -1, 0, x / ctile, z / ctile));
        for (const [a, b, c] of tris) {
          const [ax, az] = all[a];
          const [bx, bz] = all[b];
          const [cx, cz] = all[c];
          const up = (bx - ax) * (cz - az) - (bz - az) * (cx - ax) < 0;
          cb.idx.push(cIdx[a], up ? cIdx[c] : cIdx[b], up ? cIdx[b] : cIdx[c]);
        }
      }
    }

    /* ---- where a later shape takes over: soffits, risers, railings ---- */
    for (const loop of loops) {
      for (let k = 0; k < loop.length; k++) {
        const [ax, az] = loop[k];
        const [bx, bz] = loop[(k + 1) % loop.length];
        const len = Math.hypot(bx - ax, bz - az);
        if (len < 1e-4) continue;
        const mx = (ax + bx) / 2;
        const mz = (az + bz) / 2;
        if (geomDist(s, mx, mz) > -EPS) continue; // on the shape's own outline: an outer wall, done above
        if (space.dist(mx, mz) > -EPS) continue; // against a pillar or outside
        const nx = (bz - az) / len; // pointing into this shape's region
        const nz = -(bx - ax) / len;
        const j = space.ownerIndex(mx - nx * 0.15, mz - nz * 0.15);
        if (j < 0) continue;
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
        }
        // floors: a riser facing the lower side, and a railing on the higher side for real drops
        const ha = [fi(ax, az), fj(ax, az)];
        const hb = [fi(bx, bz), fj(bx, bz)];
        if (Math.abs(ha[0] - ha[1]) > 0.04 || Math.abs(hb[0] - hb[1]) > 0.04) {
          const sign = ha[0] < ha[1] ? 1 : -1;
          strip(walls.get(o.wall ?? wall), ax, az, bx, bz, [Math.min(...ha), Math.max(...ha)], [Math.min(...hb), Math.max(...hb)], nx * sign, nz * sign, 0, len / tile, tile, false);
          const drop = Math.max(Math.abs(ha[0] - ha[1]), Math.abs(hb[0] - hb[1]));
          if (drop > 0.6) {
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
        if (space.ownerIndex(x, z) !== i || space.dist(x, z) > -0.7) continue;
        const big = s.ceil > 6;
        panels.push({ x, y: s.ceil - 0.02, z, a, size: big ? [1.6, 1.6] : [1.2, 0.6], dead: rnd() < (s.dead ?? 0.12) });
      }
    }
  });

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
