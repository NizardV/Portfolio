import { Color } from "three";
import { meadowHeight } from "../../terrain";

const LIGHT_GRASS = new Color("#6fb83a");
const DEEP_GRASS = new Color("#3f8a24");

/** The colour of the meadow at a point: lighter on crests, deeper in hollows, with soft patches. */
export function grassTint(x: number, z: number, out: Color): Color {
  const h = meadowHeight(x, z);
  const patches = 0.5 + 0.25 * Math.sin(x * 0.11 + Math.sin(z * 0.07) * 2) + 0.25 * Math.sin(z * 0.13 - x * 0.05);
  const crest = Math.min(1, Math.max(0, (h - meadowHeight(x + 6, z + 6) + 1.5) / 3)); // rough « facing up-slope »
  return out.copy(DEEP_GRASS).lerp(LIGHT_GRASS, Math.min(1, patches * 0.7 + crest * 0.4));
}
