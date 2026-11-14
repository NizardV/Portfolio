"use client";
import { useEffect, useMemo } from "react";
import { CanvasTexture, SRGBColorSpace } from "three";

/** Text drawn on a canvas: words only ever appear on objects of the set (plates, indicators). */
export function usePlateTexture(text: string, color: string, background = "#20201c") {
  const tex = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, 256, 64);
    ctx.fillStyle = color;
    ctx.font = "600 28px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, 128, 34);
    const t = new CanvasTexture(canvas);
    t.colorSpace = SRGBColorSpace;
    return t;
  }, [text, color, background]);
  useEffect(() => () => tex.dispose(), [tex]);
  return tex;
}
