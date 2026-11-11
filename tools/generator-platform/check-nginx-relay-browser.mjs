#!/usr/bin/env node
// X4-config, preuves 8 et 10, et politique `cmz-sw` : la coque construite par
// la preuve native, servie par le relais nginx, ouverte par son Chromium.
//   10 : Trusted Types et politique exacte en en-tête, meta présente, aucune
//        violation au chargement ;
//    8 : service worker enregistré et actif (URL et portée), aucune violation ;
//        nouveau document au rechargement ; hors ligne, serveur réellement
//        arrêté : le document installé, servi par le service worker. Une
//        expérience avec session est en offline_policy none : son cache ne
//        contient que le document, le manifeste et l'icône, aucun bundle ni
//        /api/, et aucun fonctionnement hors ligne n'est revendiqué ;
//   cmz-sw : seconde création refusée, nom hors liste refusé ; innerHTML et
//        new Worker par chaîne toujours bloqués.
// Usage : --browser-proof-root <racine d'une preuve native>.
import assert from 'node:assert/strict';
import {
    cp,
    mkdtemp,
    readdir,
    readFile,
    rm,
    writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
    relayFixture,
    stage,
    stopRelay,
    withRelay,
} from './check-nginx-relay.mjs';
import { EXTERNAL_CSP_HEADER } from './renderers/external-content-security-policy.mjs';

const READY_TIMEOUT_MS = 15_000;

// Assertions communes, quel que soit le serveur. `server.update(index)` remplace
// index.html servi ; `server.stop()` arrête réellement le serveur.
export async function runShellBrowserChecks(launched, origin, server) {
    const results = {};
    const check = async (name, run) => {
        try {
            await run();
            results[name] = 'PASS';
        } catch (error) {
            results[name] = `FAIL ${String(error.message).split('\n')[0]}`;
        }
    };
    const context = await launched.newContext();
    await context.addInitScript(() => {
        const violations = [];
        Object.defineProperty(globalThis, '__cmzViolations', {
            value: violations,
        });
        document.addEventListener('securitypolicyviolation', (event) =>
            violations.push(`${event.effectiveDirective} ${event.sample}`)
        );
    });
    const page = await context.newPage();
    const violations = () => page.evaluate(() => globalThis.__cmzViolations);
    try {
        await check('10-trusted-types-on-nginx', async () => {
            const response = await page.goto(origin + '/');
            assert.equal(response.status(), 200);
            assert.equal(
                response.headers()['content-security-policy'],
                EXTERNAL_CSP_HEADER
            );
            assert.equal(
                await page
                    .locator('meta[http-equiv="Content-Security-Policy"]')
                    .count(),
                1
            );
            await page
                .locator('app-root *')
                .first()
                .waitFor({ timeout: READY_TIMEOUT_MS });
            assert.deepEqual(await violations(), []);
        });
        await check('8-service-worker-registered', async () => {
            const registration = await page.evaluate(
                (timeout) =>
                    Promise.race([
                        navigator.serviceWorker.ready.then((ready) => ({
                            scope: ready.scope,
                            script: ready.active?.scriptURL,
                        })),
                        new Promise((done) =>
                            setTimeout(() => done('timeout'), timeout)
                        ),
                    ]),
                READY_TIMEOUT_MS
            );
            assert.deepEqual(registration, {
                scope: origin + '/',
                script: origin + '/sw.js',
            });
            assert.deepEqual(await violations(), []);
        });
        await check('8-reload-new-document', async () => {
            await server.update((index) =>
                index.replace(
                    '</head>',
                    '<meta name="cmz-deploy" content="2"></head>'
                )
            );
            await page.reload();
            await page
                .locator('app-root *')
                .first()
                .waitFor({ timeout: READY_TIMEOUT_MS });
            assert.equal(
                await page.locator('meta[name="cmz-deploy"]').count(),
                1
            );
            assert.equal(
                await page.evaluate(() =>
                    Boolean(navigator.serviceWorker.controller)
                ),
                true
            );
            assert.deepEqual(await violations(), []);
        });
        await check('cmz-sw-policy-closed', async () => {
            const outcome = await page.evaluate(() => {
                const attempt = (name) => {
                    try {
                        globalThis.trustedTypes.createPolicy(name, {});
                        return 'created';
                    } catch (error) {
                        return error.name;
                    }
                };
                return {
                    duplicate: attempt('cmz-sw'),
                    unlisted: attempt('cmz-other'),
                };
            });
            assert.deepEqual(outcome, {
                duplicate: 'TypeError',
                unlisted: 'TypeError',
            });
        });
        await check('sinks-still-blocked', async () => {
            const outcome = await page.evaluate(() => {
                const blocked = (run) => {
                    try {
                        run();
                        return 'allowed';
                    } catch (error) {
                        return error.name;
                    }
                };
                return {
                    innerHTML: blocked(() => {
                        document.createElement('div').innerHTML = '<b>x</b>';
                    }),
                    worker: blocked(() => new Worker('/sw.js')),
                };
            });
            assert.deepEqual(outcome, {
                innerHTML: 'TypeError',
                worker: 'TypeError',
            });
        });
        await check('8-offline-document', async () => {
            const cached = await page.evaluate(async () =>
                Promise.all(
                    (await caches.keys()).map(async (name) => [
                        name,
                        (await (await caches.open(name)).keys())
                            .map((entry) => new URL(entry.url).pathname)
                            .sort(),
                    ])
                )
            );
            assert.deepEqual(cached, [
                [
                    'cmz-session-static-v1',
                    ['/', '/icon.svg', '/index.html', '/manifest.webmanifest'],
                ],
            ]);
            await server.stop();
            const response = await page.goto(origin + '/');
            assert.equal(response?.status(), 200);
            assert.equal(
                response?.fromServiceWorker(),
                true,
                'servi par le service worker'
            );
            // Version installée : le cache n'est pas réécrit au rechargement.
            assert.equal(
                await page.locator('meta[name="cmz-deploy"]').count(),
                0
            );
            assert.equal(
                await page
                    .locator('meta[http-equiv="Content-Security-Policy"]')
                    .count(),
                1
            );
        });
    } finally {
        await context.close();
    }
    return results;
}

// Coque avec session construite et Chromium d'une racine de preuve native.
export async function fromProofRoot(root) {
    const builds = [];
    for (const product of (await readdir(root))
        .filter((name) => name.startsWith('product-'))
        .sort()) {
        const apps = join(root, product, 'dist', 'apps');
        for (const app of (await readdir(apps).catch(() => []))
            .filter((name) => name.startsWith('session-'))
            .sort())
            builds.push(join(apps, app, 'browser'));
    }
    const browsers = (await readdir(join(root, 'browser'), { recursive: true }))
        .filter((path) => /(?:^|\/)chrome-headless-shell$/.test(path))
        .map((path) => join(root, 'browser', path));
    assert.ok(builds.length > 0, 'coque avec session construite introuvable');
    assert.equal(browsers.length, 1, 'Chromium de la preuve introuvable');
    return { build: builds[0], browser: browsers[0] };
}

export async function runRelayBrowserChecks({ build, browser }) {
    const { files, table } = await relayFixture();
    const root = await mkdtemp(join(tmpdir(), 'cmz-nginx-browser-'));
    try {
        await stage(root, files);
        await rm(join(root, 'html'), { recursive: true, force: true });
        await cp(build, join(root, 'html'), { recursive: true });
        const index = join(root, 'html', 'index.html');
        return await withRelay(
            root,
            table[0].variable,
            'http://svc:8000/',
            async (port, _network, relay) => {
                const { chromium } = await import('@playwright/test');
                const launched = await chromium.launch({
                    executablePath: browser,
                    headless: true,
                });
                try {
                    return await runShellBrowserChecks(
                        launched,
                        `http://127.0.0.1:${port}`,
                        {
                            update: async (change) =>
                                writeFile(
                                    index,
                                    change(await readFile(index, 'utf8'))
                                ),
                            stop: async () => stopRelay(relay),
                        }
                    );
                } finally {
                    await launched.close();
                }
            }
        );
    } finally {
        await rm(root, { recursive: true, force: true });
    }
}

async function main() {
    const index = process.argv.indexOf('--browser-proof-root');
    assert.ok(
        index > 0 && process.argv[index + 1],
        'usage : --browser-proof-root <racine>'
    );
    const results = await runRelayBrowserChecks(
        await fromProofRoot(process.argv[index + 1])
    );
    let failed = 0;
    for (const [name, outcome] of Object.entries(results)) {
        console.log(
            `${outcome === 'PASS' ? 'PASS' : 'FAIL'} nginx-relay-browser/${name}${outcome === 'PASS' ? '' : ' ' + outcome.slice(5)}`
        );
        if (outcome !== 'PASS') failed += 1;
    }
    console.log(
        `nginx-relay-browser checks=${Object.keys(results).length} failed=${failed}`
    );
    process.exitCode = failed || Object.keys(results).length !== 6 ? 1 : 0;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
