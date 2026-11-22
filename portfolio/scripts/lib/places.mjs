/**
 * The hub's places, outside the browser: the plain-TS modules they are made of (no React in them) are transpiled into
 * <tmp>/hub-audit as .mjs next to each other, then imported. Shared by hub-audit.mjs and hub-export-plan.mjs.
 * Also reads the Blender models that draw some rooms instead of the kit (Shape.skin), as plain triangles.
 */
import fs from "fs";
import os from "os";
import path from "path";
import { pathToFileURL } from "url";
import ts from "typescript";

const ROOT = process.cwd();
const W = path.join(ROOT, "src/components/hub/world");
export const OUT = path.join(os.tmpdir(), "hub-audit");
const url = (p) => pathToFileURL(p).href;
const THREE_DIR = path.join(ROOT, "node_modules/three");
const pnpm = path.join(ROOT, "node_modules/.pnpm");

/** where the model of a skin lives (served at /hub/models/skins/<skin>.glb) */
export const skinFile = (skin) => path.join(ROOT, "public/hub/models/skins", `${skin}.glb`);

export async function loadPlaces() {
  const bvhDir = fs.readdirSync(pnpm).find((d) => d.startsWith("three-mesh-bvh@"));
  if (!bvhDir) throw new Error("three-mesh-bvh not found (installed with @react-three/drei)");
  const fix = (js) =>
    js
      .replace(/from "(\.{1,2}\/[\w/]+)"/g, 'from "$1.mjs"')
      .replace(/from "three\/examples\/jsm\/utils\/BufferGeometryUtils\.js"/, `from "${url(path.join(THREE_DIR, "examples/jsm/utils/BufferGeometryUtils.js"))}"`)
      .replace(/from "three"/, `from "${url(path.join(THREE_DIR, "build/three.module.js"))}"`)
      .replace(/import [^;]* from "\.\/zones\.mjs";?/, "");
  const tx = (src) => {
    const out = path.join(OUT, src.replace(/\.ts$/, ".mjs"));
    fs.mkdirSync(path.dirname(out), { recursive: true });
    const js = ts.transpileModule(fs.readFileSync(path.join(W, src), "utf8"), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
    fs.writeFileSync(out, fix(js));
  };
  for (const f of ["sdf", "contour", "build", "slice", "murets"]) tx(`archi/${f}.ts`);
  tx("lobby.ts");
  for (const f of fs.readdirSync(path.join(W, "places"))) tx(`places/${f}`);
  fs.writeFileSync(path.join(OUT, "collision.mjs"), "export const box = (x, z, w, d) => ({ x, z, w, d });");

  const THREE = await import(url(path.join(THREE_DIR, "build/three.module.js")));
  const { mergeGeometries } = await import(url(path.join(THREE_DIR, "examples/jsm/utils/BufferGeometryUtils.js")));
  const BVH = await import(url(path.join(pnpm, bvhDir, "node_modules/three-mesh-bvh/src/index.js")));
  THREE.Mesh.prototype.raycast = BVH.acceleratedRaycast;
  const build = await import(url(path.join(OUT, "archi/build.mjs")));
  const sdf = await import(url(path.join(OUT, "archi/sdf.mjs")));

  const places = {};
  const lobby = await import(url(path.join(OUT, "lobby.mjs")));
  places.LOBBY = { space: lobby.LOBBY_SPACE, spawn: lobby.LOBBY_SPAWN };
  for (const f of fs.readdirSync(path.join(OUT, "places"))) {
    const M = await import(url(path.join(OUT, "places", f)));
    for (const [k, v] of Object.entries(M)) if (k.endsWith("_SPACE")) places[k.replace("_SPACE", "")] = { space: v, spawn: M[k.replace("_SPACE", "_SPAWN")] };
  }
  return { THREE, mergeGeometries, BVH, build, sdf, lobby, places };
}

/**
 * The triangles of a .glb, in world space, as one BufferGeometry (position + index only). Enough for rays: no textures
 * are decoded, so it works without a browser. skip: node names left out (a skin's "trims": baseboards and beams).
 * material: (name) => boolean, keeps only those primitives, with their texture UVs (e.g. a skin's ceilings, "c:…").
 * The node extras ("panels" on a skin) are in readGlbExtras.
 */
export function readGlb(file, THREE, mergeGeometries, { skip = [], material = null } = {}) {
  const buf = fs.readFileSync(file);
  const jsonLen = buf.readUInt32LE(12);
  const gltf = JSON.parse(buf.subarray(20, 20 + jsonLen).toString("utf8"));
  const binStart = 20 + jsonLen + 8;
  const view = (i) => {
    const acc = gltf.accessors[i];
    const bv = gltf.bufferViews[acc.bufferView];
    const start = binStart + (bv.byteOffset ?? 0) + (acc.byteOffset ?? 0);
    const comps = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }[acc.type];
    const Arr = { 5126: Float32Array, 5125: Uint32Array, 5123: Uint16Array, 5121: Uint8Array }[acc.componentType];
    const stride = bv.byteStride ? bv.byteStride / Arr.BYTES_PER_ELEMENT : comps;
    const src = new Arr(buf.buffer.slice(buf.byteOffset + start, buf.byteOffset + start + (acc.count - 1) * stride * Arr.BYTES_PER_ELEMENT + comps * Arr.BYTES_PER_ELEMENT));
    if (stride === comps) return src;
    const out = new Arr(acc.count * comps);
    for (let k = 0; k < acc.count; k++) for (let c = 0; c < comps; c++) out[k * comps + c] = src[k * stride + c];
    return out;
  };
  const parts = [];
  const visit = (n, parent) => {
    const node = gltf.nodes[n];
    if (skip.includes(node.name)) return;
    const m = new THREE.Matrix4();
    if (node.matrix) m.fromArray(node.matrix);
    else m.compose(new THREE.Vector3(...(node.translation ?? [0, 0, 0])), new THREE.Quaternion(...(node.rotation ?? [0, 0, 0, 1])), new THREE.Vector3(...(node.scale ?? [1, 1, 1])));
    const world = parent.clone().multiply(m);
    if (node.mesh !== undefined) {
      for (const prim of gltf.meshes[node.mesh].primitives) {
        // material: keep only the primitives whose material name passes, with their texture UVs (as three reads them)
        if (material && !material(gltf.materials?.[prim.material]?.name ?? "")) continue;
        const g = new THREE.BufferGeometry();
        g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(view(prim.attributes.POSITION)), 3));
        if (material && prim.attributes.TEXCOORD_0 !== undefined) g.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(view(prim.attributes.TEXCOORD_0)), 2));
        if (prim.indices !== undefined) g.setIndex(new THREE.BufferAttribute(new Uint32Array(view(prim.indices)), 1));
        parts.push(g.applyMatrix4(world));
      }
    }
    for (const c of node.children ?? []) visit(c, world);
  };
  for (const n of gltf.scenes[gltf.scene ?? 0].nodes) visit(n, new THREE.Matrix4());
  return parts.length ? mergeGeometries(parts.map((g) => (g.index ? g : g.setIndex([...Array(g.attributes.position.count).keys()])))) : null;
}

/** The extras of a .glb's nodes, by node name (a skin's "skin" node carries its ceiling lights in extras.panels). */
export function readGlbExtras(file) {
  const buf = fs.readFileSync(file);
  const gltf = JSON.parse(buf.subarray(20, 20 + buf.readUInt32LE(12)).toString("utf8"));
  return Object.fromEntries((gltf.nodes ?? []).filter((n) => n.extras).map((n) => [n.name, n.extras]));
}
