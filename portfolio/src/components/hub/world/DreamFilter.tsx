"use client";
import { BrightnessContrast, EffectComposer, HueSaturation, Noise, Vignette } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";

/**
 * A light « dream » grade over everything: a touch less saturated and contrasted, fine film grain, soft vignette.
 * Meant to be felt rather than seen. Turned off in « low » quality and from the menu.
 */
export default function DreamFilter({ light }: { light: boolean }) {
  return (
    <EffectComposer multisampling={light ? 0 : 4} enableNormalPass={false}>
      <HueSaturation saturation={-0.14} />
      <BrightnessContrast brightness={0.01} contrast={-0.06} />
      <Noise premultiply blendFunction={BlendFunction.SOFT_LIGHT} opacity={0.18} />
      <Vignette offset={0.32} darkness={0.42} />
    </EffectComposer>
  );
}
