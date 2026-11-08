"use client";
import type { Box } from "../collision";

/** Renders collision boxes as solid blocks (walls, pillars, rocks): the layout is written once, in zones.ts. */
export function Blocks({ boxes, height, color, roughness = 0.9 }: { boxes: readonly Box[]; height: number; color: string; roughness?: number }) {
  return (
    <>
      {boxes.map((b) => (
        <mesh key={`${b.minX}:${b.minZ}`} position={[(b.minX + b.maxX) / 2, height / 2, (b.minZ + b.maxZ) / 2]}>
          <boxGeometry args={[b.maxX - b.minX, height, b.maxZ - b.minZ]} />
          <meshStandardMaterial color={color} roughness={roughness} />
        </mesh>
      ))}
    </>
  );
}

/** A glowing opening: light seems to pour in from the other side of a doorway. */
export function LightOpening({ position, rotationY = 0, width, height }: { position: [number, number, number]; rotationY?: number; width: number; height: number }) {
  return (
    <mesh position={[position[0], position[1] + height / 2, position[2]]} rotation={[0, rotationY, 0]}>
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial color="#ffffff" toneMapped={false} />
    </mesh>
  );
}
