import { defineConfig } from '@playwright/test';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const appPort = process.env.E2E_APP_PORT ?? '4301';
const baseURL =
    process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${appPort}`;
const isCI = Boolean(process.env.CI);
const browserChannel = process.env.PLAYWRIGHT_CHANNEL
    ? { channel: process.env.PLAYWRIGHT_CHANNEL }
    : isCI
      ? {}
      : { channel: 'chrome' };

const staticCommand =
    process.env.E2E_SKIP_BUILD === '1'
        ? 'node tools/e2e-static-server.mjs'
        : 'bunx nx run workspace-react-proof:build && node tools/e2e-static-server.mjs';

export default defineConfig({
    testDir: resolve(rootDir, 'apps/workspace-react-proof/e2e'),
    testIgnore: ['**/workspace-memory-profile.spec.ts'],
    fullyParallel: false,
    forbidOnly: isCI,
    retries: 0,
    workers: 1,
    timeout: 60_000,
    expect: { timeout: 10_000 },
    outputDir: resolve(rootDir, 'test-results/workspace-react-proof'),
    reporter: isCI
        ? [
              ['list'],
              [
                  'html',
                  {
                      open: 'never',
                      outputFolder: 'playwright-report/workspace-react-proof',
                  },
              ],
          ]
        : [['list']],
    use: {
        ...browserChannel,
        baseURL,
        browserName: 'chromium',
        locale: 'fr-FR',
        reducedMotion: 'reduce',
        serviceWorkers: 'block',
        timezoneId: 'Africa/Abidjan',
        trace: 'retain-on-failure',
        video: 'off',
    },
    webServer: {
        command: staticCommand,
        cwd: rootDir,
        url: `${baseURL}/e2e-health`,
        reuseExistingServer: !isCI,
        timeout: 300_000,
        env: {
            ...process.env,
            E2E_APP_NAME: 'workspace-react-proof',
            E2E_APP_PORT: String(appPort),
        },
    },
});
