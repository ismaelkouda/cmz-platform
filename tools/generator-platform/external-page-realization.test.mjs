// X4 : `prepare:page-realization` et `verify:page-realization --target-root`.
// Le bon de travail est publié dans le registre scellé ; la page Connexion
// réalisée est vérifiée contre ses règles puis publiée à la place déclarée de
// la page d'attente. Le runner injecté ne compile rien : la chaîne native est
// prouvée par check:external-application-shells.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';

import {
    computeOwnershipSeal,
    inventoryTreeSha,
} from './core/application-ownership.mjs';
import {
    planExternalPageComposition,
    publishExternalPageComposition,
} from './core/external-page-composition.mjs';
import {
    planExternalPagePlan,
    publishExternalPagePlan,
} from './core/external-page-plan.mjs';
import {
    pagePublicationRoot,
    planExternalPageRealization,
    planExternalPageRealizationWorkOrder,
    publicExternalPageRealizationPlan,
    publishExternalPageRealization,
    workOrderPath,
} from './core/external-page-realization.mjs';
import { pageCompositionRoot } from './core/external-publication-paths.mjs';
import { sha256 } from './core/generation-manifest.mjs';
import {
    snapshotTree,
    TOOLS_ROOT,
} from './test-support/external-application-fixture.mjs';
import {
    assertProductOnlyImports,
    MANIFEST,
    readManifest,
} from './test-support/external-publication-fixture.mjs';
import {
    composedProduct,
    prepare,
    publish,
    publishCommand,
    realization,
    workOrderOf,
    writeDraft,
} from './test-support/external-realization-product.mjs';
import { SESSION_FIXTURE_DOMAINS } from './test-support/external-session-fixture.mjs';

const cli = (script, args) =>
    spawnSync(process.execPath, [join(TOOLS_ROOT, 'tools', script), ...args], {
        cwd: TOOLS_ROOT,
        encoding: 'utf8',
        timeout: 120_000,
    });
const labelOf = (args) =>
    args[1] === 'run'
        ? args[2]
        : args[0].endsWith('check-workspace.mjs')
          ? 'workspace-contract'
          : 'native-compiler';

test('X4 : bon de travail puis page Connexion réalisée, publiée à la place de la page d’attente, sur deux produits fictifs', async (t) => {
    for (const domain of SESSION_FIXTURE_DOMAINS) {
        const product = await composedProduct(t, domain);
        const workshop = await snapshotTree(TOOLS_ROOT);
        // Bon de travail : un seul fichier, dans le registre scellé.
        const labels = [];
        const { plan: prepared } = await prepare(product);
        const visible = publicExternalPageRealizationPlan(prepared);
        assert.deepEqual(
            visible.changes.map(({ path, change }) => [path, change]),
            [[workOrderPath(product.pageId), 'added']]
        );
        assert.equal(
            visible.draft_root,
            `descriptions/page-realizations/${product.shell.appName}/${product.pageId}`
        );
        const workOrder = await workOrderOf(product);
        assert.equal(workOrder.work_order_id, prepared.work_order_id);
        assert.equal(workOrder.kind, 'external-page-realization-work-order');
        assert.equal(
            workOrder.composition.module,
            `../../generated/pages/${product.pageId}/composition/src`
        );
        assert.deepEqual(workOrder.allowed_files, [
            'page.component.html',
            'page.component.scss',
            'page.component.spec.ts',
            'page.component.ts',
            'realization-evidence.json',
        ]);
        assert.deepEqual(workOrder.forbidden_literals, ['/access']);
        const manifest = await readManifest(product.app);
        const owned = new Map(
            manifest.generated_files.map((entry) => [entry.path, entry])
        );
        assert.ok(
            workOrder.composition.consumed.some(({ path }) =>
                path.startsWith(`src/app/generated/actions/${domain}-enter/`)
            )
        );
        for (const { path, sha256: hash } of workOrder.composition.consumed)
            assert.equal(owned.get(path).sha256, hash, path);
        // Page réalisée dans le brouillon, puis publiée sous plan.
        const files = await realization(product, workOrder);
        await writeDraft(product, workOrder, files);
        const placeholder = owned.get(
            `${pagePublicationRoot(product.pageId)}/page.component.ts`
        );
        const { plan, result } = await publish(
            planExternalPageRealization,
            publishExternalPageRealization,
            product.options,
            (_, args) => labels.push(labelOf(args))
        );
        assert.equal(result.replayed, false);
        assert.deepEqual(labels, [
            'native-compiler',
            `${product.shell.appName}:build:production`,
            `${product.shell.appName}:lint`,
            `${product.shell.appName}:test`,
            'workspace-contract',
        ]);
        const root = pagePublicationRoot(product.pageId);
        assert.deepEqual(
            plan.changes.map(({ path, change }) => [path, change]),
            [
                [`${root}/page.component.html`, 'added'],
                [`${root}/page.component.scss`, 'added'],
                [`${root}/page.component.spec.ts`, 'added'],
                [`${root}/page.component.ts`, 'replaced'],
                [`${root}/realization-evidence.json`, 'added'],
            ]
        );
        assert.deepEqual(
            plan.inputs.map(({ path }) => path),
            workOrder.allowed_files.map(
                (name) => `${workOrder.draft_root}/${name}`
            )
        );
        // Remplacement déclaré au registre, avec l'empreinte d'avant.
        const after = await readManifest(product.app);
        const record = after.ownership.publications.at(-1);
        assert.equal(record.tool, 'page-realization');
        const replaced = record.files.find(
            ({ path }) => path === `${root}/page.component.ts`
        );
        assert.deepEqual(replaced.before, {
            sha256: placeholder.sha256,
            bytes: placeholder.bytes,
        });
        for (const [name, content] of Object.entries(files))
            assert.equal(
                await readFile(join(product.app, root, name), 'utf8'),
                content
            );
        assertProductOnlyImports(
            Object.fromEntries(
                plan.changes.map(({ path }) => [path, plan.files[path]])
            ),
            new Set(after.generated_files.map((entry) => entry.path))
        );
        // Rejeu, puis rien de neuf ; aucune écriture dans l'atelier.
        const replay = await publishExternalPageRealization(
            { ...product.options, expectedPlanId: plan.plan_id },
            { run: () => assert.fail('Republication') }
        );
        assert.equal(replay.replayed, true);
        await assert.rejects(
            planExternalPageRealization(product.options),
            /publication without change/
        );
        assert.deepEqual(await snapshotTree(TOOLS_ROOT), workshop);
    }
});

test('X4 : chaque règle de sécurité du bon de travail refuse sa violation, sans écriture', async (t) => {
    const product = await composedProduct(t, 'observatory');
    await prepare(product);
    const workOrder = await workOrderOf(product);
    const good = await realization(product, workOrder);
    const facade = `../../generated/actions/observatory-enter/src/index`;
    const edit = (name, change) => ({
        ...good,
        [name]: change(good[name]),
    });
    const ts = 'page.component.ts';
    const html = 'page.component.html';
    const cases = [
        [
            'réseau direct',
            edit(ts, (text) => `${text}\nvoid fetch('/x');\n`),
            /direct network access forbidden in page\.component\.ts/,
        ],
        [
            'URL',
            edit(
                html,
                (text) => `${text}<a href="https://example.invalid">x</a>\n`
            ),
            /direct network access forbidden in page\.component\.html/,
        ],
        [
            'HttpClient',
            edit(
                ts,
                (text) =>
                    `import { HttpClient } from '@angular/common/http';\n${text}`
            ),
            /import not allowed by the work order in page\.component\.ts: "@angular\/common\/http"/,
        ],
        [
            'commande importée directement',
            edit(ts, (text) => `import '${facade}';\n${text}`),
            /import not allowed by the work order in page\.component\.ts: ".*actions\/observatory-enter/,
        ],
        [
            'session importée directement',
            edit(
                ts,
                (text) =>
                    `import { APPLICATION_SESSION } from '../../session';\nvoid APPLICATION_SESSION;\n${text}`
            ),
            /import not allowed by the work order in page\.component\.ts: "\.\.\/\.\.\/session"/,
        ],
        [
            'import dynamique',
            edit(ts, (text) => `${text}\nvoid import('./page.component');\n`),
            /dynamic import forbidden in page\.component\.ts/,
        ],
        [
            'stockage',
            edit(ts, (text) => `${text}\nvoid localStorage;\n`),
            /browser storage forbidden in page\.component\.ts/,
        ],
        [
            'code dynamique',
            edit(ts, (text) => `${text}\nvoid eval('1');\n`),
            /dynamic code forbidden in page\.component\.ts/,
        ],
        [
            'littéral d’endpoint',
            edit(ts, (text) => `${text}\nexport const PATH = '/access';\n`),
            /endpoint literal forbidden in page\.component\.ts: \/access/,
        ],
        [
            'contrôle inventé',
            edit(
                html,
                (text) =>
                    `${text}<input data-cmz-id="remember-me" aria-label="x" />\n`
            ),
            /data-cmz-id not declared by the page contract in page\.component\.html: "remember-me"/,
        ],
        [
            'sélecteur dynamique',
            edit(
                html,
                (text) => `${text}<p [attr.data-cmz-id]="'ready'">x</p>\n`
            ),
            /attribute binding forbidden in page\.component\.html: attr\.data-cmz-id/,
        ],
        [
            'composition non montée',
            edit(ts, (text) =>
                text.replace('PAGE_COMPOSITION_PROVIDERS,\n', '')
            ),
            /page does not mount its composition/,
        ],
        [
            'fichier en plus',
            { ...good, 'page.helper.ts': 'export {};\n' },
            /file not allowed by the work order: "page\.helper\.ts"/,
        ],
        [
            'fichier manquant',
            Object.fromEntries(
                Object.entries(good).filter(
                    ([name]) => name !== 'page.component.scss'
                )
            ),
            /page file is missing: page\.component\.scss/,
        ],
        [
            'preuve incomplète',
            edit('realization-evidence.json', (text) => {
                const evidence = JSON.parse(text);
                evidence.states.pop();
                return JSON.stringify(evidence, null, 2) + '\n';
            }),
            /\$\.states: ids must match the page contract exactly/,
        ],
    ];
    assert.ok(good[ts].includes('PAGE_COMPOSITION_PROVIDERS,\n'));
    const before = await snapshotTree(product.root, ['descriptions']);
    for (const [label, files, pattern] of cases) {
        await writeDraft(product, workOrder, files);
        const error = await planExternalPageRealization(product.options).then(
            () => assert.fail(`${label} : accepté`),
            (failure) => failure
        );
        assert.match(
            error.message,
            /page realization violates its work order/,
            label
        );
        assert.ok(
            error.violations.some((violation) => pattern.test(violation)),
            `${label} : ${error.violations.join(' | ')}`
        );
        assert.doesNotMatch(
            error.violations.join('\n'),
            /\/Users\/|\/private\//
        );
        assert.deepEqual(
            await snapshotTree(product.root, ['descriptions']),
            before
        );
    }
    // La réalisation exacte passe ; modifiée après relecture, son plan est
    // périmé et rien n'est publié.
    await writeDraft(product, workOrder, good);
    const plan = await planExternalPageRealization(product.options);
    assert.equal(plan.changes.length, 5);
    await writeDraft(
        product,
        workOrder,
        edit(html, (text) => text.replace('</main>', '<p>ajout</p></main>'))
    );
    await assert.rejects(
        publishExternalPageRealization(
            { ...product.options, expectedPlanId: plan.plan_id },
            { run: () => assert.fail('Publication d’un brouillon modifié') }
        ),
        /reviewed publication plan is stale/
    );
    assert.deepEqual(
        await snapshotTree(product.root, ['descriptions']),
        before
    );
});

// Registre modifié puis rescellé (forge exclue par l'ADR-0103) : montre la
// garde des empreintes consommées seule, plan inchangé.
async function sealedForge(product, path, content) {
    const manifestPath = join(product.app, MANIFEST);
    const original = await readFile(manifestPath);
    const previous = await readFile(join(product.app, path));
    const manifest = JSON.parse(original.toString('utf8'));
    for (const entry of [
        manifest.generated_files.find((entry) => entry.path === path),
        ...manifest.ownership.publications.flatMap((record) =>
            record.files.filter((file) => file.path === path)
        ),
    ]) {
        entry.sha256 = sha256(content);
        entry.bytes = Buffer.byteLength(content);
    }
    manifest.tree_sha256 = inventoryTreeSha(manifest.generated_files);
    manifest.ownership.seal_sha256 = computeOwnershipSeal(manifest);
    await writeFile(join(product.app, path), content);
    await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
    return async () => {
        await writeFile(join(product.app, path), previous);
        await writeFile(manifestPath, original);
    };
}

// M-4 : une composition scellée sans fichiers consommés ne lie rien ; elle
// est tenue pour périmée.
test('X4 : composition sans fichiers consommés, tenue pour périmée (M-4)', async (t) => {
    const product = await composedProduct(t, 'observatory');
    const path = `${pageCompositionRoot(product.pageId)}/generation-manifest.json`;
    const generation = JSON.parse(
        await readFile(join(product.app, path), 'utf8')
    );
    assert.ok(generation.files.length > 0);
    const restore = await sealedForge(
        product,
        path,
        JSON.stringify({ ...generation, files: [] }, null, 2) + '\n'
    );
    await assert.rejects(
        planExternalPageRealizationWorkOrder(product.options),
        /page composition is stale; regenerate it with generate:page-composition/
    );
    await restore();
    await planExternalPageRealizationWorkOrder(product.options);
});

test('X4 : composition absente ou périmée, bon de travail absent ou périmé, brouillon absent : refusés', async (t) => {
    const product = await composedProduct(t, 'equipment-hire', {
        composition: false,
    });
    const before = await snapshotTree(product.root, []);
    await assert.rejects(
        planExternalPageRealizationWorkOrder(product.options),
        /page composition is not published; run generate:page-composition/
    );
    await assert.rejects(
        planExternalPageRealization(product.options),
        /page realization work order is not prepared; run prepare:page-realization/
    );
    for (const [pageId, pattern] of [
        ['connexion', /invalid page id/],
        ['page_0000000000000000', /page is not declared by the application/],
    ])
        await assert.rejects(
            planExternalPageRealizationWorkOrder({
                ...product.options,
                pageId,
            }),
            pattern
        );
    assert.deepEqual(await snapshotTree(product.root, []), before);
    await publish(
        planExternalPageComposition,
        publishExternalPageComposition,
        product.options
    );
    // I-1 (montage) : un fichier consommé par la composition a changé, plan
    // inchangé ; la composition est périmée.
    const facade =
        'src/app/generated/actions/equipment-hire-enter/src/equipment-hire-enter.facade.ts';
    const restore = await sealedForge(
        product,
        facade,
        `${await readFile(join(product.app, facade), 'utf8')}// changé\n`
    );
    await assert.rejects(
        planExternalPageRealizationWorkOrder(product.options),
        /page composition is stale; regenerate it with generate:page-composition/
    );
    await restore();
    await prepare(product);
    await assert.rejects(
        planExternalPageRealization(product.options),
        /page realization draft is absent/
    );
    // La commande est republiée : plan, composition et bon de travail sont
    // périmés tour à tour, chacun avec la commande qui le répare.
    const definitionPath = join(product.root, product.action.definitionPath);
    const definition = JSON.parse(await readFile(definitionPath, 'utf8'));
    definition.feature.description = 'Synthetic fixture, revised for X4.';
    await writeFile(definitionPath, JSON.stringify(definition, null, 2) + '\n');
    await publishCommand(product.action);
    await assert.rejects(
        planExternalPageRealizationWorkOrder(product.options),
        /page execution plan is stale; recompile it with compile:page-execution-plan/
    );
    await publish(
        planExternalPagePlan,
        publishExternalPagePlan,
        product.options
    );
    await assert.rejects(
        planExternalPageRealizationWorkOrder(product.options),
        /page composition is stale/
    );
    await publish(
        planExternalPageComposition,
        publishExternalPageComposition,
        product.options
    );
    const workOrder = await workOrderOf(product);
    await writeDraft(product, workOrder, await realization(product, workOrder));
    await assert.rejects(
        planExternalPageRealization(product.options),
        /page realization work order is stale; prepare it again with prepare:page-realization/
    );
    const { plan } = await prepare(product);
    assert.deepEqual(
        plan.changes.map(({ change }) => change),
        ['replaced']
    );
    const realized = await planExternalPageRealization(product.options);
    assert.equal(realized.changes.length, 5);
});

test('X4 : CLI extérieures fermées, violations listées, aucun chemin de l’atelier', async (t) => {
    const product = await composedProduct(t, 'observatory');
    const base = [
        '--target-root',
        product.root,
        '--app',
        product.shell.appName,
        '--page',
        product.pageId,
    ];
    for (const script of [
        'prepare-page-realization.mjs',
        'verify-page-realization.mjs',
    ]) {
        for (const [args, pattern] of [
            [base, /requires --dry-run or --apply/],
            [[...base, '--dry-run', '--work-order', 'x'], /not allowed/],
            [[...base, '--dry-run', '--allow-file', 'x'], /not allowed/],
            [
                ['--target-root', product.root, '--dry-run'],
                /--app, --page are required/,
            ],
            [
                [...base, '--apply', 'f'.repeat(64)],
                /reviewed publication plan is stale|not prepared/,
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
    const prepared = cli('prepare-page-realization.mjs', [
        ...base,
        '--dry-run',
    ]);
    assert.equal(prepared.status, 0, prepared.stderr);
    const plan = JSON.parse(prepared.stdout);
    assert.equal(plan.tool, 'page-realization');
    assert.equal(plan.files, undefined);
    assert.doesNotMatch(prepared.stdout, new RegExp(TOOLS_ROOT));
    await prepare(product);
    // Brouillon en violation : liste JSON sur la sortie, refus fermé.
    const workOrder = await workOrderOf(product);
    const files = await realization(product, workOrder);
    await writeDraft(product, workOrder, {
        ...files,
        'page.component.ts': `${files['page.component.ts']}\nvoid fetch('/x');\n`,
    });
    const refused = cli('verify-page-realization.mjs', [...base, '--dry-run']);
    assert.equal(refused.status, 1);
    const report = JSON.parse(refused.stdout);
    assert.equal(report.ok, false);
    assert.ok(
        report.violations.some((violation) =>
            violation.startsWith('direct network access forbidden')
        )
    );
    assert.match(refused.stderr, /page realization violates its work order/);
    assert.doesNotMatch(
        refused.stdout + refused.stderr,
        new RegExp(TOOLS_ROOT)
    );
    await writeDraft(product, workOrder, files);
    const accepted = cli('verify-page-realization.mjs', [...base, '--dry-run']);
    assert.equal(accepted.status, 0, accepted.stderr);
    assert.equal(JSON.parse(accepted.stdout).ok, true);
});
