import { defineConfig } from '@playwright/test';
import baseConfig from './playwright.config.mjs';

const webServers = Array.isArray(baseConfig.webServer)
    ? baseConfig.webServer
    : [baseConfig.webServer];
if (webServers.length !== 2 || !webServers[0] || !webServers[1]) {
    throw new Error('Le profil mémoire attend le mock et le serveur SPA E2E.');
}
const appServerCommand =
    process.env.E2E_SKIP_BUILD === '1'
        ? 'node tools/e2e-static-server.mjs'
        : 'bunx nx run backoffice-angular:build:production && node tools/e2e-static-server.mjs';

/**
 * Profil Chromium explicite du workspace vivant.
 *
 * Il réutilise le mock et le navigateur du smoke, mais mesure le build de
 * production. Il isole la mesure longue des PR ordinaires. Le test reste
 * mono-worker : deux profils concurrents fausseraient leur pression mémoire.
 */
export default defineConfig({
    ...baseConfig,
    testIgnore: [],
    testMatch: ['**/workspace-memory-profile.spec.ts'],
    timeout: 300_000,
    retries: 0,
    workers: 1,
    webServer: [webServers[0], { ...webServers[1], command: appServerCommand }],
});
