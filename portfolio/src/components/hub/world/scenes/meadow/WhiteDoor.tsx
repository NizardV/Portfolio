"use client";
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { CanvasTexture, MathUtils, type Group, type MeshBasicMaterial, type PointLight } from "three";
import { useWorldState } from "../../state";
import { MEADOW_DOOR, meadowHeight } from "../../terrain";
import { MEADOW_DOOR_ID } from "../../zones";

const W = 1.2; // opening, matches the portal and the collision boxes in zones.ts
const H = 2.2;
const POST = 0.14;
const SINK = 0.4; // the frame goes into the ground: it never floats on the slope
const PAINT = "#f7f6f0";
const WARM = "#ffe6bd"; // light from the other side: the hotel hall
const OPEN_ANGLE = 1.45; // radians, swung away from the meadow

/** A soft dark blot under the door, so it sits on the grass instead of hovering. */
function useShadowTexture() {
  return useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 64;
    const ctx = canvas.getContext("2d")!;
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, "rgba(20,40,10,0.45)");
    g.addColorStop(1, "rgba(20,40,10,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
    return new CanvasTexture(canvas);
  }, []);
}

function Panel({ x, y, w, h, z }: { x: number; y: number; w: number; h: number; z: number }) {
  return (
    <mesh position={[x, y, z]}>
      <boxGeometry args={[w, h, 0.012]} />
      <meshStandardMaterial color={PAINT} roughness={0.55} />
    </mesh>
  );
}

/** The lone white door. Closed at first: the player opens it (World plays the creak); it swings slowly, light pours out. */
export default function WhiteDoor() {
  const { used } = useWorldState();
  const open = used.has(MEADOW_DOOR_ID);
  const shadow = useShadowTexture();
  const leaf = useRef<Group>(null);
  const glowFront = useRef<MeshBasicMaterial>(null);
  const glowBack = useRef<MeshBasicMaterial>(null);
  const light = useRef<PointLight>(null);
  const progress = useRef(open ? 1 : 0); // already open when coming back through it

  useFrame((_, dt) => {
    // a slow, heavy swing: starts after the latch, eases out
    progress.current = MathUtils.damp(progress.current, open ? 1 : 0, 1.6, Math.min(dt, 0.05));
    const p = progress.current;
    if (leaf.current) leaf.current.rotation.y = OPEN_ANGLE * p;
    const glow = Math.min(1, p * 2.5);
    if (glowFront.current) glowFront.current.opacity = glow;
    if (glowBack.current) glowBack.current.opacity = glow;
    if (light.current) light.current.intensity = 4 * glow; // kept at 0, never removed: no shader recompile
  });

  const y = meadowHeight(MEADOW_DOOR.x, MEADOW_DOOR.z);
  const leafW = W - 0.02;
  return (
    <group position={[MEADOW_DOOR.x, y, MEADOW_DOOR.z]}>
      {/* frame */}
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * (W / 2 + POST / 2), (H + SINK) / 2 - SINK, 0]}>
          <boxGeometry args={[POST, H + SINK, 0.2]} />
          <meshStandardMaterial color={PAINT} roughness={0.6} />
        </mesh>
      ))}
      <mesh position={[0, H + POST / 2, 0]}>
        <boxGeometry args={[W + POST * 2, POST, 0.2]} />
        <meshStandardMaterial color={PAINT} roughness={0.6} />
      </mesh>

      {/* the other side: warm and bright, revealed as the door opens (seen from both sides: it's a dream) */}
      <mesh position={[0, H / 2, -0.05]}>
        <planeGeometry args={[W, H]} />
        <meshBasicMaterial ref={glowFront} color={WARM} toneMapped={false} transparent opacity={0} depthWrite={false} />
      </mesh>
      <mesh position={[0, H / 2, 0.05]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[W, H]} />
        <meshBasicMaterial ref={glowBack} color={WARM} toneMapped={false} transparent opacity={0} depthWrite={false} />
      </mesh>
      <pointLight ref={light} position={[0, 1.3, 0.7]} color={WARM} intensity={0} distance={6} decay={1.5} />

      {/* leaf, hinged on the left post */}
      <group ref={leaf} position={[-W / 2, 0, 0]}>
        <group position={[leafW / 2, H / 2, 0]}>
          <mesh>
            <boxGeometry args={[leafW, H - 0.02, 0.045]} />
            <meshStandardMaterial color={PAINT} roughness={0.55} />
          </mesh>
          {[1, -1].map((face) => (
            <group key={face}>
              <Panel x={0} y={0.5} w={leafW * 0.72} h={0.75} z={face * 0.028} />
              <Panel x={0} y={-0.48} w={leafW * 0.72} h={0.85} z={face * 0.028} />
              <mesh position={[leafW / 2 - 0.1, -0.05, face * 0.045]}>
                <sphereGeometry args={[0.035, 12, 8]} />
                <meshStandardMaterial color="#c8a24a" metalness={0.8} roughness={0.3} />
              </mesh>
            </group>
          ))}
        </group>
      </group>

      <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[3, 2]} />
        <meshBasicMaterial map={shadow} transparent depthWrite={false} />
      </mesh>
    </group>
  );
}
