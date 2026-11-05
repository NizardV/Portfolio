import { useEffect } from "react";

/**
 * Locks page scroll while `locked` is true. `overflow: hidden` alone is not
 * enough on iOS Safari (the page behind still scrolls), so the body is pinned
 * with `position: fixed` and the scroll position restored afterwards.
 *
 * Reference-counted: if two overlays overlap, the page is only unlocked when
 * the last one goes away (otherwise the first cleanup could leave it pinned).
 */
let locks = 0;
let saved: { y: number; position: string; top: string; width: string; overflow: string } | null = null;

export function useScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return;
    const { body, documentElement: html } = document;
    if (locks++ === 0) {
      saved = { y: window.scrollY, position: body.style.position, top: body.style.top, width: body.style.width, overflow: body.style.overflow };
      body.style.position = "fixed";
      body.style.top = `-${saved.y}px`;
      body.style.width = "100%";
      body.style.overflow = "hidden";
    }
    return () => {
      if (--locks > 0 || !saved) return;
      const { y, ...styles } = saved;
      saved = null;
      Object.assign(body.style, styles);
      // jump back instantly, not with the page's smooth scrolling
      const behavior = html.style.scrollBehavior;
      html.style.scrollBehavior = "auto";
      window.scrollTo(0, y);
      html.style.scrollBehavior = behavior;
    };
  }, [locked]);
}
