"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

/**
 * Tiny UI sound kit, synthesised with WebAudio (no audio files to download).
 * Off by default; the choice is remembered in localStorage.
 */

export type SoundKind = "hover" | "click" | "open" | "close" | "toggle";

type SoundCtx = { enabled: boolean; toggle: () => void; play: (kind: SoundKind) => void };

const Ctx = createContext<SoundCtx>({ enabled: false, toggle: () => {}, play: () => {} });

const STORAGE_KEY = "nv-sound";

function blip(ac: AudioContext, freq: number, endFreq: number, duration: number, gain: number, type: OscillatorType = "sine") {
  const t = ac.currentTime;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  osc.frequency.exponentialRampToValueAtTime(endFreq, t + duration);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  osc.connect(g).connect(ac.destination);
  osc.start(t);
  osc.stop(t + duration + 0.02);
}

const RECIPES: Record<SoundKind, (ac: AudioContext) => void> = {
  hover: (ac) => blip(ac, 1800, 1500, 0.035, 0.015),
  click: (ac) => blip(ac, 520, 260, 0.08, 0.05, "triangle"),
  open: (ac) => { blip(ac, 440, 880, 0.14, 0.04); setTimeout(() => blip(ac, 660, 1320, 0.12, 0.025), 60); },
  close: (ac) => blip(ac, 700, 300, 0.12, 0.04),
  toggle: (ac) => { blip(ac, 660, 660, 0.06, 0.05, "square"); setTimeout(() => blip(ac, 990, 990, 0.08, 0.04, "square"), 70); },
};

export function SoundProvider({ children }: { children: React.ReactNode }) {
  const [enabled, setEnabled] = useState(false);
  const acRef = useRef<AudioContext | null>(null);
  const lastHover = useRef(0);

  useEffect(() => {
    try { setEnabled(localStorage.getItem(STORAGE_KEY) === "on"); } catch { /* storage blocked */ }
  }, []);

  const getAc = useCallback(() => {
    if (!acRef.current) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      acRef.current = new AC();
    }
    if (acRef.current.state === "suspended") void acRef.current.resume();
    return acRef.current;
  }, []);

  const playRaw = useCallback((kind: SoundKind) => {
    const ac = getAc();
    if (ac) RECIPES[kind](ac);
  }, [getAc]);

  const play = useCallback((kind: SoundKind) => {
    if (!enabled) return;
    if (kind === "hover") {
      // throttle hovers so sweeping the mouse across a grid doesn't buzz
      const now = performance.now();
      if (now - lastHover.current < 70) return;
      lastHover.current = now;
    }
    playRaw(kind);
  }, [enabled, playRaw]);

  const toggle = useCallback(() => {
    const next = !enabled;
    setEnabled(next);
    try { localStorage.setItem(STORAGE_KEY, next ? "on" : "off"); } catch { /* storage blocked */ }
    if (next) playRaw("toggle"); // confirms sound is on (and unlocks audio on iOS)
  }, [enabled, playRaw]);

  const value = useMemo(() => ({ enabled, toggle, play }), [enabled, toggle, play]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useSound = () => useContext(Ctx);
