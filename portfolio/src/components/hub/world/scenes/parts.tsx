"use client";

/** A glowing opening: light seems to pour in from the other side of a doorway. */
export function LightOpening({ position, rotationY = 0, width, height }: { position: [number, number, number]; rotationY?: number; width: number; height: number }) {
  return (
    <mesh position={[position[0], position[1] + height / 2, position[2]]} rotation={[0, rotationY, 0]}>
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial color="#ffffff" toneMapped={false} />
    </mesh>
  );
}
