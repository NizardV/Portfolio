/**
 * Visual tour of one hub place, as a player sees it, for a review (human or the `hub-critic` agent):
 *   - views picked automatically: spawn (4 directions), every interactable, every doorway, the farthest corners of
 *     the walkable area (looking down the longest sightlines), and every object flagged by the audit below;
 *   - a top-down map (walkable area coloured by height, unreachable interior, views, interactables, doorways, flags);
 *   - an audit of what the scenes place (the architecture itself is `pnpm hub:audit`'s job):
 *       traversable  a visible object at body height over a spot where the player can stand (walks through it)
 *       floating     an object hovering 6 cm–1 m above the floor, away from walls, resting on nothing
 *       sunk         a small object partly under the floor
 *       in-wall      an object whose centre is inside a wall or outside the place
 *   - draw calls / triangles per view, console errors;
 *   - contact sheets (6 views per image) + every view at full size.
 * Usage, from portfolio/:  node scripts/hub-tour.mjs <zone> [--samples N] [--only V03,V52] [--port P] [--no-build] [--keep-server]
 *   --only  re-shoot just these views of the last full tour (same spots), into <tmp>/hub-tour/<zone>-recheck/
 *   zone = meadow, lobby, bureaux, bassins, canaux, rouge, commerce, hotel, jeux, collines, lotissement
 * Output: <tmp>/hub-tour/<zone>/ (report.md, report.json, map.png, sheets/, views/). Uses the production build on
 * port 3100 or --port P (rebuilt first if a source file is newer than it, unless --no-build).
 */
import fs from "fs";
import os from "os";
import path from "path";
import { spawn, spawnSync } from "child_process";
import { chromium } from "@playwright/test";

const ROOT = process.cwd();
const args = process.argv.slice(2);
const zoneId = args.find((a) => !a.startsWith("--"));
const opt = (name, def) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith("--") ? Number(args[i + 1]) : def;
};
if (!zoneId) {
  console.error("usage: node scripts/hub-tour.mjs <zone> [--samples N] [--port P] [--no-build] [--keep-server]");
  process.exit(1);
}
const PORT = opt("port", 3100);
const BASE = `http://localhost:${PORT}`;
const only = (() => {
  const i = args.indexOf("--only");
  return i >= 0 && args[i + 1] ? new Set(args[i + 1].split(",")) : null;
})();
const previous = only ? JSON.parse(fs.readFileSync(path.join(os.tmpdir(), "hub-tour", zoneId, "report.json"), "utf8")) : null;
const OUT = path.join(os.tmpdir(), "hub-tour", only ? `${zoneId}-recheck` : zoneId);
const SHOT = { w: 960, h: 540 };
// next itself, not `pnpm build` / `pnpm exec`: those reinstall node_modules when the local pnpm is not the repo's
const NEXT = path.join(ROOT, "node_modules/next/dist/bin/next");

/* ---------- production server ---------- */

const newest = (dir) => {
  let t = 0;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    t = Math.max(t, e.isDirectory() ? newest(p) : fs.statSync(p).mtimeMs);
  }
  return t;
};
const up = async () => {
  try {
    return (await fetch(BASE, { signal: AbortSignal.timeout(3000) })).ok;
  } catch {
    return false;
  }
};

let server = null;
const buildId = path.join(ROOT, ".next/BUILD_ID");
const stale = !fs.existsSync(buildId) || newest(path.join(ROOT, "src")) > fs.statSync(buildId).mtimeMs;
if (stale && !args.includes("--no-build")) {
  if (await up()) {
    console.error(`A server already runs on :${PORT} with an outdated build: stop it, use another --port, or pass --no-build.`);
    process.exit(1);
  }
  console.log("Build is older than the sources: next build…");
  if (spawnSync(process.execPath, [NEXT, "build"], { stdio: "inherit" }).status !== 0) process.exit(1);
}
if (!(await up())) {
  server = spawn(process.execPath, [NEXT, "start", "-p", String(PORT)], { stdio: "ignore" });
  for (let i = 0; i < 60 && !(await up()); i++) await new Promise((r) => setTimeout(r, 1000));
  if (!(await up())) throw new Error(`next start did not come up on :${PORT}`);
}
const stopServer = () => {
  if (!server || args.includes("--keep-server")) return;
  server.kill();
};

/* ---------- browser ---------- */

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(path.join(OUT, "views"), { recursive: true });
fs.mkdirSync(path.join(OUT, "sheets"), { recursive: true });

const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const errors = [];
try {
  const page = await browser.newPage({ viewport: { width: SHOT.w, height: SHOT.h }, deviceScaleFactor: 1 });
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error" && !/Failed to load resource|ERR_|speed-insights/.test(m.text())) errors.push(m.text());
  });
  await page.goto(`${BASE}/`);
  await page.evaluate((zone) => {
    localStorage.setItem("hub-debug-spawn", JSON.stringify({ zone, x: 0, z: 0, yaw: 0 }));
    localStorage.setItem("hub-v2-settings", JSON.stringify({ quality: "high", headBob: false }));
  }, zoneId);
  await page.goto(`${BASE}/hub`);
  // only the 3D view in the shots: no hint, menu button, veil or wake-up blur
  await page.addStyleTag({ content: "body * { visibility: hidden !important } canvas { visibility: visible !important; filter: none !important }" });
  await page.waitForFunction(() => window.__hub, null, { timeout: 120_000 });
  const known = await page.evaluate(() => window.__hub.zone.id);
  if (known !== zoneId) throw new Error(`unknown zone « ${zoneId} » (the world opened « ${known} »)`);
  await page.evaluate(() => {
    const s = window.__hub.zone.spawn;
    window.__hub.teleport(s.x, s.z, s.yaw, 0);
  });

  // the place is built in slices over many frames: wait until the scene stops growing
  await page.evaluate(async () => {
    const count = () => {
      let n = 0;
      window.__hub.scene.traverse(() => n++);
      return n;
    };
    let last = -1;
    for (let calm = 0, i = 0; calm < 3 && i < 90; i++) {
      await new Promise((r) => setTimeout(r, 1000));
      const n = count();
      calm = n === last ? calm + 1 : 0;
      last = n;
    }
  });

  const audit = await page.evaluate(auditProps);
  const plan = await page.evaluate(planViews, { samples: opt("samples", 0), flags: audit.flags.slice(0, 6) });
  if (previous) plan.views = previous.views.filter((v) => only.has(v.id)).map(({ id, x, z, yaw, pitch, label }) => ({ id, x, z, yaw, pitch, label }));

  /* ---------- views ---------- */
  const views = [];
  for (const [i, v] of plan.views.entries()) {
    const id = v.id ?? `V${String(i + 1).padStart(2, "0")}`;
    const perf = await page.evaluate(async (v) => {
      const h = window.__hub;
      h.teleport(v.x, v.z, v.yaw, v.pitch);
      const frames = (n) => new Promise((r) => {
        const f = () => (--n <= 0 ? r() : requestAnimationFrame(f));
        requestAnimationFrame(f);
      });
      await frames(12); // lights ease towards the new spot, doorways nearby open their windows
      if (v.label.startsWith("passage")) {
        // the place behind a doorway is built in slices once you are near, in the portal's own scene (not reachable
        // from h.scene): give it time
        await new Promise((r) => setTimeout(r, 6000));
        await frames(6);
      }
      await new Promise((r) => setTimeout(r, 400));
      h.gl.info.autoReset = false;
      h.gl.info.reset();
      await frames(1);
      const { calls, triangles } = h.gl.info.render;
      h.gl.info.autoReset = true;
      return { calls, triangles };
    }, v);
    const file = path.join(OUT, "views", `${id}.png`);
    await page.locator("canvas").first().screenshot({ path: file, timeout: 180_000 });
    views.push({ id, ...v, ...perf, file });
    process.stdout.write(`\r${id}/${plan.views.length}`);
  }
  process.stdout.write("\n");

  /* ---------- map ---------- */
  const mapData = await page.evaluate(drawMap, { views: views.map(({ id, x, z, yaw }) => ({ id, x, z, yaw })), flags: audit.flags, reached: plan.cells });
  fs.writeFileSync(path.join(OUT, "map.png"), Buffer.from(mapData.split(",")[1], "base64"));

  /* ---------- contact sheets ---------- */
  const sheet = await browser.newPage({ viewport: { width: 1290, height: 1100 }, deviceScaleFactor: 1 });
  const sheets = [];
  for (let s = 0; s < views.length; s += 6) {
    const cells = views.slice(s, s + 6).map((v) => {
      const img = fs.readFileSync(v.file).toString("base64");
      return `<figure><img src="data:image/png;base64,${img}"><figcaption><b>${v.id}</b> ${escape(v.label)} · (${v.x.toFixed(1)}, ${v.z.toFixed(1)}) · ${deg(v.yaw)}°</figcaption></figure>`;
    });
    await sheet.setContent(
      `<style>body{margin:0;background:#111;display:grid;grid-template-columns:640px 640px;gap:6px;padding:2px;font:13px system-ui;color:#eee}
      figure{margin:0;position:relative}img{width:640px;height:360px;display:block}
      figcaption{position:absolute;left:0;bottom:0;right:0;background:#000b;padding:4px 8px}</style>${cells.join("")}`,
    );
    const file = path.join(OUT, "sheets", `sheet-${String(s / 6 + 1).padStart(2, "0")}.png`);
    await sheet.screenshot({ path: file, fullPage: true });
    sheets.push(file);
  }

  /* ---------- report ---------- */
  const maxBy = (k) => views.reduce((a, v) => (v[k] > a[k] ? v : a), views[0]);
  const report = { zone: zoneId, date: new Date().toISOString(), stats: audit.stats, flags: audit.flags, views, errors, sheets };
  fs.writeFileSync(path.join(OUT, "report.json"), JSON.stringify(report, null, 2));
  const md = [
    `# Tournée du hub — ${zoneId} (${report.date.slice(0, 16).replace("T", " ")})`,
    "",
    `Carte : map.png · planches : ${sheets.map((f) => path.basename(f)).join(", ")} · vues en grand : views/`,
    `Lieu : ${plan.reachable} m² atteignables sur ${plan.interior} m² intérieurs · ${audit.stats.meshes} objets audités (${audit.stats.skipped} ignorés : instanciés, transparents, très grands)`,
    "",
    "## Audit des objets",
    audit.flags.length ? "" : "Rien de signalé.",
    ...audit.flags.map((f) => `- **${f.kind}** ${f.what} @ (${f.x}, ${f.y}, ${f.z}) — ${f.detail}`),
    "",
    "## Performance",
    `- pire vue en draw calls : ${maxBy("calls").id} (${maxBy("calls").calls}) · en triangles : ${maxBy("triangles").id} (${Math.round(maxBy("triangles").triangles / 1000)} k)`,
    ...(maxBy("calls").calls > 300 ? ["- ⚠ plus de 300 draw calls : instancier ou fusionner"] : []),
    ...(maxBy("triangles").triangles > 1_500_000 ? ["- ⚠ plus de 1,5 M triangles"] : []),
    "",
    "## Erreurs console",
    errors.length ? errors.map((e) => `- ${e.slice(0, 300)}`).join("\n") : "Aucune.",
    "",
    "## Vues",
    ...views.map((v) => `- ${v.id} ${v.label} · (${v.x.toFixed(1)}, ${v.z.toFixed(1)}) yaw ${deg(v.yaw)}° · ${v.calls} calls, ${Math.round(v.triangles / 1000)} k tris`),
    "",
  ].join("\n");
  fs.writeFileSync(path.join(OUT, "report.md"), md);
  console.log(`${zoneId}: ${views.length} views, ${audit.flags.length} flags, ${errors.length} console errors → ${OUT}`);
} finally {
  await browser.close();
  stopServer();
}

function deg(yaw) {
  return ((Math.round((yaw * 180) / Math.PI) % 360) + 360) % 360;
}

function escape(s) {
  return String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]);
}

/* =====================================================================================================
 * The functions below run inside the page (page.evaluate): self-contained, they only use window.__hub.
 * ===================================================================================================== */

/** Audit of everything the scene draws besides the architecture. */
function auditProps() {
  const { scene, zone, ground, three } = window.__hub;
  const sp = zone.space;
  const RADIUS = 0.35;
  const boxes = [...(zone.colliders ?? []), ...(zone.interactables ?? []).filter((i) => i.blocker).map((i) => i.blocker)];
  const inBox = (x, z) => boxes.some((b) => x >= b.minX && x <= b.maxX && z >= b.minZ && z <= b.maxZ);
  const standable = (x, z) => (sp ? sp.dist(x, z) < -RADIUS - 0.01 && sp.slowAt(x, z) >= 1 : true) && !inBox(x, z);
  const r1 = (n) => Math.round(n * 10) / 10;

  const archi = new Set();
  scene.getObjectByName("archi")?.traverse((o) => archi.add(o));
  const visible = (o) => {
    for (let a = o; a; a = a.parent) if (!a.visible) return false;
    return true;
  };
  const nameOf = (o) => {
    const parts = [];
    for (let a = o; a && a !== scene && parts.length < 3; a = a.parent) if (a.name) parts.push(a.name);
    const mat = Array.isArray(o.material) ? o.material[0] : o.material;
    return (parts.join(" < ") || "(sans nom)") + (mat?.name ? ` [${mat.name}]` : "") + ` ${o.geometry?.type ?? ""}`;
  };

  const props = [];
  let skipped = 0;
  scene.traverse((o) => {
    if (!o.isMesh || archi.has(o) || !visible(o)) return;
    const mat = Array.isArray(o.material) ? o.material[0] : o.material;
    const box = new three.Box3().setFromObject(o);
    const size = box.getSize(new three.Vector3());
    if (o.isInstancedMesh || (mat?.transparent && mat.opacity < 0.5) || /water|glass|sky/i.test(mat?.name ?? "") || Math.max(size.x, size.y, size.z) > 30 || !isFinite(size.x)) {
      skipped++;
      return;
    }
    if (Math.max(size.x, size.y, size.z) < 0.12) return;
    props.push({ o, box, size, name: nameOf(o) });
  });

  const flags = [];
  const flag = (kind, p, x, y, z, detail) => {
    if (flags.some((f) => f.kind === kind && Math.hypot(f.x - x, f.z - z) < 1)) return;
    flags.push({ kind, what: p.name, x: r1(x), y: r1(y), z: r1(z), detail });
  };
  const ray = new three.Raycaster();
  const down = new three.Vector3(0, -1, 0);
  const from = new three.Vector3();

  for (const p of props) {
    const { box, size } = p;
    const cx = (box.min.x + box.max.x) / 2;
    const cz = (box.min.z + box.max.z) / 2;
    const g = ground(cx, cz);

    // walked through: solid surface at body height above a spot where the player can stand
    const step = Math.max(0.2, Math.sqrt((size.x * size.z) / 400));
    let hits = 0;
    let hy = 0;
    for (let x = box.min.x + step / 2; x < box.max.x; x += step) {
      for (let z = box.min.z + step / 2; z < box.max.z; z += step) {
        if (!standable(x, z)) continue;
        ray.set(from.set(x, box.max.y + 0.01, z), down);
        const hit = p.o.raycast ? ray.intersectObject(p.o, false)[0] : undefined;
        const h = hit ? hit.point.y - ground(x, z) : -1;
        if (h > 0.3 && h < 1.75) {
          hits++;
          hy = h;
        }
      }
    }
    if (hits >= 2) flag("traversable", p, cx, box.min.y, cz, `≈ ${(hits * step * step).toFixed(2)} m² à ${hy.toFixed(2)} m du sol, sans collision`);

    // inside a solid is fine: solids are the collision of what the scene draws there (a carousel, a house)
    if (sp?.walls && sp.dist(cx, cz) > 0.1 && !sp.solidAt(cx, cz) && Math.max(size.x, size.z) > 0.4) flag("in-wall", p, cx, box.min.y, cz, `centre ${sp.dist(cx, cz).toFixed(2)} m dans un mur ou hors du lieu`);

    const gap = box.min.y - g;
    const awayFromWalls = sp ? sp.dist(cx, cz) < -0.5 : true;
    if (gap > 0.06 && gap < 1 && awayFromWalls) {
      const resting = props.some((q) => q !== p && q.box.max.y >= box.min.y - 0.06 && q.box.min.y < box.min.y && q.box.min.x < box.max.x && q.box.max.x > box.min.x && q.box.min.z < box.max.z && q.box.max.z > box.min.z);
      if (!resting) flag("floating", p, cx, box.min.y, cz, `flotte à ${gap.toFixed(2)} m au-dessus du sol, ne repose sur rien`);
    }
    if (gap < -0.15 && box.max.y > g && size.y < 1.5 && -gap / size.y > 0.2) flag("sunk", p, cx, box.min.y, cz, `enfoncé de ${(-gap).toFixed(2)} m sous le sol (${Math.round((-gap / size.y) * 100)} % de sa hauteur)`);
  }
  const order = { traversable: 0, "in-wall": 1, floating: 2, sunk: 3 };
  flags.sort((a, b) => order[a.kind] - order[b.kind]);
  return { flags, stats: { meshes: props.length, skipped } };
}

/** Where to look from: spawn, interactables, doorways, far corners, flagged objects. */
function planViews({ samples, flags }) {
  const { zone, ground } = window.__hub;
  const sp = zone.space;
  const st = 1;
  const boxes = [...(zone.colliders ?? []), ...(zone.interactables ?? []).filter((i) => i.blocker).map((i) => i.blocker)];
  const free = (x, z) => (sp ? sp.fits(x, z, 0.35) : true) && !boxes.some((b) => x > b.minX - 0.35 && x < b.maxX + 0.35 && z > b.minZ - 0.35 && z < b.maxZ + 0.35);
  const s0 = zone.spawn;
  const key = (x, z) => `${Math.round(x / st)},${Math.round(z / st)}`;
  const seen = new Map([[key(s0.x, s0.z), [s0.x, s0.z]]]);
  const queue = [[s0.x, s0.z]];
  const LIMIT = sp ? Infinity : 90; // open places without a built space: stay around the spawn
  while (queue.length) {
    const [x, z] = queue.shift();
    for (const [dx, dz] of [[st, 0], [-st, 0], [0, st], [0, -st]]) {
      const nx = x + dx;
      const nz = z + dz;
      const k = key(nx, nz);
      if (seen.has(k) || Math.hypot(nx - s0.x, nz - s0.z) > LIMIT || !free(nx, nz) || Math.abs(ground(nx, nz) - ground(x, z)) > 0.45) continue;
      seen.set(k, [nx, nz]);
      queue.push([nx, nz]);
    }
  }
  const cells = [...seen.values()];
  let interior = cells.length;
  if (sp) {
    interior = 0;
    const [x0, z0, x1, z1] = sp.bounds;
    for (let x = x0; x < x1; x += st) for (let z = z0; z < z1; z += st) if (sp.dist(x, z) < 0) interior++;
  }

  // how far you see along a direction, at eye height (walls only: good enough to pick telling directions)
  const sight = (x, z, yaw) => {
    const dx = -Math.sin(yaw);
    const dz = -Math.cos(yaw);
    let t = 0;
    if (!sp) return 80; // open place without a built space: no walls to stop the eye
    while (t < 80 && sp.dist(x + dx * t, z + dz * t) < 0) t += 0.5;
    return t;
  };
  const near = (tx, tz, dMin, dMax) => {
    let best = null;
    for (const [x, z] of cells) {
      const d = Math.hypot(x - tx, z - tz);
      if (d < dMin || d > dMax) continue;
      let clear = true;
      for (let t = 0.1; t < 0.9 && clear; t += 0.1) if (sp && sp.dist(x + (tx - x) * t, z + (tz - z) * t) > 0) clear = false;
      const score = Math.abs(d - (dMin + dMax) / 2) + (clear ? 0 : 100);
      if (!best || score < best.score) best = { x, z, score };
    }
    return best && best.score < 100 ? best : null;
  };
  const facing = (x, z, tx, tz) => Math.atan2(-(tx - x), -(tz - z));

  const views = [];
  for (let k = 0; k < 4; k++) views.push({ x: s0.x, z: s0.z, yaw: s0.yaw + (k * Math.PI) / 2, pitch: 0, label: `arrivée ${k * 90}°` });
  for (const it of (zone.interactables ?? []).slice(0, 10)) {
    const at = near(it.x, it.z, 2, 4);
    if (at) views.push({ x: at.x, z: at.z, yaw: facing(at.x, at.z, it.x, it.z), pitch: -0.12, label: `interaction « ${it.verb} » (${it.id})` });
  }
  for (const p of zone.portals.slice(0, 8)) {
    const a = p.link?.from ?? (p.box ? { x: (p.box.minX + p.box.maxX) / 2, z: (p.box.minZ + p.box.maxZ) / 2 } : null);
    if (!a) continue;
    const at = near(a.x, a.z, 2.5, 5);
    if (at) views.push({ x: at.x, z: at.z, yaw: facing(at.x, at.z, a.x, a.z), pitch: 0, label: `passage vers ${p.to}` });
  }
  // far corners: farthest-point sampling over the walkable cells, looking down the longest sightline and around
  const n = samples || Math.max(5, Math.min(14, Math.round(cells.length / 180)));
  const picked = [[s0.x, s0.z]];
  const dmin = cells.map(([x, z]) => Math.hypot(x - s0.x, z - s0.z));
  for (let k = 0; k < n; k++) {
    let bi = 0;
    for (let i = 1; i < cells.length; i++) if (dmin[i] > dmin[bi]) bi = i;
    if (dmin[bi] < 4) break;
    const [fx, fz] = cells[bi];
    for (let i = 0; i < cells.length; i++) dmin[i] = Math.min(dmin[i], Math.hypot(cells[i][0] - fx, cells[i][1] - fz));
    // stand in the most open spot within 5 m of that far cell (a corner seen from inside, not a wall at 30 cm)
    let x = fx;
    let z = fz;
    if (sp) {
      for (const [cx, cz] of cells) if (Math.hypot(cx - fx, cz - fz) <= 5 && sp.dist(cx, cz) < sp.dist(x, z)) [x, z] = [cx, cz];
    }
    picked.push([x, z]);
    // up to 3 directions that see far (≥ 3 m), at least 60° apart, longest first
    const dirs = Array.from({ length: 24 }, (_, a) => ({ yaw: (a * Math.PI) / 12, d: sight(x, z, (a * Math.PI) / 12) })).sort((a, b) => b.d - a.d);
    const chosen = [];
    for (const dir of dirs) {
      if (chosen.length === 3 || (chosen.length && dir.d < 3)) break;
      if (chosen.every((c) => Math.abs(Math.atan2(Math.sin(c.yaw - dir.yaw), Math.cos(c.yaw - dir.yaw))) >= Math.PI / 3)) chosen.push(dir);
    }
    for (const [j, c] of chosen.entries()) views.push({ x, z, yaw: c.yaw, pitch: 0, label: `exploration ${k + 1}.${j + 1} (${Math.round(c.d)} m de vue)` });
  }
  for (const f of flags) {
    const at = near(f.x, f.z, 1.8, 3.5);
    if (!at) continue;
    const eye = ground(at.x, at.z) + 1.65;
    views.push({ x: at.x, z: at.z, yaw: facing(at.x, at.z, f.x, f.z), pitch: Math.atan2(f.y + 0.3 - eye, Math.hypot(f.x - at.x, f.z - at.z)), label: `signalé : ${f.kind}` });
  }
  return { views, reachable: cells.length * st * st, interior: interior * st * st, cells: [...seen.keys()] };
}

/** Top-down map: reachable floor by height, unreachable interior, views (arrow = direction), interactables, doorways, flags. */
function drawMap({ views, flags, reached }) {
  const reach = new Set(reached); // 1 m cells walked to from the spawn (planViews)
  const { zone, ground } = window.__hub;
  const sp = zone.space;
  const s0 = zone.spawn;
  const [x0, z0, x1, z1] = sp ? sp.bounds : [s0.x - 90, s0.z - 90, s0.x + 90, s0.z + 90];
  const scale = Math.max(3, Math.min(10, 1400 / Math.max(x1 - x0, z1 - z0)));
  const W = Math.ceil((x1 - x0) * scale);
  const H = Math.ceil((z1 - z0) * scale) + 40;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d");
  g.fillStyle = "#1b1b1f";
  g.fillRect(0, 0, W, H);
  const px = (x) => (x - x0) * scale;
  const pz = (z) => (z - z0) * scale;
  const step = 0.5;
  let gMin = Infinity;
  let gMax = -Infinity;
  const cells = [];
  for (let x = x0; x < x1; x += step) {
    for (let z = z0; z < z1; z += step) {
      const inside = sp ? sp.dist(x, z) < 0 : true;
      if (!inside) continue;
      const free = sp ? sp.fits(x, z, 0.35) : true;
      cells.push([x, z, ground(x, z), free, reach.has(`${Math.round(x)},${Math.round(z)}`)]);
    }
  }
  // colour range over the heights you walk on (a deep pit nobody reaches would flatten the rest)
  const hs = cells.filter((c) => c[4]).map((c) => c[2]).sort((a, b) => a - b);
  if (hs.length) {
    gMin = hs[Math.floor(hs.length * 0.02)];
    gMax = hs[Math.floor(hs.length * 0.98)];
  }
  for (const [x, z, h, free, walked] of cells) {
    const t = gMax > gMin ? Math.min(1, Math.max(0, (h - gMin) / (gMax - gMin))) : 0;
    g.fillStyle = !free ? "#5a5a66" : walked ? `hsl(${50 - t * 40}, ${55 + t * 30}%, ${62 - t * 22}%)` : "#2f4a6a";
    g.fillRect(px(x), pz(z), step * scale + 0.5, step * scale + 0.5);
  }
  g.lineWidth = 3;
  for (const p of zone.portals) {
    const a = p.link?.from;
    if (a) {
      const hx = Math.cos(a.yaw) * (p.link.w / 2);
      const hz = -Math.sin(a.yaw) * (p.link.w / 2);
      g.strokeStyle = "#39d";
      g.beginPath();
      g.moveTo(px(a.x - hx), pz(a.z - hz));
      g.lineTo(px(a.x + hx), pz(a.z + hz));
      g.stroke();
    } else if (p.box) {
      g.strokeStyle = "#39d";
      g.strokeRect(px(p.box.minX), pz(p.box.minZ), (p.box.maxX - p.box.minX) * scale, (p.box.maxZ - p.box.minZ) * scale);
    }
    const lx = a ? a.x : p.box ? p.box.minX : 0;
    const lz = a ? a.z : p.box ? p.box.minZ : 0;
    g.fillStyle = "#7cf";
    g.font = "12px sans-serif";
    g.fillText(`→ ${p.to}`, px(lx) + 4, pz(lz) - 4);
  }
  for (const it of zone.interactables ?? []) {
    g.fillStyle = "#c4f";
    g.beginPath();
    g.moveTo(px(it.x), pz(it.z) - 6);
    g.lineTo(px(it.x) + 6, pz(it.z));
    g.lineTo(px(it.x), pz(it.z) + 6);
    g.lineTo(px(it.x) - 6, pz(it.z));
    g.fill();
  }
  g.strokeStyle = "#f33";
  g.lineWidth = 2;
  for (const f of flags) {
    g.beginPath();
    g.moveTo(px(f.x) - 5, pz(f.z) - 5);
    g.lineTo(px(f.x) + 5, pz(f.z) + 5);
    g.moveTo(px(f.x) + 5, pz(f.z) - 5);
    g.lineTo(px(f.x) - 5, pz(f.z) + 5);
    g.stroke();
  }
  const placed = new Map();
  for (const v of views) {
    const k = `${v.x},${v.z}`;
    const n = placed.get(k) ?? 0;
    placed.set(k, n + 1);
    g.strokeStyle = "#fff";
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(px(v.x), pz(v.z));
    g.lineTo(px(v.x - Math.sin(v.yaw) * 2.5), pz(v.z - Math.cos(v.yaw) * 2.5));
    g.stroke();
    g.fillStyle = "#fff";
    g.beginPath();
    g.arc(px(v.x), pz(v.z), 3, 0, Math.PI * 2);
    g.fill();
    if (n === 0) {
      g.fillStyle = "#000";
      g.fillRect(px(v.x) + 4, pz(v.z) + 2, 26, 13);
      g.fillStyle = "#fff";
      g.font = "11px monospace";
      g.fillText(v.id, px(v.x) + 5, pz(v.z) + 12);
    }
  }
  g.fillStyle = "#fff";
  g.font = "13px sans-serif";
  g.fillRect(10, H - 22, 10 * scale, 4);
  g.fillText("10 m", 14 + 10 * scale, H - 16);
  g.fillText(`${zone.name} · jaune → rouge = plus haut (${gMin.toFixed(1)} → ${gMax.toFixed(1)} m) · gris = trop étroit · bleu nuit = libre mais inaccessible depuis l'arrivée · ◆ interaction · bleu = passage · ✕ signalé`, 120 + 10 * scale, H - 16);
  return c.toDataURL("image/png");
}
