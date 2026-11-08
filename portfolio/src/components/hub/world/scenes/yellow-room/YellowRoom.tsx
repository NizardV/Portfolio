"use client";
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { CanvasTexture, MathUtils, RepeatWrapping, SRGBColorSpace, type Group, type MeshBasicMaterial, type PointLight } from "three";
import { useWorldState } from "../../state";
import { PROJECT_DOORS, ROOM, ROOM_DOOR, type ProjectDoor } from "../../zones";
import { LightOpening } from "../parts";

/* ---------- procedural textures (no network asset) ---------- */

function canvasTexture(size: number, draw: (ctx: CanvasRenderingContext2D, s: number) => void, repeat: [number, number]) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  draw(canvas.getContext("2d")!, size);
  const tex = new CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = RepeatWrapping;
  tex.repeat.set(...repeat);
  tex.colorSpace = SRGBColorSpace;
  return tex;
}

function grain(ctx: CanvasRenderingContext2D, s: number, amount: number) {
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
  const textures = useMemo(() => {
    const wall = canvasTexture(256, (ctx, s) => {
      ctx.fillStyle = "#c8b65a";
      ctx.fillRect(0, 0, s, s);
      for (let x = 0; x < s; x += 32) {
        ctx.fillStyle = "rgba(120,100,30,0.12)";
        ctx.fillRect(x, 0, 3, s);
        ctx.fillStyle = "rgba(255,240,170,0.10)";
        ctx.fillRect(x + 14, 0, 2, s);
      }
      grain(ctx, s, 18);
    }, [6, 1.4]);
    const carpet = canvasTexture(256, (ctx, s) => {
      ctx.fillStyle = "#8a7a3e";
      ctx.fillRect(0, 0, s, s);
      grain(ctx, s, 45);
      for (let i = 0; i < 6; i++) {
        const x = Math.random() * s;
        const y = Math.random() * s;
        const g = ctx.createRadialGradient(x, y, 0, x, y, 40 + Math.random() * 60);
        g.addColorStop(0, "rgba(60,50,20,0.25)");
        g.addColorStop(1, "rgba(60,50,20,0)");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, s, s);
      }
    }, [5, 5]);
    const ceiling = canvasTexture(128, (ctx, s) => {
      ctx.fillStyle = "#d8d2b4";
      ctx.fillRect(0, 0, s, s);
      ctx.strokeStyle = "rgba(90,80,50,0.45)";
      ctx.lineWidth = 3;
      ctx.strokeRect(0, 0, s, s);
      grain(ctx, s, 14);
    }, [14, 14]);
    return { wall, carpet, ceiling };
  }, []);
  useEffect(() => () => Object.values(textures).forEach((t) => t.dispose()), [textures]);
  return textures;
}

/** A name plate drawn on a canvas: text only ever appears on objects of the set. */
function usePlate(name: string, color: string) {
  const tex = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#2a2412";
    ctx.fillRect(0, 0, 256, 64);
    ctx.strokeStyle = "#8a7a3e";
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, 252, 60);
    ctx.fillStyle = color;
    ctx.font = "600 30px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(name.toUpperCase().split("").join(" "), 128, 34);
    const t = new CanvasTexture(canvas);
    t.colorSpace = SRGBColorSpace;
    return t;
  }, [name, color]);
  useEffect(() => () => tex.dispose(), [tex]);
  return tex;
}

/* ---------- pieces ---------- */

function Panel({ position, flicker }: { position: [number, number, number]; flicker?: boolean }) {
  const mat = useRef<MeshBasicMaterial>(null);
  const light = useRef<PointLight>(null);
  useFrame(({ clock }) => {
    if (!flicker || !mat.current) return;
    // mostly on, with irregular short drop-outs
    const t = clock.elapsedTime;
    const off = Math.sin(t * 13.1) * Math.sin(t * 3.7) > 0.82 || Math.sin(t * 0.9) > 0.985;
    mat.current.color.setScalar(off ? 0.25 : 1);
    if (light.current) light.current.intensity = off ? 0.2 : 2.2;
  });
  return (
    <group position={position}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1.2, 0.6]} />
        <meshBasicMaterial ref={mat} color="#fffbe8" toneMapped={false} />
      </mesh>
      {flicker && <pointLight ref={light} position={[0, -0.4, 0]} intensity={2.2} distance={6} color="#fff4d0" />}
    </group>
  );
}

const DOOR_W = 1.1;
const DOOR_H = 2.15;
const FRAME = "#5a4c2a";

function Door({ door }: { door: ProjectDoor }) {
  const plate = usePlate(door.universe.name, door.universe.color);
  const leaf = useRef<Group>(null);
  const { rattle } = useWorldState();
  const shakeUntil = useRef(0);
  const lastRattle = useRef(rattle?.n ?? 0);

  useFrame(({ clock }) => {
    if (rattle && rattle.n !== lastRattle.current) {
      lastRattle.current = rattle.n;
      if (rattle.id === `door-${door.universe.id}`) shakeUntil.current = clock.elapsedTime + 0.45;
    }
    if (!leaf.current) return;
    const left = shakeUntil.current - clock.elapsedTime;
    leaf.current.rotation.y = left > 0 ? Math.sin(clock.elapsedTime * 70) * 0.012 * left : MathUtils.damp(leaf.current.rotation.y, 0, 10, 0.016);
  });

  return (
    <group position={[door.x, 0, door.z]} rotation={[0, door.angle, 0]}>
      {/* frame */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * (DOOR_W / 2 + 0.05), DOOR_H / 2, 0.03]}>
          <boxGeometry args={[0.1, DOOR_H + 0.1, 0.08]} />
          <meshStandardMaterial color={FRAME} />
        </mesh>
      ))}
      <mesh position={[0, DOOR_H + 0.05, 0.03]}>
        <boxGeometry args={[DOOR_W + 0.2, 0.1, 0.08]} />
        <meshStandardMaterial color={FRAME} />
      </mesh>
      {/* closed leaf, hinged on the left: shakes when tried */}
      <group ref={leaf} position={[-DOOR_W / 2, 0, 0.03]}>
        <mesh position={[DOOR_W / 2, DOOR_H / 2, 0]}>
          <boxGeometry args={[DOOR_W - 0.02, DOOR_H - 0.03, 0.04]} />
          <meshStandardMaterial color="#b8a868" roughness={0.8} />
        </mesh>
        <mesh position={[DOOR_W - 0.12, DOOR_H / 2 - 0.05, 0.035]}>
          <sphereGeometry args={[0.03, 10, 8]} />
          <meshStandardMaterial color="#8c7a3c" metalness={0.6} roughness={0.4} />
        </mesh>
      </group>
      {/* the world behind it, leaking under the door */}
      <mesh position={[0, 0.015, 0.06]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[DOOR_W - 0.05, 0.25]} />
        <meshBasicMaterial color={door.universe.color} transparent opacity={0.55} toneMapped={false} depthWrite={false} />
      </mesh>
      <pointLight position={[0, 0.15, 0.4]} color={door.universe.color} intensity={1.6} distance={3} decay={1.6} />
      {/* name plate */}
      <mesh position={[0, DOOR_H + 0.32, 0.02]}>
        <planeGeometry args={[0.7, 0.175]} />
        <meshStandardMaterial map={plate} roughness={0.6} />
      </mesh>
    </group>
  );
}

/** The way back: a bright doorway in the south wall, the meadow's daylight beyond. */
function WayOut() {
  const z = ROOM.half;
  return (
    <group>
      <LightOpening position={[0, 0, z + 0.28]} rotationY={Math.PI} width={ROOM_DOOR.width} height={ROOM_DOOR.height} />
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * (ROOM_DOOR.width / 2 + 0.05), ROOM_DOOR.height / 2, z - 0.02]}>
          <boxGeometry args={[0.1, ROOM_DOOR.height + 0.1, 0.08]} />
          <meshStandardMaterial color={FRAME} />
        </mesh>
      ))}
      <mesh position={[0, ROOM_DOOR.height + 0.05, z - 0.02]}>
        <boxGeometry args={[ROOM_DOOR.width + 0.2, 0.1, 0.08]} />
        <meshStandardMaterial color={FRAME} />
      </mesh>
      <pointLight position={[0, 1.4, z - 0.8]} color="#ffffff" intensity={2.5} distance={5} decay={1.5} />
    </group>
  );
}

export default function YellowRoom() {
  const { wall, carpet, ceiling } = useRoomTextures();
  const size = ROOM.half * 2;
  const panels: [number, number, number][] = [];
  for (let x = -4.5; x <= 4.5; x += 3) for (let z = -4.5; z <= 4.5; z += 3) panels.push([x, ROOM.height - 0.01, z]);

  return (
    <>
      <color attach="background" args={["#2a2412"]} />
      <fog attach="fog" args={["#3b3317", 4, 16]} />
      <ambientLight intensity={0.4} color="#fff2c4" />
      <hemisphereLight args={["#fff6d0", "#5a4a1c", 0.65]} />
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[size, size]} />
        <meshStandardMaterial map={carpet} roughness={1} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, ROOM.height, 0]}>
        <planeGeometry args={[size, size]} />
        <meshStandardMaterial map={ceiling} roughness={1} />
      </mesh>
      {/* walls, seen from inside; the south one has the doorway cut out */}
      {[0, 1, 3].map((i) => (
        <mesh key={i} rotation={[0, (i * Math.PI) / 2, 0]} position={[Math.sin((i * Math.PI) / 2) * -ROOM.half, ROOM.height / 2, Math.cos((i * Math.PI) / 2) * -ROOM.half]}>
          <planeGeometry args={[size, ROOM.height]} />
          <meshStandardMaterial map={wall} roughness={0.95} />
        </mesh>
      ))}
      {[-1, 1].map((s) => {
        const w = ROOM.half - ROOM_DOOR.width / 2;
        return (
          <mesh key={s} rotation={[0, Math.PI, 0]} position={[s * (ROOM_DOOR.width / 2 + w / 2), ROOM.height / 2, ROOM.half]}>
            <planeGeometry args={[w, ROOM.height]} />
            <meshStandardMaterial map={wall} roughness={0.95} />
          </mesh>
        );
      })}
      <mesh rotation={[0, Math.PI, 0]} position={[0, (ROOM.height + ROOM_DOOR.height) / 2, ROOM.half]}>
        <planeGeometry args={[ROOM_DOOR.width, ROOM.height - ROOM_DOOR.height]} />
        <meshStandardMaterial map={wall} roughness={0.95} />
      </mesh>
      {panels.map((p, i) => (
        <Panel key={p.join(":")} position={p} flicker={i === 5} />
      ))}
      {PROJECT_DOORS.map((d) => (
        <Door key={d.universe.id} door={d} />
      ))}
      <WayOut />
    </>
  );
}
