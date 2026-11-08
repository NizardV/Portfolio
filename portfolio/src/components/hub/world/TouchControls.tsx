"use client";
import { useRef, type PointerEvent as ReactPointerEvent } from "react";
import type { Controls } from "./input";

const RADIUS = 56; // joystick travel, px

/**
 * Phones: left half = virtual joystick (appears where the thumb lands), right half = drag to look.
 * Styles are mutated directly: no React render per touch move.
 */
export default function TouchControls({ controls }: { controls: Controls }) {
  const stick = useRef<{ id: number; x: number; y: number } | null>(null);
  const lookers = useRef(new Map<number, { x: number; y: number }>());
  const base = useRef<HTMLDivElement>(null);
  const knob = useRef<HTMLDivElement>(null);

  const showStick = (x: number, y: number, kx: number, ky: number, visible: boolean) => {
    if (base.current) {
      base.current.style.opacity = visible ? "1" : "0";
      base.current.style.transform = `translate(${x - RADIUS}px, ${y - RADIUS}px)`;
    }
    if (knob.current) knob.current.style.transform = `translate(${kx}px, ${ky}px)`;
  };

  const down = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    if (e.clientX < window.innerWidth / 2 && !stick.current) {
      stick.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
      showStick(e.clientX, e.clientY, 0, 0, true);
    } else {
      lookers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }
  };

  const move = (e: ReactPointerEvent<HTMLDivElement>) => {
    const s = stick.current;
    if (s?.id === e.pointerId) {
      let dx = e.clientX - s.x;
      let dy = e.clientY - s.y;
      const len = Math.hypot(dx, dy);
      if (len > RADIUS) {
        dx = (dx / len) * RADIUS;
        dy = (dy / len) * RADIUS;
      }
      controls.joy.x = dx / RADIUS;
      controls.joy.y = -dy / RADIUS;
      showStick(s.x, s.y, dx, dy, true);
      return;
    }
    const last = lookers.current.get(e.pointerId);
    if (last) {
      controls.look.dx += e.clientX - last.x;
      controls.look.dy += e.clientY - last.y;
      lookers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }
  };

  const up = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (stick.current?.id === e.pointerId) {
      stick.current = null;
      controls.joy.x = controls.joy.y = 0;
      showStick(0, 0, 0, 0, false);
    }
    lookers.current.delete(e.pointerId);
  };

  return (
    <div
      className="absolute inset-0 touch-none select-none"
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
    >
      <div
        ref={base}
        className="pointer-events-none absolute left-0 top-0 rounded-full border border-white/30 bg-white/10 opacity-0 transition-opacity"
        style={{ width: RADIUS * 2, height: RADIUS * 2 }}
      >
        <div ref={knob} className="absolute left-1/2 top-1/2 -ml-6 -mt-6 h-12 w-12 rounded-full bg-white/40" />
      </div>
    </div>
  );
}
