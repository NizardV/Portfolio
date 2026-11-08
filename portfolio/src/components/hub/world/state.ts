import { createContext, useContext } from "react";

/** World state the scenes need to draw themselves (which doors are open…). Provided by World. */
export type WorldState = { used: ReadonlySet<string> };
export const WorldStateContext = createContext<WorldState>({ used: new Set() });
export const useWorldState = () => useContext(WorldStateContext);
