/**
 * The meadow's relief, as a pure function: the scene builds its hills from it, the player walks on it and the
 * grass shader plants its blades on it (same formula, generated in GLSL below), so all three always agree.
 */

export const MEADOW_DOOR = { x: 0, z: -12 };
/** the big « Bliss » hill the door stands in front of */
const HILL = { x: 18, z: -105, radius: 75, height: 26 };
/** the small white house, far away on a ridge (scenery only) */
export const MEADOW_HOUSE = { x: -95, z: -175 };
const RIDGE = { radius: 60, height: 20 };

const smooth = (t: number) => t * t * (3 - 2 * t);
const ramp = (v: number, from: number, to: number) => smooth(Math.min(1, Math.max(0, (v - from) / (to - from))));
const bump = (x: number, z: number, cx: number, cz: number, radius: number, height: number) =>
  height * Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / radius ** 2);

export function meadowHeight(x: number, z: number): number {
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
float meadowHeight(vec2 p) {
  float x = p.x, z = p.y;
  float near = 0.7 * sin(x * 0.045 + 0.5) * cos(z * 0.038) + 0.45 * sin((x + z) * 0.07 + 1.3);
  float far = meadowRamp(length(p), 35.0, 150.0) * ((sin(x * 0.012) * cos(z * 0.015) + 1.0) * 13.0 + sin(x * 0.03 + z * 0.02) * 5.0);
  return near + far
    + meadowBump(p, vec2(${f(HILL.x)}, ${f(HILL.z)}), ${f(HILL.radius)}, ${f(HILL.height)})
    + meadowBump(p, vec2(${f(MEADOW_HOUSE.x)}, ${f(MEADOW_HOUSE.z)}), ${f(RIDGE.radius)}, ${f(RIDGE.height)});
}
`;
