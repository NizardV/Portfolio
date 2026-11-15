"use client";
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Color, DoubleSide, InstancedMesh, MeshStandardMaterial, Object3D, SphereGeometry, type Group } from "three";
import type { Piece } from "../../archi/build";
import { Pieces, seeded, useCanvas } from "../props";

/** A yellow diamond road sign on its post, a little crooked. */
export function Sign({ x, y = 0, z, ry = 0, tilt = 0.06, lines, scale = 1 }: { x: number; y?: number; z: number; ry?: number; tilt?: number; lines: string[]; scale?: number }) {
  const face = useCanvas(256, 256, (ctx) => {
    ctx.translate(128, 128);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = "#1a1a12";
    ctx.fillRect(-88, -88, 176, 176);
    ctx.fillStyle = "#f2c230";
    ctx.fillRect(-82, -82, 164, 164);
    ctx.strokeStyle = "#1a1a12";
    ctx.lineWidth = 5;
    ctx.strokeRect(-72, -72, 144, 144);
    ctx.rotate(-Math.PI / 4);
    ctx.fillStyle = "#1a1a12";
    const size = lines.length > 2 ? 28 : 34;
    ctx.font = `700 ${size}px Arial, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    lines.forEach((l, k) => ctx.fillText(l, 0, (k - (lines.length - 1) / 2) * (size + 4)));
  }, [lines.join("|")]);
  return (
    <group position={[x, y, z]} rotation={[0.03, ry, tilt]} scale={scale}>
      <mesh position={[0, 1.15, 0]}>
        <cylinderGeometry args={[0.035, 0.035, 2.3, 8]} />
        <meshStandardMaterial color="#a6a8a4" metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh position={[0, 2.3, 0.04]}>
        <planeGeometry args={[1.25, 1.25]} />
        <meshStandardMaterial map={face} transparent alphaTest={0.5} roughness={0.5} side={DoubleSide} />
      </mesh>
    </group>
  );
}

/** A cartoon tree: a bent trunk and a few big soft blobs of leaves (flat shaded, like a set piece). */
export function CartoonTree({ x, y = 0, z, s = 1, seed = 1 }: { x: number; y?: number; z: number; s?: number; seed?: number }) {
  const blobs = useMemo(() => {
    const r = seeded(seed);
    return Array.from({ length: 6 }, () => ({ x: (r() - 0.5) * 2.2, y: 3.4 + r() * 1.2, z: (r() - 0.5) * 1.8, r: 0.9 + r() * 0.6 }));
  }, [seed]);
  return (
    <group position={[x, y, z]} scale={s}>
      <mesh position={[0, 1.6, 0]} rotation={[0, 0, 0.08]}>
        <cylinderGeometry args={[0.22, 0.42, 3.2, 9]} />
        <meshStandardMaterial color="#7a4e2c" roughness={0.9} flatShading />
      </mesh>
      {blobs.map((b, k) => (
        <mesh key={k} position={[b.x, b.y, b.z]}>
          <icosahedronGeometry args={[b.r, 1]} />
          <meshStandardMaterial color={k % 2 ? "#2f8a2c" : "#3a9a33"} roughness={0.8} flatShading />
        </mesh>
      ))}
    </group>
  );
}

/** A real-looking little tree (for the peaceful zone): a slim trunk and clusters of small leaves. */
export function Tree({ x, y = 0, z, s = 1, seed = 3 }: { x: number; y?: number; z: number; s?: number; seed?: number }) {
  const leaves = useMemo(() => {
    const r = seeded(seed);
    return Array.from({ length: 14 }, () => {
      const a = r() * Math.PI * 2;
      const h = 1.8 + r() * 1.9;
      const d = (1 - Math.abs(h - 2.8) / 1.6) * (0.5 + r() * 0.6);
      return { x: Math.cos(a) * d, y: h, z: Math.sin(a) * d, r: 0.35 + r() * 0.3 };
    });
  }, [seed]);
  return (
    <group position={[x, y, z]} scale={s}>
      <mesh position={[0, 1.4, 0]}>
        <cylinderGeometry args={[0.06, 0.1, 2.8, 7]} />
        <meshStandardMaterial color="#4a3a2a" roughness={0.9} />
      </mesh>
      {leaves.map((l, k) => (
        <mesh key={k} position={[l.x, l.y, l.z]}>
          <icosahedronGeometry args={[l.r, 0]} />
          <meshStandardMaterial color={k % 3 ? "#3f6e2a" : "#557f33"} roughness={0.85} flatShading />
        </mesh>
      ))}
    </group>
  );
}

/** A flat cut-out cloud hanging from the ceiling on two strings. */
export function HangingCloud({ x, y, z, ry = 0, s = 1, top }: { x: number; y: number; z: number; ry?: number; s?: number; top: number }) {
  const map = useCanvas(256, 128, (ctx) => {
    ctx.fillStyle = "#ffffff";
    for (const [cx, cy, r] of [[70, 80, 40], [120, 58, 52], [175, 74, 42], [205, 92, 28], [45, 96, 26]]) {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillRect(40, 92, 180, 30);
    ctx.globalCompositeOperation = "source-atop";
    const g = ctx.createLinearGradient(0, 0, 0, 128);
    g.addColorStop(0, "rgba(255,255,255,0)");
    g.addColorStop(1, "rgba(150,165,190,0.55)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 128);
  });
  const strings = useMemo<Piece[]>(() => [-0.6, 0.6].map((dx) => ({ x: dx * s, y: 0.5 * s, z: 0, w: 0.012, h: top - y - 0.5 * s, d: 0.012 })), [s, top, y]);
  return (
    <group position={[x, y, z]} rotation={[0, ry, 0]}>
      <mesh>
        <planeGeometry args={[2.4 * s, 1.2 * s]} />
        <meshStandardMaterial map={map} transparent alphaTest={0.4} side={DoubleSide} roughness={1} />
      </mesh>
      <Pieces pieces={strings} color="#dcdcdc" />
    </group>
  );
}

/** Balls scattered in a region (a pit, or a river that winds): instanced, one draw call. */
export function Balls({ count, place, seed = 9 }: { count: number; place: (r: () => number) => [number, number, number]; seed?: number }) {
  const mesh = useMemo(() => {
    const r = seeded(seed);
    const cols = ["#e53b3b", "#2c6fd6", "#e8c547", "#3aa65a", "#f28c28"].map((c) => new Color(c));
    const m = new InstancedMesh(new SphereGeometry(0.11, 8, 6), new MeshStandardMaterial({ roughness: 0.35 }), count);
    const o = new Object3D();
    for (let i = 0; i < count; i++) {
      o.position.set(...place(r));
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
      m.setColorAt(i, cols[i % cols.length]);
    }
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- placed once
  }, [count, seed]);
  return <primitive object={mesh} />;
}

/** A carousel turning slowly in the ball pit: striped canopy, bulbs, horses going up and down. */
export function Carousel({ x, y, z, r }: { x: number; y: number; z: number; r: number }) {
  const spin = useRef<Group>(null);
  const horses = useRef<(Group | null)[]>([]);
  const stripes = useCanvas(256, 64, (ctx) => {
    for (let i = 0; i < 16; i++) {
      ctx.fillStyle = i % 2 ? "#f4efe2" : "#d8433b";
      ctx.fillRect(i * 16, 0, 16, 64);
    }
  });
  useFrame(({ clock }, dt) => {
    if (spin.current) spin.current.rotation.y += dt * 0.25;
    horses.current.forEach((h, k) => {
      if (h) h.position.y = 0.9 + Math.sin(clock.elapsedTime * 1.6 + k * 1.3) * 0.18;
    });
  });
  const n = 6;
  return (
    <group position={[x, y, z]}>
      <group ref={spin}>
        <mesh position={[0, 0.25, 0]}>
          <cylinderGeometry args={[r, r, 0.3, 32]} />
          <meshStandardMaterial color="#f4efe2" roughness={0.6} />
        </mesh>
        <mesh position={[0, 0.42, 0]}>
          <cylinderGeometry args={[r * 0.98, r * 0.98, 0.05, 32]} />
          <meshStandardMaterial color="#c44a3c" roughness={0.5} />
        </mesh>
        <mesh position={[0, 1.8, 0]}>
          <cylinderGeometry args={[0.18, 0.18, 3, 12]} />
          <meshStandardMaterial color="#e2c26a" metalness={0.6} roughness={0.3} />
        </mesh>
        <mesh position={[0, 3.55, 0]}>
          <coneGeometry args={[r * 1.15, 1, 32, 1, true]} />
          <meshStandardMaterial map={stripes} roughness={0.6} side={DoubleSide} />
        </mesh>
        <mesh position={[0, 3.05, 0]}>
          <cylinderGeometry args={[r * 1.15, r * 1.15, 0.22, 32, 1, true]} />
          <meshStandardMaterial map={stripes} roughness={0.6} side={DoubleSide} />
        </mesh>
        {Array.from({ length: 16 }, (_, k) => (
          <mesh key={`b${k}`} position={[Math.cos((k / 16) * Math.PI * 2) * r * 1.16, 2.95, Math.sin((k / 16) * Math.PI * 2) * r * 1.16]}>
            <sphereGeometry args={[0.05, 8, 6]} />
            <meshBasicMaterial color="#ffe6a0" toneMapped={false} />
          </mesh>
        ))}
        {Array.from({ length: n }, (_, k) => {
          const a = (k / n) * Math.PI * 2;
          const px = Math.cos(a) * r * 0.72;
          const pz = Math.sin(a) * r * 0.72;
          return (
            <group key={k} position={[px, 0, pz]} rotation={[0, -a, 0]}>
              <mesh position={[0, 1.7, 0]}>
                <cylinderGeometry args={[0.025, 0.025, 2.7, 6]} />
                <meshStandardMaterial color="#e2c26a" metalness={0.7} roughness={0.3} />
              </mesh>
              <group ref={(g) => { horses.current[k] = g; }}>
                <mesh>
                  <boxGeometry args={[0.22, 0.32, 0.8]} />
                  <meshStandardMaterial color={k % 2 ? "#f6f2ea" : "#e8c547"} roughness={0.5} />
                </mesh>
                <mesh position={[0, 0.3, 0.38]} rotation={[0.5, 0, 0]}>
                  <boxGeometry args={[0.16, 0.4, 0.18]} />
                  <meshStandardMaterial color={k % 2 ? "#f6f2ea" : "#e8c547"} roughness={0.5} />
                </mesh>
                {[-0.28, 0.28].map((lz) => (
                  <mesh key={lz} position={[0, -0.32, lz]}>
                    <boxGeometry args={[0.12, 0.36, 0.08]} />
                    <meshStandardMaterial color="#c9a46a" roughness={0.6} />
                  </mesh>
                ))}
              </group>
            </group>
          );
        })}
      </group>
      <pointLight position={[0, 2.6, 0]} intensity={6} distance={10} decay={1.6} color="#ffd9a0" />
    </group>
  );
}

/** Big painted letters on a wall (ABC, 123), each its own colour. */
export function WallLetters({ x, y, z, ry, text }: { x: number; y: number; z: number; ry: number; text: string }) {
  const colors = ["#e53b3b", "#2c6fd6", "#e8c547", "#3aa65a", "#f28c28"];
  const map = useCanvas(128 * text.length, 160, (ctx) => {
    ctx.font = "900 140px 'Arial Rounded MT Bold', Arial, sans-serif";
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    [...text].forEach((ch, k) => {
      ctx.fillStyle = "rgba(0,0,0,0.25)";
      ctx.fillText(ch, 64 + k * 128 + 5, 85);
      ctx.fillStyle = colors[(k + text.length) % colors.length];
      ctx.fillText(ch, 64 + k * 128, 80);
    });
  }, [text]);
  return (
    <mesh position={[x, y, z]} rotation={[0, ry, 0]}>
      <planeGeometry args={[0.9 * text.length, 1.15]} />
      <meshStandardMaterial map={map} transparent alphaTest={0.3} roughness={0.7} />
    </mesh>
  );
}
