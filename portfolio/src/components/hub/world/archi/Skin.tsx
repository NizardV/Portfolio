"use client";
import { useEffect, useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import { Mesh, MeshStandardMaterial, type Group, type Texture } from "three";
import { TILE, type Panel } from "./build";
import { surface, type SurfaceKey } from "./materials";
import type { Palette } from "./Architecture";

/** Where the model of a skin is served (built by tools/blender/skin.py from the place's own plan). */
export const skinUrl = (name: string) => `/hub/models/skins/${name}.glb`;
export const preloadSkin = (name: string) => useGLTF.preload(skinUrl(name), false, false);

/** a kit texture, repeated so that one UV unit (the model maps in metres) is one metre */
function metres(t: Texture, key: string): Texture {
  const c = t.clone();
  const k = 1 / (TILE[key] ?? 1);
  c.repeat.set(k, k);
  c.needsUpdate = true;
  return c;
}

function tintOf(kind: string, key: string, palette: Palette): string | undefined {
  const t = palette.surfaces;
  if (kind === "f") return t[`floor:${key}`] ?? t[key];
  if (kind === "c") return t[`ceil:${key}`] ?? t[key];
  if (kind === "beam") return t["ceil:ceiling"] ?? t.ceiling;
  return t[key];
}

function roughness(kind: string, shiny: boolean, palette: Palette): number {
  if (kind === "f") return shiny ? 0.35 : 0.95;
  return kind === "w" ? palette.roughness ?? 0.9 : 0.95;
}

/**
 * The model's materials are named after the game's surfaces: "f:carpet" (floor), "w:wallpaper" (wall), "c:ceiling"
 * (ceiling), "trim" (baseboards), "beam" (where two ceiling grids meet). Dressed with the kit's own textures and the
 * place's palette, so a skinned room looks like the others, only built properly.
 */
function dress(name: string, palette: Palette): MeshStandardMaterial | null {
  const [kind, key] = name.includes(":") ? name.split(":") : [name, name];
  if (kind === "trim") return new MeshStandardMaterial({ color: palette.trim, roughness: 0.6 });
  const look = (kind === "beam" ? "plaster" : key) as SurfaceKey; // a beam: painted plaster, the ceiling's colour
  const tex = surface(look);
  const tint = tintOf(kind, key, palette);
  const shiny = key === "tile" || key === "marble";
  return new MeshStandardMaterial({
    map: metres(tex.map, look),
    bumpMap: metres(tex.bump, look),
    bumpScale: key === "carpet" || key === "stain" ? 1.6 : 0.8,
    color: tint ?? "#ffffff",
    roughness: roughness(kind, shiny, palette),
  });
}

/**
 * A place drawn by a Blender model instead of the kit (the rooms whose Shape.skin is `name`): the model, dressed, and
 * the ceiling lights it carries (laid inside its tiles), for Architecture to light. A copy per use: the same place may
 * show live and through a doorway at once.
 */
export function useSkin(name: string, palette: Palette): { model: Group; panels: Panel[] } {
  const { scene } = useGLTF(skinUrl(name), false, false);
  const result = useMemo(() => {
    const model = scene.clone(true);
    const made = new Map<string, MeshStandardMaterial | null>();
    let panels: Panel[] = [];
    model.traverse((o) => {
      const raw = o.userData?.panels;
      if (typeof raw === "string") {
        panels = (JSON.parse(raw) as [number, number, number, number, number, boolean][]).map(([x, y, z, a, size, dead]) => ({ x, y, z, a, size: [size, size], dead }));
      }
      if (!(o instanceof Mesh) || Array.isArray(o.material)) return;
      const n = o.material.name;
      if (!made.has(n)) made.set(n, dress(n, palette));
      const m = made.get(n);
      if (m) o.material = m;
    });
    return { model, panels, made };
  }, [scene, palette]);
  useEffect(
    () => () =>
      result.made.forEach((m) => {
        m?.map?.dispose();
        m?.bumpMap?.dispose();
        m?.dispose();
      }),
    [result],
  );
  return result;
}
