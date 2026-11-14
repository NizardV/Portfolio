import { box, type Box } from "./collision";
import type { AmbienceId, Surface } from "./audio";
import type { Space } from "./archi/sdf";
import { MEADOW_DOOR, meadowHeight } from "./terrain";
import { LOBBY_ARRIVAL, LOBBY_INTERACTABLES, LOBBY_SPACE, LOBBY_SPAWN } from "./lobby";

/**
 * The world's map: each zone is a separate scene loaded on demand (see scenes/index.ts).
 * Collisions, floors and doorways live here, as data, so movement never depends on a scene's meshes.
 */
export type ZoneId = "meadow" | "lobby";

/** Where the player stands and looks (yaw 0 = looking towards -Z, π = towards +Z). */
export type Spawn = { x: number; z: number; yaw: number; pitch?: number };

/** A point on a doorway plane: walking through it means walking along yaw. */
export type Anchor = { x: number; z: number; y: number; yaw: number };

export type Portal = {
  to: ZoneId;
  /**
   * Seamless doorway: the destination is rendered live through the opening (w × h at `from`) and entered
   * by walking through, without any cut. `to` is the matching doorway on the other side.
   */
  link?: { from: Anchor; to: Anchor; w: number; h: number };
  /** otherwise: walking into this box triggers a faded transition (falls, magic doors) */
  box?: Box;
  arrive?: Spawn;
  veil?: string;
  /** only active once this interactable has been used (e.g. a door opened) */
  requires?: string;
  /** using this portal also marks these interactables as used (coming back through a door leaves it open) */
  opens?: readonly string[];
};

/** Something the player can use when close and facing it (E, click or the on-screen button). */
export type Interactable = {
  id: string;
  x: number;
  z: number;
  /** reach, metres */
  radius: number;
  /** shown in the prompt: « Ouvrir la porte » */
  verb: string;
  /** solid while unused (a closed door blocks its doorway) */
  blocker?: Box;
  /** a threshold that does not open yet: using it says what lies behind */
  locked?: { name: string; text: string; color: string };
};

/** Post-processing mood of a place (see DreamFilter). */
export type Post = { ao?: boolean; bloom?: number; vignette?: number; grain?: number; saturation?: number; contrast?: number };

export type Zone = {
  id: ZoneId;
  /** shown in the « Lieux découverts » menu and the fallback page */
  name: string;
  description: string;
  spawn: Spawn;
  /** built places: walls, floors and collisions from one distance field */
  space?: Space;
  /** simple places: box colliders */
  colliders?: readonly Box[];
  portals: readonly Portal[];
  ambience: AmbienceId;
  /** ground height under the player (default: the space's floors, or 0) */
  ground?: (x: number, z: number) => number;
  /** footstep sound */
  floor: Surface;
  /** 0..1: how much the place echoes */
  reverb?: number;
  post?: Post;
  interactables?: readonly Interactable[];
};

/* ---------- the meadow: where the dream starts. Open hills, a lone white door ---------- */

const MEADOW_DOOR_Z = MEADOW_DOOR.z;
export const MEADOW_DOOR_ID = "meadow-door";
const MEADOW_LIMIT = 70; // invisible edge: the hills beyond it are scenery only
const MEADOW_EDGES = [
  box(0, -MEADOW_LIMIT, MEADOW_LIMIT * 2, 1),
  box(0, MEADOW_LIMIT, MEADOW_LIMIT * 2, 1),
  box(-MEADOW_LIMIT, 0, 1, MEADOW_LIMIT * 2),
  box(MEADOW_LIMIT, 0, 1, MEADOW_LIMIT * 2),
];
const MEADOW_DOOR_POSTS = [box(-0.68, MEADOW_DOOR_Z, 0.16, 0.2), box(0.68, MEADOW_DOOR_Z, 0.16, 0.2)];
const DOOR_Y = meadowHeight(MEADOW_DOOR.x, MEADOW_DOOR_Z);
/** the white door, seen from the meadow (walking through it = looking north) */
export const MEADOW_DOOR_IN: Anchor = { x: MEADOW_DOOR.x, z: MEADOW_DOOR_Z, y: DOOR_Y, yaw: 0 };
const MEADOW_DOOR_OUT: Anchor = { ...MEADOW_DOOR_IN, yaw: Math.PI };
const LOBBY_OUT: Anchor = { ...LOBBY_ARRIVAL, yaw: Math.PI };

export const ZONES: Record<ZoneId, Zone> = {
  meadow: {
    id: "meadow",
    name: "La prairie",
    description: "Des collines vertes à perte de vue, le vent dans l'herbe, et une porte blanche posée au milieu de nulle part.",
    // a little off-axis, facing the door 35 m away: it is the only landmark
    spawn: { x: 6, z: 22, yaw: 0.175 },
    colliders: [...MEADOW_EDGES, ...MEADOW_DOOR_POSTS],
    ground: meadowHeight,
    floor: "grass",
    interactables: [
      { id: MEADOW_DOOR_ID, x: MEADOW_DOOR.x, z: MEADOW_DOOR_Z, radius: 2.6, verb: "Ouvrir la porte", blocker: box(0, MEADOW_DOOR_Z, 1.2, 0.12) },
    ],
    portals: [{ to: "lobby", link: { from: MEADOW_DOOR_IN, to: LOBBY_ARRIVAL, w: 1.2, h: 2.2 }, requires: MEADOW_DOOR_ID }],
    ambience: "wind",
    post: { vignette: 0.42, grain: 0.18, saturation: -0.14, contrast: -0.06 },
  },
  lobby: {
    id: "lobby",
    name: "Le Lobby",
    description: "Un labyrinthe jaune, immense et tordu : une salle de 12 m, une rotonde sur un puits sans fond, des trous dans le sol… et des seuils qui ne s'ouvrent pas encore.",
    spawn: LOBBY_SPAWN,
    space: LOBBY_SPACE,
    interactables: LOBBY_INTERACTABLES,
    portals: [{ to: "meadow", link: { from: LOBBY_OUT, to: MEADOW_DOOR_OUT, w: 1.3, h: 2.25 }, opens: [MEADOW_DOOR_ID] }],
    ambience: "lobby",
    floor: "carpet",
    reverb: 0.55,
    post: { ao: true, bloom: 0.9, vignette: 0.62, grain: 0.32, saturation: -0.22, contrast: 0.04 },
  },
};

/** Menu order, and where the dream starts. */
export const ZONE_ORDER: readonly ZoneId[] = ["meadow", "lobby"];
export const START_ZONE: ZoneId = "meadow";

/* ---------- doorway maths ---------- */

/** Rotation by θ around the vertical axis, three.js convention (rotation.y = θ turns yaw y into y + θ). */
const rot = (x: number, z: number, t: number): [number, number] => [x * Math.cos(t) + z * Math.sin(t), -x * Math.sin(t) + z * Math.cos(t)];

/** Where a pose on this side of a doorway ends up on the other side. */
export function throughDoor(link: NonNullable<Portal["link"]>, p: { x: number; z: number; yaw: number; pitch: number }): Spawn {
  const t = link.to.yaw - link.from.yaw;
  const [x, z] = rot(p.x - link.from.x, p.z - link.from.z, t);
  return { x: link.to.x + x, z: link.to.z + z, yaw: p.yaw + t, pitch: p.pitch };
}

/** The transform that places the destination place behind this doorway (for its live preview). */
export function doorwayTransform(link: NonNullable<Portal["link"]>): { position: [number, number, number]; rotationY: number } {
  const t = link.from.yaw - link.to.yaw;
  const [x, z] = rot(link.to.x, link.to.z, t);
  return { position: [link.from.x - x, link.from.y - link.to.y, link.from.z - z], rotationY: t };
}

/** Signed distance of a point past the doorway plane (> 0 = through), and its offset across the opening. */
export function doorwaySide(a: Anchor, x: number, z: number): { s: number; lateral: number } {
  const fx = -Math.sin(a.yaw);
  const fz = -Math.cos(a.yaw);
  return { s: (x - a.x) * fx + (z - a.z) * fz, lateral: (x - a.x) * -fz + (z - a.z) * fx };
}
