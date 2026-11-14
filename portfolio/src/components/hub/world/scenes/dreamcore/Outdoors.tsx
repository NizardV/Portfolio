"use client";
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { BufferAttribute, Color, PlaneGeometry, type Group } from "three";
import type { Piece } from "../../archi/build";
import { Pieces } from "../props";

/** Rolling ground: flat where you walk (inside `flat` metres), hills beyond. Coloured in mowing stripes. */
export function Hills({ flat, color, stripe, height = 14, seed = 1 }: { flat: number; color: string; stripe: string; height?: number; seed?: number }) {
  const geo = useMemo(() => {
    const g = new PlaneGeometry(700, 700, 160, 160);
    g.rotateX(-Math.PI / 2);
    const pos = g.attributes.position;
    const cols = new Float32Array(pos.count * 3);
    const a = new Color(color);
    const b = new Color(stripe);
    const c = new Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const r = Math.hypot(x, z);
      const ramp = Math.min(1, Math.max(0, (r - flat) / 60));
      const h = ramp * ((Math.sin(x * 0.018 + seed) * Math.cos(z * 0.021) + 1) * height + Math.sin(x * 0.05 + z * 0.03) * 3);
      pos.setY(i, h - 0.02);
      c.copy(Math.floor((x + 350) / 6) % 2 ? a : b);
      cols.set([c.r, c.g, c.b], i * 3);
    }
    g.setAttribute("color", new BufferAttribute(cols, 3));
    g.computeVertexNormals();
    return g;
  }, [flat, color, stripe, height, seed]);
  useEffect(() => () => geo.dispose(), [geo]);
  return (
    <mesh geometry={geo}>
      <meshLambertMaterial vertexColors />
    </mesh>
  );
}

/** A small house: body, two-slope roof, and optionally a lit window. */
export function House({ x, y = 0, z, w, d, h, color, roof, lit, ry = 0 }: { x: number; y?: number; z: number; w: number; d: number; h: number; color: string; roof: string; lit?: string; ry?: number }) {
  return (
    <group position={[x, y, z]} rotation={[0, ry, 0]}>
      <mesh position={[0, h / 2, 0]}>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial color={color} roughness={0.9} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[0, h + d * 0.2, (s * d) / 4]} rotation={[s * -0.6, 0, 0]}>
          <boxGeometry args={[w + 0.5, 0.2, d * 0.62]} />
          <meshStandardMaterial color={roof} roughness={0.8} />
        </mesh>
      ))}
      {lit && (
        <mesh position={[w * 0.2, h * 0.45, d / 2 + 0.02]}>
          <planeGeometry args={[w * 0.22, h * 0.25]} />
          <meshBasicMaterial color={lit} toneMapped={false} />
        </mesh>
      )}
    </group>
  );
}

/** A wind turbine whose blades turn, slowly. */
export function Turbine({ x, z, y = 0, s = 1 }: { x: number; z: number; y?: number; s?: number }) {
  const rotor = useRef<Group>(null);
  useFrame((_, dt) => {
    if (rotor.current) rotor.current.rotation.z += dt * 0.5;
  });
  const mast = useMemo<Piece[]>(() => [{ x, y, z, w: 0.8 * s, h: 26 * s, d: 0.8 * s }], [x, y, z, s]);
  return (
    <>
      <Pieces pieces={mast} color="#f2f2ee" />
      <group ref={rotor} position={[x, y + 26 * s, z + 0.6 * s]}>
        {[0, 1, 2].map((k) => (
          <group key={k} rotation={[0, 0, (k * Math.PI * 2) / 3]}>
            <mesh position={[0, 11 * s, 0]}>
              <boxGeometry args={[0.5 * s, 22 * s, 0.15 * s]} />
              <meshStandardMaterial color="#f6f6f2" />
            </mesh>
          </group>
        ))}
      </group>
    </>
  );
}
