import { defineConfig } from '@playwright/test';
import baseConfig from './playwright.config.mjs';

if (!baseConfig.webServer || Array.isArray(baseConfig.webServer)) {
    throw new Error(
        'Le profil mémoire React attend un serveur SPA E2E unique.'
    );
}

const appServerCommand =
    process.env.E2E_SKIP_BUILD === '1'
        ? 'node tools/e2e-static-server.mjs'
        : 'bunx nx run workspace-react-proof:build && node tools/e2e-static-server.mjs';

/**
 * Profil Chromium isolé du smoke de PR.
 *
 * La mesure utilise le build de production, un seul worker et un GC CDP
 * explicite. Elle reste volontairement propre à Chromium : elle ne prétend pas
 * mesurer le heap de Firefox ou WebKit.
 */
export default defineConfig({
    ...baseConfig,
    testIgnore: [],
    testMatch: ['**/workspace-memory-profile.spec.ts'],
    timeout: 300_000,
    retries: 0,
    workers: 1,
    webServer: { ...baseConfig.webServer, command: appServerCommand },
});
