"use client";
import { useMemo } from "react";
import { BufferGeometry, CanvasTexture, CatmullRomCurve3, Color, DoubleSide, Float32BufferAttribute, InstancedMesh, MeshLambertMaterial, Object3D, SphereGeometry, SRGBColorSpace, TubeGeometry, Vector3 } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import Model from "../../Model";
import { useWorldState } from "../../state";
import { HOLE_REACH, MEADOW_HOLE, MEADOW_HOUSES, MEADOW_POI, SKY_WALL, holeDrop, meadowHeight } from "../../terrain";
import { MEADOW_RADIO } from "../../zones";
import { Pieces, seeded, useCanvas } from "../props";
import { HORIZON } from "./Sky";
import { grassTint } from "./tint";

/** The houses: Blender models, set into the ground (their stone base is buried), each leaning a little. */
function MeadowHouses() {
  return (
    <>
      {MEADOW_HOUSES.map((h) => (
        <Model key={`${h.x},${h.z}`} id={h.model} position={[h.x, meadowHeight(h.x, h.z) - 0.38, h.z]} rotation={[0, 0, h.lean]} tint={h.color} />
      ))}
    </>
  );
}

/**
 * The hole, part of the ground itself: a polar patch of the real relief (same heights, same grass colour) that sags
 * into bare earth and curls over into a black shaft, ragged all round. It covers the coarse hills mesh, tucked below.
 */
function Hole() {
  const geometry = useMemo(() => {
    const { x, z } = MEADOW_HOLE;
    const A = 120;
    const OUT = 2.6;
    const LIP = 30;
    const SHAFT = 14;
    const g = new BufferGeometry();
    const pos: number[] = [];
    const col: number[] = [];
    const idx: number[] = [];
    const c = new Color();
    const earth = new Color("#4a3a2a");
    const rows = LIP + SHAFT + 1;
    for (let k = 0; k <= A; k++) {
      const a = (k / A) * Math.PI * 2;
      const ca = Math.cos(a);
      const sa = Math.sin(a);
      let inner = MEADOW_HOLE.r * 0.7;
      while (holeDrop(inner * ca, inner * sa) > MEADOW_HOLE.depth + 0.2) inner += 0.01;
      const edgeY = meadowHeight(x + inner * ca, z + inner * sa);
      for (let j = 0; j < rows; j++) {
        let rr: number;
        let y: number;
        if (j <= SHAFT) {
          const t = j / SHAFT;
          rr = inner * (0.85 + 0.15 * t);
          y = edgeY - (1 - t) ** 1.5 * 25;
        } else {
          const t = (j - SHAFT) / LIP;
          rr = inner + (HOLE_REACH.rim + OUT - inner) * t ** 1.6;
          y = meadowHeight(x + rr * ca, z + rr * sa) + 0.04;
        }
        pos.push(rr * ca, y, rr * sa);
        const drop = holeDrop(rr * ca, rr * sa);
        grassTint(x + rr * ca, z + rr * sa, c);
        c.lerp(earth, Math.min(1, Math.max(0, (drop - 0.12) / 0.7)) * (0.8 + 0.2 * Math.sin(a * 13 + rr * 5)));
        c.multiplyScalar(Math.max(0, 1 - Math.max(0, drop - 1.1) / 1.8));
        if (j < SHAFT) c.setRGB(0, 0, 0);
        col.push(c.r, c.g, c.b);
      }
    }
    for (let k = 0; k < A; k++) {
      for (let j = 0; j < rows - 1; j++) {
        const p0 = k * rows + j;
        const p1 = (k + 1) * rows + j;
        idx.push(p0, p0 + 1, p1, p1, p0 + 1, p1 + 1);
      }
    }
    g.setAttribute("position", new Float32BufferAttribute(pos, 3));
    g.setAttribute("color", new Float32BufferAttribute(col, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  }, []);
  return (
    <mesh geometry={geometry} position={[MEADOW_HOLE.x, 0, MEADOW_HOLE.z]}>
      <meshLambertMaterial vertexColors side={DoubleSide} />
    </mesh>
  );
}

/** A yellow diamond road sign on its post, crooked. */
export function RoadSign({ x, z, ry = 0, tilt = 0.1, lines }: { x: number; z: number; ry?: number; tilt?: number; lines: string[] }) {
  const face = useCanvas(256, 256, (ctx) => {
    ctx.translate(128, 128);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = "#1a1a12";
    ctx.fillRect(-88, -88, 176, 176);
    ctx.fillStyle = "#f2c230";
    ctx.fillRect(-80, -80, 160, 160);
    ctx.strokeStyle = "#1a1a12";
    ctx.lineWidth = 5;
    ctx.strokeRect(-72, -72, 144, 144);
    ctx.rotate(-Math.PI / 4);
    ctx.fillStyle = "#1a1a12";
    ctx.font = "700 30px Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    lines.forEach((l, k) => ctx.fillText(l, 0, (k - (lines.length - 1) / 2) * 34));
  }, [lines.join("|")]);
  const y = meadowHeight(x, z);
  return (
    <group position={[x, y - 0.1, z]} rotation={[0.04, ry, tilt]}>
      <mesh position={[0, 1.1, 0]}>
        <cylinderGeometry args={[0.035, 0.035, 2.2, 8]} />
        <meshStandardMaterial color="#9a9c98" metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh position={[0, 2.25, 0.04]}>
        <planeGeometry args={[1.2, 1.2]} />
        <meshStandardMaterial map={face} transparent alphaTest={0.5} roughness={0.5} side={DoubleSide} />
      </mesh>
    </group>
  );
}

/** Wooden power poles across the meadow, their cables sagging between them; the last one stands alone, cut. */
function PowerLine() {
  const { z, x0, x1, step } = MEADOW_POI.power;
  const poles = useMemo(() => {
    const xs: number[] = [];
    for (let x = x0; x <= x1 - step * 2; x += step) xs.push(x);
    return { linked: xs, lone: x1 };
  }, [x0, x1, step]);
  const cables = useMemo(() => {
    const parts: BufferGeometry[] = [];
    const top = (x: number) => meadowHeight(x, z) + 9.44;
    const offsets = [-1.05, -0.4, 0.4, 1.05];
    for (let i = 0; i < poles.linked.length - 1; i++) {
      const a = poles.linked[i];
      const b = poles.linked[i + 1];
      for (const o of offsets) {
        const pts = Array.from({ length: 9 }, (_, k) => {
          const t = k / 8;
          return new Vector3(a + (b - a) * t, top(a) + (top(b) - top(a)) * t - Math.sin(Math.PI * t) * 1.1, z - o);
        });
        parts.push(new TubeGeometry(new CatmullRomCurve3(pts), 12, 0.02, 4));
      }
    }
    // the cut ends hang down from the last linked pole, and from the lone one
    for (const [px, dir] of [[poles.linked[poles.linked.length - 1], 1], [poles.lone, -1]] as const) {
      for (const o of offsets) {
        const pts = [new Vector3(px, top(px), z - o), new Vector3(px + dir * 1.6, top(px) - 1.2, z - o), new Vector3(px + dir * 2, top(px) - 3.5 - Math.abs(o), z - o)];
        parts.push(new TubeGeometry(new CatmullRomCurve3(pts), 6, 0.02, 4));
      }
    }
    return mergeGeometries(parts);
  }, [poles, z]);
  return (
    <>
      {[...poles.linked, poles.lone].map((x) => (
        <Model key={x} id="powerPole" position={[x, meadowHeight(x, z) - 0.2, z]} rotation={[0, Math.PI / 2, (x % 3) * 0.012]} />
      ))}
      <mesh geometry={cables}>
        <meshStandardMaterial color="#1c1c1a" roughness={0.6} />
      </mesh>
    </>
  );
}

/** The lone tree on its hill, and its swing that moves by itself. */
function SwingTree() {
  const { x, z } = MEADOW_POI.swing;
  return <Model id="treeSwing" position={[x, meadowHeight(x, z) - 0.3, z]} rotation={[0, -0.6, 0]} node="swing" animate={(n, t) => (n.rotation.z = Math.sin(t * 1.25) * 0.32)} />;
}

/** An abandoned picnic at the bottom of a hollow: a checked blanket, plates, a basket, and a radio playing. */
function Picnic() {
  const { x, z } = MEADOW_POI.picnic;
  const y = meadowHeight(x, z);
  const { used } = useWorldState();
  const on = !used.has(MEADOW_RADIO);
  const checks = useCanvas(128, 128, (ctx) => {
    for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) {
      ctx.fillStyle = (i + j) % 2 ? "#f4efe6" : "#c8463c";
      ctx.fillRect(i * 16, j * 16, 16, 16);
    }
  });
  const things = useMemo(() => {
    const p = [
      { x: x - 0.5, y: y + 0.02, z: z + 0.3, w: 0.26, h: 0.02, d: 0.26 },
      { x: x + 0.4, y: y + 0.02, z: z - 0.4, w: 0.26, h: 0.02, d: 0.26 },
      { x: x + 0.7, y: y + 0.02, z: z + 0.5, w: 0.5, h: 0.32, d: 0.34 }, // basket
    ];
    return p;
  }, [x, y, z]);
  return (
    <group>
      <mesh position={[x, y + 0.03, z]} rotation={[-Math.PI / 2, 0, 0.3]}>
        <planeGeometry args={[2.4, 1.9]} />
        <meshStandardMaterial map={checks} roughness={1} side={DoubleSide} />
      </mesh>
      <Pieces pieces={things} color="#e9e2d0" roughness={0.6} />
      {/* the radio: a small cream box, grille, dial; its dial glows while it plays */}
      <group position={[x - 0.3, y + 0.03, z - 0.5]} rotation={[0, 0.5, 0]}>
        <mesh position={[0, 0.16, 0]}>
          <boxGeometry args={[0.44, 0.3, 0.16]} />
          <meshStandardMaterial color="#e6dcc4" roughness={0.5} />
        </mesh>
        <mesh position={[-0.08, 0.16, 0.081]}>
          <circleGeometry args={[0.1, 20]} />
          <meshStandardMaterial color="#6d5a48" roughness={0.9} />
        </mesh>
        <mesh position={[0.13, 0.18, 0.082]}>
          <planeGeometry args={[0.12, 0.08]} />
          <meshBasicMaterial color={on ? "#ffcf7a" : "#3a3328"} toneMapped={false} />
        </mesh>
      </group>
    </group>
  );
}

/** A street lamp, lit in broad daylight, its pool of light on the grass. */
function Lamp() {
  const { x, z } = MEADOW_POI.lamp;
  const y = meadowHeight(x, z);
  const pool = useCanvas(128, 128, (ctx) => {
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, "rgba(255,236,190,0.55)");
    g.addColorStop(1, "rgba(255,236,190,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
  });
  return (
    <>
      <Model id="streetLamp" position={[x, y - 0.2, z]} rotation={[0, 0.4, 0]} />
      <mesh position={[x + Math.cos(0.4) * 1.75, meadowHeight(x + 1.6, z - 0.7) + 0.06, z - Math.sin(0.4) * 1.75]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[6, 6]} />
        <meshBasicMaterial map={pool} transparent depthWrite={false} toneMapped={false} />
      </mesh>
      <pointLight position={[x + Math.cos(0.4) * 1.75, y + 6.4, z - Math.sin(0.4) * 1.75]} intensity={6} distance={10} decay={1.6} color="#ffe2a8" />
    </>
  );
}

/** A dirt path that starts nowhere and stops dead at a sign. */
function DeadEnd() {
  const { x, z, len } = MEADOW_POI.path;
  const geometry = useMemo(() => {
    const pts: [number, number][] = [];
    for (let k = 0; k <= 40; k++) {
      const t = k / 40;
      pts.push([x + 10 - 10 * t + Math.sin(t * 4) * 2, z + len / 2 - len * t]);
    }
    const pos: number[] = [];
    const col: number[] = [];
    const idx: number[] = [];
    const dirt = new Color("#8a7350");
    pts.forEach(([px, pz], k) => {
      const [nx, nz] = pts[Math.min(k + 1, pts.length - 1)];
      const [lx, lz] = pts[Math.max(k - 1, 0)];
      const dx = nx - lx;
      const dz = nz - lz;
      const l = Math.hypot(dx, dz) || 1;
      const w = 0.8 * Math.min(1, k / 3, (pts.length - 1 - k) / 1.5 + 0.4);
      for (const s of [-1, 1]) {
        const vx = px + (-dz / l) * w * s;
        const vz = pz + (dx / l) * w * s;
        pos.push(vx, meadowHeight(vx, vz) + 0.05, vz);
        col.push(dirt.r, dirt.g, dirt.b);
      }
      if (k > 0) idx.push(k * 2 - 2, k * 2 - 1, k * 2, k * 2 - 1, k * 2 + 1, k * 2);
    });
    const g = new BufferGeometry();
    g.setAttribute("position", new Float32BufferAttribute(pos, 3));
    g.setAttribute("color", new Float32BufferAttribute(col, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    return { g, end: pts[pts.length - 1] };
  }, [x, z, len]);
  return (
    <>
      <mesh geometry={geometry.g}>
        <meshLambertMaterial vertexColors side={DoubleSide} />
      </mesh>
      <RoadSign x={geometry.end[0]} z={geometry.end[1] - 0.8} ry={0.2} tilt={-0.12} lines={["NO", "OUTLET"]} />
    </>
  );
}

/** A bathtub full of clear water in a hollow of tall flowers. */
function Bathtub() {
  const { x, z } = MEADOW_POI.bathtub;
  const flowers = useMemo(() => {
    const r = seeded(31);
    const cols = ["#f3cf35", "#ffffff", "#e9a6c4", "#c9b4f0"].map((c) => new Color(c));
    const m = new InstancedMesh(new SphereGeometry(0.07, 6, 4), new MeshLambertMaterial(), 520);
    const stems = new InstancedMesh(new SphereGeometry(0.012, 3, 2), new MeshLambertMaterial({ color: "#4f7f2e" }), 520);
    const o = new Object3D();
    for (let i = 0; i < 520; i++) {
      const a = r() * Math.PI * 2;
      const d = 1.4 + Math.sqrt(r()) * 6;
      const fx = x + Math.cos(a) * d;
      const fz = z + Math.sin(a) * d;
      const h = 0.7 + r() * 0.6;
      o.position.set(fx, meadowHeight(fx, fz) + h, fz);
      o.scale.set(1, 1, 1);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
      m.setColorAt(i, cols[i % cols.length]);
      o.position.y -= h / 2;
      o.scale.set(1, h / 0.024, 1);
      o.updateMatrix();
      stems.setMatrixAt(i, o.matrix);
    }
    return [m, stems];
  }, [x, z]);
  return (
    <>
      <Model id="bathtub" position={[x, meadowHeight(x, z) - 0.05, z]} rotation={[0, 0.7, 0.02]} />
      <primitive object={flowers[0]} />
      <primitive object={flowers[1]} />
    </>
  );
}

/**
 * The edge of the world: the meadow ends on a wall painted like the sky (same colours as the sky dome, seen from
 * the middle of the meadow), with seams between its panels and a small grey service door at the foot.
 */
function SkyWall() {
  const { z, w, h } = SKY_WALL;
  const paint = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 2048;
    canvas.height = 512;
    const ctx = canvas.getContext("2d")!;
    const horizon = new Color(HORIZON);
    const mid = new Color("#7fb5ee");
    const zenith = new Color("#2f6fd0");
    const c = new Color();
    const smooth = (a: number, b: number, v: number) => {
      const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
      return t * t * (3 - 2 * t);
    };
    for (let py = 0; py < 512; py++) {
      // height on the wall -> the direction the sky dome would have there, seen from the wake-up spot
      const y = (1 - py / 512) * h - 10;
      const dy = Math.max(0, y) / Math.hypot(y, 200);
      c.copy(horizon).lerp(mid, smooth(0, 0.18, dy)).lerp(zenith, smooth(0.18, 0.85, dy));
      // the top melts into the real sky: no edge to see from afar
      const alpha = Math.min(1, Math.max(0, (py / 512 - 0.05) / 0.35));
      const s = c.clone().convertLinearToSRGB(); // the canvas is read as sRGB, three's colours are linear
      ctx.fillStyle = `rgba(${Math.round(s.r * 255)},${Math.round(s.g * 255)},${Math.round(s.b * 255)},${alpha})`;
      ctx.fillRect(0, py, 2048, 1);
    }
    // painted clouds, a little too flat
    const r = seeded(77);
    for (let k = 0; k < 14; k++) {
      const cx = r() * 2048;
      const cy = 260 + r() * 160;
      for (let j = 0; j < 7; j++) {
        const g = ctx.createRadialGradient(cx + (r() - 0.5) * 80, cy + (r() - 0.6) * 20, 0, cx, cy, 30 + r() * 30);
        g.addColorStop(0, "rgba(255,255,255,0.75)");
        g.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, 2048, 512);
      }
    }
    // panel seams: thin, only near the foot of the wall (seen when you come close)
    for (let sx = 0; sx < 2048; sx += 2048 / 9.5) {
      const g = ctx.createLinearGradient(0, 300, 0, 512);
      g.addColorStop(0, "rgba(40,60,90,0)");
      g.addColorStop(1, "rgba(40,60,90,0.35)");
      ctx.fillStyle = g;
      ctx.fillRect(sx, 300, 1, 212);
    }
    const t = new CanvasTexture(canvas);
    t.colorSpace = SRGBColorSpace;
    return t;
  }, [h]);
  const y0 = -10;
  const doorY = meadowHeight(12, z + 0.5);
  return (
    <>
      <mesh position={[0, y0 + h / 2, z]}>
        <planeGeometry args={[w, h]} />
        <meshBasicMaterial map={paint} fog={false} side={DoubleSide} transparent depthWrite={false} toneMapped={false} />
      </mesh>
      <group position={[12, doorY, z + 0.05]}>
        <mesh position={[0, 1.05, 0]}>
          <planeGeometry args={[0.95, 2.1]} />
          <meshStandardMaterial color="#8d97a3" roughness={0.6} metalness={0.3} />
        </mesh>
        <mesh position={[0.36, 1.0, 0.02]}>
          <boxGeometry args={[0.12, 0.03, 0.04]} />
          <meshStandardMaterial color="#5a5f66" metalness={0.7} roughness={0.4} />
        </mesh>
      </group>
    </>
  );
}

/** The inside of the door's house: a warm light, and the white door against the back wall catches it. */
function DoorHouseLight() {
  const h = MEADOW_HOUSES[0];
  return <pointLight position={[h.x, meadowHeight(h.x, h.z) + 2.4, h.z + 0.6]} intensity={5} distance={9} decay={1.5} color="#ffe2b0" />;
}

export default function Houses() {
  return (
    <>
      <MeadowHouses />
      <DoorHouseLight />
      <Hole />
      <RoadSign x={MEADOW_HOLE.x + 5} z={MEADOW_HOLE.z - 3} ry={-0.9} tilt={0.14} lines={["WATCH", "YOUR", "STEP"]} />
      <PowerLine />
      <SwingTree />
      <Picnic />
      <Lamp />
      <DeadEnd />
      <Bathtub />
      <SkyWall />
    </>
  );
}
