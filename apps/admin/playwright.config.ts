import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  workers: 1,
  retries: 0,
  reporter: "list",
  timeout: 45_000,
  use: {
    baseURL: process.env.ADMIN_TEST_BASE_URL,
    browserName: "chromium",
    channel: "chrome",
    headless: true,
    ignoreHTTPSErrors: true,
    launchOptions: { args: ["--enable-webgl", "--use-gl=angle", "--use-angle=swiftshader"] },
  },
});
