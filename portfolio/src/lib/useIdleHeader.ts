import { useEffect, useRef, useState } from "react";

const EVENTS = ["pointermove", "pointerdown", "keydown", "scroll", "touchstart", "wheel"] as const;

/**
 * Header stays visible while the visitor is active and slides away only after
 * `idleMs` without any interaction. Any activity brings it straight back.
 * Hovering the header itself keeps it open.
 */
export function useIdleHeader(idleMs = 30_000) {
  const [visible, setVisible] = useState(true);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hovering = useRef(false);

  useEffect(() => {
    const arm = () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => { if (!hovering.current) setVisible(false); }, idleMs);
    };
    const onActivity = () => {
      setVisible(true);
      arm();
    };
    EVENTS.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));
    arm();
    return () => {
      EVENTS.forEach((e) => window.removeEventListener(e, onActivity));
      if (timer.current) clearTimeout(timer.current);
    };
  }, [idleMs]);

  const headerProps = {
    onPointerEnter: () => { hovering.current = true; setVisible(true); },
    onPointerLeave: () => { hovering.current = false; },
  };

  return { visible, show: () => setVisible(true), headerProps };
}
