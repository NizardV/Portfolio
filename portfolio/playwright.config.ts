import { defineConfig, devices } from "@playwright/test";

const CI = !!process.env.CI;

// Software WebGL that doesn't starve the main thread (the /hub scene is WebGL).
const chromiumGL = { launchOptions: { args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] } };

/**
 * End-to-end tests (Playwright).
 * - shared.spec.ts runs everywhere, desktop.spec.ts on desktop, mobile.spec.ts on phones.
 * - Always tests the production build (on port 3100, so it never clashes with `pnpm dev`):
 *   the dev server compiles pages on demand, which makes timings flaky.
 * - WebKit (iPhone / Safari engine) runs in CI only, where `playwright install` provides it.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  timeout: 60_000,
  workers: CI ? 2 : 1,
  forbidOnly: CI,
  // CI runners occasionally lose a browser context (software WebGL); one retry absorbs that, not real bugs
  retries: CI ? 1 : 0,
  reporter: CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: "http://localhost:3100",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "desktop-chromium", use: { ...devices["Desktop Chrome"], ...chromiumGL }, testMatch: /(shared|desktop)\.spec\.ts/ },
    { name: "mobile-chromium", use: { ...devices["Pixel 7"], ...chromiumGL }, testMatch: /(shared|mobile)\.spec\.ts/ },
    { name: "small-mobile-chromium", use: { ...devices["iPhone SE"], browserName: "chromium", ...chromiumGL }, testMatch: /(shared|mobile)\.spec\.ts/ },
    ...(CI ? [{ name: "mobile-webkit", use: { ...devices["iPhone 13"] }, testMatch: /(shared|mobile)\.spec\.ts/ }] : []),
  ],
  webServer: {
    command: "pnpm build && pnpm exec next start -p 3100",
    url: "http://localhost:3100",
    reuseExistingServer: !CI,
    timeout: 240_000,
  },
});
