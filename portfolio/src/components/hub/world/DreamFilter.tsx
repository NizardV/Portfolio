"use client";
import { Bloom, BrightnessContrast, EffectComposer, HueSaturation, Noise, Vignette } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import type { ReactElement } from "react";
import type { Post } from "./zones";
import CameraLens, { type Lens } from "./CameraLens";

/**
 * The grade over everything, per place: the meadow only gets a soft « dream » touch; interiors get ambient
 * occlusion in their corners (weight, depth), glowing tubes and a heavier vignette and grain.
 * Turned off from the menu; the costly parts (AO, multisampling) only on capable devices.
 */
export default function DreamFilter({ light, post = {}, lens = "off" }: { light: boolean; post?: Post; lens?: Lens }) {
  const effects: ReactElement[] = [];
  // no screen-space AO: N8AO needs a newer three-compatible release, and SSAO here is too noisy;
  // corners get their weight from the shading baked into the walls (archi/build.ts)
  if (post.bloom) effects.push(<Bloom key="bloom" intensity={post.bloom} luminanceThreshold={0.85} luminanceSmoothing={0.2} mipmapBlur />);
  effects.push(<HueSaturation key="sat" saturation={post.saturation ?? -0.14} />);
  effects.push(<BrightnessContrast key="bc" brightness={0.01} contrast={post.contrast ?? -0.06} />);
  effects.push(<Noise key="grain" premultiply blendFunction={BlendFunction.SOFT_LIGHT} opacity={post.grain ?? 0.18} />);
  if (lens !== "off") effects.push(<CameraLens key="lens" lens={lens} />);
  effects.push(<Vignette key="vig" offset={0.3} darkness={post.vignette ?? 0.42} />);
  return (
    <EffectComposer multisampling={light ? 0 : 4} enableNormalPass={false}>
      {effects}
    </EffectComposer>
  );
}
