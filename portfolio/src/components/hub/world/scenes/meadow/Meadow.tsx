"use client";
import { useEffect, useMemo } from "react";
import { BufferAttribute, Color, PlaneGeometry } from "three";
import { HOLE_REACH, MEADOW_HOLE, MEADOW_HOUSE, meadowHeight } from "../../terrain";
import Houses from "./Houses";
import Model from "../../Model";
import { grassTint } from "./tint";
import Flowers from "./Flowers";
import Grass from "./Grass";
import Sky, { HORIZON, SUN_DIR } from "./Sky";
import WhiteDoor from "./WhiteDoor";
import Atmosphere from "../../Atmosphere";


/** Hills to the horizon, coloured per vertex: lighter on crests, deeper in hollows, with soft patches. */
function useHills() {
  return useMemo(() => {
    // a grid that is fine where you walk (~0.75 m) and loose towards the horizon: x = 150 u + 400 u⁵
    const geo = new PlaneGeometry(2, 2, 400, 400);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const c = new Color();
    const warp = (u: number) => 150 * u + 400 * u ** 5;
    for (let i = 0; i < pos.count; i++) {
      const x = warp(pos.getX(i));
      const z = warp(pos.getZ(i));
      const h = meadowHeight(x, z);
      // under the hole's lip the coarse mesh would poke through: tuck it below
      const tuck = Math.hypot(x - MEADOW_HOLE.x, z - MEADOW_HOLE.z) < HOLE_REACH.rim + 0.4 ? 0.6 : 0;
      pos.setXYZ(i, x, h - tuck, z);
      grassTint(x, z, c);
      colors.set([c.r, c.g, c.b], i * 3);
    }
    geo.setAttribute("color", new BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    return geo;
  }, []);
}

/** The small white house on its ridge, at the edge of the world, against the painted sky. */
function House() {
  return <Model id="houseCottage" position={[MEADOW_HOUSE.x, meadowHeight(MEADOW_HOUSE.x, MEADOW_HOUSE.z) - 0.38, MEADOW_HOUSE.z]} rotation={[0, 0.5, -0.03]} tint="#f3f2ec" />;
}

export default function Meadow() {
  const hills = useHills();
  useEffect(() => () => hills.dispose(), [hills]);
  const sun = SUN_DIR.map((v) => v * 100) as [number, number, number];
  return (
    <>
      <Atmosphere background={HORIZON} fog={HORIZON} near={90} far={540} />
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
      <Houses />
    </>
  );
}
