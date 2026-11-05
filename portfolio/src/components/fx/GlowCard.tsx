"use client";
import { useRef } from "react";
import { twMerge } from "tailwind-merge";

type Props = React.HTMLAttributes<HTMLDivElement> & {
  /** slight 3D tilt following the mouse (desktop only) */
  tilt?: boolean;
};

/**
 * Card with a light spot that follows the mouse (`.glow-card` in globals.css),
 * an optional tilt, and a soft hover sound when sound is on (via data-sound-hover).
 */
export default function GlowCard({ className, tilt = false, onPointerMove, onPointerEnter, onPointerLeave, ...props }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={ref}
      className={twMerge(
        "glow-card relative rounded-2xl border border-white/10 bg-white/[0.06] shadow-lg transition-[transform,background-color,border-color] duration-200 hover:border-white/20 hover:bg-white/[0.09]",
        tilt && "will-change-transform",
        className,
      )}
      data-sound-hover
      onPointerEnter={onPointerEnter}
      onPointerMove={(e) => {
        const el = ref.current;
        if (el) {
          const r = el.getBoundingClientRect();
          const x = e.clientX - r.left, y = e.clientY - r.top;
          el.style.setProperty("--mx", `${x}px`);
          el.style.setProperty("--my", `${y}px`);
          if (tilt && e.pointerType === "mouse" && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
            const rx = ((y / r.height) - 0.5) * -5;
            const ry = ((x / r.width) - 0.5) * 5;
            el.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg)`;
          }
        }
        onPointerMove?.(e);
      }}
      onPointerLeave={(e) => {
        if (ref.current) ref.current.style.transform = "";
        onPointerLeave?.(e);
      }}
      {...props}
    />
  );
}
