"use client";
import { useEffect, useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import { useLoader } from "@react-three/fiber";
import { Mesh, MeshBasicMaterial, SRGBColorSpace, TextureLoader, type Group, type Texture } from "three";
import { TILE, type Panel } from "./build";
import { surface, type SurfaceKey } from "./materials";
import type { Palette } from "./Architecture";

/** Where the model of a skin is served (built by tools/blender/skin.py from the place's own plan). */
export const skinUrl = (name: string) => `/hub/models/skins/${name}.glb`;
/** Its light, baked in Blender (tools/blender/bake.py), on the model's second UV set. */
export const skinLightUrl = (name: string) => `/hub/models/skins/${name}-light.jpg`;
export const preloadSkin = (name: string) => {
  useGLTF.preload(skinUrl(name), false, false);
  useLoader.preload(TextureLoader, skinLightUrl(name));
};
/** the lightmap stores light / LIGHTMAP_SCALE (bake.py SCALE); a basic material divides it by π */
const LIGHTMAP_SCALE = 6;
const EXPOSURE = 1;
const LIGHT = LIGHTMAP_SCALE * Math.PI * EXPOSURE;

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

/**
 * The model's materials are named after the game's surfaces: "f:carpet" (floor), "w:wallpaper" (wall), "c:ceiling"
 * (ceiling), "trim" (baseboards), "beam" (where two ceiling grids meet). Dressed with the kit's own textures and the
 * place's palette, so a skinned room looks like the others, only built properly. Lit only by the baked light: the live
 * lights of the place (Architecture's pool) no longer touch it.
 */
function dress(name: string, palette: Palette, light: Texture): MeshBasicMaterial | null {
  const [kind, key] = name.includes(":") ? name.split(":") : [name, name];
  const baked = { lightMap: light, lightMapIntensity: LIGHT };
  if (kind === "trim") return new MeshBasicMaterial({ color: palette.trim, ...baked });
  // a balcony's low wall: plain plaster in the colour of the wall it stands for (a wallpaper pattern on 1 m looked busy)
  if (kind === "muret") return new MeshBasicMaterial({ map: metres(surface("plaster").map, "plaster"), color: tintOf("w", key, palette) ?? "#ffffff", ...baked });
  const look = (kind === "beam" ? "plaster" : key) as SurfaceKey; // a beam: painted plaster, the ceiling's colour
  const tint = tintOf(kind, key, palette);
  return new MeshBasicMaterial({ map: metres(surface(look).map, look), color: tint ?? "#ffffff", ...baked });
}

/**
 * A place drawn by a Blender model instead of the kit (the rooms whose Shape.skin is `name`): the model, dressed, and
 * the ceiling lights it carries (laid inside its tiles), for Architecture to light. A copy per use: the same place may
 * show live and through a doorway at once.
 */
export function useSkin(name: string, palette: Palette): { model: Group; panels: Panel[] } {
  const { scene } = useGLTF(skinUrl(name), false, false);
  const light = useLoader(TextureLoader, skinLightUrl(name));
  const result = useMemo(() => {
    // glTF UVs: no flip; the second UV set (TEXCOORD_1, "uv1") is the lightmap's
    light.flipY = false;
    light.channel = 1;
    light.colorSpace = SRGBColorSpace;
    light.needsUpdate = true;
    const model = scene.clone(true);
    const made = new Map<string, MeshBasicMaterial | null>();
    let panels: Panel[] = [];
    model.traverse((o) => {
      const raw = o.userData?.panels;
      if (typeof raw === "string") {
        panels = (JSON.parse(raw) as [number, number, number, number, number, boolean][]).map(([x, y, z, a, size, dead]) => ({ x, y, z, a, size: [size, size], dead }));
      }
      if (!(o instanceof Mesh) || Array.isArray(o.material)) return;
      const n = o.material.name;
      if (!made.has(n)) made.set(n, dress(n, palette, light));
      const m = made.get(n);
      if (m) o.material = m;
    });
    return { model, panels, made };
  }, [scene, palette, light]);
  useEffect(
    () => () =>
      result.made.forEach((m) => {
        m?.map?.dispose(); // a clone (metres); the lightmap is the loader's, shared
        m?.dispose();
      }),
    [result],
  );
  return result;
}
