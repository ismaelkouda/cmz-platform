/**
 * Playwright config — e2e app (T12-6 / ADR-0008).
 *
 * Stack :
 * - mock-server (port MOCK_PORT, /health)
 * - build:development puis e2e-static-server (SPA + /api proxy) — pas de watchers
 * - Chrome system (local) ou Chromium Playwright (CI après install)
 *
 *   bunx nx run backoffice-angular:e2e
 *   bun run e2e
 */
import { defineConfig, devices } from '@playwright/test';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:4200';
const mockPort = process.env.MOCK_PORT ?? '3333';
const appPort = process.env.E2E_APP_PORT ?? '4200';
const isCI = Boolean(process.env.CI);

const browserChannel = process.env.PLAYWRIGHT_CHANNEL
    ? { channel: process.env.PLAYWRIGHT_CHANNEL }
    : isCI
      ? {}
      : { channel: 'chrome' };

/** Build + static : skip build if E2E_SKIP_BUILD=1 (dist déjà chaud). */
const staticCommand =
    process.env.E2E_SKIP_BUILD === '1'
        ? 'node tools/e2e-static-server.mjs'
        : 'bunx nx run backoffice-angular:build:development && node tools/e2e-static-server.mjs';

export default defineConfig({
    testDir: resolve(rootDir, 'apps/backoffice-angular/e2e'),
    fullyParallel: false,
    forbidOnly: isCI,
    retries: isCI ? 1 : 0,
    workers: 1,
    timeout: 60_000,
    expect: { timeout: 15_000 },
    reporter: isCI
        ? [
              ['list'],
              ['html', { open: 'never', outputFolder: 'playwright-report' }],
          ]
        : [['list']],
    outputDir: resolve(rootDir, 'test-results'),
    use: {
        baseURL,
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
        video: 'off',
        locale: 'fr-FR',
    },
    projects: [
        {
            name: 'chromium',
            use: {
                ...devices['Desktop Chrome'],
                ...browserChannel,
            },
        },
    ],
    webServer: [
        {
            command: 'node tools/mock-server.mjs',
            cwd: rootDir,
            url: `http://127.0.0.1:${mockPort}/health`,
            reuseExistingServer: !isCI,
            timeout: 30_000,
            env: {
                ...process.env,
                MOCK_PORT: String(mockPort),
            },
        },
        {
            command: staticCommand,
            cwd: rootDir,
            url: `http://127.0.0.1:${appPort}/e2e-health`,
            reuseExistingServer: !isCI,
            timeout: 300_000,
            env: {
                ...process.env,
                MOCK_PORT: String(mockPort),
                E2E_APP_PORT: String(appPort),
            },
        },
    ],
});
