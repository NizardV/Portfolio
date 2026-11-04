"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Bloom, EffectComposer, Noise, Vignette } from "@react-three/postprocessing";
import { CanvasTexture, MathUtils, RepeatWrapping, SRGBColorSpace, type Group, type Mesh, type MeshStandardMaterial } from "three";
import { UNIVERSES, type Universe } from "./universes";

// Room dimensions (metres). The camera stands in the middle at eye height.
const HALF = 7;
const HEIGHT = 3.2;
const EYE = 1.6;

/* ---------- procedural textures (no network assets: CSP + weight) ---------- */

function makeTexture(size: number, draw: (ctx: CanvasRenderingContext2D, s: number) => void, repeat: number) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  draw(ctx, size);
  const tex = new CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = RepeatWrapping;
  tex.repeat.set(repeat, repeat);
  tex.colorSpace = SRGBColorSpace;
  return tex;
}

function noise(ctx: CanvasRenderingContext2D, s: number, amount: number) {
  const img = ctx.getImageData(0, 0, s, s);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (Math.random() - 0.5) * amount;
    img.data[i] += n;
    img.data[i + 1] += n;
    img.data[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);
}

function useRoomTextures() {
  return useMemo(() => {
    const wall = makeTexture(256, (ctx, s) => {
      ctx.fillStyle = "#c8b65a";
      ctx.fillRect(0, 0, s, s);
      // faded vertical wallpaper pattern
      for (let x = 0; x < s; x += 32) {
        ctx.fillStyle = "rgba(120,100,30,0.12)";
        ctx.fillRect(x, 0, 3, s);
        ctx.fillStyle = "rgba(255,240,170,0.10)";
        ctx.fillRect(x + 14, 0, 2, s);
      }
      noise(ctx, s, 18);
    }, 6);

    const carpet = makeTexture(256, (ctx, s) => {
      ctx.fillStyle = "#8a7a3e";
      ctx.fillRect(0, 0, s, s);
      noise(ctx, s, 45);
      // a few damp stains
      for (let i = 0; i < 6; i++) {
        const g = ctx.createRadialGradient(Math.random() * s, Math.random() * s, 0, Math.random() * s, Math.random() * s, 40 + Math.random() * 60);
        g.addColorStop(0, "rgba(60,50,20,0.25)");
        g.addColorStop(1, "rgba(60,50,20,0)");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, s, s);
      }
    }, 5);

    const ceiling = makeTexture(128, (ctx, s) => {
      ctx.fillStyle = "#d8d2b4";
      ctx.fillRect(0, 0, s, s);
      ctx.strokeStyle = "rgba(90,80,50,0.45)";
      ctx.lineWidth = 3;
      ctx.strokeRect(0, 0, s, s);
      noise(ctx, s, 14);
    }, 14);

    return { wall, carpet, ceiling };
  }, []);
}

/* ---------- room ---------- */

function FluorescentPanel({ position, flicker }: { position: [number, number, number]; flicker?: boolean }) {
  const mat = useRef<MeshStandardMaterial>(null);
  useFrame(({ clock }) => {
    if (!flicker || !mat.current) return;
    // mostly on, with irregular short drop-outs
    const t = clock.elapsedTime;
    const off = Math.sin(t * 13.1) * Math.sin(t * 3.7) > 0.82 || Math.sin(t * 0.9) > 0.985;
    mat.current.emissiveIntensity = off ? 0.15 : 2.2;
  });
  return (
    <mesh position={position} rotation={[Math.PI / 2, 0, 0]}>
      <planeGeometry args={[1.2, 0.6]} />
      <meshStandardMaterial ref={mat} color="#fffbe8" emissive="#fff6d0" emissiveIntensity={2.2} toneMapped={false} />
    </mesh>
  );
}

function Room() {
  const { wall, carpet, ceiling } = useRoomTextures();
  const panels: [number, number, number][] = [];
  for (let x = -4.5; x <= 4.5; x += 3) for (let z = -4.5; z <= 4.5; z += 3) panels.push([x, HEIGHT - 0.01, z]);

  return (
    <group>
      {/* floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[HALF * 2, HALF * 2]} />
        <meshStandardMaterial map={carpet} roughness={1} />
      </mesh>
      {/* ceiling */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, HEIGHT, 0]}>
        <planeGeometry args={[HALF * 2, HALF * 2]} />
        <meshStandardMaterial map={ceiling} roughness={1} />
      </mesh>
      {/* walls */}
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} rotation={[0, (i * Math.PI) / 2, 0]} position={[Math.sin((i * Math.PI) / 2) * -HALF, HEIGHT / 2, Math.cos((i * Math.PI) / 2) * -HALF]}>
          <planeGeometry args={[HALF * 2, HEIGHT]} />
          <meshStandardMaterial map={wall} roughness={0.95} />
        </mesh>
      ))}
      {panels.map((p, i) => (
        <FluorescentPanel key={i} position={p} flicker={i === 5} />
      ))}
    </group>
  );
}

/* ---------- doors ---------- */

type DoorProps = {
  universe: Universe;
  angle: number;
  hovered: boolean;
  onHover: (u: Universe | null) => void;
  onSelect: (u: Universe) => void;
};

const DOOR_W = 1.1;
const DOOR_H = 2.15;

function Door({ universe, angle, hovered, onHover, onSelect }: DoorProps) {
  const glow = useRef<Mesh>(null);
  const leaf = useRef<Group>(null);
  // just in front of the wall, facing the room centre
  const x = Math.sin(angle) * -(HALF - 0.02);
  const z = Math.cos(angle) * -(HALF - 0.02);

  useFrame((_, dt) => {
    const m = glow.current?.material as MeshStandardMaterial | undefined;
    if (m) m.emissiveIntensity = MathUtils.damp(m.emissiveIntensity, hovered ? 4 : 1.4, 6, dt);
    if (leaf.current) leaf.current.rotation.y = MathUtils.damp(leaf.current.rotation.y, hovered ? -1.75 : -1.2, 5, dt);
  });

  return (
    <group position={[x, 0, z]} rotation={[0, angle, 0]}>
      <group
        onClick={(e) => { e.stopPropagation(); onSelect(universe); }}
        onPointerOver={(e) => { e.stopPropagation(); onHover(universe); document.body.style.cursor = "pointer"; }}
        onPointerOut={() => { onHover(null); document.body.style.cursor = "auto"; }}
      >
        {/* light spilling from the other side */}
        <mesh ref={glow} position={[0, DOOR_H / 2, 0.005]}>
          <planeGeometry args={[DOOR_W, DOOR_H]} />
          <meshStandardMaterial color="#000" emissive={universe.color} emissiveIntensity={1.4} toneMapped={false} />
        </mesh>
        {/* frame */}
        <mesh position={[-DOOR_W / 2 - 0.05, DOOR_H / 2, 0.03]}>
          <boxGeometry args={[0.1, DOOR_H + 0.1, 0.08]} />
          <meshStandardMaterial color="#5a4c2a" />
        </mesh>
        <mesh position={[DOOR_W / 2 + 0.05, DOOR_H / 2, 0.03]}>
          <boxGeometry args={[0.1, DOOR_H + 0.1, 0.08]} />
          <meshStandardMaterial color="#5a4c2a" />
        </mesh>
        <mesh position={[0, DOOR_H + 0.05, 0.03]}>
          <boxGeometry args={[DOOR_W + 0.2, 0.1, 0.08]} />
          <meshStandardMaterial color="#5a4c2a" />
        </mesh>
        {/* ajar door leaf, hinged on the left edge, swinging into the room */}
        <group ref={leaf} position={[-DOOR_W / 2, 0, 0.04]} rotation={[0, -1.2, 0]}>
          <mesh position={[DOOR_W / 2, DOOR_H / 2, 0]}>
            <boxGeometry args={[DOOR_W, DOOR_H, 0.04]} />
            <meshStandardMaterial color="#b8a868" />
          </mesh>
        </group>
      </group>
      <pointLight position={[0, 1.2, 0.6]} color={universe.color} intensity={hovered ? 6 : 2} distance={4.5} decay={1.6} />
    </group>
  );
}

/* ---------- scene ---------- */

export default function HubScene() {
  const router = useRouter();
  const [locked, setLocked] = useState<Universe | null>(null);
  const [hovered, setHovered] = useState<Universe | null>(null);

  useEffect(() => {
    if (!locked) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setLocked(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [locked]);

  const select = (u: Universe) => {
    if (u.href) router.push(u.href);
    else setLocked(u);
  };

  return (
    <>
      <Canvas camera={{ position: [0, EYE, 0.01], fov: 75 }} dpr={[1, 1.75]}>
        <color attach="background" args={["#2a2412"]} />
        <fog attach="fog" args={["#3b3317", 3, 13]} />
        <ambientLight intensity={0.35} color="#fff2c4" />
        <hemisphereLight args={["#fff6d0", "#5a4a1c", 0.6]} />
        <Room />
        {UNIVERSES.map((u, i) => (
          <Door
            key={u.id}
            universe={u}
            angle={(i * Math.PI) / 2}
            hovered={hovered?.id === u.id}
            onHover={setHovered}
            onSelect={select}
          />
        ))}
        <OrbitControls
          target={[0, EYE, 0]}
          enableZoom={false}
          enablePan={false}
          rotateSpeed={-0.35}
          autoRotate={!hovered && !locked}
          autoRotateSpeed={0.25}
          minPolarAngle={Math.PI / 2 - 0.3}
          maxPolarAngle={Math.PI / 2 + 0.2}
        />
        <EffectComposer>
          <Bloom intensity={0.9} luminanceThreshold={0.6} mipmapBlur />
          <Noise opacity={0.05} />
          <Vignette offset={0.25} darkness={0.75} />
        </EffectComposer>
      </Canvas>

      <div className="pointer-events-none absolute bottom-6 w-full px-4 text-center">
        {hovered ? (
          <>
            <div className="text-2xl font-semibold tracking-[0.3em]" style={{ color: hovered.color }}>
              {hovered.name.toUpperCase()}
            </div>
            <div className="mt-1 text-xs tracking-widest text-white/60">{hovered.tagline}</div>
          </>
        ) : (
          <p className="text-xs tracking-widest text-white/40">REGARDE AUTOUR DE TOI · CHOISIS UNE PORTE</p>
        )}
      </div>

      {locked && (
        <div className="absolute inset-0 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Fermer"
            className="absolute inset-0 cursor-default bg-black/60"
            onClick={() => setLocked(null)}
          />
          <div role="dialog" aria-modal="true" aria-label={locked.name} className="relative max-w-sm rounded-2xl border border-white/15 bg-[#14110a] p-6 text-center" style={{ boxShadow: `0 0 40px ${locked.color}40` }}>
            <div className="text-xl font-semibold tracking-widest" style={{ color: locked.color }}>
              {locked.name.toUpperCase()}
            </div>
            <p className="mt-3 text-sm text-white/70">La porte est verrouillée. Quelque chose se construit de l&apos;autre côté…</p>
            <button type="button" onClick={() => setLocked(null)} className="mt-5 rounded-full border border-white/20 px-4 py-2 text-xs tracking-widest text-white/80 hover:text-white">
              FERMER
            </button>
          </div>
        </div>
      )}
    </>
  );
}
