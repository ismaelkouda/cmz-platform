// X4 : réalisation de la page Connexion dans une coque avec session dont la
// commande, le plan et la composition sont publiés (X0 à X3). Le bon de travail
// puis la page réalisée sont publiés sous plan ; le compilateur, le build, le
// lint et les tests du produit décident. Deux violations des règles de sécurité
// et une spec rouge sont refusées sans écriture ; la page est ouverte dans le
// navigateur sans adresse de service : aucune requête n'est émise.
import assert from 'node:assert/strict';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { relative, resolve } from 'node:path';

import {
    pathExists,
    verifyGeneratedTree,
} from '../core/external-application-paths.mjs';
import {
    planExternalPageRealization,
    planExternalPageRealizationWorkOrder,
    publishExternalPageRealization,
    publishExternalPageRealizationWorkOrder,
    workOrderPath,
} from '../core/external-page-realization.mjs';
import { sha256 } from '../core/generation-manifest.mjs';
import { EXTERNAL_WORKSPACE_CMZ as CMZ } from '../renderers/application-workspace-renderer.mjs';
import {
    hash,
    snapshotTree,
    TOOLS_ROOT,
} from '../test-support/external-application-fixture.mjs';
import { assertProductOnlyImports } from '../test-support/external-publication-fixture.mjs';
import { connexionRealizationFiles } from '../test-support/external-realization-fixture.mjs';
import {
    confinedNode,
    record,
    targetArguments,
} from './external-application-runtime.mjs';
import { nativePublicationRunner } from './external-publication-native.mjs';

async function writeDraft(root, workOrder, files) {
    const draft = resolve(root, workOrder.draft_root);
    await rm(draft, { recursive: true, force: true });
    await mkdir(draft, { recursive: true });
    for (const [name, content] of Object.entries(files))
        await writeFile(resolve(draft, name), content);
}

async function publishNative(session, label, root, plan, publish, options) {
    const { run, labels } = nativePublicationRunner(session, label, root);
    const result = await publish(
        { ...options, expectedPlanId: plan.plan_id },
        { run }
    );
    assert.equal(result.replayed, false);
    assert.equal(labels.length, 5);
    await verifyGeneratedTree(plan.outputAbsolute, plan.files);
}

// Violation d'une règle de sécurité : refusée avant toute publication.
async function refused(session, label, root, options, files, pattern) {
    const before = await snapshotTree(root, ['descriptions', 'node_modules']);
    await assert.rejects(planExternalPageRealization(options), (error) => {
        assert.ok(
            error.violations?.some((violation) => pattern.test(violation)),
            label
        );
        return true;
    });
    assert.deepEqual(
        await snapshotTree(root, ['descriptions', 'node_modules']),
        before
    );
    session.lines.push(`PASS ${label}`);
    return files;
}

export async function proveNativePageRealization(session, shell) {
    const root = shell.input.root;
    const domain = shell.input.domain;
    const appName = shell.plan.app_name;
    const options = {
        workspaceRoot: TOOLS_ROOT,
        targetRoot: root,
        appName,
        pageId: shell.input.entryPage.id,
    };
    const label = `X4/${domain}`;
    const prepared = await planExternalPageRealizationWorkOrder(options);
    await publishNative(
        session,
        `${label}/work-order`,
        root,
        prepared,
        publishExternalPageRealizationWorkOrder,
        options
    );
    const app = resolve(root, 'apps', appName);
    const workOrder = JSON.parse(
        await readFile(resolve(app, workOrderPath(options.pageId)), 'utf8')
    );
    const contract = await readFile(resolve(app, workOrder.page_contract.path));
    const files = connexionRealizationFiles({
        pageContract: JSON.parse(contract),
        contractSha256: sha256(contract),
        composition: workOrder.composition.module,
    });
    // Règles de sécurité : réseau direct et commande importée sans composition.
    const page = 'page.component.ts';
    await writeDraft(root, workOrder, {
        ...files,
        [page]: `${files[page]}\nvoid fetch('/x');\n`,
    });
    await refused(
        session,
        `${label}/refused-direct-network`,
        root,
        options,
        files,
        /^direct network access forbidden in page\.component\.ts/
    );
    await writeDraft(root, workOrder, {
        ...files,
        [page]: `import '../../generated/actions/${domain}-enter/src/index';\n${files[page]}`,
    });
    await refused(
        session,
        `${label}/refused-direct-command`,
        root,
        options,
        files,
        /^import not allowed by the work order/
    );
    // Spec rouge : les règles passent, le test du produit refuse ; la
    // publication revient à l'état relu.
    const spec = 'page.component.spec.ts';
    const red = files[spec].replace(
        'expect(input.required).toBe(true);',
        'expect(input.required).toBe(false);'
    );
    assert.notEqual(red, files[spec], 'Mutation de spec sans effet');
    await writeDraft(root, workOrder, { ...files, [spec]: red });
    const before = await snapshotTree(app, ['node_modules']);
    const failing = await planExternalPageRealization(options);
    await assert.rejects(
        publishExternalPageRealization(
            { ...options, expectedPlanId: failing.plan_id },
            {
                run: (command, args, cwd) => {
                    assert.equal(cwd, root);
                    const name = args[0].endsWith('check-workspace.mjs')
                        ? 'workspace-contract'
                        : args[1] === 'run'
                          ? args[2]
                          : 'native-compiler';
                    const result = confinedNode(session, root, args);
                    if (name !== `${appName}:test`) {
                        record(session, `${label}/red-spec/${name}`, result);
                        return;
                    }
                    record(session, `${label}/red-spec/${name}`, result, {
                        negative: true,
                    });
                    throw new Error('product test refused the page');
                },
            }
        ),
        /product test refused the page/
    );
    assert.deepEqual(await snapshotTree(app, ['node_modules']), before);
    session.lines.push(`PASS ${label}/red-spec-rolled-back`);
    // Réalisation exacte : publiée à la place de la page d'attente.
    await writeDraft(root, workOrder, files);
    const plan = await planExternalPageRealization(options);
    await publishNative(
        session,
        `${label}/page`,
        root,
        plan,
        publishExternalPageRealization,
        options
    );
    const manifest = JSON.parse(plan.files['.cmz/app-manifest.json']);
    assert.equal(
        plan.changes.find(({ path }) => path.endsWith('/page.component.ts'))
            .change,
        'replaced'
    );
    assertProductOnlyImports(
        Object.fromEntries(
            plan.changes.map(({ path }) => [path, plan.files[path]])
        ),
        new Set(manifest.generated_files.map((entry) => entry.path))
    );
    session.lines.push(`PASS ${label}/product-only-imports`);
    const replay = await publishExternalPageRealization(
        { ...options, expectedPlanId: plan.plan_id },
        { run: () => assert.fail('Republication') }
    );
    assert.equal(replay.replayed, true);
    session.lines.push(
        `${label} page_id=${options.pageId} work_order_id=${workOrder.work_order_id} plan_id=${plan.plan_id} files=${plan.changes.length} manifest_sha256=${plan.manifest_sha256}`
    );
    await session.save();
    return { plan, page: JSON.parse(contract).page };
}

function realizationBrowserScript() {
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
    const writes = [];
    await context.route('**/*', (route) => {
        const request = route.request();
        if (new URL(request.url()).origin !== origin) {
            external.push(true);
            return route.abort();
        }
        if (request.method() !== 'GET') writes.push(request.method());
        return route.continue();
    });
    const page = await context.newPage();
    await page.goto(origin + fixture.entryPath);
    await page.getByRole('heading', { name: fixture.entryTitle, exact: true }).waitFor();
    assert.equal(await page.getByText(fixture.placeholder).count(), 0, 'La page d’attente doit être remplacée');
    await page.locator('[data-cmz-id="' + fixture.readyState + '"]').waitFor();
    for (const control of fixture.controls)
        await page.getByLabel(control.label, { exact: true }).fill('valeur-' + control.id);
    await page.getByRole('button', { name: fixture.actionLabel, exact: true }).click();
    await page.locator('[data-cmz-id="' + fixture.errorState + '"]').waitFor();
    await page.waitForLoadState('networkidle');
    assert.deepEqual(external, [], 'Requête extérieure interdite');
    assert.deepEqual(writes, [], 'Aucune requête d’envoi sans adresse de service');
    process.stdout.write('Navigateur : page réalisée, envoi sans adresse refusé sans requête.\\n');
} finally {
    if (browser) await browser.close();
    await new Promise((done, reject) => server.close((error) => error ? reject(error) : done()));
}
`;
}

// Page réalisée ouverte dans le navigateur : titre, champs étiquetés, page
// d'attente absente, et envoi sans adresse de service passé à l'état d'erreur
// du contrat sans aucune requête.
export async function qualifyRealizationBrowser(session, shells, browser) {
    const browserRelative = relative(browser.root, browser.executable)
        .split('\\')
        .join('/');
    for (const { input, plan, page } of shells) {
        const product = input.root;
        const domain = input.domain;
        const proof = resolve(product, CMZ.proof);
        assert.equal(await pathExists(proof), false);
        const [action] = page.actions.filter(
            (entry) => entry.kind === 'backend'
        );
        const fixture = {
            entryPath: input.entryPage.path,
            entryTitle: input.entryPage.title,
            placeholder:
                'Cette page doit être réalisée depuis son contrat validé.',
            readyState: page.initial_state_id,
            errorState: action.error_state_id,
            actionLabel: action.label,
            controls: page.controls.map(({ id, label }) => ({ id, label })),
        };
        const files = {
            'realization-browser.fixture.json': JSON.stringify(fixture),
            'realization-browser.mjs': realizationBrowserScript(),
        };
        await mkdir(proof);
        try {
            for (const [path, content] of Object.entries(files)) {
                await writeFile(resolve(proof, path), content, { flag: 'wx' });
                session.lines.push(
                    `instrumentation=X4/${domain}/${path} sha256=${hash(content)}`
                );
            }
            record(
                session,
                `X4/${domain}/browser-build`,
                confinedNode(
                    session,
                    product,
                    targetArguments(plan, 'build:production')
                )
            );
            record(
                session,
                `X4/${domain}/browser-realized-page`,
                confinedNode(
                    session,
                    product,
                    [
                        `${CMZ.proof}/realization-browser.mjs`,
                        resolve(product, 'dist', plan.output, 'browser'),
                        `{{readonly:0}}/${browserRelative}`,
                        resolve(proof, 'realization-browser.fixture.json'),
                    ],
                    { browser, timeoutMs: 120_000 }
                )
            );
        } finally {
            await verifyGeneratedTree(proof, files);
            await rm(proof, { recursive: true });
        }
        await verifyGeneratedTree(plan.outputAbsolute, plan.files);
    }
}
