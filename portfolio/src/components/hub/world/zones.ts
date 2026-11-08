import { box, type Box } from "./collision";
import type { AmbienceId, Surface } from "./audio";
import { MEADOW_DOOR, meadowHeight } from "./terrain";
import { UNIVERSES, type Universe } from "../universes";

/**
 * The world's map: each zone is a separate scene loaded on demand (see scenes/index.ts).
 * Collisions and portals live here, as data, so movement never depends on a scene's meshes having loaded.
 * Next places (hotel hall, offices…) are added one PR at a time; the yellow room is the interim hub.
 */
export type ZoneId = "meadow" | "yellow-room";

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
  /** a door that does not open (yet): using it rattles it and names the project behind */
  locked?: Universe;
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

/* ---------- the yellow room: the old hub, now walkable. Project doors (locked for now), the way back out ---------- */

export const ROOM = { half: 7, height: 3.2 };
export const ROOM_DOOR = { width: 1.2, height: 2.2 }; // the doorway back to the meadow, in the south wall
const WALL = 0.3;
const side = ROOM.half + WALL - ROOM_DOOR.width / 2;
export const ROOM_WALLS: readonly Box[] = [
  box(0, -ROOM.half - WALL / 2, ROOM.half * 2 + WALL * 2, WALL),
  box(-(ROOM_DOOR.width / 2 + side / 2), ROOM.half + WALL / 2, side, WALL),
  box(ROOM_DOOR.width / 2 + side / 2, ROOM.half + WALL / 2, side, WALL),
  box(-ROOM.half - WALL / 2, 0, WALL, ROOM.half * 2),
  box(ROOM.half + WALL / 2, 0, WALL, ROOM.half * 2),
];
const ROOM_DOOR_BACK = box(0, ROOM.half + WALL + 0.3, ROOM_DOOR.width + 0.6, 0.2); // nothing beyond the light

/** Project doors on the walls: x/z = centre of the door on the wall's inner face, angle = the way it faces. */
export type ProjectDoor = { universe: Universe; x: number; z: number; angle: number };
const SLOTS = [
  { x: 0, z: -ROOM.half, angle: 0 }, // north, facing you as you come in
  { x: -ROOM.half, z: 0, angle: Math.PI / 2 }, // west
  { x: ROOM.half, z: 0, angle: -Math.PI / 2 }, // east
];
export const PROJECT_DOORS: readonly ProjectDoor[] = UNIVERSES.slice(0, SLOTS.length).map((universe, i) => ({ universe, ...SLOTS[i] }));

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
        to: "yellow-room",
        veil: "#ffffff",
        requires: MEADOW_DOOR_ID,
      },
    ],
    ambience: "wind",
  },
  "yellow-room": {
    id: "yellow-room",
    name: "La salle jaune",
    description: "Papier peint défraîchi, moquette humide, néons qui grésillent. Des portes verrouillées… et la lumière du dehors.",
    spawn: { x: 0, z: ROOM.half - 1.4, yaw: 0 },
    colliders: [...ROOM_WALLS, ROOM_DOOR_BACK],
    interactables: PROJECT_DOORS.map((d) => ({
      id: `door-${d.universe.id}`,
      x: d.x,
      z: d.z,
      radius: 2.2,
      verb: "Ouvrir la porte",
      locked: d.universe,
    })),
    portals: [
      {
        box: { minX: -ROOM_DOOR.width / 2, maxX: ROOM_DOOR.width / 2, minZ: ROOM.half + 0.05, maxZ: ROOM.half + WALL + 0.5 },
        to: "meadow",
        arrive: { x: 0, z: MEADOW_DOOR_Z + 1.2, yaw: Math.PI },
        veil: "#ffffff",
        opens: [MEADOW_DOOR_ID],
      },
    ],
    ambience: "hum",
    floor: "hard",
  },
};

/** Menu order, and where the dream starts. */
export const ZONE_ORDER: readonly ZoneId[] = ["meadow", "yellow-room"];
export const START_ZONE: ZoneId = "meadow";
