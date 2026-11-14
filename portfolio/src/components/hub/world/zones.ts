import { box, type Box } from "./collision";
import type { AmbienceId, Surface } from "./audio";
import { MEADOW_DOOR, meadowHeight } from "./terrain";
import { LOBBY_COLLIDERS, LOBBY_INTERACTABLES, LOBBY_PORTAL_BOX, LOBBY_SPAWN, lobbyGround } from "./lobby";

/**
 * The world's map: each zone is a separate scene loaded on demand (see scenes/index.ts).
 * Collisions and portals live here, as data, so movement never depends on a scene's meshes having loaded.
 * The Lobby is the hub; the branches (offices, pools, hotel, mall…) are added one PR at a time.
 */
export type ZoneId = "meadow" | "lobby";

/** Where the player stands and looks (yaw 0 = looking towards -Z, π = towards +Z). */
export type Spawn = { x: number; z: number; yaw: number };

export type Portal = {
  /** walking into this box triggers the transition */
  box: Box;
  to: ZoneId;
  /** where the player appears in the destination (default: the zone's spawn) */
  arrive?: Spawn;
  /** colour of the fade that hides the loading */
  veil: string;
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

export type Zone = {
  id: ZoneId;
  /** shown in the « Lieux découverts » menu and the fallback page */
  name: string;
  description: string;
  spawn: Spawn;
  colliders: readonly Box[];
  portals: readonly Portal[];
  ambience: AmbienceId;
  /** ground height under the player (default: flat floor at 0) */
  ground?: (x: number, z: number) => number;
  /** footstep sound */
  floor: Surface;
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
    portals: [
      {
        box: { minX: -0.6, maxX: 0.6, minZ: MEADOW_DOOR_Z - 0.15, maxZ: MEADOW_DOOR_Z + 0.15 },
        to: "lobby",
        veil: "#ffffff",
        requires: MEADOW_DOOR_ID,
      },
    ],
    ambience: "wind",
  },
  lobby: {
    id: "lobby",
    name: "Le Lobby",
    description: "Un labyrinthe de pièces jaunes aux néons qui grésillent. Une salle immense, une fosse, des trous dans le sol… et des seuils qui ne s'ouvrent pas encore.",
    spawn: LOBBY_SPAWN,
    colliders: LOBBY_COLLIDERS,
    ground: lobbyGround,
    interactables: LOBBY_INTERACTABLES,
    portals: [
      {
        box: LOBBY_PORTAL_BOX,
        to: "meadow",
        arrive: { x: 0, z: MEADOW_DOOR_Z + 1.2, yaw: Math.PI },
        veil: "#ffffff",
        opens: [MEADOW_DOOR_ID],
      },
    ],
    ambience: "hum",
    floor: "carpet",
  },
};

/** Menu order, and where the dream starts. */
export const ZONE_ORDER: readonly ZoneId[] = ["meadow", "lobby"];
export const START_ZONE: ZoneId = "meadow";
