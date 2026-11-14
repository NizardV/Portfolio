import { lazy, type ComponentType, type LazyExoticComponent } from "react";
import type { ZoneId } from "../zones";

/** One code-split chunk per place: only the place you stand in (and the ones seen through a doorway) are downloaded. */
export const SCENES: Record<ZoneId, LazyExoticComponent<ComponentType>> = {
  meadow: lazy(() => import("./meadow/Meadow")),
  lobby: lazy(() => import("./lobby/Lobby")),
  bureaux: lazy(() => import("./offices/Offices")),
  bassins: lazy(() => import("./pools/Pools")),
  canaux: lazy(() => import("./canals/Canals")),
  rouge: lazy(() => import("./city/RedCity")),
  commerce: lazy(() => import("./mall/Mall")),
  hotel: lazy(() => import("./hotel/Hotel")),
  jeux: lazy(() => import("./dreamcore/Playroom")),
  collines: lazy(() => import("./dreamcore/HillsScene")),
  lotissement: lazy(() => import("./dreamcore/SuburbScene")),
};

/**
 * Get a place ready before anyone looks at it: its code, and its geometry (built a few ms per frame). Called for the
 * places seen through the doorways of the current one, so a doorway shows its place at once, without a hitch.
 */
export const PREPARE: Record<ZoneId, () => Promise<unknown>> = {
  meadow: () => import("./meadow/Meadow"),
  lobby: () => Promise.all([import("./lobby/Lobby"), import("../lobby").then((m) => m.lobbyBuilt())]),
  bureaux: () => Promise.all([import("./offices/Offices"), import("../places/offices").then((m) => m.officesBuilt())]),
  bassins: () => Promise.all([import("./pools/Pools"), import("../places/pools").then((m) => m.poolsBuilt())]),
  canaux: () => Promise.all([import("./canals/Canals"), import("../places/canals").then((m) => m.canalsBuilt())]),
  rouge: () => Promise.all([import("./city/RedCity"), import("../places/redcity").then((m) => m.cityBuilt())]),
  commerce: () => Promise.all([import("./mall/Mall"), import("../places/mall").then((m) => m.mallBuilt())]),
  hotel: () => Promise.all([import("./hotel/Hotel"), import("../places/hotel").then((m) => m.hotelBuilt())]),
  jeux: () => Promise.all([import("./dreamcore/Playroom"), import("../places/dreamcore").then((m) => m.playBuilt())]),
  collines: () => Promise.all([import("./dreamcore/HillsScene"), import("../places/dreamcore").then((m) => m.hillsBuilt())]),
  lotissement: () => Promise.all([import("./dreamcore/SuburbScene"), import("../places/dreamcore").then((m) => m.suburbBuilt())]),
};
