import { expect, test } from "@playwright/test";
import { gotoHome, menuButton, mobileMenu, openFirstProject, scrollY, useFakeClock } from "./helpers";

test.describe("mobile", () => {
  test("menu opens and closes with the button", async ({ page }) => {
    await gotoHome(page);
    await menuButton(page).click();
    await expect(mobileMenu(page)).toBeVisible();
    await expect(menuButton(page)).toHaveAttribute("aria-expanded", "true");
    await menuButton(page).click();
    await expect(mobileMenu(page)).toBeHidden();
  });

  test("menu survives quick toggling", async ({ page }) => {
    await gotoHome(page);
    for (let i = 0; i < 7; i++) await menuButton(page).click();
    await expect(mobileMenu(page)).toBeVisible();
    await menuButton(page).click();
    await expect(mobileMenu(page)).toBeHidden();
    // the backdrop must not be left covering the page
    await page.locator('#projects button[aria-haspopup="dialog"]').first().click();
    await expect(page.getByRole("dialog")).toBeVisible();
  });

  test("tapping outside the menu closes it", async ({ page }) => {
    await gotoHome(page);
    await menuButton(page).click();
    await expect(mobileMenu(page)).toBeVisible();
    const vp = page.viewportSize()!;
    await page.mouse.click(vp.width / 2, vp.height - 20);
    await expect(mobileMenu(page)).toBeHidden();
  });

  test("scrolling closes the menu", async ({ page }) => {
    await gotoHome(page);
    await menuButton(page).click();
    await expect(mobileMenu(page)).toBeVisible();
    await page.evaluate(() => window.scrollBy({ top: 600, behavior: "instant" }));
    await expect(mobileMenu(page)).toBeHidden();
  });

  test("menu link scrolls to its section and closes the menu", async ({ page }) => {
    await gotoHome(page);
    await menuButton(page).click();
    await mobileMenu(page).getByRole("link", { name: /Expérience|Experience/ }).click();
    await expect(mobileMenu(page)).toBeHidden();
    await expect(page.locator("#experience h2")).toBeInViewport();
  });

  test("header stays while the menu is open, even when idle", async ({ page }) => {
    await gotoHome(page);
    await useFakeClock(page);
    await menuButton(page).click();
    await page.clock.fastForward(31_000);
    await expect(page.locator("header")).not.toHaveClass(/-translate-y-full/);
  });

  test("page behind the project dialog does not scroll", async ({ page, browserName }) => {
    await gotoHome(page);
    await openFirstProject(page);
    await expect(page.locator("body")).toHaveCSS("position", "fixed");
    const before = await scrollY(page);
    // mobile WebKit has no mouse wheel: try a programmatic scroll there instead
    if (browserName === "webkit") await page.evaluate(() => window.scrollBy(0, 800));
    else await page.mouse.wheel(0, 800);
    await page.waitForTimeout(300);
    expect(await scrollY(page)).toBe(before);
  });

  test("hover effects don't stick after a tap", async ({ page }) => {
    await gotoHome(page);
    expect(await page.evaluate(() => matchMedia("(hover: hover)").matches)).toBe(false);
    const card = page.locator("#projects .glow-card").first();
    await card.scrollIntoViewIfNeeded();
    const idle = await card.evaluate((el) => getComputedStyle(el).backgroundColor);
    await card.locator("button").tap();
    await page.getByRole("dialog").getByRole("button", { name: /Fermer|Close/ }).first().tap();
    await expect(page.getByRole("dialog")).toBeHidden();
    expect(await card.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe(idle);
  });

  test("header buttons are big enough to tap", async ({ page }) => {
    await gotoHome(page);
    for (const button of [menuButton(page), page.locator("header button[aria-pressed]")]) {
      const box = (await button.boundingBox())!;
      expect(Math.min(box.width, box.height)).toBeGreaterThanOrEqual(36);
    }
  });

  test("tapping the logo 5 times opens the hub", async ({ page }) => {
    await gotoHome(page);
    const logo = page.getByRole("link", { name: "Accueil" });
    for (let i = 0; i < 5; i++) await logo.tap();
    await expect(page).toHaveURL(/\/hub$/);
  });
});
