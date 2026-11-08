import { lazy, type ComponentType, type LazyExoticComponent } from "react";
import type { ZoneId } from "../zones";

/** One code-split chunk per zone: only the zone you stand in is downloaded. */
export const SCENES: Record<ZoneId, LazyExoticComponent<ComponentType>> = {
  meadow: lazy(() => import("./meadow/Meadow")),
  "test-room": lazy(() => import("./TestRoom")),
};
