"use client";
import { useEffect, useMemo } from "react";
import { Effect, EffectAttribute } from "postprocessing";
import { Uniform } from "three";

export type Lens = "off" | "camera" | "vhs";

/**
 * As if the dream were seen through a camera: fine sensor static that crawls (stronger in the dark), a little colour
 * fringing towards the edges, exposure that breathes, a line that slips now and then. « VHS » adds scanlines, colour
 * bleeding, a tracking band that rolls down the picture and the odd tear.
 */
const fragmentShader = /* glsl */ `
uniform float uVhs;
float lensHash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
float luma(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }
void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec2 p = uv;
  // a line slips sideways for a frame, now and then (often, and wider, on tape)
  float line = floor(uv.y * 180.0);
  float frame = floor(time * 24.0);
  float slip = step(0.9985 - uVhs * 0.004, lensHash(vec2(line, frame)));
  p.x += slip * (lensHash(vec2(frame, line)) - 0.5) * (0.01 + 0.03 * uVhs);
  // tape: the tracking band rolls down, and the picture wobbles in it
  float roll = 1.0 - fract(time * 0.06);
  float band = smoothstep(0.05, 0.0, abs(uv.y - roll)) * uVhs;
  p.x += band * 0.008 * sin(uv.y * 300.0 + time * 30.0);
  // colour fringing towards the edges
  vec2 c = p - 0.5;
  vec2 off = c * dot(c, c) * (0.01 + 0.012 * uVhs);
  vec3 col = vec3(texture2D(inputBuffer, p + off).r, texture2D(inputBuffer, p).g, texture2D(inputBuffer, p - off).b);
  if (uVhs > 0.0) {
    // chroma bleeds to the right, the picture softens, lines show
    vec3 smear = (texture2D(inputBuffer, p + vec2(0.004, 0.0)).rgb + texture2D(inputBuffer, p + vec2(0.008, 0.0)).rgb) * 0.5;
    col = vec3(luma(col)) + mix(col - vec3(luma(col)), smear - vec3(luma(smear)), 0.6);
    col *= 0.93 + 0.07 * sin(uv.y * resolution.y * 1.4);
    col += band * 0.06;
    col = mix(col, col * vec3(1.03, 0.98, 1.05), 0.5);
  }
  // sensor static: fine, different every frame, stronger in the dark
  float n = lensHash(floor(uv * resolution) + fract(time * 61.0) * vec2(97.0, 131.0)) - 0.5;
  float l = luma(col);
  col += n * (0.016 + 0.014 * (1.0 - l)) * (1.0 + uVhs * 0.8);
  // exposure breathes
  col *= 1.0 + 0.012 * sin(time * 1.3) + 0.006 * sin(time * 7.1);
  outputColor = vec4(col, inputColor.a);
}`;

class LensEffect extends Effect {
  constructor() {
    super("LensEffect", fragmentShader, {
      attributes: EffectAttribute.CONVOLUTION,
      uniforms: new Map([["uVhs", new Uniform(0)]]),
    });
  }
}

export default function CameraLens({ lens }: { lens: Exclude<Lens, "off"> }) {
  const effect = useMemo(() => new LensEffect(), []);
  useEffect(() => {
    effect.uniforms.get("uVhs")!.value = lens === "vhs" ? 1 : 0;
  }, [effect, lens]);
  useEffect(() => () => effect.dispose(), [effect]);
  return <primitive object={effect} />;
}
