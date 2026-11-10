// X2 : `generate:action-request --target-root`, commande 2.1 Angular publiée
// sous plan dans une application extérieure (ADR-0103). Le runner injecté ne
// compile rien : la chaîne native est prouvée par
// check:external-application-shells.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { pathToFileURL } from 'node:url';

import {
    planExternalApplicationShell,
    publishExternalApplicationShell,
} from './core/application-workspace.mjs';
import {
    actionOutputRoot,
    planExternalActionRequest,
    publicExternalActionRequestPlan,
    publishExternalActionRequest,
} from './core/external-action-request.mjs';
import {
    planApplicationPublication,
    publishApplicationPublication,
} from './core/application-publication.mjs';
import { verifyGeneratedTree } from './core/external-application-paths.mjs';
import {
    shellFixture,
    snapshotTree,
    TOOLS_ROOT,
} from './test-support/external-application-fixture.mjs';
import {
    assertProductOnlyImports,
    readManifest,
    sessionApp,
} from './test-support/external-publication-fixture.mjs';
import {
    SESSION_FIXTURE_DOMAINS,
    writeExternalActionDefinitions,
} from './test-support/external-session-fixture.mjs';

const CLI = join(
    TOOLS_ROOT,
    'tools/generator-platform/generate-action-request.mjs'
);
const native = () => ({ run: () => undefined });

async function actionProduct(t, domain) {
    const product = await sessionApp(t, domain);
    const { enter, definitions } = await writeExternalActionDefinitions(
        product.root,
        domain
    );
    return {
        ...product,
        definitions,
        options: { ...product.base, definitionPath: enter },
    };
}

function cli(args) {
    return spawnSync(process.execPath, [CLI, ...args], {
        cwd: TOOLS_ROOT,
        encoding: 'utf8',
        timeout: 120_000,
    });
}

test('X2 : commande de connexion publiée sous plan sur deux produits fictifs', async (t) => {
    for (const domain of SESSION_FIXTURE_DOMAINS) {
        const product = await actionProduct(t, domain);
        const workshop = await snapshotTree(TOOLS_ROOT);
        const plan = await planExternalActionRequest(product.options);
        const visible = publicExternalActionRequestPlan(plan);
        assert.equal(visible.action_id, `${domain}-enter`);
        assert.deepEqual(
            visible.inputs.map(({ path }) => path),
            [
                product.options.definitionPath,
                `descriptions/session-${domain}/backend.json`,
                `descriptions/session-${domain}/declared.json`,
            ].sort()
        );
        const base = actionOutputRoot(plan.action_id);
        assert.ok(
            plan.changes.every(({ path }) => path.startsWith(`${base}/`))
        );
        assert.ok(plan.changes.every(({ change }) => change === 'added'));
        const labels = [];
        const result = await publishExternalActionRequest(
            { ...product.options, expectedPlanId: plan.plan_id },
            {
                run: (command, args) =>
                    labels.push(
                        args[1] === 'run'
                            ? args[2]
                            : args[0].endsWith('check-workspace.mjs')
                              ? 'workspace-contract'
                              : 'native-compiler'
                    ),
            }
        );
        assert.equal(result.plan_id, plan.plan_id);
        assert.equal(result.replayed, false);
        assert.deepEqual(labels, [
            'native-compiler',
            `${product.shell.appName}:build:production`,
            `${product.shell.appName}:lint`,
            `${product.shell.appName}:test`,
            'workspace-contract',
        ]);
        await verifyGeneratedTree(plan.outputAbsolute, plan.files);
        const manifest = await readManifest(product.app);
        const record = manifest.ownership.publications.at(-1);
        assert.equal(record.tool, 'generate:action-request');
        assert.equal(record.plan_id, plan.plan_id);
        const published = Object.fromEntries(
            plan.changes.map(({ path }) => [path, plan.files[path]])
        );
        assertProductOnlyImports(
            published,
            new Set(manifest.generated_files.map((entry) => entry.path))
        );
        // Rejeu du plan relu : rien ne change ; un nouveau plan identique n'a
        // rien à publier.
        const before = await snapshotTree(product.root, []);
        const again = await publishExternalActionRequest(
            { ...product.options, expectedPlanId: plan.plan_id },
            { run: () => assert.fail('Republication') }
        );
        assert.equal(again.replayed, true);
        assert.deepEqual(await snapshotTree(product.root, []), before);
        await assert.rejects(
            planExternalActionRequest(product.options),
            /publication without change/
        );
        // Aucune écriture dans l'atelier, aucun type-check atelier.
        assert.deepEqual(await snapshotTree(TOOLS_ROOT), workshop);
    }
});

test('X2 : régénération partielle déclarée ; aucun fichier ancien laissé sous la sortie', async (t) => {
    const product = await actionProduct(t, 'observatory');
    const first = await planExternalActionRequest(product.options);
    await publishExternalActionRequest(
        { ...product.options, expectedPlanId: first.plan_id },
        native()
    );
    const definitionPath = join(product.root, product.options.definitionPath);
    const original = await readFile(definitionPath, 'utf8');
    const definition = JSON.parse(original);
    definition.operations[0].result_model.description = 'Décodé, révisé.';
    await writeFile(definitionPath, JSON.stringify(definition, null, 2) + '\n');
    const second = await planExternalActionRequest(product.options);
    const total = Object.keys(first.files).filter((path) =>
        path.startsWith(`${actionOutputRoot(first.action_id)}/`)
    ).length;
    assert.ok(second.changes.length > 0 && second.changes.length < total);
    assert.ok(second.changes.every(({ change }) => change === 'replaced'));
    await publishExternalActionRequest(
        { ...product.options, expectedPlanId: second.plan_id },
        native()
    );
    // Un fichier publié sous la sortie par une autre publication ne peut pas
    // rester orphelin : la régénération est refusée.
    const extra = `${actionOutputRoot(first.action_id)}/extra.ts`;
    const plan = await planApplicationPublication({
        ...product.base,
        tool: 'generate:action-request',
        files: { [extra]: 'export {};\n' },
    });
    await publishApplicationPublication(
        {
            ...product.base,
            tool: 'generate:action-request',
            files: { [extra]: 'export {};\n' },
            expectedPlanId: plan.plan_id,
        },
        native()
    );
    await writeFile(definitionPath, original);
    await assert.rejects(
        planExternalActionRequest(product.options),
        /publication would leave an unexplained file/
    );
});

test('X2/T4 : un plan relu pour un produit ne publie pas dans un autre', async (t) => {
    const first = await actionProduct(t, 'observatory');
    const second = await actionProduct(t, 'observatory');
    const plan = await planExternalActionRequest(first.options);
    const before = await snapshotTree(second.root, []);
    await assert.rejects(
        publishExternalActionRequest(
            { ...second.options, expectedPlanId: plan.plan_id },
            { run: () => assert.fail('Compilation') }
        ),
        /reviewed publication plan is stale/
    );
    assert.deepEqual(await snapshotTree(second.root, []), before);
});

test('X2/T5 : définition, contrat ou source modifiés périment ou refusent le plan', async (t) => {
    const product = await actionProduct(t, 'equipment-hire');
    const plan = await planExternalActionRequest(product.options);
    const before = await snapshotTree(product.root, []);
    const definitionPath = join(product.root, product.options.definitionPath);
    const original = await readFile(definitionPath, 'utf8');
    const definition = JSON.parse(original);
    // Définition modifiée sans effet sur la sortie : le plan reste périmé.
    definition.feature.description = 'Synthetic fixture, revised.';
    await writeFile(definitionPath, JSON.stringify(definition, null, 2) + '\n');
    await assert.rejects(
        publishExternalActionRequest(
            { ...product.options, expectedPlanId: plan.plan_id },
            { run: () => assert.fail('Compilation') }
        ),
        /reviewed publication plan is stale/
    );
    // Mêmes valeurs, octets différents : la sortie est identique, seul le
    // lien aux octets relus périme le plan.
    await writeFile(definitionPath, JSON.stringify(JSON.parse(original)));
    await assert.rejects(
        publishExternalActionRequest(
            { ...product.options, expectedPlanId: plan.plan_id },
            { run: () => assert.fail('Compilation') }
        ),
        /reviewed publication plan is stale/
    );
    await writeFile(definitionPath, original);
    // Contrat ou source du contrat modifiés : refus avant toute écriture.
    for (const name of ['backend.json', 'declared.json']) {
        const path = join(
            product.root,
            `descriptions/session-equipment-hire/${name}`
        );
        const bytes = await readFile(path);
        await writeFile(path, Buffer.concat([bytes, Buffer.from(' ')]));
        await assert.rejects(
            planExternalActionRequest(product.options),
            /AR_GRAPH_|drift|external application:/
        );
        await writeFile(path, bytes);
    }
    assert.deepEqual(await snapshotTree(product.root, []), before);
    // Dérive pendant la publication, sous verrou : refus et état relu rétabli.
    await assert.rejects(
        publishExternalActionRequest(
            { ...product.options, expectedPlanId: plan.plan_id },
            {
                run: () => undefined,
                phase: async (name) => {
                    if (name === 'compiled')
                        await writeFile(definitionPath, original + ' ');
                },
            }
        ),
        /publication input drift/
    );
    await writeFile(definitionPath, original);
    assert.deepEqual(await snapshotTree(product.root, []), before);
    await publishExternalActionRequest(
        { ...product.options, expectedPlanId: plan.plan_id },
        native()
    );
});

test('X2/T7 : arrêt réel du processus après l’échange, refus des autres commandes, puis reprise', async (t) => {
    const product = await actionProduct(t, 'observatory');
    const plan = await planExternalActionRequest(product.options);
    const moduleUrl = pathToFileURL(
        join(
            TOOLS_ROOT,
            'tools/generator-platform/core/external-action-request.mjs'
        )
    ).href;
    const program = `import { publishExternalActionRequest } from ${JSON.stringify(moduleUrl)};
await publishExternalActionRequest(JSON.parse(process.argv[1]), {
run() { return undefined; }, phase(phase) { if (phase === 'published') process.kill(process.pid, 'SIGKILL'); }
});`;
    const result = spawnSync(
        process.execPath,
        [
            '--input-type=module',
            '-e',
            program,
            JSON.stringify({
                ...product.options,
                expectedPlanId: plan.plan_id,
            }),
        ],
        { cwd: product.parent, encoding: 'utf8', timeout: 120_000 }
    );
    assert.equal(result.signal, 'SIGKILL', result.stderr);
    await assert.rejects(
        planExternalApplicationShell({ ...product.shell, appName: 'other' }),
        /interrupted publication pending/
    );
    await assert.rejects(
        planExternalActionRequest(product.options),
        /interrupted publication pending/
    );
    // La même commande relue reprend, puis publie entièrement.
    const done = await publishExternalActionRequest(
        { ...product.options, expectedPlanId: plan.plan_id },
        native()
    );
    assert.equal(done.recovered, true);
    assert.equal(done.replayed, false);
    await verifyGeneratedTree(plan.outputAbsolute, plan.files);
    await planExternalApplicationShell({ ...product.shell, appName: 'other' });
});

test('X2/T8 : deux publications concurrentes de la même application, une seule passe', async (t) => {
    const product = await actionProduct(t, 'equipment-hire');
    const plan = await planExternalActionRequest(product.options);
    const options = { ...product.options, expectedPlanId: plan.plan_id };
    let entered;
    const started = new Promise((done) => (entered = done));
    let release;
    const barrier = new Promise((done) => (release = done));
    const first = publishExternalActionRequest(options, {
        run: async () => {
            entered();
            await barrier;
        },
    });
    await started;
    try {
        await assert.rejects(
            publishExternalActionRequest(options, {
                run: () => assert.fail('Second runner entered'),
            }),
            /another generation owns/
        );
    } finally {
        release();
    }
    assert.equal((await first).replayed, false);
    const manifest = await readManifest(product.app);
    assert.equal(
        manifest.ownership.publications.filter(
            (record) => record.plan_id === plan.plan_id
        ).length,
        1
    );
});

test('X2 : entrées et applications hors périmètre refusées avant toute écriture', async (t) => {
    const product = await actionProduct(t, 'observatory');
    const before = await snapshotTree(product.root, []);
    const refuse = (options, pattern) =>
        assert.rejects(planExternalActionRequest(options), pattern);
    await refuse(
        { ...product.options, definitionPath: '../escape.json' },
        /external application:/
    );
    await refuse(
        {
            ...product.options,
            definitionPath: `apps/${product.shell.appName}/.cmz/app-manifest.json`,
        },
        /reserved workspace namespace/
    );
    await refuse(
        { ...product.options, appName: 'absente' },
        /application is absent/
    );
    // Une définition 2.0 importerait des bibliothèques de l'atelier.
    const legacy = join(product.root, 'descriptions/legacy.json');
    const definition = JSON.parse(
        await readFile(
            join(product.root, product.options.definitionPath),
            'utf8'
        )
    );
    await writeFile(
        legacy,
        JSON.stringify({ ...definition, schema_version: '2.0.0' })
    );
    await refuse(
        { ...product.options, definitionPath: 'descriptions/legacy.json' },
        /requires definition 2\.1\.0/
    );
    // Contrat hors du produit : refusé par la lecture confinée.
    await writeFile(
        legacy,
        JSON.stringify({
            ...definition,
            backend_contract: {
                ...definition.backend_contract,
                uri: '../contract.json',
            },
        })
    );
    await refuse(
        { ...product.options, definitionPath: 'descriptions/legacy.json' },
        /external application: unsafe relative path/
    );
    await rm(legacy);
    assert.deepEqual(await snapshotTree(product.root, []), before);
    // Coque sans session et coque React : refusées.
    for (const profile of ['angular-pwa', 'react-spa']) {
        const plain = await shellFixture(t, profile);
        const shell = await planExternalApplicationShell(plain.shell);
        await publishExternalApplicationShell(
            { ...plain.shell, expectedPlanId: shell.plan_id },
            native()
        );
        await assert.rejects(
            planExternalActionRequest({
                workspaceRoot: TOOLS_ROOT,
                targetRoot: plain.root,
                appName: plain.shell.appName,
                definitionPath: 'descriptions/action.json',
            }),
            profile === 'angular-pwa'
                ? /application has no session module/
                : /requires an angular-pwa app/
        );
    }
});

test('X2 : CLI extérieure fermée, plan obligatoire, Angular seulement', async (t) => {
    const product = await actionProduct(t, 'equipment-hire');
    const base = [
        '--target-root',
        product.root,
        '--app',
        product.shell.appName,
        '--definition',
        product.options.definitionPath,
    ];
    for (const [args, pattern] of [
        [base, /requires --dry-run or --apply/],
        [
            [...base, '--dry-run', '--apply', 'a'.repeat(64)],
            /--dry-run or --apply/,
        ],
        [
            [...base, '--dry-run', '--target', 'reactjs'],
            /--target angular only/,
        ],
        [
            [...base, '--dry-run', '--out', 'x'],
            /not allowed with --target-root: --out/,
        ],
        [[...base, '--dry-run', '--host-bindings', 'x'], /not allowed/],
        [[...base, '--dry-run', '--artifact-root', 'x'], /not allowed/],
        [
            [...base, '--apply', 'f'.repeat(64)],
            /reviewed publication plan is stale/,
        ],
    ]) {
        const result = cli(args);
        assert.equal(result.status, 1, args.join(' '));
        assert.match(result.stderr, pattern);
        assert.doesNotMatch(result.stderr, /\n\s+at /);
    }
    const planned = cli([...base, '--dry-run']);
    assert.equal(planned.status, 0, planned.stderr);
    const plan = JSON.parse(planned.stdout);
    assert.equal(plan.tool, 'generate:action-request');
    assert.equal(plan.action_id, 'equipment-hire-enter');
    assert.equal(plan.files, undefined);
    assert.doesNotMatch(planned.stdout, new RegExp(TOOLS_ROOT));
    assert.equal(dirname(plan.output), 'apps');
});
