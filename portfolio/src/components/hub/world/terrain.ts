/**
 * The meadow's relief, as a pure function: the scene builds its hills from it, the player walks on it and the
 * grass shader plants its blades on it (same formula, generated in GLSL below), so all three always agree.
 *
 * Layout: you wake up in the open. Far ahead, on the flank of the big hill, the house that holds the white door.
 * A few houses scattered very far apart. Behind you, beyond a hill you cannot see over, the hole.
 */

/**
 * Houses standing in the meadow (axis-aligned footprints, metres; `lean` tilts them sideways, a little wrong).
 * The first one holds the white door: you go in through its front doorway, the door stands against its back wall.
 */
export const MEADOW_HOUSES = [
  // footprints match the Blender models (tools/blender/build.py): house_open 7 × 6, house_yellow 6 × 7 (2 floors),
  // house_cottage 8 × 6.5; `model` picks one, `color` repaints its walls
  { x: 28, z: -80, w: 7, d: 6, h: 3, lean: 0.015, model: "houseOpen", color: "#f4f1e6", door: true },
  { x: -74, z: -18, w: 8, d: 6.5, h: 3.2, lean: -0.05, model: "houseCottage", color: "#efe2b4" },
  { x: 86, z: 12, w: 6, d: 7, h: 5.8, lean: 0.06, model: "houseYellow", color: "#e9e6f0" },
  { x: -36, z: 92, w: 6, d: 7, h: 5.8, lean: -0.07, model: "houseYellow", color: "#f1d98f" },
  { x: -98, z: 58, w: 8, d: 6.5, h: 3.2, lean: 0.045, model: "houseCottage", color: "#e7ddd0" },
  { x: 150, z: -130, w: 6, d: 7, h: 5.8, lean: -0.04, model: "houseYellow", color: "#f2c9b8" },
  { x: -140, z: 120, w: 8, d: 6.5, h: 3.2, lean: 0.08, model: "houseCottage", color: "#d9e4ec" },
] as const;
/**
 * Points of interest of the meadow (see the plan: claude.ai/artifact/5fMWeqvH3Nt6mZrCgbwYsv). Evident: the door's
 * house, the power line, the swing tree. To look for: the picnic, the lamp, the dead-end path. Hidden: the hole,
 * the bathtub, the edge of the world.
 */
export const MEADOW_POI = {
  swing: { x: 110, z: -60 },
  picnic: { x: -110, z: 10 },
  lamp: { x: -60, z: -120 },
  path: { x: 45, z: 115, len: 60 },
  bathtub: { x: 140, z: 90 },
  power: { z: 5, x0: -170, x1: 60, step: 32 },
};
/** the meadow ends on a wall painted like the sky, far to the north, behind the big hill */
export const SKY_WALL = { z: -178, w: 1400, h: 120 };
/** where you can walk (beyond, the hills are scenery only); the sky wall stops you to the north */
export const MEADOW_LIMIT = 175;
const DOOR_HOUSE = MEADOW_HOUSES[0];
/** wall thickness of the door's house (colliders in zones.ts, mesh in scenes/meadow/Houses.tsx) */
export const HOUSE_WALL = 0.2;
/** the white door, inside the first house, against its back wall (walking through it = looking north) */
export const MEADOW_DOOR = { x: DOOR_HOUSE.x, z: DOOR_HOUSE.z - DOOR_HOUSE.d / 2 + HOUSE_WALL + 0.25 };
/** the way down into Dreamcore: a deep hole with a ragged, sagging lip, out of sight behind a hill */
export const MEADOW_HOLE = { x: -80, z: 92, r: 2.3, rim: 5.4, depth: 3.2 };
/** the big « Bliss » hill the door's house stands on */
const HILL = { x: 18, z: -105, radius: 75, height: 26 };
/** the small white house, far away on a ridge (scenery only) */
export const MEADOW_HOUSE = { x: -95, z: -175 };
const BUMPS = [
  { ...HILL },
  { x: MEADOW_HOUSE.x, z: MEADOW_HOUSE.z, radius: 60, height: 20 },
  // the hill that hides the hole from the wake-up spot
  { x: -52, z: 62, radius: 21, height: 11 },
  // the swing tree's hill, to the east
  { x: 110, z: -60, radius: 26, height: 9 },
  // hollows: the picnic, the lamp's little valley, the bathtub's flowers (negative bumps)
  { x: -110, z: 10, radius: 18, height: -4 },
  { x: -60, z: -120, radius: 16, height: -5 },
  { x: 140, z: 90, radius: 14, height: -3 },
];

const smooth = (t: number) => t * t * (3 - 2 * t);
const ramp = (v: number, from: number, to: number) => smooth(Math.min(1, Math.max(0, (v - from) / (to - from))));
const bump = (x: number, z: number, cx: number, cz: number, radius: number, height: number) =>
  height * Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / radius ** 2);

/** the hole is not round: its edge wanders with the angle */
const wobble = (a: number) => 1 + 0.13 * Math.sin(3 * a + 1.7) + 0.07 * Math.sin(5 * a + 0.4) + 0.04 * Math.sin(11 * a + 2.2);

/** how far the ground drops around the hole: it sags slowly, then curls over into the shaft */
export function holeDrop(dx: number, dz: number): number {
  const a = Math.atan2(dz, dx);
  const w = wobble(a);
  const inner = MEADOW_HOLE.r * w;
  const rim = MEADOW_HOLE.rim * (0.85 + 0.15 * w);
  const r = Math.hypot(dx, dz);
  if (r >= rim) return 0;
  if (r > inner) {
    const t = (rim - r) / (rim - inner);
    return MEADOW_HOLE.depth * t ** 2.2 + 0.08 * Math.sin(7 * a) * t;
  }
  return MEADOW_HOLE.depth + 0.08 * Math.sin(7 * a) + (inner - r) * 14;
}
/** the widest the hole gets (for the fall trigger and what has to give way around it) */
export const HOLE_REACH = { inner: MEADOW_HOLE.r * 1.24, rim: MEADOW_HOLE.rim * 1.04 };

/** the dead-end path: its centre line, from where it starts to where it stops (bare earth, no grass) */
export const PATH_LINE = { ax: MEADOW_POI.path.x + 10, az: MEADOW_POI.path.z + MEADOW_POI.path.len / 2, bx: MEADOW_POI.path.x, bz: MEADOW_POI.path.z - MEADOW_POI.path.len / 2 };
function onPath(x: number, z: number): boolean {
  const { ax, az, bx, bz } = PATH_LINE;
  const dx = bx - ax;
  const dz = bz - az;
  const t = Math.min(1, Math.max(0, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(x - ax - dx * t, z - az - dz * t) < 3;
}

/** 1 where the ground is bare (inside a house, down the hole): no grass, no flowers */
export function meadowBare(x: number, z: number): number {
  for (const hs of MEADOW_HOUSES) if (Math.abs(x - hs.x) < hs.w / 2 + 0.2 && Math.abs(z - hs.z) < hs.d / 2 + 0.2) return 1;
  if (onPath(x, z)) return 0.6;
  if (Math.hypot(x - MEADOW_POI.picnic.x, z - MEADOW_POI.picnic.z) < 2.2) return 1;
  return holeDrop(x - MEADOW_HOLE.x, z - MEADOW_HOLE.z) > 0.18 ? 1 : 0;
}

const padHeight = (hs: { x: number; z: number }) => rawHeight(hs.x, hs.z);

/** the ground under each house is levelled, blending back into the hills over a few metres */
function pads(x: number, z: number, h: number): number {
  for (const hs of MEADOW_HOUSES) {
    const dx = Math.max(0, Math.abs(x - hs.x) - hs.w / 2 - 0.5);
    const dz = Math.max(0, Math.abs(z - hs.z) - hs.d / 2 - 0.5);
    const w = 1 - smooth(Math.min(1, Math.hypot(dx, dz) / 6));
    if (w > 0) h += (padHeight(hs) - h) * w;
  }
  return h;
}

export function meadowHeight(x: number, z: number): number {
  return pads(x, z, rawHeight(x, z)) - holeDrop(x - MEADOW_HOLE.x, z - MEADOW_HOLE.z);
}

function rawHeight(x: number, z: number): number {
  // gentle swell where you walk (about a metre), so the ground never feels flat
  const near = 0.7 * Math.sin(x * 0.045 + 0.5) * Math.cos(z * 0.038) + 0.45 * Math.sin((x + z) * 0.07 + 1.3);
  // rolling hills that grow towards the horizon
  const far = ramp(Math.hypot(x, z), 35, 150) * ((Math.sin(x * 0.012) * Math.cos(z * 0.015) + 1) * 13 + Math.sin(x * 0.03 + z * 0.02) * 5);
  return near + far + BUMPS.reduce((s, b) => s + bump(x, z, b.x, b.z, b.radius, b.height), 0);
}

const f = (n: number) => n.toFixed(4); // GLSL float literal

/** The same relief for shaders: `float meadowHeight(vec2 p)` and `float meadowBare(vec2 p)`. */
export const MEADOW_HEIGHT_GLSL = /* glsl */ `
float meadowSmooth(float t) { return t * t * (3.0 - 2.0 * t); }
float meadowRamp(float v, float a, float b) { return meadowSmooth(clamp((v - a) / (b - a), 0.0, 1.0)); }
float meadowBump(vec2 p, vec2 c, float r, float h) { vec2 d = p - c; return h * exp(-dot(d, d) / (r * r)); }
float meadowRaw(vec2 p) {
  float x = p.x, z = p.y;
  float near = 0.7 * sin(x * 0.045 + 0.5) * cos(z * 0.038) + 0.45 * sin((x + z) * 0.07 + 1.3);
  float far = meadowRamp(length(p), 35.0, 150.0) * ((sin(x * 0.012) * cos(z * 0.015) + 1.0) * 13.0 + sin(x * 0.03 + z * 0.02) * 5.0);
  return near + far
${BUMPS.map((b) => `    + meadowBump(p, vec2(${f(b.x)}, ${f(b.z)}), ${f(b.radius)}, ${f(b.height)})`).join("\n")};
}
float meadowHole(vec2 d) {
  float a = atan(d.y, d.x);
  float w = 1.0 + 0.13 * sin(3.0 * a + 1.7) + 0.07 * sin(5.0 * a + 0.4) + 0.04 * sin(11.0 * a + 2.2);
  float inner = ${f(MEADOW_HOLE.r)} * w;
  float rim = ${f(MEADOW_HOLE.rim)} * (0.85 + 0.15 * w);
  float r = length(d);
  if (r >= rim) return 0.0;
  if (r > inner) {
    float t = (rim - r) / (rim - inner);
    return ${f(MEADOW_HOLE.depth)} * pow(t, 2.2) + 0.08 * sin(7.0 * a) * t;
  }
  return ${f(MEADOW_HOLE.depth)} + 0.08 * sin(7.0 * a) + (inner - r) * 14.0;
}
float meadowHeight(vec2 p) {
  float h = meadowRaw(p);
${MEADOW_HOUSES.map((hs) => `  { vec2 q = max(abs(p - vec2(${f(hs.x)}, ${f(hs.z)})) - vec2(${f(hs.w / 2 + 0.5)}, ${f(hs.d / 2 + 0.5)}), 0.0);
    float w = 1.0 - meadowSmooth(min(1.0, length(q) / 6.0));
    h += (${f(padHeight(hs))} - h) * w; }`).join("\n")}
  return h - meadowHole(p - vec2(${f(MEADOW_HOLE.x)}, ${f(MEADOW_HOLE.z)}));
}
float meadowBare(vec2 p) {
  { vec2 a = vec2(${f(PATH_LINE.ax)}, ${f(PATH_LINE.az)}), b = vec2(${f(PATH_LINE.bx)}, ${f(PATH_LINE.bz)});
    vec2 ab = b - a; float t = clamp(dot(p - a, ab) / dot(ab, ab), 0.0, 1.0);
    if (length(p - a - ab * t) < 3.0) return 0.6; }
  if (length(p - vec2(${f(MEADOW_POI.picnic.x)}, ${f(MEADOW_POI.picnic.z)})) < 2.2) return 1.0;
${MEADOW_HOUSES.map((hs) => `  if (abs(p.x - ${f(hs.x)}) < ${f(hs.w / 2 + 0.2)} && abs(p.y - ${f(hs.z)}) < ${f(hs.d / 2 + 0.2)}) return 1.0;`).join("\n")}
  return meadowHole(p - vec2(${f(MEADOW_HOLE.x)}, ${f(MEADOW_HOLE.z)})) > 0.18 ? 1.0 : 0.0;
}
`;
