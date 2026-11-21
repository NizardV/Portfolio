/**
 * First-person audit of the hub's places, without a browser: from the player's eye, at every walkable spot reachable
 * from the spawn (step rule included), rays in 144 directions against the built geometry.
 *   void       a ray that escapes in a closed place (a hole onto the outside), except through an open roof
 *   phantom    a wall standing where you can walk on both sides of it (seen, no collision)
 *   invisible  something stops you over 30 cm or more where nothing is seen (collision, no wall)
 *   floor / ceiling  straight down and up every 25 cm (8 cm on seams): no floor or ceiling, or not at the height the plan says
 *   hanging / floating / rail / skewed  construction: see construction() below
 * Usage, from portfolio/: node scripts/hub-audit.mjs [PLACE]   [--full]  (PLACE = LOBBY, POOLS, CANALS…; all by default)
 */
import fs from "fs";
import { loadPlaces, readGlb, skinFile } from "./lib/places.mjs";

const { THREE, mergeGeometries, BVH, build, places } = await loadPlaces();
const { buildSpace } = build;

/** the models that draw some rooms instead of the kit (Shape.skin): their triangles join the audited geometry */
function skins(sp) {
  const names = [...new Set(sp.shapes.map((s) => s.skin).filter(Boolean))];
  return names.map((n) => {
    if (!fs.existsSync(skinFile(n))) throw new Error(`skin « ${n} » has no model: ${skinFile(n)} (run tools/blender/greybox.py)`);
    return readGlb(skinFile(n), THREE, mergeGeometries);
  }).filter(Boolean);
}

/** walkable spots reachable from the spawn, with the step rule, every 2 m */
function spots(sp, spawn) {
  const st = 0.5;
  const key = (x, z) => `${Math.round(x / st)},${Math.round(z / st)}`;
  const s0 = spawn ?? { x: (sp.bounds[0] + sp.bounds[2]) / 2, z: (sp.bounds[1] + sp.bounds[3]) / 2 };
  const seen = new Map([[key(s0.x, s0.z), [s0.x, s0.z]]]);
  const queue = [[s0.x, s0.z]];
  while (queue.length) {
    const [x, z] = queue.shift();
    for (const [dx, dz] of [[st, 0], [-st, 0], [0, st], [0, -st]]) {
      const nx = x + dx;
      const nz = z + dz;
      const k = key(nx, nz);
      if (seen.has(k) || !sp.fits(nx, nz, 0.35) || Math.abs(sp.ground(nx, nz) - sp.ground(x, z)) > 0.45) continue;
      seen.set(k, [nx, nz]);
      queue.push([nx, nz]);
    }
  }
  return [...seen.values()].filter(([x, z]) => Math.round(x / st) % 4 === 0 && Math.round(z / st) % 4 === 0);
}

/** where a ray that hit nothing leaves the volume, and through what */
function exitOf(sp, x, y, z, dir) {
  for (let t = 0.05; t < 200; t += 0.05) {
    const px = x + dir.x * t;
    const py = y + dir.y * t;
    const pz = z + dir.z * t;
    if (sp.roomDist(px, pz) > 0) return { x: px, z: pz, what: "wall" };
    const i = sp.ownerIndex(px, pz);
    if (py > sp.ceiling(px, pz)) return { x: px, z: pz, what: `ceiling of #${i}` };
    if (py < sp.ground(px, pz)) return { x: px, z: pz, what: `floor of #${i}` };
  }
  return { x, z, what: "?" };
}

function audit(sp, spawn) {
  const built = buildSpace(sp);
  const parts = [...built.walls.values(), ...built.floors.values(), ...built.ceilings.values(), ...skins(sp)].map((g) => {
    const c = new THREE.BufferGeometry();
    c.setAttribute("position", g.attributes.position);
    c.setIndex(g.index);
    return c;
  });
  const geo = mergeGeometries(parts);
  geo.boundsTree = new BVH.MeshBVH(geo);
  const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }));
  const ray = new THREE.Raycaster();
  ray.firstHitOnly = true;
  ray.far = 400;
  const found = { void: new Map(), phantom: new Map(), invisible: new Map() };
  const note = (kind, x, z, what) => {
    const k = `${Math.round(x / 3) * 3},${Math.round(z / 3) * 3}`;
    const e = found[kind].get(k) ?? { n: 0, what };
    e.n++;
    found[kind].set(k, e);
  };
  const free = (x, z) => sp.dist(x, z) < -0.02;
  const dir = new THREE.Vector3();
  const eye = new THREE.Vector3();
  const list = spots(sp, spawn);
  let rays = 0;
  for (const [x, z] of list) {
    eye.set(x, sp.ground(x, z) + 1.6, z);
    for (let yawd = 0; yawd < 360; yawd += 15) {
      for (const pd of [-35, -12, 0, 14, 40, 72]) {
        const yaw = (yawd * Math.PI) / 180;
        const p = (pd * Math.PI) / 180;
        dir.set(-Math.sin(yaw) * Math.cos(p), Math.sin(p), -Math.cos(yaw) * Math.cos(p));
        ray.set(eye, dir);
        rays++;
        const hit = ray.intersectObject(mesh)[0];
        if (!hit) {
          if (!sp.walls) continue; // open air: the edges are invisible on purpose
          let sky = false;
          for (let t = 0.5; t < 120 && !sky; t += 0.5) {
            const px = x + dir.x * t;
            const pz = z + dir.z * t;
            const i = sp.ownerIndex(px, pz);
            sky = i >= 0 && sp.shapes[i].open && eye.y + dir.y * t > sp.ground(px, pz) + 2.5;
          }
          if (!sky) {
            const e = exitOf(sp, x, eye.y, z, dir);
            note("void", e.x, e.z, e.what);
          }
          continue;
        }
        if (pd !== 0 && pd !== -12) continue;
        const h = hit.point;
        // a wall standing in free space: free all the way through it, and between floor and ceiling on both sides
        if (Math.abs(hit.face.normal.y) < 0.3 && hit.distance > 0.6) {
          let through = true;
          for (let t = -0.3; t <= 0.3001; t += 0.05) if (!free(h.x + dir.x * t, h.z + dir.z * t)) through = false;
          const inside = (t) => {
            const px = h.x + dir.x * t;
            const pz = h.z + dir.z * t;
            return h.y > sp.ground(px, pz) + 0.05 && h.y < sp.ceiling(px, pz) - 0.05;
          };
          if (through && inside(-0.3) && inside(0.3)) note("phantom", h.x, h.z, `seen from ${x.toFixed(1)},${z.toFixed(1)} yaw ${yawd}`);
        }
        // stopped well before what is seen (corner grazes of a few cm do not count)
        if (pd === 0) {
          for (let t = 0.1; t < Math.min(hit.distance - 0.4, 60); t += 0.1) {
            if (sp.dist(x + dir.x * t, z + dir.z * t) <= 0.02) continue;
            const so = sp.solidAt(x + dir.x * t, z + dir.z * t);
            let blocked = 0;
            for (let u = t; u < Math.min(hit.distance, t + 0.6); u += 0.05) if (sp.dist(x + dir.x * u, z + dir.z * u) > 0) blocked += 0.05;
            if (blocked >= 0.3 && !(so && (so.ghost || so.h !== undefined))) note("invisible", x + dir.x * t, z + dir.z * t, `seen at ${hit.distance.toFixed(1)} m, stopped at ${t.toFixed(1)} m (from ${x.toFixed(1)},${z.toFixed(1)} yaw ${yawd})`);
            break;
          }
        }
      }
    }
  }
  vertical(sp, mesh, ray, found);
  construction(sp, built, mesh, ray, found);
  return { spots: list.length, rays, found };
}

/**
 * Straight up and down over the whole interior (reachable or not: a hole is seen from afar), every 25 cm, and every
 * 8 cm along seams between shapes, where slivers of void hide. The plan says where the floor and the ceiling are (pits
 * and wells included: they have their own deep floor), so any other answer is a hole or a misplaced piece:
 *   floor    nothing below, or a floor higher / lower than the plan's (seeing through to a floor further down)
 *   ceiling  nothing above under a roof, or a ceiling higher / lower than the plan's (open shapes: skipped)
 * On a seam, floors and ceilings overlap on purpose (see build.ts): any height between the two sides is fine there.
 */
/**
 * Construction. The layout may be as mad as the dream wants; the building is always built properly. Intended oddities
 * are declared in the plan (see the liminal rubric); none of these ever is one:
 *   hanging   a wall panel whose bottom edge rests on nothing: no floor, no lower ceiling behind, no wall going on below
 *   floating  a lowered ceiling over open floor, ending in the open on the other side: a box hanging mid-room
 *   rail      a railing running into a wall
 *   skewed    ceiling lights askew to the 60 cm ceiling tiles
 */
function construction(sp, built, mesh, ray, found) {
  for (const k of ["hanging", "floating", "rail", "skewed"]) found[k] = new Map();
  const note = (kind, x, z, what) => {
    const k = `${Math.round(x / 3) * 3},${Math.round(z / 3) * 3}`;
    const e = found[kind].get(k) ?? { n: 0, what };
    e.n++;
    found[kind].set(k, e);
  };
  const from = new THREE.Vector3();
  const dir = new THREE.Vector3();
  const hits = (o, d, len) => {
    ray.set(o, d);
    ray.far = len;
    const h = ray.intersectObject(mesh)[0];
    ray.far = 400;
    return !!h;
  };
  const DOWN = new THREE.Vector3(0, -1, 0);
  const [a, b, c, n, e1, e2] = [0, 0, 0, 0, 0, 0].map(() => new THREE.Vector3());
  for (const g of [...built.walls.values(), ...skins(sp)]) {
    const pos = g.attributes.position;
    const idx = g.index;
    for (let t = 0; t < idx.count; t += 3) {
      a.fromBufferAttribute(pos, idx.getX(t));
      b.fromBufferAttribute(pos, idx.getX(t + 1));
      c.fromBufferAttribute(pos, idx.getX(t + 2));
      n.crossVectors(e1.subVectors(b, a), e2.subVectors(c, a));
      if (n.lengthSq() < 1e-8) continue;
      n.normalize();
      if (Math.abs(n.y) > 0.3) continue;
      // the bottom edge: the middle of the two lowest corners
      const [p, q] = [a, b, c].sort((u, v) => u.y - v.y);
      const mx = (p.x + q.x) / 2;
      const mz = (p.z + q.z) / 2;
      const yb = Math.min(p.y, q.y);
      const gFront = sp.ground(mx + n.x * 0.1, mz + n.z * 0.1);
      const gBack = sp.ground(mx - n.x * 0.1, mz - n.z * 0.1);
      if (yb < Math.max(gFront, gBack) + 0.05 && yb > Math.min(gFront, gBack) - 0.3) continue; // stands on a floor
      const restsFront = hits(from.set(mx + n.x * 0.05, yb + 0.02, mz + n.z * 0.05), DOWN, 0.08);
      const restsBack = hits(from.set(mx - n.x * 0.05, yb + 0.02, mz - n.z * 0.05), DOWN, 0.08);
      const goesOn = hits(from.set(mx + n.x * 0.08, yb - 0.04, mz + n.z * 0.08), dir.set(-n.x, 0, -n.z), 0.16);
      if (!restsFront && !restsBack && !goesOn) {
        note("hanging", mx, mz, `bottom edge at ${yb.toFixed(2)} m over a floor at ${gFront.toFixed(2)} m`);
        continue;
      }
      // a soffit (bottom well above the floor, resting on a lower ceiling behind): under that lower ceiling, a wall
      // must come before the ceiling rises again, else it is a slab hanging over open floor
      if (!restsBack || yb < gFront + 1.9) continue;
      for (let s = 0.1; s < 8; s += 0.1) {
        const x = mx - n.x * s;
        const z = mz - n.z * s;
        if (sp.dist(x, z) > 0) break;
        if (sp.ceiling(x, z) > yb + 0.3) {
          if (s > 0.8) note("floating", mx, mz, `a ${s.toFixed(1)} m wide lowered ceiling at ${yb.toFixed(2)} m with open floor under it`);
          break;
        }
      }
    }
  }
  if (built.rails) {
    const pos = built.rails.attributes.position;
    for (let k = 0; k < pos.count; k += 4) {
      const x = pos.getX(k);
      const z = pos.getZ(k);
      if (sp.dist(x, z) > 0.06) note("rail", x, z, `railing ${sp.dist(x, z).toFixed(2)} m into a wall`);
    }
  }
  // each room's ceiling tiles run along its own walls (archi/build.ts tileFrame)
  const tiles = (sh) => (sh.kind === "capsule" ? Math.atan2(-(sh.bz - sh.az), sh.bx - sh.ax) : sh.a ?? 0);
  for (const p of built.panels) {
    const o = sp.ownerIndex(p.x, p.z);
    if (o < 0) continue;
    const d = p.a - tiles(sp.shapes[o]);
    const off = Math.abs(((d % (Math.PI / 2)) + Math.PI / 2) % (Math.PI / 2));
    const skew = Math.min(off, Math.PI / 2 - off);
    if (skew > 0.02) note("skewed", p.x, p.z, `${Math.round((skew * 180) / Math.PI)}° off the ceiling tiles`);
  }
}

/** the floors and ceilings the plan has within r of (x, z): on a seam, any height between them is right */
function heightsAround(sp, x, z, r) {
  const out = { owners: new Set(), gLo: Infinity, gHi: -Infinity, cLo: Infinity, cHi: -Infinity, open: false };
  for (const [dx, dz] of [[0, 0], [r, 0], [-r, 0], [0, r], [0, -r], [r, r], [-r, -r], [r, -r], [-r, r]]) {
    const i = sp.ownerIndex(x + dx, z + dz);
    if (i < 0) continue;
    out.owners.add(i);
    const g = sp.ground(x + dx, z + dz);
    out.gLo = Math.min(out.gLo, g);
    out.gHi = Math.max(out.gHi, g);
    out.cLo = Math.min(out.cLo, sp.shapes[i].ceil);
    out.cHi = Math.max(out.cHi, sp.shapes[i].ceil);
    out.open ||= !!sp.shapes[i].open;
  }
  return out;
}

function vertical(sp, mesh, ray, found) {
  const TOL = 0.05;
  const STEP = 0.25;
  const R = 0.3;
  const up = new THREE.Vector3(0, 1, 0);
  const down = new THREE.Vector3(0, -1, 0);
  const from = new THREE.Vector3();
  const [x0, z0, x1, z1] = sp.bounds;
  found.floor = new Map();
  found.ceiling = new Map();
  const note = (kind, x, z, what) => {
    const k = `${Math.round(x / 3) * 3},${Math.round(z / 3) * 3}`;
    const e = found[kind].get(k) ?? { n: 0, what };
    e.n++;
    found[kind].set(k, e);
  };
  const probe = (x, z) => {
    if (sp.dist(x, z) > -0.03) return;
    const { owners, gLo, gHi, cLo, cHi, open } = heightsAround(sp, x, z, R);
    const i = sp.ownerIndex(x, z);
    if (i < 0) return;
    const at = `#${i}${sp.shapes[i].tag ? ` (${sp.shapes[i].tag})` : ""}${owners.size > 1 ? " seam" : ""}`;
    const g = sp.ground(x, z);
    const c = sp.ceiling(x, z);
    ray.set(from.set(x, open ? gHi + 1.2 : Math.min(gHi + 1.2, cLo - 0.02), z), down);
    const f = ray.intersectObject(mesh)[0];
    if (!f) note("floor", x, z, `no floor under ${at} (plan: ${g.toFixed(2)} m)`);
    else if (f.point.y < gLo - TOL || f.point.y > gHi + TOL) note("floor", x, z, `floor at ${f.point.y.toFixed(2)} m in ${at}, plan says ${g.toFixed(2)} m`);
    if (open) return;
    ray.set(from.set(x, Math.max(g, f ? f.point.y : g) + 0.05, z), up); // from the floor actually drawn
    const h = ray.intersectObject(mesh)[0];
    if (!h) note("ceiling", x, z, `no ceiling over ${at} (plan: ${c.toFixed(2)} m)`);
    else if (h.point.y < cLo - TOL || h.point.y > cHi + TOL) note("ceiling", x, z, `ceiling at ${h.point.y.toFixed(2)} m in ${at}, plan says ${c.toFixed(2)} m`);
    return owners.size > 1;
  };
  // off the grid the geometry is traced on by an odd fraction: a ray exactly on a triangle edge may slip through
  const J = 0.0137;
  for (let x = x0 + STEP / 2 + J; x < x1; x += STEP) {
    for (let z = z0 + STEP / 2 + J; z < z1; z += STEP) {
      if (!probe(x, z)) continue;
      // a seam: look closer
      for (const ox of [-0.083, 0, 0.083]) for (const oz of [-0.083, 0, 0.083]) if (ox || oz) probe(x + ox, z + oz);
    }
  }
}

const only = process.argv.slice(2).find((a) => !a.startsWith("--"));
const full = process.argv.includes("--full"); // every spot, not just the 4 worst of each kind
for (const [name, { space, spawn }] of Object.entries(places)) {
  if (only && name !== only) continue;
  const { spots: n, rays, found } = audit(space, spawn);
  const total = (m) => [...m.values()].reduce((a, e) => a + e.n, 0);
  console.log(`${name}: ${n} spots, ${rays} rays — void ${total(found.void)} rays, phantom ${total(found.phantom)}, invisible ${total(found.invisible)}, floor ${total(found.floor)} rays, ceiling ${total(found.ceiling)} rays`);
  console.log(`   construction: hanging ${total(found.hanging)}, floating ${total(found.floating)}, rail ${total(found.rail)}, skewed ${total(found.skewed)}`);
  for (const kind of ["void", "phantom", "invisible", "floor", "ceiling", "hanging", "floating", "rail", "skewed"]) {
    for (const [k, e] of [...found[kind]].sort((a, b) => b[1].n - a[1].n).slice(0, full ? found[kind].size : 4)) console.log(`   ${kind} @${k} ×${e.n}  ${e.what}`);
  }
}
