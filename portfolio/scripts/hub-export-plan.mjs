/**
 * Exports what Blender needs to draw a skin (Shape.skin) from the game's own plan: the skinned rooms and every room
 * around them (exact outlines, floor and ceiling heights, the order that decides who owns an overlap), the solids standing
 * in them, and each room's 60 cm tile grid. tools/blender/skin.py reads it.
 * Usage, from portfolio/: node scripts/hub-export-plan.mjs <PLACE> <skin>      e.g. LOBBY slice0
 * Output: tools/blender/plans/<skin>.json
 */
import fs from "fs";
import path from "path";
import { loadPlaces } from "./lib/places.mjs";

const [placeName, skin] = process.argv.slice(2);
if (!placeName || !skin || !/^[a-z0-9_-]+$/.test(skin)) {
  console.error("usage: node scripts/hub-export-plan.mjs <PLACE> <skin>");
  process.exit(1);
}
const { build, sdf, places } = await loadPlaces();
const place = places[placeName];
if (!place) throw new Error(`unknown place ${placeName} (${Object.keys(places).join(", ")})`);
const sp = place.space;
const skinned = sp.shapes.map((s, i) => [s, i]).filter(([s]) => s.skin === skin);
if (!skinned.length) throw new Error(`no shape has skin « ${skin} » in ${placeName}`);

// every room whose bounds come within 2 m of the skinned ones: neighbours (openings) and later rooms (overlaps)
const box = skinned.map(([s]) => sdf.geomBounds(s)).reduce((a, b) => [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[2], b[2]), Math.max(a[3], b[3])]);
const near = (b) => b[0] < box[2] + 2 && b[2] > box[0] - 2 && b[1] < box[3] + 2 && b[3] > box[1] - 2;
const round = (pts) => pts.map(([x, z]) => [+x.toFixed(4), +z.toFixed(4)]);
const centre = (s) => (s.kind === "capsule" ? [(s.ax + s.bx) / 2, (s.az + s.bz) / 2] : [s.x, s.z]);
// the ceiling's look, as archi/build.ts picks it
const ceilingKey = (s) => {
  if (s.ceilMat) return s.ceilMat;
  return { tile: "tile", concrete: "concrete", marble: "plaster" }[s.mat] ?? "ceiling";
};
const floorOf = (f) => {
  if (f === undefined) return 0;
  return typeof f === "number" ? f : Math.min(f.ha, f.hb);
};

const rooms = sp.shapes
  .map((s, index) => ({ s, index }))
  .filter(({ s }) => near(sdf.geomBounds(s)))
  .map(({ s, index }) => ({
    index,
    skinned: s.skin === skin,
    outline: round(build.solidOutline(s)),
    floor: floorOf(s.floor),
    ramp: typeof s.floor === "object" ? s.floor : null,
    ceil: s.open ? floorOf(s.floor) + 8 : s.ceil,
    open: !!s.open,
    angle: "a" in s && s.a ? s.a : 0,
    centre: centre(s).map((v) => +v.toFixed(4)),
    mat: s.mat ?? "carpet",
    wall: s.wall ?? "wallpaper",
    ceilMat: ceilingKey(s),
    lights: s.lights ?? 0,
    dead: s.dead ?? 0.12,
    tag: s.tag ?? null,
  }));
const solids = sp.solids
  .filter((so) => !so.ghost && near(sdf.geomBounds(so)))
  .map((so) => {
    const [x0, z0, x1, z1] = sdf.geomBounds(so);
    return { outline: round(build.solidOutline(so)), h: so.h ?? null, base: sp.ground((x0 + x1) / 2, (z0 + z1) / 2), wall: so.mat ?? null, tag: so.tag ?? null };
  });

const out = path.join(process.cwd(), "tools/blender/plans", `${skin}.json`);
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify({ place: placeName, skin, grid: build.TILE_GRID, rooms, solids }, null, 1));
console.log(`${skin}: ${rooms.filter((r) => r.skinned).length} skinned rooms, ${rooms.filter((r) => !r.skinned).length} around them, ${solids.length} solids → ${path.relative(process.cwd(), out)}`);
