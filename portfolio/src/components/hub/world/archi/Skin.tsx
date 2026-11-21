"use client";
import { useEffect, useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import { CanvasTexture, Mesh, MeshStandardMaterial, RepeatWrapping, SRGBColorSpace, type Texture } from "three";

/** Where the model of a skin is served (built by tools/blender/greybox.py from the place's own plan). */
export const skinUrl = (name: string) => `/hub/models/skins/${name}.glb`;
export const preloadSkin = (name: string) => useGLTF.preload(skinUrl(name), false, false);

/** A small repeating texture drawn on a canvas (images packed in a .glb load from blob: URLs, which the CSP refuses). */
function canvasTexture(size: number, draw: (g: CanvasRenderingContext2D, s: number) => void): Texture {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  draw(c.getContext("2d")!, size);
  const t = new CanvasTexture(c);
  t.wrapS = t.wrapT = RepeatWrapping;
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/**
 * Greybox materials, by the names greybox.py gives them. UVs: a ceiling tile (60 cm) per unit on "tiles", a metre per
 * unit on "floor" and "wall".
 */
function greybox() {
  const tiles = canvasTexture(64, (g, s) => {
    g.fillStyle = "#e6e3d8";
    g.fillRect(0, 0, s, s);
    g.strokeStyle = "#8f8c82";
    g.lineWidth = 3;
    g.strokeRect(0, 0, s, s);
  });
  const grid = canvasTexture(64, (g, s) => {
    g.fillStyle = "#7d7152";
    g.fillRect(0, 0, s, s);
    g.fillStyle = "#6a5f44";
    g.fillRect(0, 0, s, 1);
    g.fillRect(0, 0, 1, s);
  });
  return {
    tiles: new MeshStandardMaterial({ map: tiles, roughness: 0.95 }),
    floor: new MeshStandardMaterial({ map: grid, roughness: 0.95 }),
    wall: new MeshStandardMaterial({ color: "#b9ae8a", roughness: 0.9 }),
  } as Record<string, MeshStandardMaterial>;
}

/**
 * A stretch of a place drawn by a Blender model instead of the kit (the rooms whose Shape.skin is `name`): walls, floors,
 * ceilings of 60 cm tiles. The kit leaves these rooms out and lays their lights on the same tile grid; collisions are
 * unchanged. A copy per use: the same place may show live and through a doorway at once.
 */
export default function Skin({ name }: Readonly<{ name: string }>) {
  const { scene } = useGLTF(skinUrl(name), false, false);
  const materials = useMemo(greybox, []);
  const copy = useMemo(() => {
    const c = scene.clone(true);
    c.traverse((o) => {
      if (o instanceof Mesh && !Array.isArray(o.material) && materials[o.material.name]) o.material = materials[o.material.name];
    });
    return c;
  }, [scene, materials]);
  useEffect(() => () => Object.values(materials).forEach((m) => { m.map?.dispose(); m.dispose(); }), [materials]);
  return <primitive object={copy} />;
}
