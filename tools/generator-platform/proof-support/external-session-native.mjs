// X0 (lot produit extérieur) : coque Angular avec session créée en extérieur,
// puis compilée, construite, lintée, testée et ouverte dans le navigateur avec
// les seuls outils installés dans chaque produit. Données entièrement fictives ;
// aucune page métier, aucun appel backend, aucune parité React revendiquée.
import assert from 'node:assert/strict';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { relative, resolve } from 'node:path';

import {
    planExternalApplicationShell,
    publishExternalApplicationShell,
} from '../core/application-workspace.mjs';
import {
    pathExists,
    verifyGeneratedTree,
} from '../core/external-application-paths.mjs';
import { EXTERNAL_WORKSPACE_CMZ as CMZ } from '../renderers/application-workspace-renderer.mjs';
import {
    hash,
    snapshotTree,
} from '../test-support/external-application-fixture.mjs';
import { runDocumentCli } from '../test-support/external-document-fixture.mjs';
import {
    CMZ_MODULE_SPECIFIER,
    createAppArguments,
    sessionShellOptions,
    writeExternalSessionDesign,
} from '../test-support/external-session-fixture.mjs';
import { fileMutation } from './external-application-checks.mjs';
import {
    confinedNode,
    record,
    targetArguments,
} from './external-application-runtime.mjs';

export async function publishNativeSessionShell(session, root, domain) {
    const input = await writeExternalSessionDesign(root, domain);
    const options = sessionShellOptions(input);
    const plan = await planExternalApplicationShell(options);
    const preview = record(
        session,
        `X0/${domain}/create-app-dry-run`,
        runDocumentCli('create-app', [
            ...createAppArguments(options),
            '--dry-run',
        ])
    );
    assert.equal(JSON.parse(preview.stdout).plan_id, plan.plan_id);
    const before = await snapshotTree(root);
    record(
        session,
        `X0/${domain}/react-spa-refused`,
        runDocumentCli('create-app', [
            ...createAppArguments(sessionShellOptions(input, 'react-spa')),
            '--dry-run',
        ]),
        { negative: true, diagnostic: /Création extérieure refusée/ }
    );
    assert.deepEqual(await snapshotTree(root), before);
    const labels = [];
    const run = (command, args, cwd) => {
        assert.equal(command, process.execPath);
        assert.equal(cwd, root);
        const label = args[0].endsWith('check-workspace.mjs')
            ? 'workspace-contract'
            : args[1] === 'run'
              ? args[2]
              : 'native-compiler';
        record(
            session,
            `X0/${domain}/${label}`,
            confinedNode(session, root, args)
        );
        labels.push(label);
    };
    const result = await publishExternalApplicationShell(
        { ...options, expectedPlanId: plan.plan_id },
        { run }
    );
    assert.equal(result.recovered, false);
    assert.deepEqual(labels, [
        'native-compiler',
        `${plan.app_name}:build:production`,
        `${plan.app_name}:lint`,
        `${plan.app_name}:test`,
        'workspace-contract',
    ]);
    await verifyGeneratedTree(plan.outputAbsolute, plan.files);
    assert.doesNotMatch(
        Object.entries(plan.files)
            .filter(([path]) => path.endsWith('.ts'))
            .map(([, content]) => content)
            .join('\n'),
        CMZ_MODULE_SPECIFIER
    );
    session.lines.push(
        `X0/${domain} app=${plan.app_name} plan_id=${plan.plan_id} tree_sha256=${plan.tree_sha256}`
    );
    await session.save();
    return { input, plan };
}

function sessionBrowserScript() {
    return `import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve } from 'node:path';
import { chromium } from '@playwright/test';

const [buildPath, browserPath, fixturePath] = process.argv.slice(2);
assert.ok(buildPath && browserPath && fixturePath, 'Arguments de preuve requis');
const fixture = JSON.parse(await readFile(fixturePath, 'utf8'));
const root = resolve(buildPath);
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json', '.webmanifest': 'application/manifest+json' };
const server = createServer(async (request, response) => {
    try {
        const path = resolve(root, '.' + new URL(request.url ?? '/', 'http://localhost').pathname);
        assert.ok(path === root || path.startsWith(root + '/'));
        let bytes;
        let extension = extname(path);
        try { bytes = await readFile(path); }
        catch { bytes = await readFile(resolve(root, 'index.html')); extension = '.html'; }
        response.writeHead(200, { 'content-type': types[extension] ?? 'application/octet-stream' });
        response.end(bytes);
    } catch { response.writeHead(400); response.end(); }
});
await new Promise((done) => server.listen(0, '127.0.0.1', done));
const address = server.address();
assert.ok(address && typeof address === 'object');
const origin = 'http://127.0.0.1:' + address.port;
let browser;
try {
    browser = await chromium.launch({ executablePath: browserPath, headless: true });
    const context = await browser.newContext({ serviceWorkers: 'block' });
    await context.addInitScript(() => {
        Reflect.deleteProperty(globalThis.Navigator.prototype, 'serviceWorker');
    });
    const external = [];
    await context.route('**/*', (route) => {
        if (new URL(route.request().url()).origin !== origin) {
            external.push(true);
            return route.abort();
        }
        return route.continue();
    });
    const page = await context.newPage();
    const heading = (name) => page.getByRole('heading', { name, exact: true });
    await page.goto(origin + fixture.entryPath);
    await heading(fixture.entryTitle).waitFor();
    assert.equal(await page.title(), fixture.title);
    for (const path of [fixture.landingPath, fixture.unknownPath]) {
        await page.goto(origin + path);
        await page.waitForLoadState('networkidle');
        assert.equal(await heading(fixture.landingTitle).count(), 0, 'La garde doit refuser');
        await heading(fixture.entryTitle).waitFor();
        assert.equal(new URL(page.url()).pathname, fixture.entryPath, 'Redirection attendue vers la connexion');
    }
    assert.deepEqual(external, [], 'Requête extérieure interdite');
    process.stdout.write('Navigateur : session absente, garde et redirection vérifiées.\\n');
} finally {
    if (browser) await browser.close();
    await new Promise((done, reject) => server.close((error) => error ? reject(error) : done()));
}
`;
}

export async function qualifySessionBrowser(session, shells, browser) {
    // Le Node du rendu est le même pour tous les produits ; qualifyBrowser l'a
    // déjà qualifié et enregistré une fois pour cette preuve.
    assert.ok(
        session.lines.some((line) => line.startsWith('renderer_node=')),
        'Node du rendu non qualifié avant l’oracle de session'
    );
    const browserRelative = relative(browser.root, browser.executable)
        .split('\\')
        .join('/');
    for (const { input, plan } of shells) {
        const product = input.root;
        const domain = input.domain;
        const proof = resolve(product, CMZ.proof);
        assert.equal(await pathExists(proof), false);
        const fixture = {
            title: input.design.design.title,
            entryPath: input.entryPage.path,
            entryTitle: input.entryPage.title,
            landingPath: input.landingPage.path,
            landingTitle: input.landingPage.title,
            unknownPath: '/x0-route-absente',
        };
        assert.equal(input.reconnectPage.id, input.entryPage.id);
        const files = {
            'session-browser.fixture.json': JSON.stringify(fixture),
            'session-browser.mjs': sessionBrowserScript(),
        };
        await mkdir(proof);
        try {
            for (const [path, content] of Object.entries(files)) {
                await writeFile(resolve(proof, path), content, { flag: 'wx' });
                session.lines.push(
                    `instrumentation=X0/${domain}/${path} sha256=${hash(content)}`
                );
            }
            const build = () =>
                record(
                    session,
                    `X0/${domain}/browser-build`,
                    confinedNode(
                        session,
                        product,
                        targetArguments(plan, 'build:production')
                    )
                );
            const smoke = () =>
                confinedNode(
                    session,
                    product,
                    [
                        `${CMZ.proof}/session-browser.mjs`,
                        resolve(product, 'dist', plan.output, 'browser'),
                        `{{readonly:0}}/${browserRelative}`,
                        resolve(proof, 'session-browser.fixture.json'),
                    ],
                    { browser, timeoutMs: 120_000 }
                );
            build();
            record(session, `X0/${domain}/browser-guard-redirect`, smoke());
            await fileMutation(
                session,
                product,
                `${plan.output}/src/app/app.routes.ts`,
                (value) =>
                    value.replace(
                        /canActivate:\s*\[applicationSessionGuard\],?/g,
                        ''
                    ),
                () => {
                    build();
                    return smoke();
                },
                /La garde doit refuser/
            );
        } finally {
            // Instrumentation retirée seulement si ses octets sont exacts.
            await verifyGeneratedTree(proof, files);
            await rm(proof, { recursive: true });
        }
        await verifyGeneratedTree(plan.outputAbsolute, plan.files);
    }
}
