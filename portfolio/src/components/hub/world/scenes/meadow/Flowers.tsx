"use client";
import { useEffect, useMemo } from "react";
import { CircleGeometry, Color, InstancedMesh, Matrix4, MeshLambertMaterial, Quaternion, Euler, Vector3 } from "three";
import { byQuality, useQuality } from "../../settings";
import { MEADOW_DOOR, MEADOW_HOLE, MEADOW_POI, meadowBare, meadowHeight } from "../../terrain";

const WHITE = new Color("#fbfaf2");
const YELLOW = new Color("#f3cf35");

/** White and yellow wildflowers in loose clusters, poking just above the grass. */
export default function Flowers() {
  const quality = useQuality();
  const count = byQuality(quality, { low: 900, phone: 1800, desktop: 3500, high: 6000 });

  const mesh = useMemo(() => {
    const geo = new CircleGeometry(0.06, 6);
    geo.rotateX(-Math.PI / 2);
    const flowers = new InstancedMesh(geo, new MeshLambertMaterial(), count);
    const m = new Matrix4();
    const q = new Quaternion();
    const e = new Euler();
    const p = new Vector3();
    const s = new Vector3();
    let i = 0;
    while (i < count) {
      // a cluster: one colour dominates, like real patches of daisies or buttercups
      // half the patches along the way from the wake-up spot to the door, the rest scattered
      // a third: a trail of yellow from the picnic to the hole, behind the hill (follow it)
      const kind = Math.random();
      const trail = kind < 0.2;
      const onPath = !trail && kind < 0.5;
      const t = Math.random();
      const { picnic } = MEADOW_POI;
      const cx = trail ? picnic.x + (MEADOW_HOLE.x - picnic.x) * t + Math.sin(t * 9) * 4 : onPath ? 6 + (MEADOW_DOOR.x - 6) * t + (Math.random() - 0.5) * 20 : (Math.random() - 0.5) * 320;
      const cz = trail ? picnic.z + (MEADOW_HOLE.z - 6 - picnic.z) * t : onPath ? 22 + (MEADOW_DOOR.z + 6 - 22) * t + (Math.random() - 0.5) * 10 : (Math.random() - 0.5) * 320;
      const yellow = trail || Math.random() < 0.4;
      const n = trail ? 14 : 20 + Math.floor(Math.random() * 40);
      for (let k = 0; k < n && i < count; k++, i++) {
        const a = Math.random() * Math.PI * 2;
        const r = Math.sqrt(Math.random()) * (trail ? 1.6 : 4);
        const x = cx + Math.cos(a) * r;
        const z = cz + Math.sin(a) * r;
        p.set(x, meadowHeight(x, z) + 0.3 + Math.random() * 0.2, z);
        if (meadowBare(x, z)) p.y = -100; // none indoors or down the hole
        q.setFromEuler(e.set((Math.random() - 0.5) * 0.6, Math.random() * Math.PI, (Math.random() - 0.5) * 0.6));
        const size = 0.7 + Math.random() * 0.7;
        flowers.setMatrixAt(i, m.compose(p, q, s.set(size, size, size)));
        const dominant = Math.random() < 0.85;
        flowers.setColorAt(i, trail || dominant === yellow ? YELLOW : WHITE);
      }
    }
    return flowers;
  }, [count]);

  useEffect(() => () => {
    mesh.geometry.dispose();
    (mesh.material as MeshLambertMaterial).dispose();
    mesh.dispose();
  }, [mesh]);

  return <primitive object={mesh} />;
}
