"use client";
import { useEffect, useMemo } from "react";
import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from "three";

/** Procedural materials (no network asset). UVs are in world metres divided by each texture's tile size. */
function canvasTexture(size: number, draw: (ctx: CanvasRenderingContext2D, s: number) => void) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  draw(canvas.getContext("2d")!, size);
  const tex = new CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = RepeatWrapping;
  tex.colorSpace = SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function grain(ctx: CanvasRenderingContext2D, s: number, amount: number) {
  const img = ctx.getImageData(0, 0, s, s);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (Math.random() - 0.5) * amount;
    img.data[i] += n;
    img.data[i + 1] += n;
    img.data[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);
}

function blotches(ctx: CanvasRenderingContext2D, s: number, count: number, color: string) {
  for (let i = 0; i < count; i++) {
    const x = Math.random() * s;
    const y = Math.random() * s;
    const r = s * (0.08 + Math.random() * 0.22);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, color);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
  }
}

/** world-metre size of one texture repeat */
export const TILE = { wallpaper: 2, carpet: 3, stain: 3, ceiling: 1.2, tile: 0.9, concrete: 3 };

export function useLobbyTextures() {
  const textures = useMemo(
    () => ({
      // faded mono-yellow wallpaper: thin vertical stripes and a chevron ghost
      wallpaper: canvasTexture(256, (ctx, s) => {
        ctx.fillStyle = "#c9b65c";
        ctx.fillRect(0, 0, s, s);
        for (let x = 0; x < s; x += 32) {
          ctx.fillStyle = "rgba(120,100,30,0.13)";
          ctx.fillRect(x, 0, 3, s);
          ctx.fillStyle = "rgba(255,240,170,0.10)";
          ctx.fillRect(x + 14, 0, 2, s);
        }
        ctx.strokeStyle = "rgba(110,95,35,0.07)";
        ctx.lineWidth = 2;
        for (let y = 0; y < s; y += 24) for (let x = 0; x < s; x += 32) {
          ctx.beginPath();
          ctx.moveTo(x + 8, y + 12);
          ctx.lineTo(x + 16, y + 4);
          ctx.lineTo(x + 24, y + 12);
          ctx.stroke();
        }
        grain(ctx, s, 16);
      }),
      carpet: canvasTexture(256, (ctx, s) => {
        ctx.fillStyle = "#8f7f40";
        ctx.fillRect(0, 0, s, s);
        grain(ctx, s, 40);
        blotches(ctx, s, 4, "rgba(70,58,22,0.18)");
      }),
      stain: canvasTexture(256, (ctx, s) => {
        ctx.fillStyle = "#857437";
        ctx.fillRect(0, 0, s, s);
        grain(ctx, s, 44);
        blotches(ctx, s, 9, "rgba(48,40,14,0.32)");
      }),
      ceiling: canvasTexture(128, (ctx, s) => {
        ctx.fillStyle = "#d8d2b4";
        ctx.fillRect(0, 0, s, s);
        ctx.strokeStyle = "rgba(90,80,50,0.5)";
        ctx.lineWidth = 3;
        ctx.strokeRect(0, 0, s, s);
        for (let i = 0; i < 40; i++) {
          ctx.fillStyle = "rgba(90,80,50,0.25)";
          ctx.fillRect(Math.random() * s, Math.random() * s, 2, 2);
        }
        grain(ctx, s, 12);
      }),
      // small white tiles, aqua grout: the smell of chlorine through the grate
      tile: canvasTexture(128, (ctx, s) => {
        ctx.fillStyle = "#9cc9c4";
        ctx.fillRect(0, 0, s, s);
        const n = 6;
        const c = s / n;
        for (let a = 0; a < n; a++) for (let b = 0; b < n; b++) {
          const v = 232 + Math.floor(Math.random() * 14);
          ctx.fillStyle = `rgb(${v},${v + 4},${v + 2})`;
          ctx.fillRect(a * c + 1.5, b * c + 1.5, c - 3, c - 3);
        }
        grain(ctx, s, 8);
      }),
      concrete: canvasTexture(256, (ctx, s) => {
        ctx.fillStyle = "#8c887c";
        ctx.fillRect(0, 0, s, s);
        grain(ctx, s, 34);
        blotches(ctx, s, 7, "rgba(40,38,30,0.22)");
      }),
    }),
    [],
  );
  useEffect(() => () => Object.values(textures).forEach((t) => t.dispose()), [textures]);
  return textures;
}

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
