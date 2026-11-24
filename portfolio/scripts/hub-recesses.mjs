/**
 * The Lobby's recesses (2026-11-24, the owner's call): pockets of floor too narrow for a 1.8 m wide body to reach (an
 * opening of the walkable area by a 0.9 m disc), left where rooms overlap askew. Writes
 * src/components/hub/world/lobby-recesses.ts:
 *   A  small ones (< 1 m²)                         → filled with a block of wall (accidental notches)
 *   B  by a ramp (within 3 m)                       → filled (the gap between a ramp's low wall and a wall)
 *   C  bigger ones elsewhere (≥ 1 m²)               → a short dead end, 2.4 m deep, declared as an oddity
 * Left as they are: the passages behind doors (within 3 m of a door) and pockets next to a pit (between the holes).
 * Usage, from portfolio/: node scripts/hub-recesses.mjs   (then hub:plan, skin.py, hub:audit)
 */
import fs from "fs";
import path from "path";
import { loadPlaces } from "./lib/places.mjs";

const { sdf, places, lobby } = await loadPlaces();
const all = places.LOBBY.space;
// the plan without the recesses' own pieces: they are computed from scratch
const sp = new sdf.Space(all.shapes.filter((s) => s.tag !== "impasse"), all.solids.filter((s) => s.tag !== "fill"));
const S = 0.25;
const [x0, z0, x1, z1] = sp.bounds;
const W = Math.ceil((x1 - x0) / S);
const H = Math.ceil((z1 - z0) / S);
const X = (i) => x0 + (i + 0.5) * S;
const Z = (j) => z0 + (j + 0.5) * S;
const free = new Uint8Array(W * H);
for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) free[j * W + i] = sp.dist(X(i), Z(j)) < 0 ? 1 : 0;
const R = Math.round(0.9 / S);
const disc = [];
for (let dj = -R; dj <= R; dj++) for (let di = -R; di <= R; di++) if (di * di + dj * dj <= R * R) disc.push([di, dj]);
const inside = (i, j) => i >= 0 && j >= 0 && i < W && j < H;
const eroded = new Uint8Array(W * H);
for (let j = 0; j < H; j++) {
  for (let i = 0; i < W; i++) {
    if (!free[j * W + i]) continue;
    eroded[j * W + i] = disc.every(([di, dj]) => inside(i + di, j + dj) && free[(j + dj) * W + i + di]) ? 1 : 0;
  }
}
const open = new Uint8Array(W * H);
for (let j = 0; j < H; j++) {
  for (let i = 0; i < W; i++) {
    if (!eroded[j * W + i]) continue;
    for (const [di, dj] of disc) if (inside(i + di, j + dj)) open[(j + dj) * W + i + di] = 1;
  }
}
const seen = new Uint8Array(W * H);
const pockets = [];
for (let k = 0; k < W * H; k++) {
  if (!free[k] || open[k] || seen[k]) continue;
  const cells = [];
  const stack = [k];
  seen[k] = 1;
  while (stack.length) {
    const c = stack.pop();
    const i = c % W;
    const j = (c - i) / W;
    cells.push([X(i), Z(j)]);
    for (const [a, b] of [[i + 1, j], [i - 1, j], [i, j + 1], [i, j - 1]]) {
      if (!inside(a, b)) continue;
      const q = b * W + a;
      if (free[q] && !open[q] && !seen[q]) {
        seen[q] = 1;
        stack.push(q);
      }
    }
  }
  if (cells.length * S * S >= 0.25) pockets.push(cells);
}

const doors = [...lobby.EXITS.map((e) => [e.anchor.x, e.anchor.z]), [lobby.LOBBY_ARRIVAL.x, lobby.LOBBY_ARRIVAL.z]];
const ramps = sp.shapes.filter((s) => typeof s.floor === "object");
const r4 = (v) => Math.round(v * 1e4) / 1e4;
const fills = [];
const deadEnds = [];
const tally = { A: 0, B: 0, C: 0, door: 0, pit: 0, skipped: 0 };
for (const cells of pockets) {
  const n = cells.length;
  const area = n * S * S;
  const cx = cells.reduce((a, c) => a + c[0], 0) / n;
  const cz = cells.reduce((a, c) => a + c[1], 0) / n;
  if (doors.some(([dx, dz]) => Math.hypot(dx - cx, dz - cz) < 3)) {
    tally.door++;
    continue;
  }
  const g = sp.ground(cx, cz);
  const byRamp = ramps.some((r) => sdf.geomDist(r, cx, cz) < 3);
  const byPit = !byRamp && sp.shapes.some((s) => sdf.geomDist(s, cx, cz) < 1 && sdf.floorAt(s.floor, cx, cz) < g - 0.5);
  if (byPit) {
    tally.pit++;
    continue;
  }
  // its main axis (PCA) and extents along it
  let sxx = 0;
  let szz = 0;
  let sxz = 0;
  for (const [x, z] of cells) {
    sxx += (x - cx) ** 2;
    szz += (z - cz) ** 2;
    sxz += (x - cx) * (z - cz);
  }
  // laid along the walls there: the room angle nearest the pocket's main axis (within 20°), else its own axis
  const pca = 0.5 * Math.atan2(2 * sxz, sxx - szz);
  const turn = (t) => Math.atan2(Math.sin(t), Math.cos(t));
  const quarter = (t) => turn(t - Math.round(t / (Math.PI / 2)) * (Math.PI / 2));
  const wallAngles = sp.shapes.filter((r) => r.kind === "box" && sdf.geomDist(r, cx, cz) < 1.5).map((r) => -(r.grid ? r.grid.a : r.a ?? 0));
  const snap = wallAngles.map((t) => pca - quarter(pca - t)).sort((a, b) => Math.abs(quarter(pca - a)) - Math.abs(quarter(pca - b)))[0];
  const aligned = snap !== undefined && Math.abs(quarter(pca - snap)) < 0.35;
  const th = aligned ? snap : pca;
  const [ux, uz, vx, vz] = [Math.cos(th), Math.sin(th), -Math.sin(th), Math.cos(th)];
  let [u0, u1, v0, v1] = [Infinity, -Infinity, Infinity, -Infinity];
  for (const [x, z] of cells) {
    const u = (x - cx) * ux + (z - cz) * uz;
    const v = (x - cx) * vx + (z - cz) * vz;
    u0 = Math.min(u0, u - S / 2);
    u1 = Math.max(u1, u + S / 2);
    v0 = Math.min(v0, v - S / 2);
    v1 = Math.max(v1, v + S / 2);
  }
  const mu = (u0 + u1) / 2;
  const mv = (v0 + v1) / 2;
  const bx = cx + ux * mu + vx * mv;
  const bz = cz + uz * mu + vz * mv;
  if (area < 1 || byRamp) {
    const w = u1 - u0 + 0.1;
    const d = v1 - v0 + 0.1;
    if (w * d > 2.2 * area + 0.3) {
      tally.skipped++; // not a pocket a box fits: left as it is
      continue;
    }
    // a block of wall runs along the walls around it: a pocket whose main axis is askew to every room there (a triangle
    // in a corner, its box at 45°) is left alone, as is a tiny one (a 60 cm cube of wall in the open)
    if (w * d < 0.5 || !aligned) {
      tally.skipped++;
      continue;
    }
    // never over floor the pocket does not own (a box reaching across a thin wall into the next room cut it open)
    const own = new Set(cells.map(([x, z]) => `${Math.round(x / S)},${Math.round(z / S)}`));
    let spills = false;
    for (let a = -w / 2; a <= w / 2 && !spills; a += 0.1) {
      for (let b = -d / 2; b <= d / 2 && !spills; b += 0.1) {
        const x = bx + ux * a + vx * b;
        const z = bz + uz * a + vz * b;
        if (sp.dist(x, z) >= -0.02) continue;
        let near = false;
        for (let i = -1; i <= 1 && !near; i++) for (let j = -1; j <= 1 && !near; j++) near = own.has(`${Math.round(x / S) + i},${Math.round(z / S) + j}`);
        spills = !near;
      }
    }
    if (spills) {
      tally.skipped++;
      continue;
    }
    // Solid boxes turn by a about the vertical with local x along (cos a, -sin a) (sdf.ts): a = -th
    fills.push({ kind: "box", x: r4(bx), z: r4(bz), w: r4(w), d: r4(d), a: r4(-th), tag: "fill" });
    tally[byRamp ? "B" : "A"]++;
    continue;
  }
  // C: a dead end. Its way in: from the reachable floor nearest to it, towards the pocket
  let ox = 0;
  let oz = 0;
  let m = 0;
  for (let j = 0; j < H; j++) {
    for (let i = 0; i < W; i++) {
      if (!open[j * W + i] || Math.hypot(X(i) - cx, Z(j) - cz) > 2.5) continue;
      ox += X(i);
      oz += Z(j);
      m++;
    }
  }
  if (!m) {
    tally.skipped++;
    continue;
  }
  let [dx, dz] = [cx - ox / m, cz - oz / m];
  const len = Math.hypot(dx, dz) || 1;
  [dx, dz] = [dx / len, dz / len];
  // as deep as 2.4 m beyond the pocket's mouth, shorter if another room or a solid lies behind the wall
  const across = Math.max(1.2, Math.abs((u1 - u0) * (ux * -dz + uz * dx)) + Math.abs((v1 - v0) * (vx * -dz + vz * dx)));
  let depth = 2.4;
  const clear = (dep) => {
    for (let t = 0.6; t <= dep + 0.3; t += 0.2) {
      for (let s = -across / 2 - 0.3; s <= across / 2 + 0.3; s += 0.2) {
        const x = cx + dx * t - dz * s;
        const z = cz + dz * t + dx * s;
        if (sp.dist(x, z) < 0.1 && Math.hypot(x - cx, z - cz) > 1.2) return false;
      }
    }
    return true;
  };
  while (depth > 1.2 && !clear(depth)) depth -= 0.2;
  if (depth <= 1.2) {
    tally.skipped++;
    continue;
  }
  const mx = cx + dx * (depth / 2);
  const mz = cz + dz * (depth / 2);
  deadEnds.push({ kind: "box", x: r4(mx), z: r4(mz), w: r4(across), d: r4(depth + 0.6), a: r4(Math.atan2(-dz, dx) + Math.PI / 2), ceil: lobby.STD_CEIL, lights: 2.4, dead: 0.5, mat: "carpet", tag: "impasse" });
  tally.C++;
}

const out = path.join(process.cwd(), "src/components/hub/world/lobby-recesses.ts");
const head = fs.readFileSync(out, "utf8").split("export const RECESS_FILLS")[0];
fs.writeFileSync(
  out,
  `${head}export const RECESS_FILLS: Solid[] = ${JSON.stringify(fills)};\nexport const RECESS_DEAD_ENDS: Shape[] = ${JSON.stringify(deadEnds)};\n`,
);
console.log(`recesses: ${pockets.length} pockets — filled A ${tally.A}, B ${tally.B}; dead ends C ${tally.C}; left: doors ${tally.door}, pits ${tally.pit}, no fit ${tally.skipped}`);
for (const d of deadEnds) console.log(`  dead end at (${d.x}, ${d.z}) ${d.w} × ${d.d} m`);
