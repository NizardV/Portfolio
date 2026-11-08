import { useEffect, useState } from "react";
import { loadJSON, saveJSON } from "./env";

/** Player preferences, remembered in the browser (silently in-memory only if storage is blocked). */
export type Quality = "low" | "auto" | "high";

export type Settings = {
  quality: Quality;
  volume: number; // 0..1
  muted: boolean;
  sensitivity: number; // look speed multiplier
  invertY: boolean;
  /** null = follow the system « reduce motion » setting; true/false = the player's explicit choice */
  headBob: boolean | null;
};

export const DEFAULT_SETTINGS: Settings = {
  quality: "auto",
  volume: 0.6,
  muted: false,
  sensitivity: 1,
  invertY: false,
  headBob: null,
};

const STORE = "hub-v2-settings";

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(() => ({ ...DEFAULT_SETTINGS, ...loadJSON<Partial<Settings>>(STORE, {}) }));
  useEffect(() => saveJSON(STORE, settings), [settings]);
  const update = (patch: Partial<Settings>) => setSettings((s) => ({ ...s, ...patch }));
  return [settings, update] as const;
}

/** Canvas pixel ratio range for a quality level: phones stay lighter on « auto ». */
export function pixelRatio(quality: Quality, touch: boolean): [number, number] {
  if (quality === "low") return [0.75, 1];
  if (quality === "high") return [1, 2];
  return touch ? [1, 1.5] : [1, 2];
}

/** iPhone / iPod (and iPad pretending to be a Mac): no Fullscreen API there, only « Add to Home Screen ». */
export function isIOS(): boolean {
  const ua = navigator.userAgent;
  return /iP(hone|od|ad)/.test(ua) || (ua.includes("Macintosh") && navigator.maxTouchPoints > 1);
}

/** Launched from the home screen (no browser bars). */
export function isStandalone(): boolean {
  return (navigator as Navigator & { standalone?: boolean }).standalone === true || window.matchMedia("(display-mode: standalone)").matches;
}

/* ---------- fullscreen (not available on iPhone Safari: the button is then hidden) ---------- */

type FsElement = HTMLElement & { webkitRequestFullscreen?: () => void };
type FsDocument = Document & { webkitFullscreenElement?: Element | null; webkitExitFullscreen?: () => void };

export function canFullscreen(): boolean {
  const el = document.documentElement as FsElement;
  return typeof document !== "undefined" && !!(el.requestFullscreen || el.webkitRequestFullscreen);
}

export function isFullscreen(): boolean {
  const doc = document as FsDocument;
  return !!(doc.fullscreenElement ?? doc.webkitFullscreenElement);
}

/**
 * "page" = the page asked for it (button, menu); "browser" = the browser's own fullscreen (F11), which a page
 * can see but cannot leave; null = windowed.
 */
export function fullscreenMode(): "page" | "browser" | null {
  if (isFullscreen()) return "page";
  if (window.matchMedia("(pointer: coarse)").matches) return null; // phones: the window always spans the screen width
  const fillsScreen = Math.abs(window.innerWidth - screen.width) <= 1 && Math.abs(window.innerHeight - screen.height) <= 1;
  return fillsScreen || window.matchMedia("(display-mode: fullscreen)").matches ? "browser" : null;
}

export function toggleFullscreen() {
  const doc = document as FsDocument;
  const el = document.documentElement as FsElement;
  try {
    if (isFullscreen()) {
      if (doc.exitFullscreen) void doc.exitFullscreen();
      else doc.webkitExitFullscreen?.();
    } else if (el.requestFullscreen) {
      void el.requestFullscreen({ navigationUI: "hide" }).catch(() => {});
    } else {
      el.webkitRequestFullscreen?.();
    }
  } catch {
    /* refused by the browser: nothing to do */
  }
}
