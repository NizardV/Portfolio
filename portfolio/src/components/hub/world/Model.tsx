"use client";
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { Group, Matrix4, Mesh, MeshStandardMaterial, type BufferGeometry, type Material, type Object3D } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

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

/**
 * A model as Blender exports it is dozens of small meshes (each window frame, each muntin, each insulator): one draw call
 * each, ~100 per house, and the meadow seen through the Lobby's door cost ~1100 of them (found by hub:tour). Here every
 * mesh sharing a material is merged into one, in the model's own space. Nodes that move (keep) stay nodes, with what
 * they carry merged inside them. Done once per model and per set of moving nodes, then shared by every copy.
 */
const flattened = new WeakMap<Object3D, Map<string, Group>>();

function flatten(root: Object3D, keep: ReadonlySet<string>): Group {
  root.updateMatrixWorld(true);
  const toRoot = new Matrix4().copy(root.matrixWorld).invert();
  const out = new Group();
  const buckets = new Map<Material, BufferGeometry[]>();
  const visit = (o: Object3D) => {
    for (const c of o.children) {
      const rel = new Matrix4().multiplyMatrices(toRoot, c.matrixWorld);
      if (keep.has(c.name)) {
        const node = flatten(c, keep);
        node.name = c.name;
        rel.decompose(node.position, node.quaternion, node.scale);
        out.add(node);
        continue;
      }
      if (c instanceof Mesh && !Array.isArray(c.material)) {
        const list = buckets.get(c.material) ?? [];
        list.push((c.geometry as BufferGeometry).clone().applyMatrix4(rel));
        buckets.set(c.material, list);
      }
      visit(c);
    }
  };
  visit(root);
  for (const [material, geos] of buckets) {
    const merged = geos.length > 1 ? mergeAll(geos) : geos[0];
    if (merged) {
      const mesh = new Mesh(merged, material);
      mesh.name = material.name;
      out.add(mesh);
    } else for (const g of geos) out.add(new Mesh(g, material)); // attributes too different to merge: leave them apart
  }
  return out;
}

/** merge geometries even when some are indexed and some not, or carry an extra attribute the others lack */
function mergeAll(geos: BufferGeometry[]): BufferGeometry | null {
  const common = new Set(Object.keys(geos[0].attributes).filter((k) => geos.every((g) => k in g.attributes)));
  const indexed = geos.every((g) => g.index);
  const ready = geos.map((g) => {
    const h = !indexed && g.index ? g.toNonIndexed() : g;
    for (const k of Object.keys(h.attributes)) if (!common.has(k)) h.deleteAttribute(k);
    h.morphAttributes = {};
    return h;
  });
  return mergeGeometries(ready);
}

function flat(scene: Object3D, keep: readonly string[]): Group {
  const key = [...keep].sort((a, b) => a.localeCompare(b)).join(",");
  let byKeep = flattened.get(scene);
  if (!byKeep) {
    byKeep = new Map();
    flattened.set(scene, byKeep);
  }
  let g = byKeep.get(key);
  if (!g) {
    g = flatten(scene, new Set(keep));
    byKeep.set(key, g);
  }
  return g;
}

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
  /** other nodes the animation moves by name, inside `node` (the carousel's horses): kept apart when merging */
  moving?: readonly string[];
};

/** One placed copy of a model (copies share the merged geometry and the materials, unless tinted). */
export default function Model({ id, position, rotation, scale, tint, animate, node, moving }: Readonly<Props>) {
  const { scene } = useGLTF(MODELS[id], false, false);
  const copy = useMemo(() => {
    const c = flat(scene, [...(node ? [node] : []), ...(moving ?? [])]).clone(true);
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
  }, [scene, tint, node, moving]);
  const animated = useRef<Object3D | null>(null);
  useEffect(() => {
    animated.current = node ? copy.getObjectByName(node) ?? null : null;
  }, [copy, node]);
  useFrame(({ clock }) => {
    if (animate && animated.current) animate(animated.current, clock.elapsedTime);
  });
  return <primitive object={copy} position={position} rotation={rotation} scale={scale} />;
}
