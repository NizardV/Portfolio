import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import { Box3, Raycaster, Vector3, type Camera, type Scene, type WebGLRenderer } from "three";
import { loadJSON } from "./env";
import type { Zone } from "./zones";

/**
 * Building tools only: once `localStorage["hub-debug-spawn"]` is set (see World.firstArrival), the world exposes
 * `window.__hub` so scripts/hub-tour.mjs can move the camera, read the scene and audit what is placed in it.
 * Never set for visitors: nothing here runs in a normal visit.
 */
export type HubDebug = {
  zone: Zone;
  scene: Scene;
  camera: Camera;
  gl: WebGLRenderer;
  ground: (x: number, z: number) => number;
  /** puts the player there at once (no walking, no doorway fired) */
  teleport: (x: number, z: number, yaw: number, pitch?: number) => void;
  three: { Box3: typeof Box3; Raycaster: typeof Raycaster; Vector3: typeof Vector3 };
};

const debugOn = () => loadJSON<unknown>("hub-debug-spawn", null) !== null;

export function useHubDebug(zone: Zone, ground: HubDebug["ground"], teleport: HubDebug["teleport"]) {
  const { scene, camera, gl } = useThree();
  useEffect(() => {
    if (!debugOn()) return;
    const w = window as unknown as { __hub?: HubDebug };
    const handle: HubDebug = { zone, scene, camera, gl, ground, teleport, three: { Box3, Raycaster, Vector3 } };
    w.__hub = handle;
    return () => {
      if (w.__hub === handle) delete w.__hub;
    };
  }, [zone, scene, camera, gl, ground, teleport]);
}
