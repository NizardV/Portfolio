"use client";
import { useEffect, useMemo, useRef, type MutableRefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { MathUtils, type PerspectiveCamera } from "three";
import { collide as collideBoxes, inside } from "./collision";
import { readMove, type Controls } from "./input";
import { doorwaySide, type Interactable, type Portal, type Spawn, type Zone } from "./zones";

const EYE = 1.65;
const RADIUS = 0.3;
const WALK = 2.6; // m/s: a stroll, the world is meant to be looked at
const RUN = 5;
const MOUSE = 0.0022; // rad per pixel
const TOUCH = 0.005;
const PITCH_MAX = 1.35;
const BOB = 0.05; // vertical, metres (×1.5 when running)
const SWAY = 0.03; // sideways, one sway per two steps
const STEP_RATE = { walk: 10, run: 14 }; // phase speed: one footstep per 2π
const FOV = { walk: 70, run: 76 }; // running widens the view a little
const FACING = Math.cos((55 * Math.PI) / 180); // an object counts as « in front » within ±55°
const STEP_MAX = 0.45; // the highest step up or down you take without a ramp
/** a doorway arms once you are this far before it, and fires when you reach its plane */
const ARM = -0.4;

export type Pose = { x: number; z: number; yaw: number; pitch: number };

type Props = {
  zone: Zone;
  spawn: Spawn;
  controls: Controls;
  paused: boolean;
  touch: boolean;
  /** look speed multiplier and vertical inversion, from the menu */
  sensitivity: number;
  invertY: boolean;
  /** head bob and running effects wanted (already false under reduced motion) */
  bob: boolean;
  /** interactables already used (open doors): they no longer block nor prompt, and unlock their doorways */
  used: ReadonlySet<string>;
  /** shared with the World: where the player is, every frame */
  pose: MutableRefObject<Pose>;
  onMove: () => void;
  onStep: (run: boolean) => void;
  onFocus: (target: Interactable | null) => void;
  onPortal: (portal: Portal) => void;
};

/** First-person camera: look, walk, slide along walls, find what can be used, step through doorways. Remount to respawn. */
export default function Player(props: Props) {
  const { zone, spawn, controls, paused, touch, sensitivity, invertY, bob, used, pose, onMove, onStep, onFocus, onPortal } = props;
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const me = useRef({ x: spawn.x, z: spawn.z, yaw: spawn.yaw, pitch: spawn.pitch ?? 0, phase: 0, bob: 0, moved: false, gone: false, focus: "" });
  const armed = useRef(new Map<Portal, boolean>());

  // closed doors are walls until opened
  const blockers = useMemo(
    () => [...(zone.colliders ?? []), ...(zone.interactables ?? []).filter((i) => i.blocker && !used.has(i.id)).map((i) => i.blocker!)],
    [zone, used],
  );
  const ground = useMemo(() => zone.ground ?? (zone.space ? (x: number, z: number) => zone.space!.ground(x, z) : () => 0), [zone]);
  const collide = useMemo(
    () => (x: number, z: number): [number, number] => {
      let p: [number, number] = zone.space ? zone.space.collide(x, z, RADIUS) : [x, z];
      if (blockers.length) p = collideBoxes(p[0], p[1], RADIUS, blockers);
      return p;
    },
    [zone, blockers],
  );

  useEffect(() => {
    camera.rotation.order = "YXZ"; // yaw then pitch: no roll creeping in
    if (Math.abs(camera.near - 0.03) > 1e-6) {
      camera.near = 0.03; // so a doorway plane right in front of the eyes is never clipped
      camera.updateProjectionMatrix();
    }
    // a doorway arms only once you have stepped away from it (you may arrive standing in one)
    for (const p of zone.portals) if (p.link) armed.current.set(p, doorwaySide(p.link.from, spawn.x, spawn.z).s < ARM);
  }, [camera, zone, spawn]);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05); // a frozen tab must not teleport the player through a wall
    const s = me.current;
    const { look } = controls;
    if (!paused && !s.gone) {
      const sens = (touch ? TOUCH : MOUSE) * sensitivity;
      // keep yaw in [-π, π]: an ever-growing angle loses precision over a long session
      s.yaw = MathUtils.euclideanModulo(s.yaw - look.dx * sens + Math.PI, Math.PI * 2) - Math.PI;
      s.pitch = MathUtils.clamp(s.pitch - look.dy * sens * (invertY ? -1 : 1), -PITCH_MAX, PITCH_MAX);
    }
    look.dx = look.dy = 0;

    const move = paused || s.gone ? { x: 0, z: 0, run: false } : readMove(controls);
    const speed = (move.run ? RUN : WALK) * dt;
    const sin = Math.sin(s.yaw);
    const cos = Math.cos(s.yaw);
    const mx = (-sin * move.z + cos * move.x) * speed;
    const mz = (-cos * move.z - sin * move.x) * speed;
    if (mx || mz) {
      // slide along walls; refuse steps too high (or drops too deep) unless a ramp leads there
      const g0 = ground(s.x, s.z);
      const ok = ([x, z]: [number, number]) => Math.abs(ground(x, z) - g0) < STEP_MAX;
      const tries: [number, number][] = [collide(s.x + mx, s.z + mz), collide(s.x + mx, s.z), collide(s.x, s.z + mz)];
      const next = tries.find(ok);
      if (next) [s.x, s.z] = next;
    }

    const walking = Math.hypot(move.x, move.z) > 0.1;
    if (walking && !s.moved) {
      s.moved = true;
      onMove();
    }

    // footsteps on each dip of the bob (always heard, even with the bob turned off)
    const before = Math.floor(s.phase / (Math.PI * 2));
    s.phase += walking ? dt * (move.run ? STEP_RATE.run : STEP_RATE.walk) : 0;
    if (Math.floor(s.phase / (Math.PI * 2)) !== before) onStep(move.run);

    // doorways: fire when the plane is reached, and never let the eye cross it in this place
    if (!s.gone) {
      for (const p of zone.portals) {
        if (p.requires && !used.has(p.requires)) continue;
        if (p.link) {
          const { s: side, lateral } = doorwaySide(p.link.from, s.x, s.z);
          if (side < ARM) armed.current.set(p, true);
          if (armed.current.get(p) && side >= 0 && Math.abs(lateral) < p.link.w / 2 + 0.2) {
            const fx = -Math.sin(p.link.from.yaw);
            const fz = -Math.cos(p.link.from.yaw);
            const back = Math.max(0, side - 0.04);
            s.x -= fx * back;
            s.z -= fz * back;
            s.gone = true; // the next place remounts the player, exactly where it continues
            pose.current = { x: s.x, z: s.z, yaw: s.yaw, pitch: s.pitch };
            onPortal(p);
            break;
          }
        } else if (p.box && inside(s.x, s.z, p.box)) {
          s.gone = true;
          onPortal(p);
          break;
        }
      }
    }

    // head bob and run feel, faded in and out; none at all under reduced motion or when turned off
    s.bob = MathUtils.damp(s.bob, walking && bob ? (move.run ? 1.5 : 1) : 0, 6, dt);
    const sway = Math.sin(s.phase / 2) * SWAY * s.bob;
    const floor = ground(s.x, s.z);
    camera.position.set(s.x + cos * sway, floor + EYE - Math.abs(Math.sin(s.phase / 2)) * BOB * s.bob, s.z - sin * sway);
    camera.rotation.set(s.pitch, s.yaw, 0);
    const fov = MathUtils.damp(camera.fov, walking && move.run && bob ? FOV.run : FOV.walk, 4, dt);
    if (Math.abs(fov - camera.fov) > 0.01) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
    if (!s.gone) pose.current = { x: s.x, z: s.z, yaw: s.yaw, pitch: s.pitch };

    // what can be used: close enough and roughly in front of us
    let focus: Interactable | null = null;
    for (const item of zone.interactables ?? []) {
      if (used.has(item.id) && !item.locked) continue;
      const dx = item.x - s.x;
      const dz = item.z - s.z;
      const dist = Math.hypot(dx, dz);
      if (dist > item.radius) continue;
      if (dist < 0.8 || (-sin * dx - cos * dz) / dist > FACING) focus = item;
    }
    if ((focus?.id ?? "") !== s.focus) {
      s.focus = focus?.id ?? "";
      onFocus(focus);
    }
  });

  useEffect(() => () => onFocus(null), [onFocus]);

  return null;
}
