"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, OrbitControls, Stars } from "@react-three/drei";
import { MathUtils, type Mesh } from "three";
import { UNIVERSES, type Universe } from "./universes";

const RADIUS = 4;

type PortalProps = {
  universe: Universe;
  angle: number;
  hovered: boolean;
  onHover: (u: Universe | null) => void;
  onSelect: (u: Universe) => void;
};

function Portal({ universe, angle, hovered, onHover, onSelect }: PortalProps) {
  const ring = useRef<Mesh>(null);
  const x = Math.sin(angle) * RADIUS;
  const z = Math.cos(angle) * RADIUS;

  useFrame((_, dt) => {
    if (!ring.current) return;
    ring.current.rotation.z += dt * (hovered ? 1.5 : 0.4);
    const s = MathUtils.lerp(ring.current.scale.x, hovered ? 1.15 : 1, 0.1);
    ring.current.scale.setScalar(s);
  });

  return (
    <group position={[x, 0, z]} rotation={[0, angle + Math.PI, 0]}>
      <Float speed={1.5} floatIntensity={0.6} rotationIntensity={0.1}>
        <group
          onClick={(e) => { e.stopPropagation(); onSelect(universe); }}
          onPointerOver={(e) => { e.stopPropagation(); onHover(universe); document.body.style.cursor = "pointer"; }}
          onPointerOut={() => { onHover(null); document.body.style.cursor = "auto"; }}
        >
        <mesh ref={ring}>
          <torusGeometry args={[1, 0.08, 16, 64]} />
          <meshStandardMaterial color={universe.color} emissive={universe.color} emissiveIntensity={hovered ? 3 : 1.5} />
        </mesh>
        <mesh>
          <circleGeometry args={[0.92, 48]} />
          <meshBasicMaterial color={universe.color} transparent opacity={hovered ? 0.25 : 0.08} />
        </mesh>
        </group>
        <pointLight color={universe.color} intensity={hovered ? 6 : 2} distance={4} />
      </Float>
    </group>
  );
}

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
      <Canvas camera={{ position: [0, 0, 0.01], fov: 70 }} dpr={[1, 2]}>
        <color attach="background" args={["#05060a"]} />
        <fog attach="fog" args={["#05060a", 6, 16]} />
        <ambientLight intensity={0.3} />
        <Stars radius={60} depth={30} count={3000} factor={3} fade speed={0.5} />
        {UNIVERSES.map((u, i) => (
          <Portal
            key={u.id}
            universe={u}
            angle={(i / UNIVERSES.length) * Math.PI * 2 + Math.PI}
            hovered={hovered?.id === u.id}
            onHover={setHovered}
            onSelect={select}
          />
        ))}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.6, 0]}>
          <ringGeometry args={[RADIUS - 0.05, RADIUS + 0.05, 96]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.15} />
        </mesh>
        <OrbitControls enableZoom={false} enablePan={false} rotateSpeed={-0.4} autoRotate autoRotateSpeed={0.3}
          minPolarAngle={Math.PI / 2 - 0.35} maxPolarAngle={Math.PI / 2 + 0.25} />
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
          <p className="text-xs tracking-widest text-white/40">GLISSE POUR TOURNER · CLIQUE UN PORTAIL</p>
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
          <div role="dialog" aria-modal="true" aria-label={locked.name} className="relative max-w-sm rounded-2xl border border-white/15 bg-[#0b0d14] p-6 text-center" style={{ boxShadow: `0 0 40px ${locked.color}40` }}>
            <div className="text-xl font-semibold tracking-widest" style={{ color: locked.color }}>
              {locked.name.toUpperCase()}
            </div>
            <p className="mt-3 text-sm text-white/70">Cet univers est encore en construction. Reviens plus tard 👀</p>
            <button type="button" onClick={() => setLocked(null)} className="mt-5 rounded-full border border-white/20 px-4 py-2 text-xs tracking-widest text-white/80 hover:text-white">
              FERMER
            </button>
          </div>
        </div>
      )}
    </>
  );
}
