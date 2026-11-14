import { buildSpaceAsync, type Built } from "../archi/build";
import type { Shape, Space } from "../archi/sdf";

/** A point on a doorway plane; walking through it means walking along yaw (0 = towards -z). */
export type Anchor = { x: number; z: number; y: number; yaw: number };

export const forward = (yaw: number): [number, number] => [-Math.sin(yaw), -Math.cos(yaw)];

/**
 * A short passage on the far side of a doorway (behind the anchor, against its yaw): arriving through a doorway
 * leaves you a few centimetres past its plane, and this keeps that spot inside the place.
 */
export function throat(a: Anchor, w: number, h: number, len = 1.6): Shape {
  const [fx, fz] = forward(a.yaw);
  // starts 0.3 m on the near side so it always overlaps the room it opens from (no seam on the doorway line)
  const mid = len / 2 - 0.3;
  return { kind: "box", x: a.x - fx * mid, z: a.z - fz * mid, w, d: len, a: a.yaw, floor: a.y, ceil: a.y + h, lights: 0 };
}

/** The same anchor, facing the other way (the way back out). */
export const back = (a: Anchor): Anchor => ({ ...a, yaw: a.yaw + Math.PI });

/**
 * Geometry is derived once per visit, on first need (scene, doorway preview, or getting ready behind a door), then
 * shared. In small slices while nobody waits for it; in big ones as soon as someone stands in the place (urgent).
 */
export function lazyBuilt(space: Space): (urgent?: boolean) => Promise<Built> {
  let built: Promise<Built> | null = null;
  const budget = { ms: 6 };
  return (urgent = false) => {
    if (urgent) budget.ms = 40;
    return (built ??= buildSpaceAsync(space, budget));
  };
}

/** box helper for rotated rooms: centre, size, angle */
export const room = (x: number, z: number, w: number, d: number, extra: Partial<Shape> & { ceil: number }): Shape => ({ kind: "box", x, z, w, d, ...extra }) as Shape;
