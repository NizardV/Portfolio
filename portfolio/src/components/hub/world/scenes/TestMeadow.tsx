"use client";
import { useMemo } from "react";
import { PlaneGeometry } from "three";
import { MEADOW_DOOR_Z, MEADOW_ROCKS } from "../zones";
import { Blocks, LightOpening } from "./parts";

const DOOR_W = 1.2;
const DOOR_H = 2.2;

/** Flat where you walk, rolling hills beyond the invisible edge (60 m). */
function useHills() {
  return useMemo(() => {
    const geo = new PlaneGeometry(500, 500, 120, 120);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = -pos.getY(i); // the plane is rotated flat below
      const ramp = Math.min(1, Math.max(0, (Math.hypot(x, z) - 45) / 60));
      const h = (Math.sin(x * 0.02) * Math.cos(z * 0.025) + 1) * 9 + Math.sin(x * 0.05 + z * 0.03) * 3;
      pos.setZ(i, h * ramp);
    }
    geo.computeVertexNormals();
    return geo;
  }, []);
}

function WhiteDoor() {
  return (
    <group position={[0, 0, MEADOW_DOOR_Z]}>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * (DOOR_W / 2 + 0.08), DOOR_H / 2, 0]}>
          <boxGeometry args={[0.16, DOOR_H, 0.2]} />
          <meshStandardMaterial color="#f4f4f0" />
        </mesh>
      ))}
      <mesh position={[0, DOOR_H + 0.08, 0]}>
        <boxGeometry args={[DOOR_W + 0.32, 0.16, 0.2]} />
        <meshStandardMaterial color="#f4f4f0" />
      </mesh>
      {/* ajar leaf, and light behind it */}
      <mesh position={[-DOOR_W / 2 + 0.02, DOOR_H / 2, 0.45]} rotation={[0, -1.1, 0]}>
        <boxGeometry args={[0.04, DOOR_H - 0.04, DOOR_W]} />
        <meshStandardMaterial color="#fafaf6" />
      </mesh>
      <LightOpening position={[0, 0, -0.02]} width={DOOR_W} height={DOOR_H} />
      <LightOpening position={[0, 0, 0.02]} rotationY={Math.PI} width={DOOR_W} height={DOOR_H} />
    </group>
  );
}

export default function TestMeadow() {
  const hills = useHills();
  return (
    <>
      <color attach="background" args={["#6fa8e8"]} />
      <fog attach="fog" args={["#cfe2f5", 40, 220]} />
      <hemisphereLight args={["#dcecff", "#4f7d2c", 1.2]} />
      <directionalLight position={[40, 60, 25]} intensity={1.8} color="#fff6e0" />
      <mesh geometry={hills} rotation={[-Math.PI / 2, 0, 0]}>
        <meshStandardMaterial color="#5aa236" roughness={1} />
      </mesh>
      <Blocks boxes={MEADOW_ROCKS} height={0.9} color="#9a9a92" />
      <WhiteDoor />
    </>
  );
}
