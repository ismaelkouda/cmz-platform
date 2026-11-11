// X5 C3a : `generate:list-query --target-root`, lecture list-query v2 Angular
// au profil extérieur, publiée sous plan dans une application extérieure
// (ADR-0103), sur le modèle de l'action-request extérieure (X2). Le runner
// injecté ne compile rien : la chaîne native est prouvée ailleurs.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';

import {
    planExternalListQuery,
    publicExternalListQueryPlan,
    publishExternalListQuery,
    queryOutputRoot,
} from './core/external-list-query.mjs';
import { verifyGeneratedTree } from './core/external-application-paths.mjs';
import { sha256, stableStringify } from './core/generation-manifest.mjs';
import {
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
    writeExternalQueryDefinition,
} from './test-support/external-session-fixture.mjs';

const CLI = join(
    TOOLS_ROOT,
    'tools/generator-platform/generate-list-query.mjs'
);
const native = () => ({ run: () => undefined });

async function queryProduct(t, domain, edit) {
    const product = await sessionApp(t, domain);
    const definitionPath = await writeExternalQueryDefinition(
        product.root,
        domain,
        edit
    );
    return { ...product, options: { ...product.base, definitionPath } };
}

const cli = (args) =>
    spawnSync(process.execPath, [CLI, ...args], {
        cwd: TOOLS_ROOT,
        encoding: 'utf8',
        timeout: 120_000,
    });

test('C3a : lecture extérieure publiée sous plan sur deux produits fictifs', async (t) => {
    for (const domain of SESSION_FIXTURE_DOMAINS) {
        const product = await queryProduct(t, domain);
        const workshop = await snapshotTree(TOOLS_ROOT);
        const plan = await planExternalListQuery(product.options);
        const visible = publicExternalListQueryPlan(plan);
        assert.equal(visible.query_id, `${domain}-catalogue`);
        assert.deepEqual(
            visible.inputs.map(({ path }) => path),
            [
                product.options.definitionPath,
                `descriptions/session-${domain}/backend.json`,
                `descriptions/session-${domain}/declared.json`,
            ].sort()
        );
        const base = queryOutputRoot(plan.query_id);
        assert.ok(
            plan.changes.every(({ path }) => path.startsWith(`${base}/`))
        );
        assert.ok(plan.changes.every(({ change }) => change === 'added'));
        const modelPath = `${base}/execution-model.json`;
        const model = JSON.parse(plan.files[modelPath]);
        assert.equal(sha256(stableStringify(model)), plan.model_sha256);
        // Profil extérieur, par la commande de production (O-C2-1).
        const query = model.queries[0];
        assert.equal(query.wire_model.unknown_fields, 'ignore');
        assert.deepEqual(query.request_policy.cache, { mode: 'bypass' });
        assert.equal(query.controller.execution.stale_data.on_error, 'clear');
        // G3 : adresse de service résolue à l'exécution.
        const source = plan.files[`${base}/src/${plan.query_id}.source.ts`];
        assert.match(source, /baseUrl = this\.injector\.get\(/);
        assert.doesNotMatch(source, /readonly baseUrl = inject\(/);
        assert.deepEqual(visible.dependent_pages, []);
        // C3b : test de conformité publié avec la lecture, hors du plan
        // d'artefacts (le manifeste de génération ne le lie pas).
        const spec = `${base}/src/${plan.query_id}.contract.spec.ts`;
        assert.match(plan.files[spec], /from 'vitest'/);
        assert.equal(
            JSON.parse(
                plan.files[`${base}/generation-manifest.json`]
            ).files.some(({ path }) => path.endsWith('.contract.spec.ts')),
            false
        );
        const result = await publishExternalListQuery(
            { ...product.options, expectedPlanId: plan.plan_id },
            native()
        );
        assert.equal(result.plan_id, plan.plan_id);
        await verifyGeneratedTree(plan.outputAbsolute, plan.files);
        const manifest = await readManifest(product.app);
        const record = manifest.ownership.publications.at(-1);
        assert.equal(record.tool, 'generate:list-query');
        assert.equal(record.plan_id, plan.plan_id);
        assertProductOnlyImports(
            Object.fromEntries(
                plan.changes.map(({ path }) => [path, plan.files[path]])
            ),
            new Set(manifest.generated_files.map((entry) => entry.path))
        );
        await assert.rejects(
            planExternalListQuery(product.options),
            /publication without change/
        );
        // Aucune écriture dans l'atelier, aucun type-check atelier.
        assert.deepEqual(await snapshotTree(TOOLS_ROOT), workshop);
    }
});

test('C3a : refus nommés du profil extérieur et de la définition', async (t) => {
    const cases = [
        [
            'cache host',
            (definition) => {
                definition.operations[0].execution.cache = {
                    mode: 'host',
                    scope: 'principal',
                    refresh: 'bypass',
                };
            },
            /external application: LIST_QUERY_EXTERNAL_CACHE_HOST/,
        ],
        [
            'nom lu de prototype (E5)',
            (definition) => {
                definition.operations[0].read_model.fields[1].name =
                    'constructor';
            },
            /external application: LIST_QUERY_EXTERNAL_READ_NAME: read field constructor/,
        ],
        [
            'version de définition',
            (definition) => {
                definition.schema_version = '1.0.0';
            },
            /external application: external list-query requires definition 2\.0\.0/,
        ],
    ];
    for (const [label, edit, message] of cases) {
        const product = await queryProduct(t, 'observatory', edit);
        await assert.rejects(
            planExternalListQuery(product.options),
            message,
            label
        );
    }
});

test('C3a : M-2, le contrat lu doit être celui que déclarent les pages', async (t) => {
    const product = await sessionApp(t, 'observatory');
    // Même identifiant de contrat, autres octets (formatage compact) : la
    // définition le référence exactement, mais les pages déclarent l'original.
    const contractPath = join(
        product.root,
        'descriptions/session-observatory/backend.json'
    );
    const contract = JSON.parse(await readFile(contractPath, 'utf8'));
    await writeFile(contractPath, JSON.stringify(contract));
    const definitionPath = await writeExternalQueryDefinition(
        product.root,
        'observatory'
    );
    await assert.rejects(
        planExternalListQuery({ ...product.base, definitionPath }),
        /backend contract differs from the contract declared by the application pages/
    );
});

test('C3b : une contrainte non synthétisable est un refus nommé de la commande', async (t) => {
    const product = await sessionApp(t, 'observatory');
    const contractPath = join(
        product.root,
        'descriptions/session-observatory/backend.json'
    );
    const contract = JSON.parse(await readFile(contractPath, 'utf8'));
    const item = contract.models.find((model) =>
        (model.fields ?? []).some((field) => field.name === 'label')
    );
    item.fields.push({
        ...structuredClone(item.fields.find((field) => field.name === 'label')),
        name: 'reference',
        constraints: { pattern: '^[A-Z]+$' },
    });
    await writeFile(contractPath, JSON.stringify(contract, null, 2) + '\n');
    const definitionPath = await writeExternalQueryDefinition(
        product.root,
        'observatory'
    );
    await assert.rejects(
        planExternalListQuery({ ...product.base, definitionPath }),
        /^Error: external application: LIST_QUERY_CONFORMANCE_UNSYNTHESIZABLE: field [a-z-]+\.reference has constraint pattern$/
    );
});

test('C3a : le CLI ne fait qu’aiguiller ; sorties fermées', async (t) => {
    const product = await queryProduct(t, 'equipment-hire');
    const args = [
        '--target-root',
        product.root,
        '--app',
        product.shell.appName,
        '--definition',
        product.options.definitionPath,
    ];
    const dry = cli([...args, '--dry-run']);
    assert.equal(dry.status, 0, dry.stderr);
    const plan = JSON.parse(dry.stdout);
    assert.equal(plan.query_id, 'equipment-hire-catalogue');
    assert.match(plan.plan_id, /^[a-f0-9]{64}$/);
    const extra = cli([...args, '--out', 'x', '--dry-run']);
    assert.equal(extra.status, 1);
    assert.match(
        extra.stderr,
        /argument not allowed with --target-root: --out/
    );
    const both = cli([...args, '--dry-run', '--apply', plan.plan_id]);
    assert.equal(both.status, 1);
    assert.match(both.stderr, /requires --dry-run or --apply <plan_id>/);
    const unreviewed = cli([...args, '--apply', 'f'.repeat(64)]);
    assert.equal(unreviewed.status, 1);
    assert.doesNotMatch(
        unreviewed.stderr,
        new RegExp(TOOLS_ROOT.replaceAll('/', '\\/'))
    );
});
