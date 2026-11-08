import { expect, test } from "@playwright/test";
import { gotoHome, horizontalOverflow, menuButton, openFirstProject, scrollThrough, scrollY, trackErrors } from "./helpers";

test.describe("page (all devices)", () => {
  test("loads without errors", async ({ page }) => {
    const errors = trackErrors(page);
    await gotoHome(page);
    await scrollThrough(page);
    expect(errors).toEqual([]);
  });

  test("nothing sticks out sideways", async ({ page }) => {
    await gotoHome(page);
    expect(await horizontalOverflow(page)).toEqual([]);
    await scrollThrough(page);
    expect(await horizontalOverflow(page)).toEqual([]);
    await openFirstProject(page);
    expect(await horizontalOverflow(page)).toEqual([]);
  });

  // Regression: an invisible but mounted mobile menu made the fixed header swallow taps on the content below it.
  test("the header doesn't cover the page under it", async ({ page }) => {
    await gotoHome(page);
    const vp = page.viewportSize()!;
    for (const y of [100, 200, 400]) {
      const inHeader = await page.evaluate(([x, top]) => !!document.elementFromPoint(x, top)?.closest("header"), [vp.width / 2, y]);
      expect(inHeader, `tap at y=${y} lands on the header`).toBe(false);
    }
  });

  test("every section is reachable and filled", async ({ page }) => {
    await gotoHome(page);
    await scrollThrough(page);
    for (const id of ["about", "projects", "experience", "education", "contact"]) {
      const section = page.locator(`#${id}`);
      await expect(section).toBeVisible();
      expect((await section.innerText()).trim().length, `#${id} is empty`).toBeGreaterThan(20);
    }
  });

  test("switches language", async ({ page, isMobile }) => {
    await gotoHome(page);
    if (isMobile) await menuButton(page).click();
    await page.getByRole("tab", { name: "EN" }).filter({ visible: true }).click();
    await expect(page.locator("#projects h2")).toHaveText("Projects");
    await expect(page.locator("html")).toHaveAttribute("lang", /fr|en/);
  });

  test("project dialog opens, stays on screen, and closes without moving the page", async ({ page }) => {
    await gotoHome(page);
    const { dialog, scrollBefore: before } = await openFirstProject(page);
    const box = await dialog.boundingBox();
    const vp = page.viewportSize()!;
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(vp.width);
    expect(box!.height).toBeLessThanOrEqual(vp.height);

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    expect(Math.abs((await scrollY(page)) - before)).toBeLessThanOrEqual(2);
    await expect(page.locator("body")).not.toHaveCSS("position", "fixed");
  });

  test("every project opens its own detail", async ({ page }) => {
    await gotoHome(page);
    const cards = page.locator('#projects button[aria-haspopup="dialog"]');
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      const title = (await cards.nth(i).locator("h3").innerText()).trim();
      await cards.nth(i).scrollIntoViewIfNeeded();
      await cards.nth(i).click();
      await expect(page.getByRole("dialog")).toContainText(title);
      await page.getByRole("dialog").getByRole("button", { name: /Fermer|Close/ }).click();
      await expect(page.getByRole("dialog")).toBeHidden();
    }
  });

  // Regression: the dialog used to stay on screen (and the page locked) after quick open/close cycles.
  test("dialog survives quick open/close cycles", async ({ page }) => {
    await gotoHome(page);
    const cards = page.locator('#projects button[aria-haspopup="dialog"]');
    for (let i = 0; i < 6; i++) {
      const card = cards.nth(i % (await cards.count()));
      await card.scrollIntoViewIfNeeded();
      await card.click();
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();
      await dialog.getByRole("button", { name: /Fermer|Close/ }).click();
      await expect(dialog).toBeHidden();
      await expect(page.locator("body")).not.toHaveCSS("position", "fixed");
    }
  });

  test("hub page renders", async ({ page }) => {
    await page.goto("/hub");
    await expect(page.locator("canvas")).toBeVisible({ timeout: 30_000 });
    // Only check the way back: tearing down software WebGL on navigation can crash the CI browser.
    await expect(page.getByRole("link", { name: /RETOUR/ })).toHaveAttribute("href", "/");
  });

  test("hub v2: first-person world and places menu", async ({ page }) => {
    await page.goto("/hub/v2");
    await expect(page.locator("canvas")).toBeVisible({ timeout: 30_000 });
    await page.getByRole("button", { name: /^MENU/ }).click();
    const menu = page.getByRole("dialog", { name: "Menu" });
    await expect(menu).toBeVisible();
    await expect(menu.getByRole("button", { name: /La prairie/ })).toBeVisible();
    await expect(menu.getByText("???")).toBeVisible(); // the room is not found yet
    await expect(menu.getByRole("link", { name: /SE RÉVEILLER/ })).toHaveAttribute("href", "/");
    for (const [tab, setting] of [["Graphismes", "Balancement de la marche"], ["Audio", "Volume"], ["Contrôles", "Sensibilité"]]) {
      await menu.getByRole("tab", { name: tab }).click();
      await expect(menu.getByLabel(setting)).toBeVisible();
    }
    await menu.getByRole("button", { name: "REPRENDRE" }).click();
    await expect(menu).toBeHidden();
    await page.keyboard.press("Tab"); // Tab also opens the menu
    await expect(menu).toBeVisible();
    await page.keyboard.press("Tab"); // …and closes it
    await expect(menu).toBeHidden();
  });
});
