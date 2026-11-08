/** Axis-aligned box on the ground plane (metres). The player is a circle that slides along these. */
export type Box = { minX: number; maxX: number; minZ: number; maxZ: number };

/** Box from its centre and size: easier to read in zone layouts. */
export function box(cx: number, cz: number, width: number, depth: number): Box {
  return { minX: cx - width / 2, maxX: cx + width / 2, minZ: cz - depth / 2, maxZ: cz + depth / 2 };
}

export function inside(x: number, z: number, b: Box): boolean {
  return x >= b.minX && x <= b.maxX && z >= b.minZ && z <= b.maxZ;
}

/**
 * Pushes a circle (x, z, radius) out of every box it overlaps, so the player slides along walls
 * instead of sticking. Two passes settle corners where two boxes meet.
 */
export function collide(x: number, z: number, radius: number, boxes: readonly Box[]): [number, number] {
  for (let pass = 0; pass < 2; pass++) {
    for (const b of boxes) {
      const nearX = Math.max(b.minX, Math.min(x, b.maxX));
      const nearZ = Math.max(b.minZ, Math.min(z, b.maxZ));
      const dx = x - nearX;
      const dz = z - nearZ;
      const dist = Math.hypot(dx, dz);
      if (dist >= radius) continue;
      if (dist > 1e-6) {
        x = nearX + (dx / dist) * radius;
        z = nearZ + (dz / dist) * radius;
      } else {
        // centre inside the box (very fast move or spawn): leave through the closest side
        const exits = [x - b.minX, b.maxX - x, z - b.minZ, b.maxZ - z];
        const side = exits.indexOf(Math.min(...exits));
        if (side === 0) x = b.minX - radius;
        else if (side === 1) x = b.maxX + radius;
        else if (side === 2) z = b.minZ - radius;
        else z = b.maxZ + radius;
      }
    }
  }
  return [x, z];
}
