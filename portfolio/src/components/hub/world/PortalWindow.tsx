"use client";
import { createContext, Suspense, useContext } from "react";
import { MeshPortalMaterial } from "@react-three/drei";
import { SCENES } from "./scenes";
import { doorwayTransform, type Portal } from "./zones";

/** True inside a doorway preview: scenes may lighten themselves (less grass, fewer lights…). */
export const PreviewContext = createContext(false);
export const usePreview = () => useContext(PreviewContext);

/**
 * A doorway that shows the place behind it, live: the destination scene is rendered from the player's own eye,
 * placed so its doorway lines up with this one. Walking through then swaps places without any visible cut.
 */
export default function PortalWindow({ portal }: { portal: Portal }) {
  const link = portal.link!;
  const Scene = SCENES[portal.to];
  const { position, rotationY } = doorwayTransform(link);
  const fx = -Math.sin(link.from.yaw);
  const fz = -Math.cos(link.from.yaw);
  return (
    <mesh position={[link.from.x + fx * 0.09, link.from.y + link.h / 2, link.from.z + fz * 0.09]} rotation={[0, link.from.yaw, 0]}>
      <planeGeometry args={[link.w + 0.04, link.h + 0.02]} />
      <MeshPortalMaterial worldUnits blur={0} resolution={512}>
        <PreviewContext.Provider value={true}>
          <Suspense fallback={null}>
            <group position={position} rotation={[0, rotationY, 0]}>
              <Scene />
            </group>
          </Suspense>
        </PreviewContext.Provider>
      </MeshPortalMaterial>
    </mesh>
  );
}
