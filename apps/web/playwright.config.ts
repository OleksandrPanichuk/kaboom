import { defineConfig, devices } from "@playwright/test";

const API_PORT = Number(process.env.E2E_API_PORT ?? 8090);
const WEB_PORT = Number(process.env.E2E_WEB_PORT ?? 4180);
const DATABASE_URL =
  process.env.E2E_DATABASE_URL ??
  "postgres://postgres:postgres@localhost:5433/kaboom_e2e";

export default defineConfig({
  testDir: "./e2e/specs",
  testMatch: "**/*.e2e.ts",
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  timeout: 60_000,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${WEB_PORT}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        ...(process.env.CI ? {} : { channel: "chrome" }),
      },
    },
  ],
  webServer: [
    {
      command: "bun run --cwd ../api e2e:server",
      url: `http://localhost:${API_PORT}/api/health/ready`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        NODE_ENV: "test",
        E2E_CONTROL: "true",
        PORT: String(API_PORT),
        DATABASE_URL,
        APP_URL: `http://localhost:${WEB_PORT}`,
        CORS_ORIGIN: `http://localhost:${WEB_PORT}`,
        LOG_LEVEL: "warn",
      },
    },
    {
      command: `bunx vite build && bunx vite preview --port ${WEB_PORT} --strictPort`,
      url: `http://localhost:${WEB_PORT}`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        API_URL: `http://localhost:${API_PORT}`,
        VITE_STRIPE_PUBLISHABLE_KEY: "pk_test_e2e",
        VITE_RECAPTCHA_SITE_KEY: "",
        VITE_RECAPTCHA_V2_SITE_KEY: "",
      },
    },
  ],
});
