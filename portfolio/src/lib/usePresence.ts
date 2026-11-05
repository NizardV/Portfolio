import { useEffect, useState } from "react";

/**
 * Keeps something mounted for `exitMs` after it is hidden, so it can play a CSS
 * exit transition, then unmounts it on a plain timer.
 *
 * Replaces framer-motion's AnimatePresence for overlays: its exit could stall,
 * leaving a closed dialog on screen with the page scroll still locked.
 */
export function usePresence<T>(value: T | null, exitMs = 200) {
  const [shown, setShown] = useState<T | null>(value);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (value !== null) {
      setShown(value);
      setLeaving(false);
      return;
    }
    setLeaving(true);
    const id = setTimeout(() => { setShown(null); setLeaving(false); }, exitMs);
    return () => clearTimeout(id);
  }, [value, exitMs]);

  return { shown, leaving };
}
