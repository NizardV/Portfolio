"use client";
import { useEffect, useMemo } from "react";
import { BufferAttribute, Color, PlaneGeometry } from "three";
import { MEADOW_HOUSE, meadowHeight } from "../../terrain";
import Flowers from "./Flowers";
import Grass from "./Grass";
import Sky, { HORIZON, SUN_DIR } from "./Sky";
import WhiteDoor from "./WhiteDoor";

const LIGHT_GRASS = new Color("#6fb83a");
const DEEP_GRASS = new Color("#3f8a24");

/** Hills to the horizon, coloured per vertex: lighter on crests, deeper in hollows, with soft patches. */
function useHills() {
  return useMemo(() => {
    const geo = new PlaneGeometry(1100, 1100, 220, 220);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const c = new Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const h = meadowHeight(x, z);
      pos.setY(i, h);
      const patches = 0.5 + 0.25 * Math.sin(x * 0.11 + Math.sin(z * 0.07) * 2) + 0.25 * Math.sin(z * 0.13 - x * 0.05);
      const crest = Math.min(1, Math.max(0, (h - meadowHeight(x + 6, z + 6) + 1.5) / 3)); // rough « facing up-slope »
      c.copy(DEEP_GRASS).lerp(LIGHT_GRASS, Math.min(1, patches * 0.7 + crest * 0.4));
      colors.set([c.r, c.g, c.b], i * 3);
    }
    geo.setAttribute("color", new BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    return geo;
  }, []);
}

/** The small white house on its ridge: far, quiet, out of reach. */
function House() {
  const y = meadowHeight(MEADOW_HOUSE.x, MEADOW_HOUSE.z);
  return (
    <group position={[MEADOW_HOUSE.x, y, MEADOW_HOUSE.z]} rotation={[0, 0.5, 0]}>
      <mesh position={[0, 2, 0]}>
        <boxGeometry args={[8, 4.5, 6]} />
        <meshLambertMaterial color="#f3f2ec" />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[0, 5.2, side * 1.6]} rotation={[side * 0.6, 0, 0]}>
          <boxGeometry args={[8.6, 0.25, 3.9]} />
          <meshLambertMaterial color="#7d8794" />
        </mesh>
      ))}
      {[-2.2, 0.6].map((x) => (
        <mesh key={x} position={[x, 2.4, 3.01]}>
          <planeGeometry args={[1.1, 1.2]} />
          <meshBasicMaterial color="#2c3440" />
        </mesh>
      ))}
    </group>
  );
}

export default function Meadow() {
  const hills = useHills();
  useEffect(() => () => hills.dispose(), [hills]);
  const sun = SUN_DIR.map((v) => v * 100) as [number, number, number];
  return (
    <>
      <color attach="background" args={[HORIZON]} />
      <fog attach="fog" args={[HORIZON, 90, 540]} />
      <hemisphereLight args={["#d6eaff", "#4f7f2a", 1.15]} />
      <directionalLight position={sun} intensity={2.3} color="#fff4dc" />
      <Sky />
      <mesh geometry={hills}>
        <meshLambertMaterial vertexColors />
      </mesh>
      <Grass />
      <Flowers />
      <House />
      <WhiteDoor />
    </>
  );
}
