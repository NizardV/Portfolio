"use client";
import { useMemo } from "react";
import { CanvasTexture, SRGBColorSpace } from "three";
import { piecesGeometry, type Piece } from "../archi/build";
import { surface, type SurfaceKey } from "../archi/materials";

/** Many boxes as one mesh (furniture, shelves, racks, ledges…). Build the list once (useMemo) before passing it. */
export function Pieces({ pieces, color, glow, surfaceKey, tile = 1, roughness = 0.8, metalness = 0 }: { pieces: Piece[]; color: string; glow?: boolean; surfaceKey?: SurfaceKey; tile?: number; roughness?: number; metalness?: number }) {
  const geo = useMemo(() => piecesGeometry(pieces, tile), [pieces, tile]);
  if (!geo) return null;
  const tex = surfaceKey ? surface(surfaceKey) : null;
  return (
    <mesh geometry={geo}>
      {glow ? (
        <meshBasicMaterial color={color} toneMapped={false} />
      ) : (
        <meshStandardMaterial color={color} map={tex?.map} bumpMap={tex?.bump} roughness={roughness} metalness={metalness} />
      )}
    </mesh>
  );
}

/** A canvas texture drawn once (signs, screens, painted skies). */
export function useCanvas(w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void, deps: unknown[] = []) {
  return useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    draw(canvas.getContext("2d")!);
    const t = new CanvasTexture(canvas);
    t.colorSpace = SRGBColorSpace;
    return t;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- drawn once per set of inputs
  }, deps);
}

/** Rotate a local offset (lx, lz) by angle a (same convention as the shapes) and add it to (x, z). */
export const at = (x: number, z: number, lx: number, lz: number, a: number): [number, number] => [x + lx * Math.cos(a) + lz * Math.sin(a), z - lx * Math.sin(a) + lz * Math.cos(a)];

/** A seeded random, so props are the same for every visitor. */
export function seeded(seed: number) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}
