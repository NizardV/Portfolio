"use client";
import { ROOM, ROOM_DOOR, ROOM_PILLARS, ROOM_WALLS } from "../zones";
import { Blocks, LightOpening } from "./parts";

const W = ROOM.halfWidth * 2;
const D = ROOM.halfDepth * 2;

function Panels() {
  const spots: [number, number][] = [];
  for (let x = -5; x <= 5; x += 5) for (let z = -3; z <= 3; z += 3) spots.push([x, z]);
  return (
    <>
      {spots.map(([x, z]) => (
        <mesh key={`${x}:${z}`} position={[x, ROOM.height - 0.01, z]} rotation={[Math.PI / 2, 0, 0]}>
          <planeGeometry args={[1.2, 0.6]} />
          <meshBasicMaterial color="#fffbe8" toneMapped={false} />
        </mesh>
      ))}
    </>
  );
}

export default function TestRoom() {
  return (
    <>
      <color attach="background" args={["#1c1a14"]} />
      <fog attach="fog" args={["#2b281e", 6, 22]} />
      <ambientLight intensity={0.5} color="#fff2c4" />
      <hemisphereLight args={["#fff6d0", "#6b5f3a", 0.7]} />
      <pointLight position={[0, ROOM.height - 0.3, 0]} intensity={8} distance={14} color="#fff4d6" />
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[W, D]} />
        <meshStandardMaterial color="#8c8466" roughness={1} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, ROOM.height, 0]}>
        <planeGeometry args={[W, D]} />
        <meshStandardMaterial color="#d8d2b4" roughness={1} />
      </mesh>
      <Blocks boxes={ROOM_WALLS} height={ROOM.height} color="#cbbf8a" />
      <Blocks boxes={ROOM_PILLARS} height={ROOM.height} color="#b8ad7c" />
      <Panels />
      <LightOpening position={[0, 0, ROOM_DOOR.z + 0.28]} rotationY={Math.PI} width={ROOM_DOOR.width} height={2.2} />
    </>
  );
}
