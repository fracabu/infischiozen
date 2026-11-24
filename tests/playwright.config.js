/**
 * @module tests/playwright.config
 * Playwright configuration for the browser tests (*.spec.js). Vitest runs
 * only the *.test.js files.
 *
 * The tests run against a test instance, never against the real data: API
 * and web start on their own ports, with a new empty PGlite folder for each
 * run. DATABASE_URL is the .env.example placeholder, so the server stays in
 * local mode even when .env.local holds a real Neon connection string.
 */
import { tmpdir } from 'node:os'
import path from 'node:path'
import { defineConfig } from '@playwright/test'

const API_PORT = 3098
const WEB_PORT = 5174
const PLACEHOLDER_URL = 'postgresql://utente:password@host/database'

// A new path for each run. The server creates the folder (scripts/_db.mjs).
// Workers load this file again and get another path, but only the runner
// starts the servers.
const DATA_DIR = path.join(tmpdir(), `infischiozen-e2e-${Date.now()}`)

const serverEnvironment = {
  CARTELLA_DATI: DATA_DIR,
  PORTA_API: String(API_PORT),
  PORTA_WEB: String(WEB_PORT),
  DATABASE_URL: PLACEHOLDER_URL,
}

export default defineConfig({
  testDir: '.',
  testMatch: '**/*.spec.js',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  use: {
    baseURL: `http://localhost:${WEB_PORT}`,
    trace: 'on-first-retry',
  },
  webServer: [
    {
      command: 'npm run api',
      cwd: '..',
      url: `http://127.0.0.1:${API_PORT}/api/clienti`,
      env: serverEnvironment,
      reuseExistingServer: false,
    },
    // The built bundle, not the dev server: on a cold start the dev server
    // compiles each module on the first request, and parallel tests timed out.
    // vite preview forwards /api like the dev server (preview.proxy).
    {
      command: `npm run build && npm run preview -- --port ${WEB_PORT} --strictPort`,
      cwd: '..',
      url: `http://localhost:${WEB_PORT}`,
      env: serverEnvironment,
      timeout: 120_000,
      reuseExistingServer: false,
    },
  ],
})
