import { expect, type Page } from "@playwright/test";

/** Collects uncaught page errors and console errors (ignores blocked third-party requests). */
export function trackErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    // Vercel Speed Insights only exists on Vercel; locally its script 404s.
    if (m.type() === "error" && !/Failed to load resource|ERR_|speed-insights/.test(m.text())) errors.push(m.text());
  });
  return errors;
}

export async function gotoHome(page: Page) {
  await page.goto("/");
  // Playwright scrolls targets into view before clicking; with CSS smooth scrolling the
  // element keeps moving and never counts as "stable". The site's own smooth scrolls
  // (nav buttons) use scrollTo({ behavior: "smooth" }) and are unaffected.
  await page.addStyleTag({ content: "html { scroll-behavior: auto !important; }" });
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
}

/**
 * Switches to a fake clock once the page is interactive (installing it before load would
 * delay React's hydration), then starts the idle timers from a known instant.
 * Use clock.fastForward (fires due timers once), not runFor: runFor would replay every
 * animation frame of the hero canvas, which takes ages without a GPU.
 */
export async function useFakeClock(page: Page) {
  await page.clock.install();
  await page.mouse.move(5, 5);
}

/**
 * Elements sticking out of the viewport sideways. Includes position: fixed ones, which
 * don't add a scrollbar but still let phones pan the page sideways. Elements clipped
 * by an overflow-hidden ancestor that itself fits on screen are fine.
 */
export function horizontalOverflow(page: Page) {
  // Only the right side matters: content hanging off the left edge can't be scrolled to.
  return page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const fits = (r: DOMRect) => r.right <= vw + 1;
    const clipped = (el: Element) => {
      for (let a = el.parentElement; a; a = a.parentElement) {
        const ox = getComputedStyle(a).overflowX;
        if ((ox === "hidden" || ox === "clip") && fits(a.getBoundingClientRect())) return true;
      }
      return false;
    };
    const offenders: string[] = [];
    if (document.documentElement.scrollWidth > vw) offenders.push(`page is ${document.documentElement.scrollWidth}px wide for ${vw}px`);
    document.querySelectorAll("body *").forEach((el) => {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      if (!r.width || cs.display === "none" || fits(r) || clipped(el)) return;
      offenders.push(`<${el.tagName.toLowerCase()} class="${String(el.getAttribute("class")).slice(0, 60)}"> ${Math.round(r.left)}..${Math.round(r.right)}`);
    });
    return offenders;
  });
}

/** Scrolls through the whole page so every scroll-revealed section renders. */
export async function scrollThrough(page: Page) {
  const height = await page.evaluate(() => document.body.scrollHeight);
  for (let y = 0; y <= height; y += 400) {
    await page.evaluate((top) => window.scrollTo({ top, behavior: "instant" }), y);
    await page.waitForTimeout(60);
  }
}

export const scrollY = (page: Page) => page.evaluate(() => Math.round(window.scrollY));

/** Waits until the page stops scrolling (the site uses smooth scrolling). */
export async function waitForScrollEnd(page: Page) {
  await page.waitForFunction(() => new Promise<boolean>((resolve) => {
    const y = window.scrollY;
    setTimeout(() => resolve(window.scrollY === y), 150);
  }));
}

export const menuButton = (page: Page) => page.locator('header button[aria-controls="mobile-menu"]');
export const mobileMenu = (page: Page) => page.locator("#mobile-menu");

/**
 * Opens the first project card's detail dialog. Also returns where the page was scrolled
 * when it opened, read from the scroll lock (body is pinned at top: -scrollY).
 */
export async function openFirstProject(page: Page) {
  const card = page.locator('#projects button[aria-haspopup="dialog"]').first();
  await card.scrollIntoViewIfNeeded();
  await waitForScrollEnd(page);
  await card.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  const scrollBefore = await page.evaluate(() => -parseInt(document.body.style.top || "0", 10));
  return { dialog, scrollBefore };
}
