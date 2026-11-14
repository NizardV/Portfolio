"use client";
import { useLayoutEffect } from "react";
import { useThree } from "@react-three/fiber";
import { Color, Fog, FogExp2 } from "three";

/**
 * Sky colour and fog of a place, set on whichever three.js scene renders it: the main one, or the private scene
 * of a doorway preview. (A JSX `<fog attach>` would attach to the nearest parent object instead, e.g. a group.)
 */
export default function Atmosphere({ background, fog, density, near, far }: { background: string; fog: string; density?: number; near?: number; far?: number }) {
  const scene = useThree((s) => s.scene);
  useLayoutEffect(() => {
    const prev = { background: scene.background, fog: scene.fog };
    scene.background = new Color(background);
    scene.fog = density ? new FogExp2(fog, density) : new Fog(fog, near ?? 10, far ?? 100);
    return () => {
      scene.background = prev.background;
      scene.fog = prev.fog;
    };
  }, [scene, background, fog, density, near, far]);
  return null;
}
