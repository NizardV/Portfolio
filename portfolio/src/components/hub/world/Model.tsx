"use client";
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { Mesh, MeshStandardMaterial, type Group, type Object3D } from "three";

/**
 * Models made in Blender (tools/blender/build.py), served from /public/hub/models. Plain .glb, no Draco: the site's
 * CSP has no 'wasm-unsafe-eval', and the models are small. Loaded through Suspense with the place they belong to.
 */
export const MODELS = {
  carousel: "/hub/models/carousel.glb",
  houseOpen: "/hub/models/house_open.glb",
  houseYellow: "/hub/models/house_yellow.glb",
  houseCottage: "/hub/models/house_cottage.glb",
  treeSwing: "/hub/models/tree_swing.glb",
  powerPole: "/hub/models/power_pole.glb",
  streetLamp: "/hub/models/street_lamp.glb",
  bathtub: "/hub/models/bathtub.glb",
} as const;
export type ModelId = keyof typeof MODELS;

/** Start downloading a place's models early (with its code and geometry, see scenes/index.ts PREPARE). */
export const preloadModels = (ids: readonly ModelId[]) => ids.forEach((id) => useGLTF.preload(MODELS[id], false, false));

type Props = {
  id: ModelId;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number | [number, number, number];
  /** colour override for every surface of the model (a house in another paint) */
  tint?: string;
  /** a node to animate by name each frame (the carousel's « spin », the swing…) */
  animate?: (node: Object3D, t: number) => void;
  node?: string;
};

/** One placed copy of a model (clones share geometry and textures with the cached original). */
export default function Model({ id, position, rotation, scale, tint, animate, node }: Props) {
  const { scene } = useGLTF(MODELS[id], false, false);
  const copy = useMemo(() => {
    const c = scene.clone(true);
    c.traverse((o) => {
      if (!(o instanceof Mesh)) return;
      if (!(o.material instanceof MeshStandardMaterial)) return;
      if (tint && /^walls_/.test(o.material.name)) {
        o.material = o.material.clone();
        o.material.color.set(tint);
      }
      // ceilings face down: lit by the ground's colour (green outdoors); a little light of their own keeps them white
      if (/^ceiling/.test(o.material.name)) {
        o.material = o.material.clone();
        o.material.emissive.set("#6a665e");
      }
    });
    return c;
  }, [scene, tint]);
  const moving = useRef<Object3D | null>(null);
  useEffect(() => {
    moving.current = node ? copy.getObjectByName(node) ?? null : null;
  }, [copy, node]);
  useFrame(({ clock }) => {
    if (animate && moving.current) animate(moving.current, clock.elapsedTime);
  });
  return <primitive object={copy as Group} position={position} rotation={rotation} scale={scale} />;
}
