import { createContext, useContext } from "react";
import type { Sfx } from "./audio";

/** World state the scenes need to draw themselves (which doors are open…). Provided by World. */
/** used = interactables already used (open doors); rattle = the last locked door tried (n changes each time) */
/** mark = record something as used / found (a memory that happens on its own: an event) */
/** sfx = play a one-shot sound (an event in a scene) */
export type WorldState = { used: ReadonlySet<string>; rattle?: { id: string; n: number }; mark?: (ids: readonly string[]) => void; sfx?: (name: Sfx) => void };
export const WorldStateContext = createContext<WorldState>({ used: new Set() });
export const useWorldState = () => useContext(WorldStateContext);
