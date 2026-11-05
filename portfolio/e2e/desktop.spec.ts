import { expect, test } from "@playwright/test";
import { gotoHome, useFakeClock } from "./helpers";

test.describe("desktop", () => {
  test("nav buttons scroll to their section", async ({ page }) => {
    await gotoHome(page);
    await page.locator("header nav").getByRole("button", { name: "Formation" }).click();
    await expect(page.locator("#education h2")).toBeInViewport();
  });

  test("header hides after 30s idle and comes back on activity", async ({ page }) => {
    await gotoHome(page);
    await useFakeClock(page);
    const header = page.locator("header");
    await page.clock.fastForward(20_000);
    await expect(header).not.toHaveClass(/-translate-y-full/);
    await page.clock.fastForward(11_000);
    await expect(header).toHaveClass(/-translate-y-full/);
    await page.mouse.move(400, 400);
    await expect(header).not.toHaveClass(/-translate-y-full/);
  });

  test("Konami code opens the hub", async ({ page }) => {
    await gotoHome(page);
    for (const key of ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"]) {
      await page.keyboard.press(key);
    }
    await expect(page).toHaveURL(/\/hub$/);
  });

  test("sound preference survives a reload", async ({ page }) => {
    await gotoHome(page);
    const toggle = page.locator("header button[aria-pressed]");
    await expect(toggle).toHaveAttribute("aria-pressed", "false");
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-pressed", "true");
    await page.reload();
    await expect(page.locator("header button[aria-pressed]")).toHaveAttribute("aria-pressed", "true");
  });
});
