"use client";
import { useEffect, useRef } from "react";

/**
 * Soft glow that trails the mouse. Desktop only (fine pointer), disabled under
 * reduced motion. The native cursor is kept for usability; this is decoration.
 */
export default function CursorGlow() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!window.matchMedia("(pointer: fine)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const target = { x: -500, y: -500 };
    const pos = { x: -500, y: -500 };
    let raf = 0;
    let pressed = false;

    // The loop only runs while the glow is catching up with the cursor, so an idle page costs nothing.
    const start = () => { if (!raf) raf = requestAnimationFrame(tick); };
    const onMove = (e: PointerEvent) => {
      target.x = e.clientX;
      target.y = e.clientY;
      el.style.opacity = "1";
      start();
    };
    const onLeave = () => { el.style.opacity = "0"; };
    const onDown = () => { pressed = true; start(); };
    const onUp = () => { pressed = false; start(); };

    function tick() {
      pos.x += (target.x - pos.x) * 0.18;
      pos.y += (target.y - pos.y) * 0.18;
      const s = pressed ? 0.7 : 1;
      el!.style.transform = `translate3d(${pos.x - 200}px, ${pos.y - 200}px, 0) scale(${s})`;
      const settled = Math.abs(target.x - pos.x) < 0.5 && Math.abs(target.y - pos.y) < 0.5;
      raf = settled ? 0 : requestAnimationFrame(tick);
    }

    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
    };
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      // Not rendered at all on touch screens, and parked off-screen until the mouse moves:
      // a 400px fixed box sticking out of a phone's viewport lets the page pan sideways.
      style={{ transform: "translate3d(-1000px, -1000px, 0)" }}
      className="pointer-events-none fixed left-0 top-0 z-30 hidden h-[400px] w-[400px] rounded-full opacity-0 transition-opacity [@media(pointer:fine)]:block duration-300 [background:radial-gradient(closest-side,rgba(0,179,255,0.10),rgba(168,85,247,0.06)_45%,transparent_70%)]"
    />
  );
}
