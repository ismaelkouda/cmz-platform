#!/usr/bin/env node
// X4-config, preuves 8 et 10, et politique `cmz-sw` : la coque construite par
// la preuve native, servie par le relais nginx, ouverte par son Chromium.
//   10 : Trusted Types et politique exacte en en-tête, meta présente, aucune
//        violation au chargement ;
//    8 : service worker enregistré et actif (URL et portée), aucune violation ;
//        nouveau document au rechargement ; cache conforme à la variante
//        déclarée par la conception de la coque (table fermée) ; hors ligne,
//        serveur réellement arrêté, document servi par le service worker ;
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
    get,
    relayFixture,
    stage,
    stopRelay,
    withRelay,
} from './check-nginx-relay.mjs';
import { EXTERNAL_CSP_HEADER } from './renderers/external-content-security-policy.mjs';

const READY_TIMEOUT_MS = 15_000;
// Composant routé : le premier enfant d'app-root est le router-outlet, caché.
const ROUTED = 'app-root router-outlet + *';
export const SW_CACHES_API = `
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);
    if (event.request.method !== 'GET' || !url.pathname.startsWith('/api/')) return;
    event.respondWith(fetch(event.request).then((response) => {
        const copy = response.clone();
        return caches.open(CACHE).then((cache) => cache.put(event.request, copy)).then(() => response);
    }));
});
`;
const SHELL_ENTRIES = [
    '/',
    '/icon.svg',
    '/index.html',
    '/manifest.webmanifest',
];

// Attendus par variante déclarée (session, offline_policy). Une variante
// absente de la table arrête la preuve.
export const EXPECTATIONS = {
    // Avec session : offline_policy none (X0) ; document, manifeste et icône
    // seulement, version installée ; aucun démarrage hors ligne revendiqué.
    'session:none': {
        cache: (cached) =>
            assert.deepEqual(cached, [
                ['cmz-session-static-v1', SHELL_ENTRIES],
            ]),
        offlineDeploy: 0,
        bootsOffline: false,
    },
    // Sans session : service worker de la coque, réseau d'abord ; le cache
    // garde la coque et ses ressources de même origine, jamais /api/.
    'shell:none': {
        cache: (cached, files) => {
            assert.equal(cached.length, 1);
            assert.equal(cached[0][0], 'cmz-shell-v1');
            const entries = cached[0][1];
            for (const entry of SHELL_ENTRIES)
                assert.ok(entries.includes(entry), entry);
            for (const entry of entries.filter(
                (path) => !SHELL_ENTRIES.includes(path)
            ))
                assert.ok(
                    /^\/[A-Za-z0-9_-]+(?:-[A-Za-z0-9_]+)?\.(?:js|css)$/.test(
                        entry
                    ) && files.includes(entry.slice(1)),
                    entry
                );
            for (const prefix of ['main-', 'polyfills-', 'styles-'])
                assert.ok(
                    entries.some((entry) => entry.startsWith('/' + prefix)),
                    prefix
                );
        },
        offlineDeploy: 1,
        bootsOffline: true,
    },
};

// Assertions communes, quel que soit le serveur. `server.update(index)` remplace
// index.html servi ; `server.stop()` arrête réellement le serveur.
export async function runShellBrowserChecks(
    launched,
    origin,
    server,
    { expectation, files, api }
) {
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
                .locator(ROUTED)
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
                .locator(ROUTED)
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
        // Garde de sécurité des deux variantes : la page appelle réellement le
        // relais (fetch GET, fetch POST, image GET) ; le cache ne contient
        // jamais /api/, jamais une requête autre que GET, jamais une autre
        // origine.
        await check('cache-security', async () => {
            const statuses = await page.evaluate(async (base) => {
                const image = await new Promise((done) => {
                    const element = new Image();
                    element.onload = element.onerror = () => done('image');
                    element.src = base + 'ok?image';
                });
                return [
                    (await fetch(base + 'ok')).status,
                    (await fetch(base + 'echo', { method: 'POST', body: 'x' }))
                        .status,
                    image,
                ];
            }, api);
            assert.deepEqual(statuses, [200, 200, 'image']);
            const requests = await page.evaluate(async () =>
                (
                    await Promise.all(
                        (await caches.keys()).map(async (name) =>
                            (await (await caches.open(name)).keys()).map(
                                (entry) => [entry.method, entry.url]
                            )
                        )
                    )
                ).flat()
            );
            assert.ok(requests.length > 0, 'cache vide');
            for (const [method, url] of requests) {
                assert.equal(method, 'GET', url);
                assert.equal(new URL(url).origin, origin, url);
                assert.ok(!new URL(url).pathname.startsWith('/api'), url);
            }
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
            expectation.cache(cached, files);
            await server.stop();
            const response = await page.goto(origin + '/');
            assert.equal(response?.status(), 200);
            assert.equal(
                response?.fromServiceWorker(),
                true,
                'servi par le service worker'
            );
            assert.equal(
                await page.locator('meta[name="cmz-deploy"]').count(),
                expectation.offlineDeploy
            );
            if (expectation.bootsOffline)
                await page
                    .locator(ROUTED)
                    .first()
                    .waitFor({ timeout: READY_TIMEOUT_MS });
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

// Variante déclarée d'une coque Angular : session et offline_policy, lues dans
// la conception que référence son manifeste.
export async function shellVariant(product, app) {
    const manifest = JSON.parse(
        await readFile(
            join(product, 'apps', app, '.cmz', 'app-manifest.json'),
            'utf8'
        )
    );
    if (manifest.profile !== 'angular-pwa') return null;
    const design = JSON.parse(
        await readFile(join(product, manifest.design_ref.path), 'utf8')
    );
    const experience = design.experiences.find(
        (entry) => entry.id === manifest.experience_id
    );
    assert.ok(experience, `${app} : expérience introuvable`);
    const key = `${experience.session ? 'session' : 'shell'}:${experience.offline_policy}`;
    assert.ok(EXPECTATIONS[key], `${app} : variante non qualifiée ${key}`);
    return key;
}

// Coques Angular construites avec service worker, et Chromium d'une racine de
// preuve native.
export async function fromProofRoot(root) {
    const shells = [];
    for (const product of (await readdir(root))
        .filter((name) => name.startsWith('product-'))
        .sort()) {
        const dist = join(root, product, 'dist', 'apps');
        for (const app of (await readdir(dist).catch(() => [])).sort()) {
            const build = join(dist, app, 'browser');
            const files = await readdir(build).catch(() => []);
            if (!files.includes('sw.js')) continue;
            const variant = await shellVariant(join(root, product), app);
            if (variant)
                shells.push({ app: `${product}/${app}`, build, variant });
        }
    }
    const browsers = (await readdir(join(root, 'browser'), { recursive: true }))
        .filter((path) => /(?:^|\/)chrome-headless-shell$/.test(path))
        .map((path) => join(root, 'browser', path));
    for (const variant of Object.keys(EXPECTATIONS))
        assert.ok(
            shells.some((shell) => shell.variant === variant),
            `aucune coque construite pour ${variant}`
        );
    assert.equal(browsers.length, 1, 'Chromium de la preuve introuvable');
    return { shells, browser: browsers[0] };
}

// Le relais sert-il le nouveau document ? Le partage de fichiers de Docker
// Desktop (macOS) propage une écriture avec un court délai ; sous Linux, la
// première lecture suffit. Borné : au-delà, la preuve échoue.
async function waitServed(port, expected) {
    for (let attempt = 0; attempt < 50; attempt += 1) {
        if ((await get(port, '/index.html')).body === expected) return;
        await new Promise((done) => setTimeout(done, 200));
    }
    throw new Error('nouveau document non servi par le relais');
}

export async function runRelayBrowserChecks({
    build,
    browser,
    variant,
    mutateServiceWorker = false,
}) {
    const { files, table } = await relayFixture();
    const root = await mkdtemp(join(tmpdir(), 'cmz-nginx-browser-'));
    try {
        await stage(root, files);
        await rm(join(root, 'html'), { recursive: true, force: true });
        await cp(build, join(root, 'html'), { recursive: true });
        const index = join(root, 'html', 'index.html');
        const builtFiles = await readdir(join(root, 'html'));
        // Contre-mutation : un service worker qui met /api/ en cache.
        if (mutateServiceWorker)
            await writeFile(
                join(root, 'html', 'sw.js'),
                (await readFile(join(root, 'html', 'sw.js'), 'utf8')) +
                    SW_CACHES_API
            );
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
                            update: async (change) => {
                                const next = change(
                                    await readFile(index, 'utf8')
                                );
                                await writeFile(index, next);
                                await waitServed(port, next);
                            },
                            stop: async () => stopRelay(relay),
                        },
                        {
                            expectation: EXPECTATIONS[variant],
                            files: builtFiles,
                            api: table[0].path,
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
    const { shells, browser } = await fromProofRoot(process.argv[index + 1]);
    const results = {};
    for (const shell of shells)
        for (const [name, outcome] of Object.entries(
            await runRelayBrowserChecks({ ...shell, browser })
        ))
            results[`${shell.app} ${shell.variant} ${name}`] = outcome;
    let failed = 0;
    // Contre-mutation par variante : la garde de cache devient rouge.
    let killed = 0;
    if (process.argv.includes('--mutations'))
        for (const variant of Object.keys(EXPECTATIONS)) {
            const shell = shells.find((entry) => entry.variant === variant);
            const mutated = await runRelayBrowserChecks({
                ...shell,
                browser,
                mutateServiceWorker: true,
            });
            const red = mutated['cache-security'] !== 'PASS';
            console.log(
                `${red ? 'PASS' : 'FAIL'} nginx-relay-browser/mutation sw-caches-api ${shell.app} -> cache-security ${red ? 'red' : 'still green'}`
            );
            if (red) killed += 1;
            else failed += 1;
        }
    for (const [name, outcome] of Object.entries(results)) {
        console.log(
            `${outcome === 'PASS' ? 'PASS' : 'FAIL'} nginx-relay-browser/${name}${outcome === 'PASS' ? '' : ' ' + outcome.slice(5)}`
        );
        if (outcome !== 'PASS') failed += 1;
    }
    console.log(
        `nginx-relay-browser checks=${Object.keys(results).length} failed=${failed}`
    );
    process.exitCode =
        failed || Object.keys(results).length !== 7 * shells.length ? 1 : 0;
    if (killed) console.log(`nginx-relay-browser mutations killed=${killed}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
