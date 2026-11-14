/**
 * Architecture as signed distance fields: a place is the union of shapes (rooms, corridors, rotundas…) minus solids
 * (pillars). Negative = inside the walkable space. Walls, floors and ceilings are extracted from this field
 * (see build.ts), and the player collides with the very same field, so what you see is exactly what stops you.
 *
 * Later shapes override earlier ones where they overlap (their floor and ceiling win): a tall hall placed after
 * a corridor keeps its height, a raised platform placed after a room sits on top of it.
 */

/** floor height: flat, or a ramp from (ax,az) at ha to (bx,bz) at hb */
export type Floor = number | { ax: number; az: number; bx: number; bz: number; ha: number; hb: number };

export type Geom =
  | { kind: "box"; x: number; z: number; w: number; d: number; a?: number; round?: number }
  | { kind: "circle"; x: number; z: number; r: number }
  | { kind: "ngon"; x: number; z: number; r: number; n: number; a?: number }
  | { kind: "capsule"; ax: number; az: number; bx: number; bz: number; r: number };

export type Surface = "carpet" | "stain" | "tile" | "concrete" | "wood" | "marble" | "void";
export type WallSurface = "wallpaper" | "tile" | "concrete" | "plaster" | "panel";

export type Shape = Geom & {
  floor?: Floor;
  ceil: number;
  /** floor and ceiling look */
  mat?: Surface;
  /** wall look for the boundary owned by this shape */
  wall?: WallSurface;
  /** ceiling lights: metres between panels (0 = none) */
  lights?: number;
  /** share of dead panels */
  dead?: number;
  /** free-form label for props (hall, well…) */
  tag?: string;
  /** no ceiling at all (open sky or a void above) */
  open?: boolean;
};

export type Solid = Geom & { mat?: WallSurface; tag?: string };

/* ---------- primitive distance functions (2D, x/z) ---------- */

function rotate(x: number, z: number, a: number): [number, number] {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [x * c + z * s, -x * s + z * c];
}

export function geomDist(g: Geom, px: number, pz: number): number {
  switch (g.kind) {
    case "circle":
      return Math.hypot(px - g.x, pz - g.z) - g.r;
    case "box": {
      const [x, z] = rotate(px - g.x, pz - g.z, -(g.a ?? 0));
      const r = g.round ?? 0;
      const qx = Math.abs(x) - (g.w / 2 - r);
      const qz = Math.abs(z) - (g.d / 2 - r);
      return Math.hypot(Math.max(qx, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qz), 0) - r;
    }
    case "ngon": {
      // regular polygon (Inigo Quilez)
      const [x, z] = rotate(px - g.x, pz - g.z, -(g.a ?? 0));
      const an = Math.PI / g.n;
      const len = Math.hypot(x, z);
      let bn = Math.atan2(x, z) % (2 * an);
      if (bn < 0) bn += 2 * an;
      bn -= an;
      const qx = len * Math.cos(bn) - g.r * Math.cos(an);
      let qy = len * Math.abs(Math.sin(bn)) - g.r * Math.sin(an);
      qy += Math.min(Math.max(-qy, 0), g.r * Math.sin(an));
      return Math.hypot(qx, qy) * Math.sign(qx || 1);
    }
    case "capsule": {
      const dx = g.bx - g.ax;
      const dz = g.bz - g.az;
      const t = Math.min(1, Math.max(0, ((px - g.ax) * dx + (pz - g.az) * dz) / (dx * dx + dz * dz || 1)));
      return Math.hypot(px - (g.ax + dx * t), pz - (g.az + dz * t)) - g.r;
    }
  }
}

export function geomBounds(g: Geom): [number, number, number, number] {
  switch (g.kind) {
    case "circle":
    case "ngon":
      return [g.x - g.r, g.z - g.r, g.x + g.r, g.z + g.r];
    case "box": {
      const h = Math.hypot(g.w, g.d) / 2;
      return [g.x - h, g.z - h, g.x + h, g.z + h];
    }
    case "capsule":
      return [Math.min(g.ax, g.bx) - g.r, Math.min(g.az, g.bz) - g.r, Math.max(g.ax, g.bx) + g.r, Math.max(g.az, g.bz) + g.r];
  }
}

export function floorAt(f: Floor | undefined, x: number, z: number): number {
  if (f === undefined) return 0;
  if (typeof f === "number") return f;
  const dx = f.bx - f.ax;
  const dz = f.bz - f.az;
  const t = Math.min(1, Math.max(0, ((x - f.ax) * dx + (z - f.az) * dz) / (dx * dx + dz * dz || 1)));
  return f.ha + (f.hb - f.ha) * t;
}

/* ---------- a place: shapes + solids, with a spatial index ---------- */

const CELL = 8;
const MARGIN = 3;

export class Space {
  readonly shapes: Shape[];
  readonly solids: Solid[];
  readonly bounds: [number, number, number, number];
  private index = new Map<string, { shapes: number[]; solids: number[] }>();

  constructor(shapes: Shape[], solids: Solid[] = []) {
    this.shapes = shapes;
    this.solids = solids;
    const b: [number, number, number, number] = [Infinity, Infinity, -Infinity, -Infinity];
    const add = (bb: [number, number, number, number], list: "shapes" | "solids", i: number) => {
      b[0] = Math.min(b[0], bb[0]);
      b[1] = Math.min(b[1], bb[1]);
      b[2] = Math.max(b[2], bb[2]);
      b[3] = Math.max(b[3], bb[3]);
      for (let cx = Math.floor((bb[0] - MARGIN) / CELL); cx <= Math.floor((bb[2] + MARGIN) / CELL); cx++)
        for (let cz = Math.floor((bb[1] - MARGIN) / CELL); cz <= Math.floor((bb[3] + MARGIN) / CELL); cz++) {
          const k = `${cx},${cz}`;
          let entry = this.index.get(k);
          if (!entry) this.index.set(k, (entry = { shapes: [], solids: [] }));
          entry[list].push(i);
        }
    };
    shapes.forEach((s, i) => add(geomBounds(s), "shapes", i));
    solids.forEach((s, i) => add(geomBounds(s), "solids", i));
    this.bounds = [b[0] - 2, b[1] - 2, b[2] + 2, b[3] + 2];
  }

  private near(x: number, z: number) {
    return this.index.get(`${Math.floor(x / CELL)},${Math.floor(z / CELL)}`);
  }

  /** signed distance to the walls: negative inside the walkable space */
  dist(x: number, z: number): number {
    const n = this.near(x, z);
    if (!n) return 10;
    let d = 10;
    for (const i of n.shapes) d = Math.min(d, geomDist(this.shapes[i], x, z));
    for (const i of n.solids) d = Math.max(d, -geomDist(this.solids[i], x, z));
    return d;
  }

  /** index of the shape that owns this point (the last one containing it), or -1 */
  ownerIndex(x: number, z: number): number {
    const n = this.near(x, z);
    if (!n) return -1;
    let best = -1;
    for (const i of n.shapes) if (i > best && geomDist(this.shapes[i], x, z) < 0) best = i;
    return best;
  }

  /** distance to every shape placed after `i` (min), used to cut a shape's own floor/ceiling */
  laterDist(i: number, x: number, z: number): number {
    const n = this.near(x, z);
    if (!n) return 10;
    let d = 10;
    for (const j of n.shapes) if (j > i) d = Math.min(d, geomDist(this.shapes[j], x, z));
    return d;
  }

  ground(x: number, z: number): number {
    const i = this.ownerIndex(x, z);
    return i < 0 ? 0 : floorAt(this.shapes[i].floor, x, z);
  }

  ceiling(x: number, z: number): number {
    const i = this.ownerIndex(x, z);
    return i < 0 ? 3 : this.shapes[i].ceil;
  }

  /** push a circle of radius r back inside the space (two passes settle corners) */
  collide(x: number, z: number, r: number): [number, number] {
    for (let pass = 0; pass < 3; pass++) {
      const d = this.dist(x, z);
      if (d <= -r) break;
      const e = 0.02;
      const gx = this.dist(x + e, z) - this.dist(x - e, z);
      const gz = this.dist(x, z + e) - this.dist(x, z - e);
      const len = Math.hypot(gx, gz) || 1;
      const push = d + r + 0.001;
      x -= (gx / len) * push;
      z -= (gz / len) * push;
    }
    return [x, z];
  }
}
