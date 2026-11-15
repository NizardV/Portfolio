import { box, type Box } from "./collision";
import type { AmbienceId, Surface } from "./audio";
import type { Space } from "./archi/sdf";
import { HOLE_REACH, HOUSE_WALL, MEADOW_DOOR, MEADOW_HOLE, MEADOW_HOUSES, meadowHeight } from "./terrain";
import { EXITS, LOBBY_ARRIVAL, LOBBY_INTERACTABLES, LOBBY_SPACE, LOBBY_SPAWN } from "./lobby";
import { back } from "./places/common";
import { OFFICES_ENTRY, OFFICES_SPACE, OFFICES_SPAWN } from "./places/offices";
import { POOLS_DRAIN, POOLS_ENTRY, POOLS_SPACE, POOLS_SPAWN } from "./places/pools";
import { CANALS_CRACK, CANALS_ENTRY, CANALS_SPACE, CANALS_SPAWN, CANALS_UP } from "./places/canals";
import { CITY_BACK, CITY_ENTRY, CITY_SPACE, CITY_SPAWN } from "./places/redcity";
import { MALL_ENTRY, MALL_SPACE, MALL_SPAWN } from "./places/mall";
import { HOTEL_ENTRY, HOTEL_SPACE, HOTEL_SPAWN } from "./places/hotel";
import { HILLS_FALL, HILLS_SPACE, HILLS_SPAWN, PLAY_FALL, PLAY_SPACE, PLAY_SPAWN, SUBURB_FALL, SUBURB_SPACE, SUBURB_SPAWN } from "./places/dreamcore";

/**
 * The world's map: each zone is a separate scene loaded on demand (see scenes/index.ts).
 * Collisions, floors and doorways live here, as data, so movement never depends on a scene's meshes.
 */
export type ZoneId = "meadow" | "lobby" | "bureaux" | "bassins" | "canaux" | "rouge" | "commerce" | "hotel" | "jeux" | "collines" | "lotissement";

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
const MEADOW_LIMIT = 110; // invisible edge: the hills beyond it are scenery only
const MEADOW_EDGES = [
  box(0, -MEADOW_LIMIT, MEADOW_LIMIT * 2, 1),
  box(0, MEADOW_LIMIT, MEADOW_LIMIT * 2, 1),
  box(-MEADOW_LIMIT, 0, 1, MEADOW_LIMIT * 2),
  box(MEADOW_LIMIT, 0, 1, MEADOW_LIMIT * 2),
];
const MEADOW_DOOR_POSTS = [box(MEADOW_DOOR.x - 0.68, MEADOW_DOOR_Z, 0.16, 0.2), box(MEADOW_DOOR.x + 0.68, MEADOW_DOOR_Z, 0.16, 0.2)];
/**
 * The houses: closed ones are solid blocks; the door's house has walls, a doorway 1.3 m wide in front, and its
 * back wall leaves room for the door frame (the door stands 25 cm in front of it: the wall must not stop you first).
 */
const MEADOW_WALLS = MEADOW_HOUSES.flatMap((h) => {
  if (!("door" in h && h.door)) return [box(h.x, h.z, h.w, h.d)];
  const t = HOUSE_WALL;
  const gap = 0.65;
  const side = h.w / 2 - gap;
  const back = h.w / 2 - 0.78; // either side of the door's frame
  return [
    box(h.x - 0.78 - back / 2, h.z - h.d / 2 + t / 2, back, t),
    box(h.x + 0.78 + back / 2, h.z - h.d / 2 + t / 2, back, t),
    box(h.x, h.z - h.d / 2 - 0.2, 1.6, 0.2), // behind the door: nothing to see there, nowhere to go
    box(h.x - h.w / 2 + t / 2, h.z, t, h.d),
    box(h.x + h.w / 2 - t / 2, h.z, t, h.d),
    box(h.x - gap - side / 2, h.z + h.d / 2 - t / 2, side, t),
    box(h.x + gap + side / 2, h.z + h.d / 2 - t / 2, side, t),
  ];
});
const DOOR_Y = meadowHeight(MEADOW_DOOR.x, MEADOW_DOOR_Z);
/** the white door, seen from the meadow (walking through it = looking north) */
export const MEADOW_DOOR_IN: Anchor = { x: MEADOW_DOOR.x, z: MEADOW_DOOR_Z, y: DOOR_Y, yaw: 0 };
const MEADOW_DOOR_OUT: Anchor = { ...MEADOW_DOOR_IN, yaw: Math.PI };
const LOBBY_OUT: Anchor = { ...LOBBY_ARRIVAL, yaw: Math.PI };

/** A doorway both ways: `out` is the plane walked through when leaving `a`, `into` the same plane seen from `b`. */
function pair(a: ZoneId, out: Anchor, b: ZoneId, into: Anchor, w: number, h: number, extra: Partial<Portal> = {}): [Portal, Portal] {
  return [
    { to: b, link: { from: out, to: into, w, h }, ...extra },
    { to: a, link: { from: back(into), to: back(out), w, h } },
  ];
}
const exit = (id: string) => EXITS.find((e) => e.id === id)!;
const lobbyTo = (id: string, b: ZoneId, into: Anchor) => pair("lobby", exit(id).anchor, b, into, exit(id).size[0], exit(id).size[1]);
const [lobbyMeadow, meadowLobby] = [
  { to: "meadow" as const, link: { from: LOBBY_OUT, to: MEADOW_DOOR_OUT, w: 1.3, h: 2.25 }, opens: [MEADOW_DOOR_ID] },
  { to: "lobby" as const, link: { from: MEADOW_DOOR_IN, to: LOBBY_ARRIVAL, w: 1.2, h: 2.2 }, requires: MEADOW_DOOR_ID },
];
const [lobbyOffices, officesLobby] = lobbyTo("exit-bureaux", "bureaux", OFFICES_ENTRY);
const [lobbyPools, poolsLobby] = lobbyTo("exit-bassins", "bassins", POOLS_ENTRY);
const [lobbyMall, mallLobby] = lobbyTo("exit-commerce", "commerce", MALL_ENTRY);
const [lobbyHotel, hotelLobby] = lobbyTo("exit-hotel", "hotel", HOTEL_ENTRY);
const [canalsLobby, lobbyCanals] = pair("canaux", CANALS_UP, "lobby", back(exit("exit-canaux").anchor), 1.1, 2.1);
const [cityLobby, lobbyCity] = pair("rouge", CITY_BACK, "lobby", back(exit("exit-rouge").anchor), 1, 2);
const [poolsCanals, canalsPools] = pair("bassins", POOLS_DRAIN, "canaux", CANALS_ENTRY, 1.8, 2);
const [canalsCity, cityCanals] = pair("canaux", CANALS_CRACK, "rouge", CITY_ENTRY, 0.9, 2.1);
const fall = (to: ZoneId, box: Box, arrive: Spawn): Portal => ({ to, box, arrive, veil: "#000000" });
const indoor = { ao: true, bloom: 0.8, vignette: 0.6, grain: 0.3, saturation: -0.2, contrast: 0.04 };

export const ZONES: Record<ZoneId, Zone> = {
  meadow: {
    id: "meadow",
    name: "La prairie",
    description: "Des collines vertes à perte de vue, le vent dans l'herbe, quelques maisons. Dans l'une d'elles, une porte blanche.",
    // a little off-axis, facing the door 35 m away: it is the only landmark
    spawn: { x: 6, z: 22, yaw: -0.1 },
    colliders: [...MEADOW_EDGES, ...MEADOW_DOOR_POSTS, ...MEADOW_WALLS],
    ground: meadowHeight,
    floor: "grass",
    interactables: [
      { id: MEADOW_DOOR_ID, x: MEADOW_DOOR.x, z: MEADOW_DOOR_Z, radius: 2.6, verb: "Ouvrir la porte", blocker: box(MEADOW_DOOR.x, MEADOW_DOOR_Z, 1.2, 0.12) },
    ],
    portals: [meadowLobby, fall("jeux", box(MEADOW_HOLE.x, MEADOW_HOLE.z, HOLE_REACH.inner * 2 + 0.6, HOLE_REACH.inner * 2 + 0.6), PLAY_SPAWN)],
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
    portals: [lobbyMeadow, lobbyOffices, lobbyPools, lobbyMall, lobbyHotel, lobbyCanals, lobbyCity],
    ambience: "lobby",
    floor: "carpet",
    reverb: 0.55,
    post: { ao: true, bloom: 0.9, vignette: 0.62, grain: 0.32, saturation: -0.22, contrast: 0.04 },
  },
  bureaux: {
    id: "bureaux",
    name: "Les bureaux isolés",
    description: "Un plateau de bureaux plus large que son immeuble. Au fond, la salle de surveillance ; sous les pieds, la salle serveurs : les deux pièces de Vigil.",
    spawn: OFFICES_SPAWN,
    space: OFFICES_SPACE,
    portals: [officesLobby],
    ambience: "hum",
    floor: "carpet",
    reverb: 0.4,
    post: { ...indoor, saturation: -0.35 },
  },
  bassins: {
    id: "bassins",
    name: "Les bassins",
    description: "Des piscines qu'on traverse en marchant dans l'eau : faïence éblouissante, voûte sombre, nuit bleue, et une cour à ciel ouvert au milieu du bâtiment.",
    spawn: POOLS_SPAWN,
    space: POOLS_SPACE,
    portals: [poolsLobby, poolsCanals],
    ambience: "water",
    floor: "hard",
    reverb: 0.85,
    post: { ...indoor, bloom: 1.1, saturation: -0.1 },
  },
  canaux: {
    id: "canaux",
    name: "Les canaux",
    description: "Des tunnels bas sous les bassins, un canal d'eau verte. Un escalier remonte quelque part ; une fissure, au milieu, n'a rien à faire là.",
    spawn: CANALS_SPAWN,
    space: CANALS_SPACE,
    portals: [canalsPools, canalsLobby, canalsCity],
    ambience: "water",
    floor: "hard",
    reverb: 0.9,
    post: { ...indoor, saturation: -0.3 },
  },
  rouge: {
    id: "rouge",
    name: "La ville rouge",
    description: "La nuit, sous une ligne aérienne, entre des tours dont toutes les fenêtres sont allumées. Personne.",
    spawn: CITY_SPAWN,
    space: CITY_SPACE,
    portals: [cityCanals, cityLobby],
    ambience: "city",
    floor: "hard",
    reverb: 0.3,
    post: { bloom: 1.2, vignette: 0.75, grain: 0.55, saturation: -0.05, contrast: 0.1 },
  },
  commerce: {
    id: "commerce",
    name: "Le centre commercial",
    description: "Un centre commercial mort en étoile, des galeries de boutiques fermées. Un disquaire au bout de l'une ; derrière une autre, une maison construite dans un hangar.",
    spawn: MALL_SPAWN,
    space: MALL_SPACE,
    portals: [mallLobby],
    ambience: "mall",
    floor: "hard",
    reverb: 0.75,
    post: { ...indoor, saturation: -0.25 },
  },
  hotel: {
    id: "hotel",
    name: "L'hôtel",
    description: "Le dernier étage d'un hôtel bâti autour d'un puits. En dessous, le même étage se répète, plus loin que la lumière ne va.",
    spawn: HOTEL_SPAWN,
    space: HOTEL_SPACE,
    portals: [hotelLobby],
    ambience: "hum",
    floor: "carpet",
    reverb: 0.6,
    post: { ...indoor, saturation: -0.1 },
  },
  jeux: {
    id: "jeux",
    name: "La salle de jeux",
    description: "Un décor d'enfant sous un plafond noir : un ciel peint, un soleil qui sourit, un vrai rayon de soleil. Une piscine à balles, puis une salle verte… et un trou.",
    spawn: PLAY_SPAWN,
    space: PLAY_SPACE,
    portals: [fall("collines", PLAY_FALL, HILLS_SPAWN)],
    ambience: "hum",
    floor: "carpet",
    reverb: 0.5,
    post: { ...indoor, saturation: 0.05, bloom: 1 },
  },
  collines: {
    id: "collines",
    name: "Les collines",
    description: "Des collines d'herbe, de petites maisons jaunes et des éoliennes. L'une des maisons n'a pas de plancher.",
    spawn: HILLS_SPAWN,
    space: HILLS_SPACE,
    portals: [fall("lotissement", HILLS_FALL, SUBURB_SPAWN)],
    ambience: "wind",
    floor: "grass",
    post: { vignette: 0.45, grain: 0.2, saturation: -0.05 },
  },
  lotissement: {
    id: "lotissement",
    name: "Le lotissement",
    description: "Un lotissement vide au crépuscule rose, toutes les fenêtres allumées. Un cratère au bout de la rue.",
    spawn: SUBURB_SPAWN,
    space: SUBURB_SPACE,
    portals: [fall("lobby", SUBURB_FALL, LOBBY_SPAWN)],
    ambience: "wind",
    floor: "hard",
    post: { vignette: 0.55, grain: 0.28, saturation: -0.1, bloom: 0.6 },
  },
};

/** Menu order, and where the dream starts. */
export const ZONE_ORDER: readonly ZoneId[] = ["meadow", "lobby", "bureaux", "bassins", "canaux", "rouge", "commerce", "hotel", "jeux", "collines", "lotissement"];
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
