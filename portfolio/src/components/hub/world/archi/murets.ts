import { solidOutline } from "./build";
import type { Solid, Space } from "./sdf";

/**
 * Low walls along balcony edges (2026-11-22, the user's choice over railings): wherever the floor drops more than a step
 * (STEP) between two rooms of a place drawn by its Blender model, with head room above the high side. Laid out here,
 * once, from the plan: the game gets their collision (ghost capsules, the player no longer walks into them) and
 * tools/blender/skin.py draws exactly these (plan export: `murets`).
 *
 * A run is a list of points along the edge, each with the way into the high side (unit), the high and the low floor.
 * `ends`: free ends (15 cm overhang, to close a corner) vs ends where another run carries on in line (no overhang).
 */
export type MuretRun = {
  room: number;
  pts: [x: number, z: number, nx: number, nz: number, high: number, low: number][];
  ends: [boolean, boolean];
  closed: boolean;
};

const STEP = 0.45; // the player walks down this much (Player STEP_MAX): over it, a low wall
const THICK = 0.15;
const HEAD = 2; // head room needed above the high side: a slot under a low ceiling is a construction fault, not a balcony

type Sample = { x: number; z: number; nx: number; nz: number; high: number; low: number; mark: string | null; room: number };

export function murets(sp: Space): { runs: MuretRun[]; solids: Solid[] } {
  const runs: MuretRun[] = [];
  const seen = new Map<string, [number, number][]>();
  const walled = (x: number, z: number) => {
    const cx = Math.floor(x);
    const cz = Math.floor(z);
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) for (const [px, pz] of seen.get(`${cx + i},${cz + j}`) ?? []) if (Math.hypot(x - px, z - pz) < 0.2) return true;
    return false;
  };
  sp.shapes.forEach((s, si) => {
    if (!s.skin || s.open) return;
    const samples = edgeSamples(sp, si, walled);
    for (const p of samples) if (p.mark) seen.set(`${Math.floor(p.x)},${Math.floor(p.z)}`, [...(seen.get(`${Math.floor(p.x)},${Math.floor(p.z)}`) ?? []), [p.x, p.z]]);
    runs.push(...splitRuns(samples).map((r) => reachWalls(sp, r)));
  });
  return { runs, solids: runs.flatMap(collision) };
}

/** Points every 25 cm along a room's outline, and at each corner (facing both sides), marked where a low wall goes. */
function edgeSamples(sp: Space, si: number, walled: (x: number, z: number) => boolean): Sample[] {
  const o = solidOutline(sp.shapes[si]);
  const out: Sample[] = [];
  for (let k = 0; k < o.length; k++) {
    const [px, pz] = o[k];
    const [qx, qz] = o[(k + 1) % o.length];
    const len = Math.hypot(qx - px, qz - pz);
    if (len < 1e-4) continue;
    const [tx, tz] = [(qx - px) / len, (qz - pz) / len];
    const [nx, nz] = [-tz, tx];
    const steps = Math.max(1, Math.ceil(len / 0.25));
    for (let i = 0; i < steps; i++) out.push(sample(sp, si, px + (tx * len * i) / steps, pz + (tz * len * i) / steps, nx, nz, walled));
    // the corner itself, still facing this side: the next side starts there facing its own way (the wall turns closed)
    const last = out[out.length - 1];
    if (last?.mark) out.push({ ...last, x: qx, z: qz });
  }
  return out;
}

function sample(sp: Space, si: number, x: number, z: number, nx: number, nz: number, walled: (x: number, z: number) => boolean): Sample {
  const none: Sample = { x, z, nx, nz, high: 0, low: 0, mark: null, room: -1 };
  const a = sp.ownerIndex(x + nx * 0.1, z + nz * 0.1);
  const b = sp.ownerIndex(x - nx * 0.1, z - nz * 0.1);
  // only along an edge that really parts two rooms, this one owning a side
  if (a < 0 || b < 0 || a === b || (a !== si && b !== si) || sp.shapes[a].open || sp.shapes[b].open || !sp.shapes[a].skin || !sp.shapes[b].skin) return none;
  const fa = sp.ground(x + nx * 0.1, z + nz * 0.1);
  const fb = sp.ground(x - nx * 0.1, z - nz * 0.1);
  const side = fa > fb ? 1 : -1;
  const high = Math.max(fa, fb);
  // along a ramp the wall runs its whole length (from where the floors part), as on a real ramp: a wall starting halfway
  // down, where the drop passes a step, looked unfinished and left a corner to squeeze through
  const ramp = (i: number) => typeof sp.shapes[i].floor === "object" && rampDrop(sp.shapes[i]) > STEP;
  const min = ramp(a) || ramp(b) ? 0.05 : STEP;
  if (Math.abs(fa - fb) <= min || walled(x, z)) return none;
  if (sp.ceiling(x + side * nx * 0.2, z + side * nz * 0.2) - high <= HEAD) return none;
  const room = side > 0 ? a : b;
  return { x, z, nx: nx * side, nz: nz * side, high, low: Math.min(fa, fb), mark: `${room}:${side}`, room };
}

function rampDrop(s: Space["shapes"][number]) {
  const f = s.floor;
  return typeof f === "object" ? Math.abs(f.hb - f.ha) : 0;
}

/** A free end, carried on along its line to the wall when one stands within 60 cm (a gap a hand fits through, not a
 * passage): the low wall then closes onto it. */
function reachWalls(sp: Space, r: MuretRun): MuretRun {
  if (r.closed) return r;
  const pts = [...r.pts];
  const ends: [boolean, boolean] = [...r.ends];
  for (const end of [0, 1] as const) {
    if (!ends[end]) continue;
    const [a, b] = end === 0 ? [pts[0], pts[1]] : [pts[pts.length - 1], pts[pts.length - 2]];
    const len = Math.hypot(a[0] - b[0], a[1] - b[1]) || 1;
    const [dx, dz] = [(a[0] - b[0]) / len, (a[1] - b[1]) / len];
    for (let d = 0.05; d <= 0.6; d += 0.05) {
      const x = a[0] + dx * d;
      const z = a[1] + dz * d;
      // the wall face is where the middle of the low wall leaves the space
      if (sp.dist(x + a[2] * THICK * 0.5, z + a[3] * THICK * 0.5) < 0) continue;
      const p: MuretRun["pts"][number] = [x, z, a[2], a[3], a[4], a[5]];
      if (end === 0) pts.unshift(p);
      else pts.push(p);
      ends[end] = false; // closed on the wall: no overhang
      break;
    }
  }
  return { ...r, pts, ends };
}

/** Runs of consecutive marked samples (one loop: a wall all around a pit is one closed run). */
function splitRuns(samples: Sample[]): MuretRun[] {
  if (!samples.length) return [];
  const pt = (p: Sample): MuretRun["pts"][number] => [p.x, p.z, p.nx, p.nz, p.high, p.low];
  const start = samples.findIndex((p) => !p.mark);
  if (start < 0) return [{ room: samples[0].room, pts: [...samples, samples[0]].map(pt), ends: [false, false], closed: true }];
  const order = [...samples.slice(start), ...samples.slice(0, start)];
  const runs: MuretRun[] = [];
  let run: Sample[] = [];
  let joined = false;
  for (const p of [...order, null]) {
    if (run.length && (!p?.mark || p.mark !== run[run.length - 1].mark)) {
      const handover = !!p?.mark; // another wall takes over here: end exactly where it starts
      if (handover && p) run.push({ ...p, nx: run[run.length - 1].nx, nz: run[run.length - 1].nz, high: run[run.length - 1].high, low: run[run.length - 1].low });
      const length = run.slice(1).reduce((d, q, i) => d + Math.hypot(q.x - run[i].x, q.z - run[i].z), 0);
      if (run.length > 1 && length >= 0.8) runs.push({ room: run[0].room, pts: run.map(pt), ends: [!joined, !handover], closed: false });
      run = [];
      joined = handover;
    }
    if (p?.mark) run.push(p);
  }
  return runs;
}

/** The run's collision: capsules along its middle line, merged while it runs straight. */
function collision(r: MuretRun): Solid[] {
  const mid = r.pts.map(([x, z, nx, nz]) => [x + nx * THICK * 0.5, z + nz * THICK * 0.5] as [number, number]);
  const out: Solid[] = [];
  let a = 0;
  for (let i = 1; i < mid.length; i++) {
    const last = i === mid.length - 1;
    const turn = !last && turned(mid[a], mid[i], mid[i + 1]);
    if (!last && !turn) continue;
    const [ax, az] = mid[a];
    const [bx, bz] = mid[i];
    if (Math.hypot(bx - ax, bz - az) > 0.01) out.push({ kind: "capsule", ax, az, bx, bz, r: THICK / 2, ghost: true, tag: "muret" });
    a = i;
  }
  return out;
}

function turned(a: [number, number], b: [number, number], c: [number, number]) {
  const d1 = Math.atan2(b[1] - a[1], b[0] - a[0]);
  const d2 = Math.atan2(c[1] - b[1], c[0] - b[0]);
  return Math.abs(Math.atan2(Math.sin(d2 - d1), Math.cos(d2 - d1))) > 0.02;
}
