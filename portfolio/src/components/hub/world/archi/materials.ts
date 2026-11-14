import { CanvasTexture, NoColorSpace, RepeatWrapping, SRGBColorSpace, type Texture } from "three";

/**
 * Procedural surfaces, drawn once per session (no network asset): a neutral colour map plus a bump map each.
 * Neutral on purpose: every place tints them with its own palette (yellow lobby, beige hotel, cold offices…).
 */
export type SurfaceKey = "wallpaper" | "tile" | "concrete" | "plaster" | "panel" | "carpet" | "stain" | "wood" | "marble" | "void" | "ceiling";
export type SurfaceTextures = { map: Texture; bump: Texture };

type Draw = (ctx: CanvasRenderingContext2D, s: number, rnd: () => number) => void;

function make(size: number, draw: Draw, seed: number, srgb: boolean): Texture {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  let st = seed;
  const rnd = () => ((st = (st * 16807) % 2147483647) / 2147483647);
  draw(canvas.getContext("2d")!, size, rnd);
  const t = new CanvasTexture(canvas);
  t.wrapS = t.wrapT = RepeatWrapping;
  t.colorSpace = srgb ? SRGBColorSpace : NoColorSpace;
  t.anisotropy = 8;
  return t;
}

function noise(ctx: CanvasRenderingContext2D, s: number, amount: number, rnd: () => number) {
  const img = ctx.getImageData(0, 0, s, s);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (rnd() - 0.5) * amount;
    img.data[i] += n;
    img.data[i + 1] += n;
    img.data[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);
}

function blots(ctx: CanvasRenderingContext2D, s: number, n: number, rgba: string, rnd: () => number, min = 0.06, max = 0.25) {
  for (let i = 0; i < n; i++) {
    const x = rnd() * s;
    const y = rnd() * s;
    const r = s * (min + rnd() * (max - min));
    for (const [ox, oy] of [[0, 0], [s, 0], [-s, 0], [0, s], [0, -s]]) {
      const g = ctx.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, r);
      g.addColorStop(0, rgba);
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, s, s);
    }
  }
}

const fill = (c: string): Draw => (ctx, s) => { ctx.fillStyle = c; ctx.fillRect(0, 0, s, s); };

const SURFACES: Record<SurfaceKey, { map: Draw; bump: Draw; size?: number }> = {
  wallpaper: {
    map: (ctx, s, rnd) => {
      fill("#e9e4d4")(ctx, s, rnd);
      for (let x = 0; x < s; x += 32) {
        ctx.fillStyle = "rgba(90,80,50,0.12)";
        ctx.fillRect(x, 0, 3, s);
        ctx.fillStyle = "rgba(255,255,240,0.14)";
        ctx.fillRect(x + 14, 0, 2, s);
      }
      ctx.strokeStyle = "rgba(90,80,50,0.08)";
      ctx.lineWidth = 2;
      for (let y = 0; y < s; y += 24) for (let x = 0; x < s; x += 32) {
        ctx.beginPath(); ctx.moveTo(x + 8, y + 12); ctx.lineTo(x + 16, y + 4); ctx.lineTo(x + 24, y + 12); ctx.stroke();
      }
      blots(ctx, s, 3, "rgba(80,70,30,0.10)", rnd, 0.1, 0.3); // damp patches
      noise(ctx, s, 14, rnd);
    },
    bump: (ctx, s, rnd) => {
      fill("#808080")(ctx, s, rnd);
      for (let x = 0; x < s; x += 32) { ctx.fillStyle = "#6a6a6a"; ctx.fillRect(x, 0, 3, s); ctx.fillStyle = "#909090"; ctx.fillRect(x + 14, 0, 2, s); }
      noise(ctx, s, 10, rnd);
    },
  },
  carpet: {
    map: (ctx, s, rnd) => { fill("#c9c6bd")(ctx, s, rnd); noise(ctx, s, 46, rnd); blots(ctx, s, 3, "rgba(60,55,40,0.14)", rnd); },
    bump: (ctx, s, rnd) => { fill("#808080")(ctx, s, rnd); noise(ctx, s, 90, rnd); },
  },
  stain: {
    map: (ctx, s, rnd) => { fill("#c2beb2")(ctx, s, rnd); noise(ctx, s, 50, rnd); blots(ctx, s, 9, "rgba(45,40,25,0.32)", rnd); },
    bump: (ctx, s, rnd) => { fill("#808080")(ctx, s, rnd); noise(ctx, s, 90, rnd); },
  },
  void: {
    map: (ctx, s, rnd) => { fill("#7a776e")(ctx, s, rnd); noise(ctx, s, 30, rnd); },
    bump: (ctx, s, rnd) => { fill("#808080")(ctx, s, rnd); noise(ctx, s, 60, rnd); },
  },
  ceiling: {
    map: (ctx, s, rnd) => {
      fill("#ece8da")(ctx, s, rnd);
      ctx.strokeStyle = "rgba(70,65,45,0.55)"; ctx.lineWidth = 3; ctx.strokeRect(0, 0, s, s);
      for (let i = 0; i < 60; i++) { ctx.fillStyle = "rgba(70,65,45,0.22)"; ctx.fillRect(rnd() * s, rnd() * s, 2, 2); }
      blots(ctx, s, 1, "rgba(120,95,40,0.12)", rnd, 0.1, 0.3); // a water stain now and then
      noise(ctx, s, 10, rnd);
    },
    bump: (ctx, s, rnd) => { fill("#9a9a9a")(ctx, s, rnd); ctx.strokeStyle = "#404040"; ctx.lineWidth = 6; ctx.strokeRect(0, 0, s, s); noise(ctx, s, 40, rnd); },
    size: 128,
  },
  tile: {
    map: (ctx, s, rnd) => {
      fill("#a5aaa8")(ctx, s, rnd);
      const n = 6;
      const c = s / n;
      for (let a = 0; a < n; a++) for (let b = 0; b < n; b++) {
        const v = 236 + Math.floor(rnd() * 14);
        ctx.fillStyle = `rgb(${v},${v + 2},${v + 1})`;
        ctx.fillRect(a * c + 1.5, b * c + 1.5, c - 3, c - 3);
      }
      noise(ctx, s, 6, rnd);
    },
    bump: (ctx, s, rnd) => {
      fill("#404040")(ctx, s, rnd);
      const n = 6;
      const c = s / n;
      ctx.fillStyle = "#b0b0b0";
      for (let a = 0; a < n; a++) for (let b = 0; b < n; b++) ctx.fillRect(a * c + 2, b * c + 2, c - 4, c - 4);
    },
    size: 128,
  },
  concrete: {
    map: (ctx, s, rnd) => { fill("#a8a59c")(ctx, s, rnd); noise(ctx, s, 36, rnd); blots(ctx, s, 8, "rgba(40,38,30,0.2)", rnd); },
    bump: (ctx, s, rnd) => { fill("#808080")(ctx, s, rnd); noise(ctx, s, 70, rnd); blots(ctx, s, 6, "rgba(0,0,0,0.25)", rnd); },
  },
  plaster: {
    map: (ctx, s, rnd) => { fill("#e6e3da")(ctx, s, rnd); noise(ctx, s, 10, rnd); blots(ctx, s, 3, "rgba(80,75,60,0.08)", rnd, 0.15, 0.4); },
    bump: (ctx, s, rnd) => { fill("#808080")(ctx, s, rnd); noise(ctx, s, 24, rnd); },
  },
  panel: {
    map: (ctx, s, rnd) => {
      fill("#d9d6cc")(ctx, s, rnd);
      for (let x = 0; x < s; x += 64) { ctx.fillStyle = "rgba(40,40,40,0.35)"; ctx.fillRect(x, 0, 2, s); }
      noise(ctx, s, 12, rnd);
    },
    bump: (ctx, s, rnd) => { fill("#909090")(ctx, s, rnd); for (let x = 0; x < s; x += 64) { ctx.fillStyle = "#303030"; ctx.fillRect(x, 0, 3, s); } },
  },
  wood: {
    map: (ctx, s, rnd) => {
      fill("#b08a5c")(ctx, s, rnd);
      for (let y = 0; y < s; y += 32) {
        ctx.fillStyle = `rgba(60,35,15,${0.15 + rnd() * 0.15})`;
        ctx.fillRect(0, y, s, 32);
        ctx.fillStyle = "rgba(40,22,10,0.5)";
        ctx.fillRect(0, y, s, 1.5);
      }
      noise(ctx, s, 18, rnd);
    },
    bump: (ctx, s, rnd) => { fill("#909090")(ctx, s, rnd); for (let y = 0; y < s; y += 32) { ctx.fillStyle = "#303030"; ctx.fillRect(0, y, s, 2); } noise(ctx, s, 20, rnd); },
  },
  marble: {
    map: (ctx, s, rnd) => {
      fill("#e4dfd3")(ctx, s, rnd);
      ctx.strokeStyle = "rgba(120,110,95,0.25)";
      for (let i = 0; i < 7; i++) {
        ctx.lineWidth = 1 + rnd() * 2;
        ctx.beginPath();
        let x = rnd() * s;
        let y = 0;
        ctx.moveTo(x, y);
        while (y < s) { x += (rnd() - 0.5) * 30; y += 12; ctx.lineTo(x, y); }
        ctx.stroke();
      }
      ctx.strokeStyle = "rgba(60,55,45,0.3)"; ctx.lineWidth = 2; ctx.strokeRect(0, 0, s, s);
      noise(ctx, s, 8, rnd);
    },
    bump: (ctx, s, rnd) => { fill("#909090")(ctx, s, rnd); ctx.strokeStyle = "#404040"; ctx.lineWidth = 4; ctx.strokeRect(0, 0, s, s); },
  },
};

const cache = new Map<SurfaceKey, SurfaceTextures>();

/** Textures for a surface, created on first use and kept for the whole visit. */
export function surface(key: SurfaceKey): SurfaceTextures {
  let t = cache.get(key);
  if (!t) {
    const def = SURFACES[key];
    const seed = key.length * 7919 + 13;
    t = { map: make(def.size ?? 256, def.map, seed, true), bump: make(def.size ?? 256, def.bump, seed + 1, false) };
    cache.set(key, t);
  }
  return t;
}
