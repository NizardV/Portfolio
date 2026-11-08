import { createContext, useContext } from "react";

/** World state the scenes need to draw themselves (which doors are open…). Provided by World. */
/** used = interactables already used (open doors); rattle = the last locked door tried (n changes each time) */
export type WorldState = { used: ReadonlySet<string>; rattle?: { id: string; n: number } };
export const WorldStateContext = createContext<WorldState>({ used: new Set() });
export const useWorldState = () => useContext(WorldStateContext);
