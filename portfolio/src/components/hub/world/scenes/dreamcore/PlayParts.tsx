"use client";
import { MeshPortalMaterial } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { Suspense, useMemo, useRef, useState } from "react";
import { Path, RepeatWrapping, Shape, ShapeGeometry, Vector2, type Mesh } from "three";
import type { Piece } from "../../archi/build";
import { Water } from "../../archi/Place";
import Model from "../../Model";
import { BACKSTAGE_CRATE, GARDEN_PLANTERS, GARDENS, PLAY, PLAY_IDS, RAMP, ROTUNDA_HOUSES, ROTUNDA_TREES } from "../../places/playground";
import { HILLS_SPAWN } from "../../places/dreamcore";
import { PreviewContext } from "../../PortalWindow";
import { useWorldState } from "../../state";
import { meadowHeight } from "../../terrain";
import type { ZoneId } from "../../zones";
import { SCENES } from "../index";
import { Pieces, seeded, useCanvas } from "../props";
import { Balls, CartoonTree, HangingCloud, Sign, Tree, WallLetters } from "./Kit";
import { Turbine } from "./Outdoors";

const P = PLAY;
const G = GARDENS;

/* ---------------------------------------------------------------- views onto other places */

/**
 * A window (or a screen) that shows another place, live: the place is rendered inside the opening, moved and turned so
 * that `from` (a point of that place, where you would stand) sits right behind the opening, looking out through it.
 * Only mounted when you are close enough to see it.
 */
function ViewWindow({ zone, x, y, z, ry, w, h, from, near = 25 }: { zone: ZoneId; x: number; y: number; z: number; ry: number; w: number; h: number; from: { x: number; y: number; z: number; yaw: number }; near?: number }) {
  const [on, setOn] = useState(false);
  const last = useRef(0);
  useFrame(({ camera, clock }) => {
    if (clock.elapsedTime - last.current < 0.4) return;
    last.current = clock.elapsedTime;
    const close = Math.hypot(camera.position.x - x, camera.position.z - z) < near;
    if (close !== on) setOn(close);
  });
  const Scene = SCENES[zone];
  // In the plane's own frame (its children inherit its position and turn): looking through it from the front is
  // looking along -z. The other place is turned so that its yaw `from.yaw` (0 = towards -z there too) lines up with
  // that, and moved so that `from` sits a little behind the glass, at eye level for whoever stands in front.
  const turn = -from.yaw;
  const c = Math.cos(turn);
  const s = Math.sin(turn);
  // a point (px, pz) of that place, turned by `turn` about y (three.js: x' = x cos + z sin, z' = -x sin + z cos)
  const fx = from.x * c + from.z * s;
  const fz = -from.x * s + from.z * c;
  // the window's centre is at height y in this place; the eye of whoever looks is about 1.6 m up: from.y sits there
  const position: [number, number, number] = [-fx, 1.6 - y - from.y, 0.4 - fz];
  return (
    <mesh position={[x, y, z]} rotation={[0, ry, 0]}>
      <planeGeometry args={[w, h]} />
      {on ? (
        <MeshPortalMaterial worldUnits blur={0} resolution={512}>
          <PreviewContext.Provider value={true}>
            <Suspense fallback={null}>
              <group position={position} rotation={[0, turn, 0]}>
                <Scene />
              </group>
            </Suspense>
          </PreviewContext.Provider>
        </MeshPortalMaterial>
      ) : (
        <meshBasicMaterial color="#cfe0f2" toneMapped={false} />
      )}
    </mesh>
  );
}

/* ---------------------------------------------------------------- zone 1: the ball pit */

function ballsTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#1d1d22";
  ctx.fillRect(0, 0, 256, 256);
  const r = seeded(5);
  const cols = ["#e53b3b", "#2c6fd6", "#e8c547", "#3aa65a", "#f28c28"];
  for (let i = 0; i < 900; i++) {
    const x = r() * 256;
    const y = r() * 256;
    const g = ctx.createRadialGradient(x - 3, y - 3, 1, x, y, 11);
    const c = cols[i % cols.length];
    g.addColorStop(0, "#ffffff");
    g.addColorStop(0.25, c);
    g.addColorStop(1, "#000000");
    ctx.fillStyle = g;
    for (const [ox, oy] of [[0, 0], [256, 0], [-256, 0], [0, 256], [0, -256]]) {
      ctx.beginPath();
      ctx.arc(x + ox, y + oy, 10, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  return canvas;
}

/** A surface of packed balls (the pit, the river): a texture under a scattering of real balls. */
function BallSurface({ shape, y, repeat }: { shape: Shape; y: number; repeat: number }) {
  const map = useCanvas(256, 256, (ctx) => ctx.drawImage(ballsTexture(), 0, 0));
  map.wrapS = map.wrapT = RepeatWrapping;
  map.repeat.set(repeat, repeat);
  const geo = useMemo(() => {
    const g = new ShapeGeometry(shape, 24);
    const pos = g.attributes.position;
    const uv = g.attributes.uv;
    for (let k = 0; k < uv.count; k++) uv.setXY(k, pos.getX(k) / 3, pos.getY(k) / 3);
    return g;
  }, [shape]);
  return (
    <mesh geometry={geo} position={[0, y, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <meshStandardMaterial map={map} roughness={0.4} />
    </mesh>
  );
}

const roundRect = (cx: number, cz: number, w: number, d: number, r: number) => {
  // in the XY plane of a shape that is then laid flat (rotation -π/2 about X): y = -z
  const s = new Shape();
  const x0 = cx - w / 2;
  const x1 = cx + w / 2;
  const y0 = -cz - d / 2;
  const y1 = -cz + d / 2;
  s.moveTo(x0 + r, y0);
  s.lineTo(x1 - r, y0);
  s.absarc(x1 - r, y0 + r, r, -Math.PI / 2, 0, false);
  s.lineTo(x1, y1 - r);
  s.absarc(x1 - r, y1 - r, r, 0, Math.PI / 2, false);
  s.lineTo(x0 + r, y1);
  s.absarc(x0 + r, y1 - r, r, Math.PI / 2, Math.PI, false);
  s.lineTo(x0, y0 + r);
  s.absarc(x0 + r, y0 + r, r, Math.PI, Math.PI * 1.5, false);
  return s;
};

/** The ball pit, to wade through (slowly), and the carousel turning on its island in the middle. */
export function BallPit() {
  const { pit, carousel } = P;
  const shape = useMemo(() => roundRect(pit.x, pit.z, pit.w - 0.2, pit.d - 0.2, pit.round), [pit]);
  return (
    <>
      <BallSurface shape={shape} y={-0.12} repeat={1} />
      <Balls
        count={2400}
        seed={9}
        place={(r) => {
          let x = 0;
          let z = 0;
          do {
            x = pit.x + (r() - 0.5) * (pit.w - 2);
            z = pit.z + (r() - 0.5) * (pit.d - 2);
          } while (Math.hypot(x - carousel.x, z - carousel.z) < carousel.r + 0.3 || Math.hypot(Math.max(0, Math.abs(x - pit.x) - (pit.w / 2 - pit.round)), Math.max(0, Math.abs(z - pit.z) - (pit.d / 2 - pit.round))) > pit.round - 0.5);
          return [x, -0.12 + r() * 0.1, z];
        }}
      />
      <Model
        id="carousel"
        position={[carousel.x, -0.4, carousel.z]}
        node="spin"
        animate={(n, t) => {
          n.rotation.y = t * 0.22;
          for (let k = 0; k < 6; k++) {
            const h = n.getObjectByName(`horse${k}`);
            if (h) h.position.y = 1.05 + Math.sin(t * 1.6 + k * 1.3) * 0.16;
          }
        }}
      />
      <pointLight position={[carousel.x, 3.2, carousel.z]} intensity={8} distance={14} decay={1.5} color="#ffd9a0" />
      <WallLetters x={-9} y={4.2} z={pit.z - pit.d / 2 + 0.06} ry={0} text="ABC" />
      <WallLetters x={pit.x + pit.w / 2 - 0.06} y={4.2} z={-45} ry={-Math.PI / 2} text="123" />
      <HangingCloud x={-6} y={5.2} z={-40} top={7} ry={0.3} />
      <HangingCloud x={7} y={5.6} z={-50} top={7} ry={-0.4} s={0.8} />
      <Sign x={11} z={-34} ry={-0.6} tilt={-0.07} lines={["NO", "DIVING"]} />
    </>
  );
}

/* ---------------------------------------------------------------- zone 1: the giant bedroom */

/** Everything three times too big: the bed, its striped blanket, the night table and its alarm clock, a night light. */
export function Bedroom() {
  const { bed, steps, table, nightlight } = P;
  const { used } = useWorldState();
  const lit = used.has(PLAY_IDS.nightlight);
  const stripes = useCanvas(128, 128, (ctx) => {
    for (let i = 0; i < 8; i++) {
      ctx.fillStyle = i % 2 ? "#3f9a4a" : "#a9dc8c";
      ctx.fillRect(0, i * 16, 128, 16);
    }
  });
  const face = useCanvas(256, 256, (ctx) => {
    ctx.fillStyle = "#f6f1e4";
    ctx.beginPath();
    ctx.arc(128, 128, 124, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#2a2a2a";
    ctx.font = "700 30px Georgia, serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (let k = 1; k <= 12; k++) {
      const a = (k / 12) * Math.PI * 2;
      ctx.fillText(String(k), 128 + Math.sin(a) * 96, 128 - Math.cos(a) * 96);
    }
    ctx.strokeStyle = "#2a2a2a";
    ctx.lineCap = "round";
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(128, 128);
    ctx.lineTo(128 + 50, 128 - 30); // ten past three, forever
    ctx.stroke();
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(128, 128);
    ctx.lineTo(128 + 20, 128 - 82);
    ctx.stroke();
  });
  const frame = useMemo<Piece[]>(() => [
    { x: bed.x, y: 0, z: bed.z, w: bed.w + 0.06, h: bed.top - 0.32, d: bed.d + 0.06 }, // the bed's base, over the shape's sides
    { x: bed.x, y: 0, z: bed.z + bed.d / 2 + 0.2, w: bed.w + 0.4, h: 3.4, d: 0.36 }, // headboard
    { x: bed.x, y: 0, z: bed.z - bed.d / 2 - 0.15, w: bed.w + 0.3, h: 1.8, d: 0.3 }, // footboard
    { x: table.x, y: 0, z: table.z, w: table.w, h: table.h, d: table.d },
  ], [bed, table]);
  return (
    <>
      <Pieces pieces={frame} color="#f4f1ea" roughness={0.6} />
      {/* the blanket lies ON the mattress (the bed's top is walkable: 8 cm of soft cloth under your feet) */}
      <mesh position={[bed.x, bed.top + 0.04, bed.z - 0.6]}>
        <boxGeometry args={[bed.w + 0.02, 0.08, bed.d * 0.8]} />
        <meshStandardMaterial map={stripes} roughness={0.95} />
      </mesh>
      <mesh position={[bed.x, bed.top + 0.25, bed.z + bed.d / 2 - 1.1]} scale={[1, 0.38, 0.6]}>
        <sphereGeometry args={[1.6, 24, 16]} />
        <meshStandardMaterial color="#ffffff" roughness={1} />
      </mesh>
      {/* the steps up: a fallen book, a toy box */}
      <mesh position={[steps[0].x, steps[0].h / 2, steps[0].z]}>
        <boxGeometry args={[1.64, steps[0].h, 1.64]} />
        <meshStandardMaterial color="#b8352d" roughness={0.6} />
      </mesh>
      <mesh position={[steps[1].x, steps[1].h / 2, steps[1].z]}>
        <boxGeometry args={[1.64, steps[1].h, 1.64]} />
        <meshStandardMaterial color="#c9a46a" roughness={0.8} />
      </mesh>
      {/* the alarm clock on the table, ticking (see the emitters in zones.ts) */}
      <group position={[table.x, table.h, table.z]}>
        <mesh position={[0, 0.65, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.6, 0.6, 0.36, 32]} />
          <meshStandardMaterial color="#c8463c" roughness={0.4} metalness={0.3} />
        </mesh>
        <mesh position={[0, 0.65, 0.185]}>
          <circleGeometry args={[0.55, 32]} />
          <meshStandardMaterial map={face} roughness={0.5} />
        </mesh>
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * 0.4, 1.28, 0]} scale={[1, 0.7, 1]}>
            <sphereGeometry args={[0.24, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color="#d9b45a" roughness={0.3} metalness={0.8} />
          </mesh>
        ))}
        {[-1, 1].map((s) => (
          <mesh key={`f${s}`} position={[s * 0.38, 0.08, 0]} rotation={[0, 0, s * 0.5]}>
            <cylinderGeometry args={[0.04, 0.04, 0.3, 8]} />
            <meshStandardMaterial color="#d9b45a" metalness={0.8} roughness={0.3} />
          </mesh>
        ))}
      </group>
      {/* the night light: a mushroom on the floor; E switches it on (and a lullaby starts) */}
      <group position={[nightlight.x, 0, nightlight.z]}>
        <mesh position={[0, 0.2, 0]}>
          <cylinderGeometry args={[0.1, 0.14, 0.4, 12]} />
          <meshStandardMaterial color="#f4ecd8" roughness={0.6} />
        </mesh>
        <mesh position={[0, 0.42, 0]} scale={[1, 0.6, 1]}>
          <sphereGeometry args={[0.32, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color={lit ? "#ffcf8a" : "#c8463c"} emissive={lit ? "#ff9a40" : "#000000"} emissiveIntensity={lit ? 1.4 : 0} roughness={0.5} />
        </mesh>
        <pointLight position={[0, 0.8, 0]} intensity={lit ? 9 : 0} distance={12} decay={1.4} color="#ffb070" />
      </group>
      {/* the little door behind the table: a frame, its leaf ajar */}
      <group position={[33.5, 0, -31.75]}>
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * 0.6, 0.6, 0]}>
            <boxGeometry args={[0.1, 1.2, 0.14]} />
            <meshStandardMaterial color="#f4f1ea" />
          </mesh>
        ))}
        <mesh position={[0, 1.16, 0]}>
          <boxGeometry args={[1.3, 0.1, 0.14]} />
          <meshStandardMaterial color="#f4f1ea" />
        </mesh>
        <mesh position={[-0.55 + 0.3, 0.55, 0.32]} rotation={[0, -1.1, 0]}>
          <boxGeometry args={[0.95, 1.05, 0.05]} />
          <meshStandardMaterial color="#a9cdea" roughness={0.6} />
        </mesh>
      </group>
      <pointLight position={[P.bedroom.x, 7, P.bedroom.z]} intensity={22} distance={30} decay={1.2} color="#b8c8ff" />
    </>
  );
}

/* ---------------------------------------------------------------- zone 1: the block corner */

const LETTERS = ["D", "O", "R", "S"];
function Block({ x, y, z, ry = 0, rz = 0, letter, color }: { x: number; y: number; z: number; ry?: number; rz?: number; letter: string; color: string }) {
  const map = useCanvas(128, 128, (ctx) => {
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 128, 128);
    ctx.strokeStyle = "rgba(0,0,0,0.25)";
    ctx.lineWidth = 10;
    ctx.strokeRect(5, 5, 118, 118);
    ctx.fillStyle = "#ffffff";
    ctx.font = "900 92px 'Arial Rounded MT Bold', Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(letter, 64, 70);
  }, [letter, color]);
  return (
    <mesh position={[x, y + 0.8, z]} rotation={[0, ry, rz]}>
      <boxGeometry args={[1.6, 1.6, 1.6]} />
      <meshStandardMaterial map={map} roughness={0.7} />
    </mesh>
  );
}

/** Giant ABC blocks: a tower that spells a word, read from the top, and toppled ones hiding the vent. */
export function BlockCorner() {
  const { tower, vent } = P;
  const colors = ["#e53b3b", "#2c6fd6", "#e8c547", "#3aa65a", "#f28c28"];
  const grille = useMemo<Piece[]>(() => {
    const p: Piece[] = [{ x: vent.x + 0.06, y: 0, z: vent.z, w: 0.08, h: 1.2, d: 1.5 }];
    return p;
  }, [vent]);
  return (
    <>
      {LETTERS.map((l, k) => (
        <Block key={l + k} x={tower.x + Math.sin(k) * 0.05} y={(LETTERS.length - 1 - k) * 1.6} z={tower.z} ry={k * 0.08} letter={l} color={colors[k]} />
      ))}
      <Block x={-42.4} y={0} z={-50} ry={0.4} letter="A" color={colors[4]} />
      <Block x={-41.6} y={0} z={-54.4} ry={-0.3} letter="B" color={colors[1]} />
      <Block x={-38} y={0} z={-36} ry={0.7} letter="C" color={colors[3]} />
      <Block x={-24.5} y={0} z={-50.5} ry={0.2} letter="Z" color={colors[0]} />
      {/* the vent: a grille that has come loose */}
      <group position={[vent.x + 0.08, 0.55, vent.z]} rotation={[0, 0, 0.35]}>
        {Array.from({ length: 7 }, (_, k) => (
          <mesh key={k} position={[0, 0, -0.6 + k * 0.2]}>
            <boxGeometry args={[0.04, 1, 0.05]} />
            <meshStandardMaterial color="#8a9094" metalness={0.6} roughness={0.4} />
          </mesh>
        ))}
      </group>
      <Pieces pieces={grille} color="#0a0a0c" />
      <CartoonTree x={-36} z={-40} s={0.9} seed={12} />
      <Sign x={-23} z={-34} ry={0.4} tilt={0.12} lines={["DETOUR"]} />
      <pointLight position={[-32, 5, -44]} intensity={8} distance={22} decay={1.4} color="#b8c8ff" />
    </>
  );
}

/* ---------------------------------------------------------------- zone 1: clouds, purple room, slide, tunnel, backstage */

/** The corridor of clouds: you walk among them, hanging low. */
export function CloudCorridor() {
  const { clouds } = P;
  const list = useMemo(() => {
    const r = seeded(17);
    return Array.from({ length: 9 }, (_, k) => ({ x: clouds.x + (r() - 0.5) * 4, y: 1.7 + r() * 0.9, z: clouds.z + clouds.d / 2 - 1.5 - k * 2, ry: (r() - 0.5) * 0.8, s: 0.6 + r() * 0.35 }));
  }, [clouds]);
  return (
    <>
      {list.map((c, k) => (
        <HangingCloud key={k} x={c.x} y={c.y} z={c.z} top={3.2} ry={c.ry} s={c.s} />
      ))}
      <pointLight position={[clouds.x, 2.6, clouds.z]} intensity={4} distance={14} decay={1.5} color="#cfe0ff" />
    </>
  );
}

/** The purple room: dark, two levels, round lights hanging at every height; the slide down from the balcony. */
export function PurpleRoom() {
  const { purple, slide, balcony } = P;
  const globes = useMemo(() => {
    const r = seeded(21);
    return Array.from({ length: 16 }, () => ({ x: purple.x + (r() - 0.5) * 20, y: 2.5 + r() * 6.5, z: purple.z + (r() - 0.5) * 22, s: 0.15 + r() * 0.25 }));
  }, [purple]);
  // the slide follows its ramp exactly: from the balcony (x0, its floor height) down to the pit (x1 + 1, 0.6)
  const chute = useMemo<Piece[]>(() => {
    const run = slide.x0 - (slide.x1 + 1);
    const rise = balcony.h - 0.6;
    const tilt = Math.atan2(rise, run);
    const span = Math.hypot(run, rise);
    const cx = (slide.x0 + slide.x1 + 1) / 2;
    const mid = (balcony.h + 0.6) / 2;
    return [
      { x: cx, y: mid + 0.005, z: slide.z, w: span, h: 0.04, d: 2.2, tilt },
      ...[-1, 1].map((s) => ({ x: cx, y: mid, z: slide.z + s * 1.12, w: span, h: 0.55, d: 0.07, tilt })),
      // the last metre, flat, into the balls
      { x: slide.x1 + 0.5, y: 0.6, z: slide.z, w: 1.2, h: 0.04, d: 2.2 },
    ];
  }, [slide, balcony.h]);
  return (
    <>
      {globes.map((g, k) => (
        <mesh key={k} position={[g.x, g.y, g.z]}>
          <sphereGeometry args={[g.s, 16, 12]} />
          <meshBasicMaterial color={k % 3 ? "#f2e8ff" : "#c9a8ff"} toneMapped={false} />
        </mesh>
      ))}
      <pointLight position={[purple.x - 1, 7, purple.z - 2]} intensity={30} distance={26} decay={1.3} color="#a98cff" />
      <pointLight position={[purple.x + 5, 2.5, purple.z + 6]} intensity={12} distance={16} decay={1.5} color="#e6dcff" />
      <pointLight position={[balcony.x, balcony.h + 2.2, balcony.z]} intensity={10} distance={14} decay={1.5} color="#d8c8ff" />
      {/* the slide: a yellow chute from the balcony down to the pit */}
      <Pieces pieces={chute} color="#e8c547" roughness={0.35} />
    </>
  );
}

/** The sky tunnel: a round black hole at the far end, and a river of balls pouring out of it towards the pit. */
export function Tunnel() {
  const { tunnel } = P;
  const end = tunnel.z - tunnel.d / 2;
  const rim = useMemo(() => {
    const outline = new Shape();
    outline.absarc(0, 0, 2.6, 0, Math.PI * 2, false);
    outline.holes.push(new Path([new Vector2(-G.mouth.w / 2, -1.6), new Vector2(G.mouth.w / 2, -1.6), new Vector2(G.mouth.w / 2, 3 - 1.6), new Vector2(-G.mouth.w / 2, 3 - 1.6)]));
    return new ShapeGeometry(outline, 48);
  }, []);
  const river = useMemo(() => {
    // a winding band from the hole to the pit
    const s = new Shape();
    const pts: [number, number][] = [];
    for (let k = 0; k <= 24; k++) {
      const t = k / 24;
      pts.push([Math.sin(t * 5.5) * 1.4 * t, end + 0.3 + t * (tunnel.d + 2)]);
    }
    const width = (t: number) => 0.9 + t * 1.3;
    pts.forEach(([x, z], k) => (k ? s.lineTo(x - width(k / 24), -z) : s.moveTo(x - width(0), -z)));
    for (let k = pts.length - 1; k >= 0; k--) s.lineTo(pts[k][0] + width(k / 24), -pts[k][1]);
    return s;
  }, [end, tunnel.d]);
  return (
    <>
      <mesh geometry={rim} position={[tunnel.x, 1.6, end + 0.04]}>
        <meshBasicMaterial color="#05060a" />
      </mesh>
      <BallSurface shape={river} y={0.03} repeat={1} />
      <Balls
        count={900}
        seed={4}
        place={(r) => {
          const t = r();
          const z = end + 0.4 + t * (tunnel.d + 1);
          const cx = Math.sin(t * 5.5) * 1.4 * t;
          const w = 0.9 + t * 1.3;
          return [cx + (r() - 0.5) * w * 1.8, 0.08 + r() * 0.08, z];
        }}
      />
      <Sign x={-3} z={end + 6} ry={0.5} tilt={0.18} lines={["FLOOD", "ZONE"]} />
      <CartoonTree x={-3} z={tunnel.z + 6} s={0.8} seed={5} />
      <HangingCloud x={1.5} y={4} z={tunnel.z + 2} top={tunnel.ceil} s={0.7} />
      <HangingCloud x={-1.8} y={4.3} z={tunnel.z - 5} top={tunnel.ceil} s={0.6} ry={0.6} />
      <pointLight position={[0, 4.6, tunnel.z]} intensity={6} distance={18} decay={1.4} color="#b8c8ff" />
    </>
  );
}

/** Backstage: plywood struts behind the painted sky, two spotlights, and an old TV showing the meadow, live. */
export function Backstage() {
  const { backstage, stage } = P;
  const z0 = stage.z - stage.d / 2;
  const struts = useMemo<Piece[]>(() => {
    const p: Piece[] = [];
    for (let x = backstage.x - backstage.w / 2 + 1; x < backstage.x + backstage.w / 2; x += 2.2) {
      p.push({ x, y: 0, z: z0 - 0.35, w: 0.12, h: 6.8, d: 0.12 });
      p.push({ x, y: 0, z: z0 - 1.6, w: 0.1, h: 0.1, d: 2.6, a: 0 });
    }
    p.push({ x: BACKSTAGE_CRATE.x, y: 0, z: BACKSTAGE_CRATE.z, w: 0.9, h: 0.6, d: 0.7 }); // a crate under the TV
    return p;
  }, [backstage, z0]);
  return (
    <>
      <Pieces pieces={struts} color="#b98a5a" surfaceKey="wood" tile={1.2} />
      {/* the TV: a box with a screen that shows the meadow */}
      <mesh position={[BACKSTAGE_CRATE.x, 0.6 + 0.3, BACKSTAGE_CRATE.z]}>
        <boxGeometry args={[0.8, 0.6, 0.6]} />
        <meshStandardMaterial color="#3a3530" roughness={0.6} />
      </mesh>
      <ViewWindow zone="meadow" x={BACKSTAGE_CRATE.x + 0.42} y={0.92} z={BACKSTAGE_CRATE.z} ry={Math.PI / 2} w={0.5} h={0.38} from={{ x: 96, y: meadowHeight(96, -50), z: -50, yaw: -1.0 }} near={9} />
      <pointLight position={[-13, 1.2, -28]} intensity={3} distance={6} decay={1.5} color="#bfe0ff" />
      <pointLight position={[-8, 5.5, -27.5]} intensity={6} distance={12} decay={1.4} color="#ffe2b0" />
      {[-11, -4].map((x) => (
        <mesh key={x} position={[x, 5.6, -28.8]} rotation={[0.6, 0, 0]}>
          <cylinderGeometry args={[0.22, 0.3, 0.6, 16]} />
          <meshStandardMaterial color="#1c1c1e" metalness={0.5} roughness={0.5} />
        </mesh>
      ))}
    </>
  );
}

/* ---------------------------------------------------------------- zone 2: the gardens */

/** Railings along both edges of the ring (smooth arcs) and both sides of the ramp up to it. */
function RingRails() {
  const { rotunda, ring } = G;
  const pieces = useMemo<Piece[]>(() => {
    const p: Piece[] = [];
    const from = (ring.from * Math.PI) / 180;
    const to = (ring.to * Math.PI) / 180;
    for (const r of [ring.r - ring.width / 2 + 0.08, ring.r + ring.width / 2 - 0.08]) {
      const n = Math.ceil(((to - from) * r) / 0.6);
      for (let k = 0; k < n; k++) {
        const a0 = from + ((to - from) * k) / n;
        const a1 = from + ((to - from) * (k + 1)) / n;
        const am = (a0 + a1) / 2;
        const x = rotunda.x + Math.sin(am) * r;
        const z = rotunda.z + Math.cos(am) * r;
        const len = 2 * r * Math.sin((a1 - a0) / 2) + 0.02;
        p.push({ x, y: ring.h + 0.92, z, w: len, h: 0.06, d: 0.06, a: am });
        if (k % 2 === 0) p.push({ x: rotunda.x + Math.sin(a0) * r, y: ring.h, z: rotunda.z + Math.cos(a0) * r, w: 0.05, h: 0.95, d: 0.05 });
      }
    }
    // the ramp: both sides, sloping
    const { ax, az, bx, bz, w } = RAMP;
    const len = Math.hypot(bx - ax, bz - az);
    const dx = (bx - ax) / len;
    const dz = (bz - az) / len;
    const a = Math.atan2(-dz, dx);
    const tilt = Math.atan2(ring.h, len);
    for (const s of [-1, 1]) {
      const ox = -dz * (w / 2 - 0.08) * s;
      const oz = dx * (w / 2 - 0.08) * s;
      p.push({ x: (ax + bx) / 2 + ox, y: ring.h / 2 + 0.92, z: (az + bz) / 2 + oz, w: Math.hypot(len, ring.h), h: 0.06, d: 0.06, a, tilt });
      for (let t = 0.6; t < len; t += 1.4) p.push({ x: ax + dx * t + ox, y: (ring.h * t) / len, z: az + dz * t + oz, w: 0.05, h: 0.95, d: 0.05 });
    }
    return p;
  }, [rotunda, ring]);
  return <Pieces pieces={pieces} color="#f4f1ea" roughness={0.6} />;
}

/** The rotunda: daylight from a round skylight; the raised ring and its tiny houses, trees, one turbine. */
export function Rotunda() {
  const { rotunda, ring } = G;
  const at = (deg: number, r = ring.r) => [rotunda.x + Math.sin((deg * Math.PI) / 180) * r, rotunda.z + Math.cos((deg * Math.PI) / 180) * r] as const;
  const houses = ROTUNDA_HOUSES;
  const trees = ROTUNDA_TREES;
  return (
    <>
      <mesh position={[rotunda.x, rotunda.ceil - 0.02, rotunda.z]} rotation={[Math.PI / 2, 0, 0]}>
        <circleGeometry args={[6, 48]} />
        <meshBasicMaterial color="#fbf8ef" toneMapped={false} />
      </mesh>
      <pointLight position={[rotunda.x, rotunda.ceil - 1.5, rotunda.z]} intensity={40} distance={34} decay={1.2} color="#fff4e0" />
      <pointLight position={[rotunda.x, 2.4, rotunda.z]} intensity={8} distance={12} decay={1.4} color="#fff4e0" />
      {houses.map((a, k) => {
        const [x, z] = at(a);
        return <Model key={a} id="houseYellow" position={[x, ring.h - 0.1, z]} rotation={[0, ((a + 90) * Math.PI) / 180, 0]} scale={0.26} tint={k % 2 ? "#efd27a" : "#f2e6c8"} />;
      })}
      {trees.map((a, k) => {
        const [x, z] = at(a, ring.r + 0.6);
        return <Tree key={a} x={x} y={ring.h} z={z} s={0.55} seed={k + 11} />;
      })}
      <RingRails />
      <Tree x={rotunda.x} z={rotunda.z} s={1.1} seed={9} />
      <Sign x={rotunda.x + 3} z={rotunda.z + 17} ry={-0.3} tilt={0.09} lines={["EXIT", "ONLY"]} />
    </>
  );
}

/** The long garden: picket fence, trees in white planters, a single turbine under the skylights, arches, a bench. */
export function Garden() {
  const { garden, turbine } = G;
  const x0 = garden.x - garden.w / 2;
  const x1 = garden.x + garden.w / 2;
  const z0 = garden.z + garden.d / 2 - 6;
  const z1 = garden.z - garden.d / 2 + 6;
  const pickets = useMemo<Piece[]>(() => {
    const p: Piece[] = [];
    const fx = garden.x - 4.5;
    for (let z = z0; z > z1; z -= 0.22) if (Math.abs(z - turbine.z) > 1.2) p.push({ x: fx, y: 0, z, w: 0.04, h: 0.95 + (Math.round(z / 0.22) % 2) * 0.05, d: 0.09 });
    for (const y of [0.3, 0.75]) p.push({ x: fx + 0.04, y, z: (z0 + z1) / 2, w: 0.03, h: 0.07, d: z0 - z1 });
    return p;
  }, [garden.x, z0, z1, turbine.z]);
  const planters = useMemo(() => GARDEN_PLANTERS.map((z) => ({ x: garden.x + 5.5, z })), [garden.x]);
  const boxes = useMemo<Piece[]>(() => [
    ...planters.map((p) => ({ x: p.x, y: 0, z: p.z, w: 1.6, h: 0.45, d: 1.6 })),
    { x: x0 + 0.6, y: 0.42, z: -147, w: 0.5, h: 0.06, d: 1.8 },
    { x: x0 + 0.36, y: 0.48, z: -147, w: 0.06, h: 0.5, d: 1.8 },
  ], [x0, planters]);
  const arch = useMemo(() => {
    const s = new Shape();
    s.moveTo(-0.9, 0);
    s.lineTo(-0.9, 1.6);
    s.absarc(0, 1.6, 0.9, Math.PI, 0, true);
    s.lineTo(0.9, 0);
    return new ShapeGeometry(s, 24);
  }, []);
  return (
    <>
      <Pieces pieces={pickets} color="#f8f8f4" />
      <Pieces pieces={boxes} color="#f2efe8" roughness={0.7} />
      {planters.map((p, k) => (
        <group key={p.z}>
          <mesh position={[p.x, 0.47, p.z]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[1.4, 1.4]} />
            <meshStandardMaterial color="#4f7f2e" roughness={1} />
          </mesh>
          <Tree x={p.x} y={0.45} z={p.z} s={1.3} seed={40 + k} />
        </group>
      ))}
      <Turbine x={turbine.x} z={turbine.z} s={0.17} />
      {[-144, -172].map((z) => (
        <mesh key={z} geometry={arch} position={[x1 - 0.03, 0, z]} rotation={[0, -Math.PI / 2, 0]}>
          <meshBasicMaterial color="#0d0d0f" />
        </mesh>
      ))}
      {[-140, -152, -164, -176].map((z) => (
        <mesh key={z} position={[x0 + 0.12, 2.6, z]}>
          <sphereGeometry args={[0.13, 12, 10]} />
          <meshBasicMaterial color="#fff2d6" toneMapped={false} />
        </mesh>
      ))}
      {[-138, -148, -158, -168, -178].map((z) => (
        <mesh key={z} position={[garden.x, garden.ceil - 0.02, z]} rotation={[Math.PI / 2, 0, 0]}>
          <planeGeometry args={[garden.w - 3, 2.4]} />
          <meshBasicMaterial color="#f6f2e6" toneMapped={false} />
        </mesh>
      ))}
      <pointLight position={[garden.x, garden.ceil - 1, -143]} intensity={26} distance={26} decay={1.2} color="#fff4e0" />
      <pointLight position={[garden.x, garden.ceil - 1, -170]} intensity={26} distance={26} decay={1.2} color="#fff4e0" />
      <Sign x={garden.x + 2} z={-178} ry={0.4} tilt={-0.06} lines={["DETOUR"]} />
    </>
  );
}

/** The calm pool: still water under a skylight, white tiles. */
export function CalmPool() {
  const { pool, basin } = G;
  return (
    <>
      <Water y={-0.12} x={basin.x} z={basin.z} w={basin.w} d={basin.d} color="#8fc8d8" glint="#ffffff" opacity={0.7} />
      <mesh position={[pool.x, 5.98, pool.z]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[14, 10]} />
        <meshBasicMaterial color="#eef6fb" toneMapped={false} />
      </mesh>
      <pointLight position={[pool.x, 5, pool.z]} intensity={22} distance={24} decay={1.3} color="#e8f4ff" />
    </>
  );
}

/** The white rooms: a phone on a small table, ringing (E to pick it up); a window that shows the meadow. */
export function WhiteRooms() {
  const { phone, meadowWindow } = G;
  const { used } = useWorldState();
  const lifted = used.has(PLAY_IDS.phone);
  const handset = useRef<Mesh>(null);
  useFrame(({ clock }) => {
    // it shakes while it rings: two seconds on, four off
    if (handset.current) handset.current.position.y = 0.86 + (!lifted && clock.elapsedTime % 6 < 2 ? Math.sin(clock.elapsedTime * 60) * 0.006 : 0);
  });
  const table = useMemo<Piece[]>(() => [{ x: phone.x, y: 0, z: phone.z, w: 0.8, h: 0.75, d: 0.5 }], [phone]);
  return (
    <>
      <Pieces pieces={table} color="#e8e4dc" />
      <pointLight position={[phone.x - 2, 2.6, phone.z + 2]} intensity={5} distance={10} decay={1.5} color="#fff2dc" />
      <mesh position={[phone.x, 0.8, phone.z]}>
        <boxGeometry args={[0.28, 0.1, 0.22]} />
        <meshStandardMaterial color="#e6dcc4" roughness={0.4} />
      </mesh>
      <mesh ref={handset} position={[lifted ? phone.x + 0.25 : phone.x, 0.86, phone.z]} rotation={[0, lifted ? 0.9 : 0, lifted ? Math.PI / 2 : 0]}>
        <boxGeometry args={[0.32, 0.05, 0.07]} />
        <meshStandardMaterial color="#e6dcc4" roughness={0.4} />
      </mesh>
      <group position={[meadowWindow.x, 1.5, meadowWindow.z - 0.04]}>
        {[[0, meadowWindow.h / 2 + 0.05, meadowWindow.w + 0.2, 0.1], [0, -meadowWindow.h / 2 - 0.05, meadowWindow.w + 0.2, 0.1], [meadowWindow.w / 2 + 0.05, 0, 0.1, meadowWindow.h], [-meadowWindow.w / 2 - 0.05, 0, 0.1, meadowWindow.h], [0, 0, 0.05, meadowWindow.h]].map(([x, y, w, h], k) => (
          <mesh key={k} position={[x, y, 0]}>
            <boxGeometry args={[w, h, 0.08]} />
            <meshStandardMaterial color="#ffffff" />
          </mesh>
        ))}
      </group>
      <ViewWindow zone="meadow" x={meadowWindow.x} y={1.5} z={meadowWindow.z - 0.06} ry={Math.PI} w={meadowWindow.w} h={meadowWindow.h} from={{ x: 6, y: meadowHeight(6, 22), z: 22, yaw: -0.1 }} near={14} />
    </>
  );
}

/** The lookout: a big window onto Motion's hills, far below; a bench to look at them. */
export function Lookout() {
  const { lookout, hillsWindow } = G;
  const bench = useMemo<Piece[]>(() => [
    { x: hillsWindow.x + 3.2, y: lookout.h + 0.42, z: hillsWindow.z, w: 0.5, h: 0.06, d: 2.4 },
    { x: hillsWindow.x + 3.44, y: lookout.h + 0.48, z: hillsWindow.z, w: 0.06, h: 0.5, d: 2.4 },
    ...[-1, 1].map((s) => ({ x: hillsWindow.x + 3.2, y: lookout.h, z: hillsWindow.z + s * 1, w: 0.46, h: 0.42, d: 0.08 })),
  ], [hillsWindow, lookout.h]);
  const mullions = useMemo<Piece[]>(() => {
    const p: Piece[] = [];
    const y0 = lookout.h + 0.8;
    for (let k = 0; k <= 4; k++) p.push({ x: hillsWindow.x + 0.08, y: y0, z: hillsWindow.z - hillsWindow.w / 2 + (k * hillsWindow.w) / 4, w: 0.12, h: hillsWindow.h, d: 0.12 });
    p.push({ x: hillsWindow.x + 0.08, y: y0 - 0.1, z: hillsWindow.z, w: 0.3, h: 0.12, d: hillsWindow.w + 0.12 });
    p.push({ x: hillsWindow.x + 0.08, y: y0 + hillsWindow.h, z: hillsWindow.z, w: 0.14, h: 0.12, d: hillsWindow.w + 0.12 });
    return p;
  }, [hillsWindow, lookout.h]);
  return (
    <>
      <ViewWindow
        zone="collines"
        x={hillsWindow.x + 0.04}
        y={lookout.h + 0.8 + hillsWindow.h / 2}
        z={hillsWindow.z}
        ry={Math.PI / 2}
        w={hillsWindow.w}
        h={hillsWindow.h}
        from={{ x: HILLS_SPAWN.x, y: 12, z: HILLS_SPAWN.z + 30, yaw: 0 }}
        near={34}
      />
      <Pieces pieces={mullions} color="#f4f1ea" />
      <Pieces pieces={bench} color="#f6f6f2" roughness={0.5} />
    </>
  );
}
