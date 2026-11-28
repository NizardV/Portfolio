import { createContext, useContext } from "react";

/** World state the scenes need to draw themselves (which doors are open…). Provided by World. */
/** used = interactables already used (open doors); rattle = the last locked door tried (n changes each time) */
/** mark = record something as used / found (a memory that happens on its own: an event) */
export type WorldState = { used: ReadonlySet<string>; rattle?: { id: string; n: number }; mark?: (ids: readonly string[]) => void };
export const WorldStateContext = createContext<WorldState>({ used: new Set() });
export const useWorldState = () => useContext(WorldStateContext);
