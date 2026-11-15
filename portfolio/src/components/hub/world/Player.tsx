"use client";
import { useCallback, useEffect, useMemo, useRef, type MutableRefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { MathUtils, type PerspectiveCamera } from "three";
import { collide as collideBoxes, inside } from "./collision";
import { useHubDebug } from "./debug";
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
const CROUCH = { eye: 0.8, speed: 0.45 }; // crouched: eye this much lower, this share of the speed
const HEADROOM = { stand: 1.9, crouch: 1.05 }; // the least room between floor and ceiling to stand, to crawl
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
  const me = useRef({ x: spawn.x, z: spawn.z, yaw: spawn.yaw, pitch: spawn.pitch ?? 0, phase: 0, bob: 0, crouch: 0, moved: false, gone: false, focus: "" });
  const armed = useRef(new Map<Portal, boolean>());

  // closed doors are walls until opened
  const blockers = useMemo(
    () => [...(zone.colliders ?? []), ...(zone.interactables ?? []).filter((i) => i.blocker && !used.has(i.id)).map((i) => i.blocker!)],
    [zone, used],
  );
  const ground = useMemo(() => zone.ground ?? (zone.space ? (x: number, z: number) => zone.space!.ground(x, z) : () => 0), [zone]);
  const room = useMemo(() => (zone.space ? (x: number, z: number) => zone.space!.ceiling(x, z) - zone.space!.ground(x, z) : () => Infinity), [zone]);
  const slowAt = useMemo(() => (zone.space ? (x: number, z: number) => zone.space!.slowAt(x, z) : () => 1), [zone]);
  const dropAt = useMemo(() => (zone.space ? (x: number, z: number) => zone.space!.dropAt(x, z) : () => false), [zone]);
  const collide = useMemo(
    () => (x: number, z: number): [number, number] => {
      let p: [number, number] = zone.space ? zone.space.collide(x, z, RADIUS) : [x, z];
      if (blockers.length) p = collideBoxes(p[0], p[1], RADIUS, blockers);
      return p;
    },
    [zone, blockers],
  );

  // building tools (scripts/hub-tour.mjs): jump anywhere; doorways re-arm only once stepped away from
  const teleport = useCallback(
    (x: number, z: number, yaw: number, pitch = 0) => {
      Object.assign(me.current, { x, z, yaw, pitch: MathUtils.clamp(pitch, -PITCH_MAX, PITCH_MAX), bob: 0, phase: 0 });
      for (const p of zone.portals) if (p.link) armed.current.set(p, false);
    },
    [zone],
  );
  useHubDebug(zone, ground, teleport);

  useEffect(() => {
    camera.rotation.order = "YXZ"; // yaw then pitch: no roll creeping in
    if (Math.abs(camera.near - 0.03) > 1e-6) {
      camera.near = 0.03; // so a doorway plane right in front of the eyes is never clipped
      camera.updateProjectionMatrix();
    }
    // a doorway arms only once you have stepped away from it (you may arrive standing in one)
    for (const p of zone.portals) {
      if (!p.link) continue;
      const { s: side, lateral } = doorwaySide(p.link.from, spawn.x, spawn.z);
      armed.current.set(p, side < ARM && Math.abs(lateral) < p.link.w / 2 + 0.2);
    }
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
    // crouching: wanted, or forced while there is no room to stand up
    const down = controls.crouch || room(s.x, s.z) < HEADROOM.stand;
    s.crouch = MathUtils.damp(s.crouch, down ? 1 : 0, 9, dt);
    if (down) move.run = false;
    const speed = (move.run ? RUN : WALK) * (1 - (1 - CROUCH.speed) * s.crouch) * slowAt(s.x, s.z) * dt;
    const sin = Math.sin(s.yaw);
    const cos = Math.cos(s.yaw);
    const mx = (-sin * move.z + cos * move.x) * speed;
    const mz = (-cos * move.z - sin * move.x) * speed;
    if (mx || mz) {
      // slide along walls; refuse steps too high (or drops too deep) unless a ramp leads there
      const g0 = ground(s.x, s.z);
      const need = down ? HEADROOM.crouch : HEADROOM.stand;
      const ok = ([x, z]: [number, number]) => {
        const g = ground(x, z);
        const step = Math.abs(g - g0) < STEP_MAX || (g < g0 && dropAt(x, z));
        return step && room(x, z) >= need;
      };
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
          const facing = Math.abs(lateral) < p.link.w / 2 + 0.2;
          // armed only when standing in front of the opening; stepping aside (or walking round behind) disarms it,
          // so only a real walk through the doorway crosses, never a sidestep into it from behind
          if (side < ARM && facing) armed.current.set(p, true);
          else if (!facing || side > 0.3) armed.current.set(p, false);
          if (armed.current.get(p) && side >= 0 && facing) {
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
    camera.position.set(s.x + cos * sway, floor + EYE - CROUCH.eye * s.crouch - Math.abs(Math.sin(s.phase / 2)) * BOB * s.bob, s.z - sin * sway);
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
      if (used.has(item.id) && !item.locked && !item.toggle) continue;
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
