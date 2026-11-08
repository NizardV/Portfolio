"use client";
import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { MathUtils } from "three";
import { collide, inside } from "./collision";
import { readMove, type Controls } from "./input";
import type { Portal, Spawn, Zone } from "./zones";

const EYE = 1.65;
const RADIUS = 0.3;
const WALK = 2.6; // m/s: a stroll, the world is meant to be looked at
const RUN = 5;
const MOUSE = 0.0022; // rad per pixel
const TOUCH = 0.005;
const PITCH_MAX = 1.35;
const BOB = 0.05; // vertical, metres
const SWAY = 0.03; // sideways, half the step frequency (one sway per two steps)

type Props = {
  zone: Zone;
  spawn: Spawn;
  controls: Controls;
  paused: boolean;
  touch: boolean;
  /** look speed multiplier and vertical inversion, from the menu */
  sensitivity: number;
  invertY: boolean;
  /** head bob wanted (already false under reduced motion) */
  bob: boolean;
  onMove: () => void;
  onPortal: (portal: Portal) => void;
};

/** First-person camera: look, walk, slide along walls, step through portals. Remount it to respawn. */
export default function Player({ zone, spawn, controls, paused, touch, sensitivity, invertY, bob, onMove, onPortal }: Props) {
  const camera = useThree((s) => s.camera);
  const me = useRef({ x: spawn.x, z: spawn.z, yaw: spawn.yaw, pitch: 0, phase: 0, bob: 0, moved: false, gone: false });

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
    [s.x, s.z] = collide(
      s.x + (-sin * move.z + cos * move.x) * speed,
      s.z + (-cos * move.z - sin * move.x) * speed,
      RADIUS,
      zone.colliders,
    );

    const walking = Math.hypot(move.x, move.z) > 0.1;
    if (walking && !s.moved) {
      s.moved = true;
      onMove();
    }
    // gentle head bob, faded in and out; none at all under reduced motion or when turned off
    s.phase += walking ? dt * (move.run ? 11 : 8) : 0;
    s.bob = MathUtils.damp(s.bob, walking && bob ? 1 : 0, 6, dt);
    const sway = Math.sin(s.phase / 2) * SWAY * s.bob;
    camera.position.set(s.x + cos * sway, EYE - Math.abs(Math.sin(s.phase / 2)) * BOB * s.bob, s.z - sin * sway);
    camera.rotation.set(s.pitch, s.yaw, 0);

    if (!s.gone) {
      const portal = zone.portals.find((p) => inside(s.x, s.z, p.box));
      if (portal) {
        s.gone = true; // trigger once; the next zone remounts the player
        onPortal(portal);
      }
    }
  });

  return null;
}
