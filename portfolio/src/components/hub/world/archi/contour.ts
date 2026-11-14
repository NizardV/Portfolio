/**
 * Marching squares: turns a distance field into closed outlines (polylines), with the inside on the left.
 * Straight runs are simplified so a 30 m wall is two points, not seventy.
 */
import { drain, type Steps } from "./slice";

export type Pt = [number, number];

// segments per case, as pairs of cell edges (0: top, 1: right, 2: bottom, 3: left); corners 0..3 = tl, tr, br, bl
const TABLE: number[][][] = [
  [], [[3, 0]], [[0, 1]], [[3, 1]], [[1, 2]], [[3, 0], [1, 2]], [[0, 2]], [[3, 2]],
  [[2, 3]], [[2, 0]], [[0, 1], [2, 3]], [[2, 1]], [[1, 3]], [[1, 0]], [[0, 3]], [],
];

type Field = (x: number, z: number) => number;

export function contours(f: Field, x0: number, z0: number, x1: number, z1: number, step: number): Pt[][] {
  return drain(contourSteps(f, x0, z0, x1, z1, step));
}

/** the same, yielding every few rows (see slice.ts) */
export function* contourSteps(f: Field, x0: number, z0: number, x1: number, z1: number, step: number): Steps<Pt[][]> {
  const [loops] = yield* contourSetSteps((x, z, out) => { out[0] = f(x, z); }, 1, x0, z0, x1, z1, step);
  return loops;
}

/**
 * Several fields over the same grid, sampled together (one pass: a sample may share its work between the fields),
 * then outlined one by one.
 */
export function* contourSetSteps(fields: (x: number, z: number, out: number[]) => void, count: number, x0: number, z0: number, x1: number, z1: number, step: number): Steps<Pt[][][]> {
  const nx = Math.ceil((x1 - x0) / step) + 1;
  const nz = Math.ceil((z1 - z0) / step) + 1;
  const grids = Array.from({ length: count }, () => new Float32Array(nx * nz));
  const out = new Array<number>(count).fill(1);
  for (let j = 0; j < nz; j++) {
    for (let i = 0; i < nx; i++) {
      // the border is always outside, so every outline closes
      if (i === 0 || j === 0 || i === nx - 1 || j === nz - 1) out.fill(1);
      else fields(x0 + i * step, z0 + j * step, out);
      for (let k = 0; k < count; k++) grids[k][j * nx + i] = out[k];
    }
    if (j % 16 === 15) yield;
  }
  const result: Pt[][][] = [];
  for (const v of grids) result.push(yield* march(v, nx, nz, x0, z0, step));
  return result;
}

function* march(v: Float32Array, nx: number, nz: number, x0: number, z0: number, step: number): Steps<Pt[][]> {
  const val = (i: number, j: number) => v[j * nx + i];
  const pts = new Map<string, Pt>();
  const edgePoint = (i: number, j: number, e: number): [string, Pt] => {
    // canonical edge id so neighbouring cells share the exact same point
    let k: string;
    let a: [number, number];
    let b: [number, number];
    if (e === 0) { k = `h${i},${j}`; a = [i, j]; b = [i + 1, j]; }
    else if (e === 2) { k = `h${i},${j + 1}`; a = [i, j + 1]; b = [i + 1, j + 1]; }
    else if (e === 3) { k = `v${i},${j}`; a = [i, j]; b = [i, j + 1]; }
    else { k = `v${i + 1},${j}`; a = [i + 1, j]; b = [i + 1, j + 1]; }
    let p = pts.get(k);
    if (!p) {
      const va = val(a[0], a[1]);
      const vb = val(b[0], b[1]);
      const t = va / (va - vb);
      p = [x0 + (a[0] + (b[0] - a[0]) * t) * step, z0 + (a[1] + (b[1] - a[1]) * t) * step];
      pts.set(k, p);
    }
    return [k, p];
  };

  const next = new Map<string, string>();
  for (let j = 0; j < nz - 1; j++) for (let i = 0; i < nx - 1; i++) {
    if (i === 0 && j % 64 === 63) yield;
    const tl = val(i, j) < 0 ? 1 : 0;
    const tr = val(i + 1, j) < 0 ? 2 : 0;
    const br = val(i + 1, j + 1) < 0 ? 4 : 0;
    const bl = val(i, j + 1) < 0 ? 8 : 0;
    let c = tl | tr | br | bl;
    if (c === 5 || c === 10) {
      // saddle: decide with the centre value
      const centre = (val(i, j) + val(i + 1, j) + val(i + 1, j + 1) + val(i, j + 1)) / 4;
      if (centre < 0) c = c === 5 ? 10 : 5;
    }
    for (const [ea, eb] of TABLE[c]) {
      const [ka] = edgePoint(i, j, ea);
      const [kb] = edgePoint(i, j, eb);
      // orient: inside on the left of a→b (x right, z down → left normal is (dz, -dx)). Decided from the grid's
      // topology alone, with the cell's edge midpoints and the inside corner of the first edge: never degenerate
      // (a real segment can shrink to a point when a corner sits exactly on the outline), and never a new sample
      // of the field that could disagree with the grid and break the loop.
      const [ax, az] = MID[ea];
      const [bx, bz] = MID[eb];
      const [p, q] = EDGE_CORNERS[ea];
      const [cx, cz] = val(i + p[0], j + p[1]) < 0 ? p : q;
      if ((cx - ax) * (bz - az) - (cz - az) * (bx - ax) > 0) next.set(ka, kb);
      else next.set(kb, ka);
    }
  }

  const loops: Pt[][] = [];
  const seen = new Set<string>();
  for (const start of next.keys()) {
    if (seen.has(start)) continue;
    const loop: Pt[] = [];
    let k: string | undefined = start;
    while (k && !seen.has(k)) {
      seen.add(k);
      loop.push(pts.get(k)!);
      k = next.get(k);
    }
    // only loops that really close: an open chain closed by force would draw a chord across the room
    if (k === start && loop.length >= 3) loops.push(simplify(loop, 0.03));
  }
  return loops;
}

/** cell-local edge midpoints and edge corners (0: top, 1: right, 2: bottom, 3: left) */
const MID: Pt[] = [[0.5, 0], [1, 0.5], [0.5, 1], [0, 0.5]];
const EDGE_CORNERS: [Pt, Pt][] = [[[0, 0], [1, 0]], [[1, 0], [1, 1]], [[0, 1], [1, 1]], [[0, 0], [0, 1]]];

/** Ramer–Douglas–Peucker on a closed loop */
function simplify(loop: Pt[], tol: number): Pt[] {
  if (loop.length < 8) return loop;
  // split the loop at its farthest point from the first one, simplify both halves
  let far = 0;
  let best = 0;
  for (let i = 1; i < loop.length; i++) {
    const d = Math.hypot(loop[i][0] - loop[0][0], loop[i][1] - loop[0][1]);
    if (d > best) { best = d; far = i; }
  }
  const a = rdp(loop.slice(0, far + 1), tol);
  const b = rdp([...loop.slice(far), loop[0]], tol);
  return [...a.slice(0, -1), ...b.slice(0, -1)];
}

function rdp(pts: Pt[], tol: number): Pt[] {
  if (pts.length < 3) return pts;
  const [ax, az] = pts[0];
  const [bx, bz] = pts[pts.length - 1];
  const dx = bx - ax;
  const dz = bz - az;
  const len = Math.hypot(dx, dz) || 1;
  let idx = 0;
  let dmax = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const d = Math.abs((pts[i][0] - ax) * dz - (pts[i][1] - az) * dx) / len;
    if (d > dmax) { dmax = d; idx = i; }
  }
  if (dmax <= tol) return [pts[0], pts[pts.length - 1]];
  const left = rdp(pts.slice(0, idx + 1), tol);
  const right = rdp(pts.slice(idx), tol);
  return [...left.slice(0, -1), ...right];
}

export const loopArea = (loop: Pt[]) => {
  let a = 0;
  for (let i = 0; i < loop.length; i++) {
    const [x1, z1] = loop[i];
    const [x2, z2] = loop[(i + 1) % loop.length];
    a += x1 * z2 - x2 * z1;
  }
  return a / 2;
};

export function pointInLoop(p: Pt, loop: Pt[]): boolean {
  let inside = false;
  for (let i = 0, j = loop.length - 1; i < loop.length; j = i++) {
    const [xi, zi] = loop[i];
    const [xj, zj] = loop[j];
    if (zi > p[1] !== zj > p[1] && p[0] < ((xj - xi) * (p[1] - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}
