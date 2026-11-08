"use client";
import { useMemo } from "react";
import { CanvasTexture } from "three";
import { MEADOW_DOOR, meadowHeight } from "../../terrain";

const W = 1.2; // opening, matches the portal and the posts' collision boxes in zones.ts
const H = 2.2;
const POST = 0.14;
const SINK = 0.4; // the frame goes into the ground: it never floats on the slope
const PAINT = "#f7f6f0";
const WARM = "#ffe6bd"; // light from the other side: the hotel hall

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

function Panel({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  return (
    <mesh position={[x, y, 0.03]}>
      <boxGeometry args={[w, h, 0.012]} />
      <meshStandardMaterial color={PAINT} roughness={0.55} />
    </mesh>
  );
}

/** The lone white door: frame, panelled leaf ajar, brass handle, warm light spilling through. */
export default function WhiteDoor() {
  const shadow = useShadowTexture();
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

      {/* leaf, hinged on the left post, opened away from the meadow */}
      <group position={[-W / 2, 0, -0.06]} rotation={[0, 0.65, 0]}>
        <group position={[leafW / 2, H / 2, 0]}>
          <mesh>
            <boxGeometry args={[leafW, H - 0.02, 0.045]} />
            <meshStandardMaterial color={PAINT} roughness={0.55} />
          </mesh>
          <Panel x={0} y={0.5} w={leafW * 0.72} h={0.75} />
          <Panel x={0} y={-0.48} w={leafW * 0.72} h={0.85} />
          <mesh position={[leafW / 2 - 0.1, -0.05, 0.045]}>
            <sphereGeometry args={[0.035, 12, 8]} />
            <meshStandardMaterial color="#c8a24a" metalness={0.8} roughness={0.3} />
          </mesh>
        </group>
      </group>

      {/* the other side: warm, bright, somewhere indoors */}
      <mesh position={[0, H / 2, -0.04]}>
        <planeGeometry args={[W, H]} />
        <meshBasicMaterial color={WARM} toneMapped={false} />
      </mesh>
      <mesh position={[0, H / 2, -0.05]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[W, H]} />
        <meshBasicMaterial color={WARM} toneMapped={false} />
      </mesh>
      <pointLight position={[0, 1.3, 0.7]} color={WARM} intensity={4} distance={6} decay={1.5} />

      <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[3, 2]} />
        <meshBasicMaterial map={shadow} transparent depthWrite={false} />
      </mesh>
    </group>
  );
}
