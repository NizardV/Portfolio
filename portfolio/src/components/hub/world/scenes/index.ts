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
