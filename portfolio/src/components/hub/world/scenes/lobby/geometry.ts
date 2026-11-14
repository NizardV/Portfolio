import { BoxGeometry, BufferGeometry, PlaneGeometry } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import {
  ARRIVAL_DOOR, C, CELLS, DOOR_H, DOOR_W, EDGES, HALF, HOLES, HOLE_SQUARES, N, WALL_T, WELL,
  cx, cz, edgeFloor, edgeHeightsOf, edgeTop, type Cell, type Edge, type Mat,
} from "../../lobby";
import { TILE } from "./textures";

/** A box by its bottom-centre and size (metres). */
export type Piece = { x: number; y: number; z: number; w: number; h: number; d: number };
type Rect = { x0: number; x1: number; z0: number; z1: number };

/** Merged boxes with UVs in world metres / tile, so textures never stretch on long walls. */
export function boxesGeometry(pieces: Piece[], tile: number): BufferGeometry | null {
  if (!pieces.length) return null;
  const parts = pieces.map(({ x, y, z, w, h, d }) => {
    const g = new BoxGeometry(w, h, d);
    const uv = g.attributes.uv;
    // face order: +x, -x, +y, -y, +z, -z (4 vertices each)
    const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
    for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) {
      const v = f * 4 + k;
      uv.setXY(v, (uv.getX(v) * dims[f][0]) / tile, (uv.getY(v) * dims[f][1]) / tile);
    }
    g.translate(x, y + h / 2, z);
    return g;
  });
  const merged = mergeGeometries(parts);
  parts.forEach((p) => p.dispose());
  return merged;
}

/** Merged horizontal quads: floors (facing up) or ceilings (facing down). */
export function quadsGeometry(rects: (Rect & { y: number })[], tile: number, facing: "up" | "down"): BufferGeometry | null {
  if (!rects.length) return null;
  const parts = rects.map(({ x0, x1, z0, z1, y }) => {
    const w = x1 - x0;
    const d = z1 - z0;
    const g = new PlaneGeometry(w, d);
    g.rotateX(facing === "up" ? -Math.PI / 2 : Math.PI / 2);
    g.translate((x0 + x1) / 2, y, (z0 + z1) / 2);
    // UVs from world position: neighbouring floor pieces line up, no seam at every cell
    const uv = g.attributes.uv;
    const pos = g.attributes.position;
    for (let v = 0; v < uv.count; v++) uv.setXY(v, pos.getX(v) / tile, pos.getZ(v) / tile);
    return g;
  });
  const merged = mergeGeometries(parts);
  parts.forEach((p) => p.dispose());
  return merged;
}

/** rect minus hole: up to four rects around it */
function subtract(r: Rect, h: Rect): Rect[] {
  if (h.x1 <= r.x0 || h.x0 >= r.x1 || h.z1 <= r.z0 || h.z0 >= r.z1) return [r];
  const out: Rect[] = [];
  if (h.z0 > r.z0) out.push({ ...r, z1: h.z0 });
  if (h.z1 < r.z1) out.push({ ...r, z0: h.z1 });
  const z0 = Math.max(r.z0, h.z0);
  const z1 = Math.min(r.z1, h.z1);
  if (h.x0 > r.x0) out.push({ x0: r.x0, x1: h.x0, z0, z1 });
  if (h.x1 < r.x1) out.push({ x0: h.x1, x1: r.x1, z0, z1 });
  return out;
}

const cellRect = (c: Cell): Rect => ({ x0: cx(c.i) - C / 2, x1: cx(c.i) + C / 2, z0: cz(c.j) - C / 2, z1: cz(c.j) + C / 2 });
const wallMat = (a: Cell, b?: Cell): "wallpaper" | "tile" | "concrete" =>
  a.mat === "tile" || b?.mat === "tile" ? "tile" : a.mat === "concrete" || b?.mat === "concrete" ? "concrete" : "wallpaper";

export type LobbyGeometry = {
  walls: Record<"wallpaper" | "tile" | "concrete", Piece[]>;
  floors: Record<Mat, (Rect & { y: number })[]>;
  ceilings: (Rect & { y: number })[];
  steps: Piece[];
  rails: Piece[];
  panels: { x: number; y: number; z: number; ry: number; big: boolean; tint: string }[];
};

/** Turns the Lobby data into lists of pieces; the scene merges them into a handful of meshes. */
export function buildLobby(): LobbyGeometry {
  const walls: LobbyGeometry["walls"] = { wallpaper: [], tile: [], concrete: [] };
  const floors: LobbyGeometry["floors"] = { carpet: [], stain: [], tile: [], concrete: [] };
  const ceilings: LobbyGeometry["ceilings"] = [];
  const steps: Piece[] = [];
  const rails: Piece[] = [];
  const panels: LobbyGeometry["panels"] = [];

  const seg = (e: Edge, center: number, len: number, y0: number, y1: number, list: Piece[]) => {
    if (y1 - y0 < 0.01 || len < 0.01) return;
    list.push(e.vertical ? { x: e.x, y: y0, z: center, w: WALL_T, h: y1 - y0, d: len } : { x: center, y: y0, z: e.z, w: len, h: y1 - y0, d: WALL_T });
  };

  for (const e of EDGES) {
    const list = walls[wallMat(e.a, e.b)];
    const lo = edgeFloor(e);
    const top = edgeTop(e);
    const mid = e.vertical ? e.z : e.x;
    if (e.kind === "wall") seg(e, mid, C, lo, top, list);
    else if (e.kind === "door" && !e.blocked) {
      const g0 = mid + e.offset - DOOR_W / 2;
      const g1 = mid + e.offset + DOOR_W / 2;
      seg(e, (mid - C / 2 + g0) / 2, g0 - (mid - C / 2), lo, top, list);
      seg(e, (g1 + mid + C / 2) / 2, mid + C / 2 - g1, lo, top, list);
      seg(e, mid + e.offset, DOOR_W, lo + DOOR_H, top, list);
    } else {
      // open side: soffit where ceilings differ, riser and railing where floors differ
      const lowCeil = Math.min(e.a.ceil, e.b.ceil);
      seg(e, mid, C, lowCeil, top, list);
      const [ha, hb] = edgeHeightsOf(e);
      if (Math.abs(ha - hb) > 0.05) seg(e, mid, C, Math.min(ha, hb), Math.max(ha, hb), list);
      if (e.blocked) {
        // a real railing (handrail, kick plate, posts); the collision box stays solid
        const y = Math.max(ha, hb);
        seg(e, mid, C, y + 0.92, y + 0.98, rails);
        seg(e, mid, C, y, y + 0.08, rails);
        for (let t = -C / 2 + 0.25; t <= C / 2 - 0.2; t += 1.2) seg(e, mid + t, 0.05, y, y + 0.95, rails);
      }
    }
  }

  // outer walls, cell by cell (so they follow each cell's floor and ceiling)
  for (let k = 0; k < N; k++) {
    const sides: [Cell, boolean, number, number][] = [
      [CELLS[k][0], false, cx(k), -HALF - WALL_T / 2],
      [CELLS[k][N - 1], false, cx(k), HALF + WALL_T / 2],
      [CELLS[0][k], true, -HALF - WALL_T / 2, cz(k)],
      [CELLS[N - 1][k], true, HALF + WALL_T / 2, cz(k)],
    ];
    for (const [c, vertical, x, z] of sides) {
      const list = walls[wallMat(c)];
      const lo = Math.min(c.floor, c.stair ? Math.min(c.stair.atMin, c.stair.atMax) : c.floor);
      const hi = c.ceil;
      const isArrival = !vertical && z > 0 && Math.abs(x - ARRIVAL_DOOR.x) < C / 2;
      if (!isArrival) {
        list.push(vertical ? { x, y: lo, z, w: WALL_T, h: hi - lo, d: C } : { x, y: lo, z, w: C, h: hi - lo, d: WALL_T });
        continue;
      }
      const g0 = ARRIVAL_DOOR.x - ARRIVAL_DOOR.width / 2;
      const g1 = ARRIVAL_DOOR.x + ARRIVAL_DOOR.width / 2;
      const s0 = x - C / 2;
      const s1 = x + C / 2;
      list.push({ x: (s0 + g0) / 2, y: lo, z, w: g0 - s0, h: hi - lo, d: WALL_T });
      list.push({ x: (g1 + s1) / 2, y: lo, z, w: s1 - g1, h: hi - lo, d: WALL_T });
      list.push({ x: ARRIVAL_DOOR.x, y: lo + ARRIVAL_DOOR.height, z, w: ARRIVAL_DOOR.width, h: hi - lo - ARRIVAL_DOOR.height, d: WALL_T });
    }
  }

  // floors, ceilings, stairs, ceiling lights
  const well: Rect = { x0: WELL.x - WELL.size / 2, x1: WELL.x + WELL.size / 2, z0: WELL.z - WELL.size / 2, z1: WELL.z + WELL.size / 2 };
  const holeRects: Rect[] = HOLE_SQUARES.map(([x, z]) => ({ x0: x - HOLES.step / 2, x1: x + HOLES.step / 2, z0: z - HOLES.step / 2, z1: z + HOLES.step / 2 }));
  for (const col of CELLS) for (const c of col) {
    const r = cellRect(c);
    if (c.stair) {
      const n = 9;
      const lo = Math.min(c.stair.atMin, c.stair.atMax);
      for (let k = 0; k < n; k++) {
        const t = (k + 0.5) / n;
        const topY = c.stair.atMin + (c.stair.atMax - c.stair.atMin) * t;
        const len = C / n;
        steps.push(c.stair.axis === "x"
          ? { x: r.x0 + len * (k + 0.5), y: lo - 0.01, z: cz(c.j), w: len, h: topY - lo + 0.01, d: C }
          : { x: cx(c.i), y: lo - 0.01, z: r.z0 + len * (k + 0.5), w: C, h: topY - lo + 0.01, d: len });
      }
    } else {
      let pieces = [r];
      if (c.tag === "pit") pieces = pieces.flatMap((p) => subtract(p, well));
      if (c.tag === "holes") for (const h of holeRects) pieces = pieces.flatMap((p) => subtract(p, h));
      for (const p of pieces) floors[c.mat].push({ ...p, y: c.floor });
    }
    ceilings.push({ ...r, y: c.ceil });

    const tint = c.tag === "pool" ? "#e9fbff" : "#fffbe8";
    const y = c.ceil - 0.02;
    if (c.tag === "hall") {
      for (const [dx, dz] of [[-1.25, -1.25], [1.25, -1.25], [-1.25, 1.25], [1.25, 1.25]]) panels.push({ x: cx(c.i) + dx, y, z: cz(c.j) + dz, ry: 0, big: true, tint });
    } else if (c.lights === 2) {
      const ry = (c.i + c.j) % 2 ? Math.PI / 2 : 0;
      for (const o of [-1.25, 1.25]) panels.push({ x: cx(c.i) + (ry ? 0 : o), y, z: cz(c.j) + (ry ? o : 0), ry, big: false, tint });
    } else if (c.lights === 1) panels.push({ x: cx(c.i), y, z: cz(c.j), ry: 0, big: false, tint });
  }
  return { walls, floors, ceilings, steps, rails, panels };
}

export { TILE };
