"use client";
import { useEffect, useRef } from "react";

/**
 * Animated hero background: drifting particles linked by faint lines,
 * gently pulled toward the cursor. Plain 2D canvas (no three.js on the main page).
 * Pauses when off-screen or when the tab is hidden; static under reduced motion.
 */

const COLORS = ["0,179,255", "168,85,247", "236,72,153"]; // cyan, violet, fuchsia (site palette)
const LINK_DIST = 130;
const MOUSE_DIST = 180;

type P = { x: number; y: number; vx: number; vy: number; r: number; c: string };

export default function HeroCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let w = 0, h = 0, dpr = 1, raf = 0, visible = true;
    let particles: P[] = [];
    const mouse = { x: -9999, y: -9999 };

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.round(Math.min(90, (w * h) / 14000));
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        r: 0.8 + Math.random() * 1.6,
        c: COLORS[Math.floor(Math.random() * COLORS.length)],
      }));
    };

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      for (const p of particles) {
        if (!reduced) {
          const dx = mouse.x - p.x, dy = mouse.y - p.y;
          const d = Math.hypot(dx, dy);
          if (d < MOUSE_DIST && d > 1) { p.vx += (dx / d) * 0.012; p.vy += (dy / d) * 0.012; }
          p.vx *= 0.985; p.vy *= 0.985;
          // keep a minimum drift so the field never freezes
          if (Math.abs(p.vx) + Math.abs(p.vy) < 0.08) { p.vx += (Math.random() - 0.5) * 0.05; p.vy += (Math.random() - 0.5) * 0.05; }
          p.x += p.vx; p.y += p.vy;
          if (p.x < 0 || p.x > w) p.vx *= -1;
          if (p.y < 0 || p.y > h) p.vy *= -1;
        }
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${p.c},0.8)`;
        ctx.fill();
      }
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i], b = particles[j];
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < LINK_DIST) {
            ctx.strokeStyle = `rgba(${a.c},${(1 - d / LINK_DIST) * 0.18})`;
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          }
        }
        const p = particles[i];
        const dm = Math.hypot(p.x - mouse.x, p.y - mouse.y);
        if (dm < MOUSE_DIST) {
          ctx.strokeStyle = `rgba(${p.c},${(1 - dm / MOUSE_DIST) * 0.45})`;
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(mouse.x, mouse.y); ctx.stroke();
        }
      }
    };

    const loop = () => {
      if (visible && !document.hidden) draw();
      raf = requestAnimationFrame(loop);
    };

    const onMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
      if (reduced) draw();
    };
    const onLeave = () => { mouse.x = mouse.y = -9999; };

    resize();
    draw();
    const io = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; });
    io.observe(canvas);
    const ro = new ResizeObserver(() => { resize(); draw(); });
    ro.observe(canvas);
    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerleave", onLeave);
    if (!reduced) raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className="absolute inset-0 h-full w-full [mask-image:radial-gradient(ellipse_at_center,black_35%,transparent_78%)] [-webkit-mask-image:radial-gradient(ellipse_at_center,black_35%,transparent_78%)]"
    />
  );
}
