/**
 * The meadow's relief, as a pure function: the scene builds its hills from it, the player walks on it and the
 * grass shader plants its blades on it (same formula, generated in GLSL below), so all three always agree.
 */

/**
 * Houses standing in the meadow (axis-aligned footprints, metres). The first one holds the white door: you go in
 * through its front doorway, and the door stands against its back wall. The others are closed.
 */
export const MEADOW_HOUSES = [
  { x: 0, z: -13.6, w: 7, d: 6, h: 3, color: "#f4f1e6", roof: "#7d8794", door: true },
  { x: -40, z: 6, w: 8, d: 6.5, h: 3.4, color: "#efe2b4", roof: "#6d6170" },
  { x: 36, z: -34, w: 6.5, d: 7.5, h: 3.2, color: "#e9e6f0", roof: "#5e6b78" },
] as const;
/** the white door, inside the first house, against its back wall (walking through it = looking north) */
export const MEADOW_DOOR = { x: 0, z: MEADOW_HOUSES[0].z - MEADOW_HOUSES[0].d / 2 + 0.45 };
/** the way down into Dreamcore: a deep round hole with a soft lip, far from the wake-up spot but in plain view */
export const MEADOW_HOLE = { x: -30, z: -42, r: 1.3, rim: 3.6, depth: 2.6 };
/** the big « Bliss » hill the door stands in front of */
const HILL = { x: 18, z: -105, radius: 75, height: 26 };
/** the small white house, far away on a ridge (scenery only) */
export const MEADOW_HOUSE = { x: -95, z: -175 };
const RIDGE = { radius: 60, height: 20 };

const smooth = (t: number) => t * t * (3 - 2 * t);
const ramp = (v: number, from: number, to: number) => smooth(Math.min(1, Math.max(0, (v - from) / (to - from))));
const bump = (x: number, z: number, cx: number, cz: number, radius: number, height: number) =>
  height * Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / radius ** 2);

/** how far the ground drops at distance r from the hole's centre: a rounded lip, then a shaft */
export function holeDrop(r: number): number {
  const { r: inner, rim, depth } = MEADOW_HOLE;
  if (r >= rim) return 0;
  if (r > inner) return (depth * (1 - Math.cos(((rim - r) / (rim - inner)) * Math.PI))) / 2;
  return depth + (inner - r) * 14;
}

/** 1 where the ground is bare (inside a house, in the hole): no grass, no flowers */
export function meadowBare(x: number, z: number): number {
  for (const hs of MEADOW_HOUSES) if (Math.abs(x - hs.x) < hs.w / 2 + 0.2 && Math.abs(z - hs.z) < hs.d / 2 + 0.2) return 1;
  return Math.hypot(x - MEADOW_HOLE.x, z - MEADOW_HOLE.z) < MEADOW_HOLE.rim - 0.3 ? 1 : 0;
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
  return pads(x, z, rawHeight(x, z)) - holeDrop(Math.hypot(x - MEADOW_HOLE.x, z - MEADOW_HOLE.z));
}

function rawHeight(x: number, z: number): number {
  // gentle swell where you walk (about a metre), so the ground never feels flat
  const near = 0.7 * Math.sin(x * 0.045 + 0.5) * Math.cos(z * 0.038) + 0.45 * Math.sin((x + z) * 0.07 + 1.3);
  // rolling hills that grow towards the horizon
  const far = ramp(Math.hypot(x, z), 35, 150) * ((Math.sin(x * 0.012) * Math.cos(z * 0.015) + 1) * 13 + Math.sin(x * 0.03 + z * 0.02) * 5);
  return (
    near +
    far +
    bump(x, z, HILL.x, HILL.z, HILL.radius, HILL.height) +
    bump(x, z, MEADOW_HOUSE.x, MEADOW_HOUSE.z, RIDGE.radius, RIDGE.height)
  );
}

const f = (n: number) => n.toFixed(4); // GLSL float literal

/** The same relief for shaders: `float meadowHeight(vec2 p)`. */
export const MEADOW_HEIGHT_GLSL = /* glsl */ `
float meadowSmooth(float t) { return t * t * (3.0 - 2.0 * t); }
float meadowRamp(float v, float a, float b) { return meadowSmooth(clamp((v - a) / (b - a), 0.0, 1.0)); }
float meadowBump(vec2 p, vec2 c, float r, float h) { vec2 d = p - c; return h * exp(-dot(d, d) / (r * r)); }
float meadowRaw(vec2 p) {
  float x = p.x, z = p.y;
  float near = 0.7 * sin(x * 0.045 + 0.5) * cos(z * 0.038) + 0.45 * sin((x + z) * 0.07 + 1.3);
  float far = meadowRamp(length(p), 35.0, 150.0) * ((sin(x * 0.012) * cos(z * 0.015) + 1.0) * 13.0 + sin(x * 0.03 + z * 0.02) * 5.0);
  return near + far
    + meadowBump(p, vec2(${f(HILL.x)}, ${f(HILL.z)}), ${f(HILL.radius)}, ${f(HILL.height)})
    + meadowBump(p, vec2(${f(MEADOW_HOUSE.x)}, ${f(MEADOW_HOUSE.z)}), ${f(RIDGE.radius)}, ${f(RIDGE.height)});
}
float meadowHole(float r) {
  float inner = ${f(MEADOW_HOLE.r)}, rim = ${f(MEADOW_HOLE.rim)}, depth = ${f(MEADOW_HOLE.depth)};
  if (r >= rim) return 0.0;
  if (r > inner) return depth * (1.0 - cos((rim - r) / (rim - inner) * 3.14159265)) * 0.5;
  return depth + (inner - r) * 14.0;
}
float meadowHeight(vec2 p) {
  float h = meadowRaw(p);
${MEADOW_HOUSES.map((hs) => `  { vec2 q = max(abs(p - vec2(${f(hs.x)}, ${f(hs.z)})) - vec2(${f(hs.w / 2 + 0.5)}, ${f(hs.d / 2 + 0.5)}), 0.0);
    float w = 1.0 - meadowSmooth(min(1.0, length(q) / 6.0));
    h += (${f(padHeight(hs))} - h) * w; }`).join("\n")}
  return h - meadowHole(length(p - vec2(${f(MEADOW_HOLE.x)}, ${f(MEADOW_HOLE.z)})));
}
float meadowBare(vec2 p) {
${MEADOW_HOUSES.map((hs) => `  if (abs(p.x - ${f(hs.x)}) < ${f(hs.w / 2 + 0.2)} && abs(p.y - ${f(hs.z)}) < ${f(hs.d / 2 + 0.2)}) return 1.0;`).join("\n")}
  return length(p - vec2(${f(MEADOW_HOLE.x)}, ${f(MEADOW_HOLE.z)})) < ${f(MEADOW_HOLE.rim - 0.3)} ? 1.0 : 0.0;
}
`;
