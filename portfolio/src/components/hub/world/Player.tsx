"use client";
import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { MathUtils, type PerspectiveCamera } from "three";
import { collide, inside } from "./collision";
import { readMove, type Controls } from "./input";
import type { Interactable, Portal, Spawn, Zone } from "./zones";

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
  /** interactables already used (open doors): they no longer block nor prompt */
  used: ReadonlySet<string>;
  onMove: () => void;
  onStep: (run: boolean) => void;
  onFocus: (target: Interactable | null) => void;
  onPortal: (portal: Portal) => void;
};

/** First-person camera: look, walk, slide along walls, find what can be used, step through portals. Remount to respawn. */
export default function Player(props: Props) {
  const { zone, spawn, controls, paused, touch, sensitivity, invertY, bob, used, onMove, onStep, onFocus, onPortal } = props;
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const me = useRef({ x: spawn.x, z: spawn.z, yaw: spawn.yaw, pitch: 0, phase: 0, bob: 0, moved: false, gone: false, focus: "" });

  // closed doors are walls until opened
  const colliders = useMemo(
    () => [...zone.colliders, ...(zone.interactables ?? []).filter((i) => i.blocker && !used.has(i.id)).map((i) => i.blocker!)],
    [zone, used],
  );

  useEffect(() => {
    camera.rotation.order = "YXZ"; // yaw then pitch: no roll creeping in
  }, [camera]);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05); // a frozen tab must not teleport the player through a wall
    const s = me.current;
    const { look } = controls;
    if (!paused) {
      const sens = (touch ? TOUCH : MOUSE) * sensitivity;
      // keep yaw in [-π, π]: an ever-growing angle loses precision over a long session
      s.yaw = MathUtils.euclideanModulo(s.yaw - look.dx * sens + Math.PI, Math.PI * 2) - Math.PI;
      s.pitch = MathUtils.clamp(s.pitch - look.dy * sens * (invertY ? -1 : 1), -PITCH_MAX, PITCH_MAX);
    }
    look.dx = look.dy = 0;

    const move = paused ? { x: 0, z: 0, run: false } : readMove(controls);
    const speed = (move.run ? RUN : WALK) * dt;
    const sin = Math.sin(s.yaw);
    const cos = Math.cos(s.yaw);
    [s.x, s.z] = collide(s.x + (-sin * move.z + cos * move.x) * speed, s.z + (-cos * move.z - sin * move.x) * speed, RADIUS, colliders);

    const walking = Math.hypot(move.x, move.z) > 0.1;
    if (walking && !s.moved) {
      s.moved = true;
      onMove();
    }

    // footsteps on each dip of the bob (always heard, even with the bob turned off)
    const before = Math.floor(s.phase / (Math.PI * 2));
    s.phase += walking ? dt * (move.run ? STEP_RATE.run : STEP_RATE.walk) : 0;
    if (Math.floor(s.phase / (Math.PI * 2)) !== before) onStep(move.run);

    // head bob and run feel, faded in and out; none at all under reduced motion or when turned off
    s.bob = MathUtils.damp(s.bob, walking && bob ? (move.run ? 1.5 : 1) : 0, 6, dt);
    const sway = Math.sin(s.phase / 2) * SWAY * s.bob;
    const floor = zone.ground?.(s.x, s.z) ?? 0;
    camera.position.set(s.x + cos * sway, floor + EYE - Math.abs(Math.sin(s.phase / 2)) * BOB * s.bob, s.z - sin * sway);
    camera.rotation.set(s.pitch, s.yaw, 0);
    const fov = MathUtils.damp(camera.fov, walking && move.run && bob ? FOV.run : FOV.walk, 4, dt);
    if (Math.abs(fov - camera.fov) > 0.01) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }

    // what can be used: close enough and roughly in front of us
    let focus: Interactable | null = null;
    for (const item of zone.interactables ?? []) {
      if (used.has(item.id)) continue;
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

    if (!s.gone) {
      const portal = zone.portals.find((p) => (!p.requires || used.has(p.requires)) && inside(s.x, s.z, p.box));
      if (portal) {
        s.gone = true; // trigger once; the next zone remounts the player
        onPortal(portal);
      }
    }
  });

  useEffect(() => () => onFocus(null), [onFocus]);

  return null;
}
