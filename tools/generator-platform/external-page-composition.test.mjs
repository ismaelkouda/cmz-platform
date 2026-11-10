// X3 : `compile:page-execution-plan` et `generate:page-composition
// --target-root`. La page Connexion d'une coque avec session est planifiée
// depuis les fichiers possédés de l'application, puis composée en consommant
// la commande publiée par X2 (ADR-0103). Le runner injecté ne compile rien :
// la chaîne native est prouvée par check:external-application-shells.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';

import {
    planExternalApplicationShell,
    publishExternalApplicationShell,
} from './core/application-workspace.mjs';
import {
    computeOwnershipSeal,
    inventoryTreeSha,
} from './core/application-ownership.mjs';
import {
    planExternalActionRequest,
    publicExternalActionRequestPlan,
    publishExternalActionRequest,
    sessionApplication,
} from './core/external-action-request.mjs';
import {
    assertPlanReferences,
    planExternalPageComposition,
    publicExternalPageCompositionPlan,
    publishExternalPageComposition,
} from './core/external-page-composition.mjs';
import {
    ownedAppFile,
    pagePlanPath,
    planExternalPagePlan,
    publicExternalPagePlan,
    publishExternalPagePlan,
} from './core/external-page-plan.mjs';
import { sha256 } from './core/generation-manifest.mjs';
import {
    shellFixture,
    snapshotTree,
    TOOLS_ROOT,
} from './test-support/external-application-fixture.mjs';
import {
    assertProductOnlyImports,
    MANIFEST,
    readManifest,
    sessionApp,
} from './test-support/external-publication-fixture.mjs';
import {
    SESSION_FIXTURE_DOMAINS,
    writeExternalActionDefinitions,
} from './test-support/external-session-fixture.mjs';

const native = () => ({ run: () => undefined });
const cli = (script, args) =>
    spawnSync(
        process.execPath,
        [join(TOOLS_ROOT, 'tools/generator-platform', script), ...args],
        { cwd: TOOLS_ROOT, encoding: 'utf8', timeout: 120_000 }
    );

async function publishCommand(options) {
    const plan = await planExternalActionRequest(options);
    await publishExternalActionRequest(
        { ...options, expectedPlanId: plan.plan_id },
        native()
    );
    return plan;
}

// Produit fictif : coque avec session, puis commande de connexion publiée (X2).
async function connexionProduct(t, domain, { command = true } = {}) {
    const product = await sessionApp(t, domain);
    const { enter } = await writeExternalActionDefinitions(
        product.root,
        domain
    );
    const action = { ...product.base, definitionPath: enter };
    if (command) await publishCommand(action);
    return {
        ...product,
        action,
        pageId: product.input.entryPage.id,
        options: { ...product.base, pageId: product.input.entryPage.id },
    };
}

async function publishPlan(options) {
    const plan = await planExternalPagePlan(options);
    const result = await publishExternalPagePlan(
        { ...options, expectedPlanId: plan.plan_id },
        native()
    );
    return { plan, result };
}

async function publishComposition(options, run = () => undefined) {
    const plan = await planExternalPageComposition(options);
    const result = await publishExternalPageComposition(
        { ...options, expectedPlanId: plan.plan_id },
        { run }
    );
    return { plan, result };
}

test('X3 : page Connexion planifiée puis composée sur deux produits fictifs, en consommant la commande X2', async (t) => {
    for (const domain of SESSION_FIXTURE_DOMAINS) {
        const product = await connexionProduct(t, domain);
        const workshop = await snapshotTree(TOOLS_ROOT);
        // Plan de page : un seul fichier, dans le registre scellé.
        const pagePlan = await planExternalPagePlan(product.options);
        const visible = publicExternalPagePlan(pagePlan);
        assert.equal(visible.page_id, product.pageId);
        assert.deepEqual(
            visible.changes.map(({ path, change }) => [path, change]),
            [[pagePlanPath(product.pageId), 'added']]
        );
        assert.deepEqual(visible.inputs, []);
        await publishExternalPagePlan(
            { ...product.options, expectedPlanId: pagePlan.plan_id },
            native()
        );
        const document = JSON.parse(
            pagePlan.files[pagePlanPath(product.pageId)]
        );
        assert.equal(document.schema_version, '1.1.0');
        assert.deepEqual(
            document.command_nodes.map((node) => node.primitive_ref.uri),
            [
                `apps/${product.shell.appName}/src/app/generated/actions/${domain}-enter/execution-model.json`,
            ]
        );
        assert.equal(
            document.source.page_contract.uri,
            `apps/${product.shell.appName}/.cmz/pages/${product.pageId}.json`
        );
        assert.equal(document.session.effects[0].kind, 'establish');
        // Recompilation déterministe : rien de neuf à publier.
        await assert.rejects(
            planExternalPagePlan(product.options),
            /publication without change/
        );
        // Composition : seulement ses fichiers, aucune copie de la commande.
        const labels = [];
        const { plan } = await publishComposition(product.options, (_, args) =>
            labels.push(
                args[1] === 'run'
                    ? args[2]
                    : args[0].endsWith('check-workspace.mjs')
                      ? 'workspace-contract'
                      : 'native-compiler'
            )
        );
        assert.deepEqual(labels, [
            'native-compiler',
            `${product.shell.appName}:build:production`,
            `${product.shell.appName}:lint`,
            `${product.shell.appName}:test`,
            'workspace-contract',
        ]);
        const base = `src/app/generated/pages/${product.pageId}/composition`;
        const visibleComposition = publicExternalPageCompositionPlan(plan);
        assert.deepEqual(visibleComposition.consumed_commands, [
            `src/app/generated/actions/${domain}-enter`,
        ]);
        assert.deepEqual(
            plan.changes.map(({ path }) => path),
            [
                `${base}/generation-manifest.json`,
                `${base}/src/index.ts`,
                `${base}/src/page-composition.providers.ts`,
                `${base}/src/page-composition.ts`,
            ]
        );
        const composition = plan.files[`${base}/src/page-composition.ts`];
        assert.match(
            composition,
            new RegExp(
                `from '\\.\\./\\.\\./\\.\\./\\.\\./actions/${domain}-enter/src/${domain}-enter\\.facade'`
            )
        );
        assert.match(
            composition,
            /import \{ APPLICATION_SESSION \} from '\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/session'/
        );
        const manifest = await readManifest(product.app);
        const owned = new Map(
            manifest.generated_files.map((entry) => [entry.path, entry])
        );
        assertProductOnlyImports(
            Object.fromEntries(
                plan.changes.map(({ path }) => [path, plan.files[path]])
            ),
            new Set(owned.keys())
        );
        // Le manifeste de génération lie les octets de la commande consommée.
        const generation = JSON.parse(
            plan.files[`${base}/generation-manifest.json`]
        );
        const consumed = generation.files.filter(({ path }) =>
            path.startsWith(`actions/${domain}-enter/src/`)
        );
        assert.ok(consumed.length > 5);
        for (const entry of consumed)
            assert.equal(
                entry.sha256,
                owned.get(`src/app/generated/${entry.path}`).sha256,
                entry.path
            );
        assert.equal(
            manifest.ownership.publications.at(-1).tool,
            'generate:page-composition'
        );
        // Rejeu, puis rien de neuf ; aucune écriture dans l'atelier.
        const replay = await publishExternalPageComposition(
            { ...product.options, expectedPlanId: plan.plan_id },
            { run: () => assert.fail('Republication') }
        );
        assert.equal(replay.replayed, true);
        await assert.rejects(
            planExternalPageComposition(product.options),
            /publication without change/
        );
        assert.deepEqual(await snapshotTree(TOOLS_ROOT), workshop);
    }
});

test('X3 : plan périmé si la commande change, recompilé puis recomposé', async (t) => {
    const product = await connexionProduct(t, 'observatory');
    await publishPlan(product.options);
    const reviewed = await planExternalPageComposition(product.options);
    // La commande X2 est régénérée après relecture de la composition.
    const definitionPath = join(product.root, product.action.definitionPath);
    const definition = JSON.parse(await readFile(definitionPath, 'utf8'));
    definition.feature.description = 'Synthetic fixture, revised for X3.';
    await writeFile(definitionPath, JSON.stringify(definition, null, 2) + '\n');
    await publishCommand(product.action);
    const before = await snapshotTree(product.root, []);
    await assert.rejects(
        publishExternalPageComposition(
            { ...product.options, expectedPlanId: reviewed.plan_id },
            { run: () => assert.fail('Composition sur un plan périmé') }
        ),
        /page execution plan is stale; recompile it/
    );
    await assert.rejects(
        planExternalPageComposition(product.options),
        /page execution plan is stale/
    );
    assert.deepEqual(await snapshotTree(product.root, []), before);
    // Recompilation : le plan est remplacé, puis la composition publiée.
    const { plan } = await publishPlan(product.options);
    assert.deepEqual(
        plan.changes.map(({ change }) => change),
        ['replaced']
    );
    const composed = await publishComposition(product.options);
    assert.equal(composed.result.replayed, false);
});

test('X3 : commande absente, plan absent, page inconnue ou à lectures refusés avant toute écriture', async (t) => {
    const product = await connexionProduct(t, 'equipment-hire', {
        command: false,
    });
    const before = await snapshotTree(product.root, []);
    await assert.rejects(
        planExternalPagePlan(product.options),
        /page action enter has no published command; publish it with generate:action-request/
    );
    await assert.rejects(
        planExternalPageComposition(product.options),
        /page execution plan is not published; run compile:page-execution-plan/
    );
    for (const [pageId, pattern] of [
        ['connexion', /invalid page id/],
        ['page_0000000000000000', /page is not declared by the application/],
    ])
        await assert.rejects(
            planExternalPagePlan({ ...product.options, pageId }),
            pattern
        );
    const withLoads = product.input.design.pages.find(
        (page) => page.loads.length > 0
    );
    await assert.rejects(
        planExternalPagePlan({ ...product.options, pageId: withLoads.id }),
        /supports command pages only/
    );
    assert.deepEqual(await snapshotTree(product.root, []), before);
    // Coque sans session et coque React : refusées.
    for (const profile of ['angular-pwa', 'react-spa']) {
        const plain = await shellFixture(t, profile);
        const shell = await planExternalApplicationShell(plain.shell);
        await publishExternalApplicationShell(
            { ...plain.shell, expectedPlanId: shell.plan_id },
            native()
        );
        const options = {
            workspaceRoot: TOOLS_ROOT,
            targetRoot: plain.root,
            appName: plain.shell.appName,
            pageId: product.pageId,
        };
        const pattern =
            profile === 'angular-pwa'
                ? /application has no session module/
                : /requires an angular-pwa app/;
        await assert.rejects(planExternalPagePlan(options), pattern);
        await assert.rejects(planExternalPageComposition(options), pattern);
    }
});

// Fichier possédé modifié avec son entrée de registre, sans recalculer le
// sceau : les gardes de la composition le refusent avant la primitive.
async function forgeOwned(product, path, content) {
    const manifestPath = join(product.app, MANIFEST);
    const original = await readFile(manifestPath);
    const previous = await readFile(join(product.app, path));
    const manifest = JSON.parse(original.toString('utf8'));
    const entry = manifest.generated_files.find(
        (candidate) => candidate.path === path
    );
    entry.sha256 = sha256(content);
    entry.bytes = Buffer.byteLength(content);
    await writeFile(join(product.app, path), content);
    await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
    return async () => {
        await writeFile(join(product.app, path), previous);
        await writeFile(manifestPath, original);
    };
}

test('X3 : références du plan hors de l’application et commande consommée différente, refusées', async (t) => {
    const product = await connexionProduct(t, 'observatory');
    await publishPlan(product.options);
    const app = product.shell.appName;
    const planPath = pagePlanPath(product.pageId);
    const plan = JSON.parse(
        await readFile(join(product.app, planPath), 'utf8')
    );
    const owned = new Set(
        (await readManifest(product.app)).generated_files.map(
            ({ path }) => path
        )
    );
    assert.deepEqual(assertPlanReferences(plan, app, owned), [
        `.cmz/pages/${product.pageId}.json`,
        'src/app/generated/actions/observatory-enter/execution-model.json',
    ]);
    for (const uri of [
        '../outside.json',
        '/absolute/model.json',
        'descriptions/session-observatory/backend.json',
        'apps/other-app/src/app/generated/actions/x/execution-model.json',
        // Autre application dont le nom a la même longueur.
        `apps/${'x'.repeat(app.length)}/src/app/generated/actions/observatory-enter/execution-model.json`,
        `apps/${app}/src/app/generated/unowned.json`,
        `apps/${app}/src/../src/app/generated/actions/observatory-enter/execution-model.json`,
        // Validation X3, S5 : une URI non textuelle reçoit le même refus fermé.
        42,
        null,
        undefined,
    ]) {
        const forged = structuredClone(plan);
        forged.command_nodes[0].primitive_ref.uri = uri;
        assert.throws(
            () => assertPlanReferences(forged, app, owned),
            /page plan references a file outside the application/,
            String(uri)
        );
    }
    const before = await snapshotTree(product.root, []);
    // Par la commande : plan forgé vers un fichier du produit hors application.
    const forged = structuredClone(plan);
    forged.command_nodes[0].primitive_ref.uri =
        'descriptions/session-observatory/backend.json';
    let restore = await forgeOwned(
        product,
        planPath,
        JSON.stringify(forged, null, 2) + '\n'
    );
    await assert.rejects(
        planExternalPageComposition(product.options),
        /page plan references a file outside the application/
    );
    await restore();
    // Plan inscrit au registre par un autre outil : non reconnu comme plan.
    const manifestPath = join(product.app, MANIFEST);
    const original = await readFile(manifestPath);
    const registry = JSON.parse(original.toString('utf8'));
    registry.ownership.publications.findLast((record) =>
        record.files.some((file) => file.path === planPath)
    ).tool = 'generate:page-composition';
    await writeFile(manifestPath, JSON.stringify(registry, null, 2) + '\n');
    await assert.rejects(
        planExternalPageComposition(product.options),
        /page execution plan is not published/
    );
    await writeFile(manifestPath, original);
    // Commande publiée différente de ce que la composition rendrait.
    const facade =
        'src/app/generated/actions/observatory-enter/src/observatory-enter.facade.ts';
    restore = await forgeOwned(
        product,
        facade,
        (await readFile(join(product.app, facade), 'utf8')) + '// modifié\n'
    );
    await assert.rejects(
        planExternalPageComposition(product.options),
        /page command enter differs from its published command/
    );
    await restore();
    assert.deepEqual(await snapshotTree(product.root, []), before);
});

const ENTER_MODEL =
    'src/app/generated/actions/observatory-enter/execution-model.json';

// Registre modifié puis rescellé de façon cohérente (forge exclue par
// l'ADR-0103) : montre ce que fait le code devant un registre valide mais
// différent, comme la sonde P5 du validateur.
async function sealedForge(product, edit) {
    const path = join(product.app, MANIFEST);
    const original = await readFile(path);
    const manifest = JSON.parse(original.toString('utf8'));
    edit(manifest);
    manifest.tree_sha256 = inventoryTreeSha(manifest.generated_files);
    manifest.ownership.seal_sha256 = computeOwnershipSeal(manifest);
    await writeFile(path, JSON.stringify(manifest, null, 2) + '\n');
    return () => writeFile(path, original);
}

test('X3 : modèle attribué à un autre outil, refusé dès le plan de page, et lecture exacte des fichiers possédés', async (t) => {
    const product = await connexionProduct(t, 'observatory');
    const before = await snapshotTree(product.root, []);
    // Validation X3, S8 : registre scellé et cohérent où le modèle de la
    // commande est publié par un autre outil. Le plan ne le retient pas.
    const restore = await sealedForge(product, (manifest) => {
        manifest.ownership.publications.findLast((record) =>
            record.files.some((file) => file.path === ENTER_MODEL)
        ).tool = 'generate:page-composition';
    });
    await assert.rejects(
        planExternalPagePlan(product.options),
        /page action enter has no published command; publish it with generate:action-request/
    );
    await assert.rejects(
        publishExternalPagePlan(
            { ...product.options, expectedPlanId: 'a'.repeat(64) },
            { run: () => assert.fail('Publication du plan') }
        ),
        /page action enter has no published command/
    );
    await restore();
    assert.deepEqual(await snapshotTree(product.root, []), before);
    // Validation X3, S1 et S2 : fichier non inscrit, puis octets possédés
    // modifiés sur disque.
    const app = await sessionApplication(product.root, product.shell.appName);
    await writeFile(join(product.app, 'src/stray.ts'), 'export {};\n');
    await assert.rejects(
        ownedAppFile(app, 'src/stray.ts'),
        /file is not owned by the application/
    );
    await rm(join(product.app, 'src/stray.ts'));
    const model = await readFile(join(product.app, ENTER_MODEL));
    await writeFile(join(product.app, ENTER_MODEL), `${model} `);
    await assert.rejects(
        ownedAppFile(app, ENTER_MODEL),
        /owned application file drift/
    );
    await writeFile(join(product.app, ENTER_MODEL), model);
    assert.equal((await ownedAppFile(app, ENTER_MODEL)).equals(model), true);
    assert.deepEqual(await snapshotTree(product.root, []), before);
});

// Copie d'une définition du produit sous un autre identifiant de commande,
// pour la même opération du contrat.
async function copyDefinition(product, name, id) {
    const path = `descriptions/session-observatory/actions/${name}.json`;
    const definition = JSON.parse(
        await readFile(join(product.root, path), 'utf8')
    );
    definition.feature.id = `${id}-feature`;
    definition.operations[0].id = id;
    const copy = `descriptions/session-observatory/actions/${id}.json`;
    await writeFile(
        join(product.root, copy),
        JSON.stringify(definition, null, 2) + '\n'
    );
    return { ...product.action, definitionPath: copy };
}

test('X3 : deux commandes publiées pour la même action de page, refusées en les nommant (M-3)', async (t) => {
    const product = await connexionProduct(t, 'observatory');
    // Deux commandes pour une opération que la page n'utilise pas : elles ne
    // changent ni ne bloquent ce plan.
    const agree = {
        ...product.action,
        definitionPath:
            'descriptions/session-observatory/actions/observatory-agree.json',
    };
    await publishCommand(agree);
    await publishCommand(
        await copyDefinition(
            product,
            'observatory-agree',
            'observatory-consent'
        )
    );
    const plan = await planExternalPagePlan(product.options);
    assert.deepEqual(
        JSON.parse(plan.files[pagePlanPath(product.pageId)]).command_nodes.map(
            (node) => node.primitive_ref.uri
        ),
        [
            `apps/${product.shell.appName}/src/app/generated/actions/observatory-enter/execution-model.json`,
        ]
    );
    // Deux commandes pour l'action de la page : refus qui les nomme.
    await publishCommand(
        await copyDefinition(product, 'observatory-enter', 'observatory-entry')
    );
    const before = await snapshotTree(product.root, []);
    await assert.rejects(
        planExternalPagePlan(product.options),
        /page action enter has several published commands \(observatory-enter, observatory-entry\); keep one/
    );
    assert.deepEqual(await snapshotTree(product.root, []), before);
});

test('X3 : commande republiée après le plan ou la composition, pages dépendantes nommées (I-1)', async (t) => {
    const product = await connexionProduct(t, 'observatory');
    const definitionPath = join(product.root, product.action.definitionPath);
    const revise = async (description) => {
        const definition = JSON.parse(await readFile(definitionPath, 'utf8'));
        definition.feature.description = description;
        await writeFile(
            definitionPath,
            JSON.stringify(definition, null, 2) + '\n'
        );
    };
    // Une autre page publie son plan avec une autre commande : elle ne dépend
    // pas de la commande de connexion.
    await publishCommand({
        ...product.action,
        definitionPath:
            'descriptions/session-observatory/actions/observatory-agree.json',
    });
    const agreePage = product.input.design.pages.find((page) =>
        page.actions.some(
            (action) =>
                action.operation_ref?.operation_id === 'observatory-agree'
        )
    );
    const agreePlan = await publishPlan({
        ...product.options,
        pageId: agreePage.id,
    });
    assert.equal(agreePlan.result.replayed, false);
    // Plan de connexion publié, sans composition.
    await publishPlan(product.options);
    await revise('Synthetic fixture, revised once.');
    let plan = await planExternalActionRequest(product.action);
    assert.deepEqual(plan.dependent_pages, [
        { page_id: product.pageId, composition: false, realization: false },
    ]);
    await publishExternalActionRequest(
        { ...product.action, expectedPlanId: plan.plan_id },
        native()
    );
    // Plan recompilé, composition publiée, puis nouvelle révision.
    await publishPlan(product.options);
    await publishComposition(product.options);
    await revise('Synthetic fixture, revised twice.');
    plan = await planExternalActionRequest(product.action);
    const expected = [
        { page_id: product.pageId, composition: true, realization: false },
    ];
    assert.deepEqual(
        publicExternalActionRequestPlan(plan).dependent_pages,
        expected
    );
    const args = [
        '--target-root',
        product.root,
        '--app',
        product.shell.appName,
        '--definition',
        product.action.definitionPath,
    ];
    const dry = cli('generate-action-request.mjs', [...args, '--dry-run']);
    assert.equal(dry.status, 0, dry.stderr);
    assert.deepEqual(JSON.parse(dry.stdout).dependent_pages, expected);
    assert.match(
        dry.stderr,
        new RegExp(
            `⚠ Pages qui consomment cette commande : ${product.pageId} \\(plan, composition\\)\\. Après publication, relancer compile:page-execution-plan puis generate:page-composition pour chacune\\.`
        )
    );
    // Un plan inscrit par un autre outil n'est pas un plan de page (registre
    // rescellé, forge exclue par l'ADR-0103).
    const restore = await sealedForge(product, (manifest) => {
        manifest.ownership.publications.findLast((record) =>
            record.files.some(
                (file) => file.path === pagePlanPath(product.pageId)
            )
        ).tool = 'generate:page-composition';
    });
    assert.deepEqual(
        (await planExternalActionRequest(product.action)).dependent_pages,
        []
    );
    await restore();
    const result = await publishExternalActionRequest(
        { ...product.action, expectedPlanId: plan.plan_id },
        native()
    );
    assert.deepEqual(result.dependent_pages, expected);
    // La page dépendante est périmée, et chaque commande X3 le dit.
    await assert.rejects(
        planExternalPageComposition(product.options),
        /page execution plan is stale; recompile it with compile:page-execution-plan/
    );
});

test('X3 : CLI extérieures fermées, plan obligatoire', async (t) => {
    const product = await connexionProduct(t, 'equipment-hire');
    const base = [
        '--target-root',
        product.root,
        '--app',
        product.shell.appName,
        '--page',
        product.pageId,
    ];
    for (const script of [
        'compile-page-execution-plan.mjs',
        'generate-page-composition.mjs',
    ]) {
        for (const [args, pattern] of [
            [base, /requires --dry-run or --apply/],
            [
                [...base, '--dry-run', '--apply', 'a'.repeat(64)],
                /--dry-run or --apply/,
            ],
            [
                [...base, '--dry-run', '--plan', 'x'],
                /not allowed with --target-root: --plan/,
            ],
            [[...base, '--dry-run', '--host-bindings', 'x'], /not allowed/],
            [[...base, '--dry-run', '--out', 'x'], /not allowed/],
            [
                ['--target-root', product.root, '--dry-run'],
                /--app, --page are required/,
            ],
            [[...base.slice(0, 4), '--dry-run'], /❌ --page is required/],
            [
                [...base, '--apply', 'f'.repeat(64)],
                /reviewed publication plan is stale|not published/,
            ],
        ]) {
            const result = cli(script, args);
            assert.equal(result.status, 1, `${script} ${args.join(' ')}`);
            assert.match(result.stderr, pattern);
            assert.doesNotMatch(result.stderr, /\n\s+at /);
        }
        const help = cli(script, ['--target-root', '/absent', '--help']);
        assert.equal(help.status, 0, help.stderr);
        assert.match(help.stdout, /--page <page_id>/);
    }
    // compile:page-execution-plan n'a pas de mode atelier.
    const workshop = cli('compile-page-execution-plan.mjs', [
        '--app',
        'x',
        '--page',
        product.pageId,
        '--dry-run',
    ]);
    assert.equal(workshop.status, 1);
    assert.match(workshop.stderr, /--target-root is required/);
    // Plan puis publication par la CLI.
    const planned = cli('compile-page-execution-plan.mjs', [
        ...base,
        '--dry-run',
    ]);
    assert.equal(planned.status, 0, planned.stderr);
    const plan = JSON.parse(planned.stdout);
    assert.equal(plan.tool, 'compile:page-execution-plan');
    assert.equal(plan.files, undefined);
    assert.doesNotMatch(planned.stdout, new RegExp(TOOLS_ROOT));
});
