import { box, type Box } from "./collision";
import type { AmbienceId } from "./audio";

/**
 * The world's map: each zone is a separate scene loaded on demand (see scenes/index.ts).
 * Collisions and portals live here, as data, so movement never depends on a scene's meshes having loaded.
 * PR 1 ships two test zones only; the real places (meadow, hotel, offices…) replace them one PR at a time.
 */
export type ZoneId = "test-meadow" | "test-room";

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
};

/* ---------- test meadow: open field, a lone white door, a few rocks to bump into ---------- */

export const MEADOW_DOOR_Z = -12;
export const MEADOW_ROCKS: readonly Box[] = [box(-6, -4, 2, 1.6), box(7, -9, 1.4, 2.4), box(4, 3, 1.2, 1.2)];
const MEADOW_LIMIT = 60; // invisible edge: hills beyond it are scenery only
const MEADOW_EDGES = [
  box(0, -MEADOW_LIMIT, MEADOW_LIMIT * 2, 1),
  box(0, MEADOW_LIMIT, MEADOW_LIMIT * 2, 1),
  box(-MEADOW_LIMIT, 0, 1, MEADOW_LIMIT * 2),
  box(MEADOW_LIMIT, 0, 1, MEADOW_LIMIT * 2),
];
const MEADOW_DOOR_POSTS = [box(-0.68, MEADOW_DOOR_Z, 0.16, 0.2), box(0.68, MEADOW_DOOR_Z, 0.16, 0.2)];

/* ---------- test room: closed room with pillars, a lit doorway back to the meadow ---------- */

export const ROOM = { halfWidth: 8, halfDepth: 6, height: 3 };
export const ROOM_DOOR = { width: 1.2, z: ROOM.halfDepth };
const WALL = 0.3;
const sideWidth = ROOM.halfWidth + WALL - ROOM_DOOR.width / 2;
export const ROOM_WALLS: readonly Box[] = [
  box(0, -ROOM.halfDepth - WALL / 2, ROOM.halfWidth * 2 + WALL * 2, WALL),
  box(-(ROOM_DOOR.width / 2 + sideWidth / 2), ROOM.halfDepth + WALL / 2, sideWidth, WALL),
  box(ROOM_DOOR.width / 2 + sideWidth / 2, ROOM.halfDepth + WALL / 2, sideWidth, WALL),
  box(-ROOM.halfWidth - WALL / 2, 0, WALL, ROOM.halfDepth * 2),
  box(ROOM.halfWidth + WALL / 2, 0, WALL, ROOM.halfDepth * 2),
];
export const ROOM_PILLARS: readonly Box[] = [box(-3, -1.5, 0.6, 0.6), box(3, -1.5, 0.6, 0.6)];
const ROOM_DOOR_BACK = box(0, ROOM.halfDepth + WALL + 0.3, ROOM_DOOR.width + 0.6, 0.2); // nothing beyond the light

export const ZONES: Record<ZoneId, Zone> = {
  "test-meadow": {
    id: "test-meadow",
    name: "Prairie (essai)",
    description: "Collines à perte de vue et une porte blanche posée au milieu de nulle part.",
    spawn: { x: 0, z: 8, yaw: 0 },
    colliders: [...MEADOW_ROCKS, ...MEADOW_EDGES, ...MEADOW_DOOR_POSTS],
    portals: [
      {
        box: { minX: -0.6, maxX: 0.6, minZ: MEADOW_DOOR_Z - 0.15, maxZ: MEADOW_DOOR_Z + 0.15 },
        to: "test-room",
        veil: "#ffffff",
      },
    ],
    ambience: "wind",
  },
  "test-room": {
    id: "test-room",
    name: "Salle (essai)",
    description: "Une salle vide aux néons qui bourdonnent. Une lumière blanche filtre par la porte.",
    spawn: { x: 0, z: ROOM.halfDepth - 1.5, yaw: 0 },
    colliders: [...ROOM_WALLS, ...ROOM_PILLARS, ROOM_DOOR_BACK],
    portals: [
      {
        box: { minX: -ROOM_DOOR.width / 2, maxX: ROOM_DOOR.width / 2, minZ: ROOM.halfDepth + 0.05, maxZ: ROOM.halfDepth + WALL + 0.5 },
        to: "test-meadow",
        arrive: { x: 0, z: MEADOW_DOOR_Z + 1.2, yaw: Math.PI },
        veil: "#ffffff",
      },
    ],
    ambience: "hum",
  },
};

/** Menu order, and where the dream starts. */
export const ZONE_ORDER: readonly ZoneId[] = ["test-meadow", "test-room"];
export const START_ZONE: ZoneId = "test-meadow";
