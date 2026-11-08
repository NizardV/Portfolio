import { useEffect } from "react";

/**
 * Shared, mutable input state. Written by DOM listeners, read every frame by the player:
 * a plain object avoids re-rendering React on each key press or touch move.
 */
export type Controls = {
  keys: Set<string>;
  /** virtual joystick, -1..1 (y > 0 = forward) */
  joy: { x: number; y: number };
  /** look deltas in pixels, consumed (reset) by the player each frame */
  look: { dx: number; dy: number };
};

export const createControls = (): Controls => ({ keys: new Set(), joy: { x: 0, y: 0 }, look: { dx: 0, dy: 0 } });

// KeyboardEvent.code is the PHYSICAL key: "KeyW" is Z on AZERTY, so ZQSD and WASD both work.
const FORWARD = ["KeyW", "ArrowUp"];
const BACK = ["KeyS", "ArrowDown"];
const LEFT = ["KeyA", "ArrowLeft"];
const RIGHT = ["KeyD", "ArrowRight"];
const RUN = ["ShiftLeft", "ShiftRight"];
const MOVE_KEYS = new Set([...FORWARD, ...BACK, ...LEFT, ...RIGHT, ...RUN]);

const held = (c: Controls, codes: string[]) => (codes.some((k) => c.keys.has(k)) ? 1 : 0);

/** Movement intent: x = right, z = forward, both -1..1 (length capped to 1). */
export function readMove(c: Controls): { x: number; z: number; run: boolean } {
  let x = held(c, RIGHT) - held(c, LEFT) + c.joy.x;
  let z = held(c, FORWARD) - held(c, BACK) + c.joy.y;
  const len = Math.hypot(x, z);
  if (len > 1) {
    x /= len;
    z /= len;
  }
  return { x, z, run: held(c, RUN) === 1 || Math.hypot(c.joy.x, c.joy.y) > 0.95 };
}

/** Keyboard listeners for as long as `enabled` is true. Keys are released when the tab loses focus. */
export function useKeyboard(c: Controls, enabled: boolean) {
  useEffect(() => {
    if (!enabled) {
      c.keys.clear();
      return;
    }
    const down = (e: KeyboardEvent) => {
      if (!MOVE_KEYS.has(e.code) || e.ctrlKey || e.metaKey || e.altKey) return;
      c.keys.add(e.code);
      e.preventDefault(); // arrows would scroll
    };
    const up = (e: KeyboardEvent) => c.keys.delete(e.code);
    const clear = () => c.keys.clear();
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", clear);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", clear);
      clear();
    };
  }, [c, enabled]);
}
