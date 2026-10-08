import { defineConfig } from '@playwright/test';
import baseConfig from './playwright.config.mjs';

if (!baseConfig.webServer || Array.isArray(baseConfig.webServer)) {
    throw new Error(
        'Le profil mémoire C5 React attend un serveur SPA E2E unique.'
    );
}

const appServerCommand =
    process.env.E2E_SKIP_BUILD === '1'
        ? 'node tools/e2e-static-server.mjs'
        : 'bunx nx run users-management-react-proof:build && node tools/e2e-static-server.mjs';

export default defineConfig({
    ...baseConfig,
    testIgnore: [],
    testMatch: ['**/users-management-memory-profile.spec.ts'],
    timeout: 300_000,
    retries: 0,
    workers: 1,
    webServer: { ...baseConfig.webServer, command: appServerCommand },
});
