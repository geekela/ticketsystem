import { defineConfig, devices } from "@playwright/test";

// The suite starts its own backend and frontend on separate ports, so it never
// talks to a `pnpm dev` session that may be running with a real API key.
const BACKEND_PORT = 8100;
const FRONTEND_PORT = 5174;

// E2E_LIVE=1 keeps the API key from backend/.env so Claude classifies (costs a
// little). Otherwise the key is blanked and the backend uses keyword matching,
// which is deterministic and free.
const LIVE = process.env.E2E_LIVE === "1";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  // A live Claude call can take several seconds.
  timeout: LIVE ? 90_000 : 30_000,
  expect: { timeout: LIVE ? 45_000 : 5_000 },
  use: {
    baseURL: `http://127.0.0.1:${FRONTEND_PORT}`,
    trace: "on-first-retry",
    // SLOW_MO=500 pauses that many ms between actions, to watch a --headed run.
    launchOptions: { slowMo: Number(process.env.SLOW_MO ?? 0) },
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: `uv run fastapi run main.py --host 127.0.0.1 --port ${BACKEND_PORT}`,
      cwd: "backend",
      url: `http://127.0.0.1:${BACKEND_PORT}/health`,
      // Variables already in the environment win over backend/.env.
      env: LIVE ? { ANALYZER: "anthropic" } : { ANALYZER: "anthropic", ANTHROPIC_API_KEY: "" },
      reuseExistingServer: false,
      timeout: 60_000,
    },
    {
      command: `pnpm exec vite --host 127.0.0.1 --port ${FRONTEND_PORT}`,
      cwd: "frontend",
      url: `http://127.0.0.1:${FRONTEND_PORT}`,
      env: { API_TARGET: `http://127.0.0.1:${BACKEND_PORT}` },
      reuseExistingServer: false,
      timeout: 60_000,
    },
  ],
});
