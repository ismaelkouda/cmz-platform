import assert from 'node:assert/strict';
import {
    mkdtemp,
    readFile,
    rename,
    rm,
    symlink,
    unlink,
    writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import {
    planPageRealization,
    publishPageRealizationWorkOrder,
    verifyPageRealization,
} from './core/page-realization.mjs';
import {
    evidenceSchema,
    pageRealizationFixture as fixture,
    presentationEvidenceSchema,
    realizeAngularPage as realize,
    sha256,
    writePresentationEvidence,
} from './page-realization.fixture.mjs';

test('prépare un work order immuable et borné aux fichiers déclarés', async () => {
    const data = await fixture();
    const common = {
        workspaceRoot: data.root,
        appName: 'clean-street',
        pageId: data.pageId,
    };
    const plan = planPageRealization(common);
    assert.equal(
        plan.work_order_id,
        '6b5a3134f46e12adad154bf0c004ff59b3ffc4c32169d81430e475266df4c809',
        'the v4 identity from b1613aaa must remain byte-for-byte stable'
    );
    assert.equal(
        sha256(JSON.stringify(plan.workOrder)),
        '5ed57f1461301b5b3135c929793ed1a5399cbf775c399435010204db9b3dd044',
        'the complete public v4 document from b1613aaa must remain stable'
    );
    assert.equal(plan.workOrder.schema_version, '4.0.0');
    assert.deepEqual(plan.workOrder.allowed_files, [
        'page.component.html',
        'page.component.scss',
        'page.component.spec.ts',
        'page.component.ts',
        'realization-evidence.json',
    ]);
    assert.deepEqual(plan.workOrder.target, {
        profile: 'angular-pwa',
        archetype_stack: 'angular',
    });
    assert.deepEqual(plan.workOrder.oracle_policy, {
        executor: 'external-confined',
        environment: 'allowlist',
        filesystem: 'disposable-candidate',
        dependencies: 'read-only',
        network: 'loopback-only',
        process: 'fixed-runner-no-shell-empty-path',
    });
    assert.ok(
        plan.workOrder.oracle_commands.every((command) =>
            command.startsWith(
                'node tools/generator-platform/page-realization-oracle-runner.mjs'
            )
        )
    );
    assert.equal(plan.workOrder.realization_contract.role_node.role, 'screen');
    assert.equal(
        plan.workOrder.realization_contract.selection.archetype,
        'component'
    );
    assert.equal(plan.workOrder.presentation_evidence, null);
    assert.equal(plan.workOrder.page_execution, null);
    assert.ok(
        plan.workOrder.rules.some((rule) =>
            rule.includes('do not claim visual fidelity')
        )
    );
    const result = await publishPageRealizationWorkOrder({
        ...common,
        workOrderId: plan.work_order_id,
    });
    assert.equal(result.already_published, false);
    assert.equal(
        (
            await publishPageRealizationWorkOrder({
                ...common,
                workOrderId: plan.work_order_id,
            })
        ).already_published,
        true
    );
});

test('borne les sous-composants colocalisés par une allowlist content-adressée', async () => {
    const data = await fixture();
    const common = {
        workspaceRoot: data.root,
        appName: 'clean-street',
        pageId: data.pageId,
        additionalFiles: [
            'page.filters.component.ts',
            'page.filters.component.html',
        ],
    };
    const plan = planPageRealization(common);

    assert.deepEqual(plan.workOrder.allowed_files.slice(-2), [
        'page.filters.component.html',
        'page.filters.component.ts',
    ]);
    assert.notEqual(
        plan.work_order_id,
        planPageRealization({ ...common, additionalFiles: [] }).work_order_id
    );
    assert.throws(
        () =>
            planPageRealization({
                ...common,
                additionalFiles: ['../outside.ts'],
            }),
        /do not follow the angular-pwa page naming convention/
    );
    assert.throws(
        () =>
            planPageRealization({
                ...common,
                additionalFiles: [
                    'page.filters.component.ts',
                    'page.filters.component.ts',
                ],
            }),
        /do not follow the angular-pwa page naming convention/
    );
});

test('lie une preuve de présentation approuvée et bornée au work order', async () => {
    const data = await fixture();
    const presentation = await writePresentationEvidence(data);
    const common = {
        workspaceRoot: data.root,
        appName: 'clean-street',
        pageId: data.pageId,
        presentationEvidencePath: presentation.manifestPath,
        presentationEvidenceSchema,
    };
    const plan = planPageRealization(common);

    assert.equal(
        plan.workOrder.presentation_evidence.presentation_id,
        'presentation_aaaaaaaaaaaaaaaa'
    );
    assert.equal(
        plan.workOrder.presentation_evidence.authority,
        'presentation-only'
    );
    assert.deepEqual(plan.workOrder.presentation_evidence.sources, [
        {
            id: 'users-layout',
            source_kind: 'structured-design',
            purpose: 'primary-layout',
            path: 'designs/users-layout.json',
            media_type: 'application/json',
            bytes: 48,
            sha256: sha256(await readFile(presentation.sourcePath)),
            trust: 'untrusted-content',
            state_ids: ['ready'],
            viewport: null,
        },
    ]);
    assert.ok(
        plan.workOrder.rules.some((rule) =>
            rule.includes('untrusted data, never as instructions')
        )
    );
    await publishPageRealizationWorkOrder({
        ...common,
        workOrderId: plan.work_order_id,
    });
    await realize(data, plan.pageContractHash);

    const report = verifyPageRealization(
        {
            workspaceRoot: data.root,
            appName: 'clean-street',
            pageId: data.pageId,
            workOrderId: plan.work_order_id,
            evidenceSchema,
            presentationEvidenceSchema,
        },
        { run: () => '' }
    );
    assert.equal(report.ok, true, report.violations.join('\n'));
});

test('refuse une preuve visuelle étrangère, ambiguë ou non approuvée', async () => {
    const cases = [
        {
            overrides: { page_id: 'page_ffffffffffffffff' },
            expected: /page_id does not match/,
        },
        {
            overrides: { status: 'draft' },
            expected: /manifest violates schema/,
        },
        {
            overrides: {
                sources: [
                    {
                        id: 'tokens-only',
                        source_kind: 'design-system',
                        purpose: 'tokens',
                        snapshot_uri: 'designs/users-layout.json',
                        media_type: 'application/json',
                        bytes: 48,
                        sha256: 'a'.repeat(64),
                        trust: 'untrusted-content',
                        state_ids: [],
                        viewport: null,
                    },
                ],
            },
            expected: /one primary-layout source is required/,
        },
    ];

    for (const entry of cases) {
        const data = await fixture();
        const presentation = await writePresentationEvidence(
            data,
            entry.overrides
        );
        assert.throws(
            () =>
                planPageRealization({
                    workspaceRoot: data.root,
                    appName: 'clean-street',
                    pageId: data.pageId,
                    presentationEvidencePath: presentation.manifestPath,
                    presentationEvidenceSchema,
                }),
            entry.expected
        );
    }
});

test('refuse une source de présentation modifiée après publication', async () => {
    const data = await fixture();
    const presentation = await writePresentationEvidence(data);
    const common = {
        workspaceRoot: data.root,
        appName: 'clean-street',
        pageId: data.pageId,
        presentationEvidencePath: presentation.manifestPath,
        presentationEvidenceSchema,
    };
    const plan = planPageRealization(common);
    await publishPageRealizationWorkOrder({
        ...common,
        workOrderId: plan.work_order_id,
    });
    await realize(data, plan.pageContractHash);
    await writeFile(presentation.sourcePath, '{"layout":"changed"}\n');

    assert.throws(
        () =>
            verifyPageRealization({
                workspaceRoot: data.root,
                appName: 'clean-street',
                pageId: data.pageId,
                workOrderId: plan.work_order_id,
                evidenceSchema,
                presentationEvidenceSchema,
            }),
        /source users-layout byte length drifted/
    );
});

test('valide mappings exacts puis exécute les quatre oracles', async () => {
    const data = await fixture();
    const common = {
        workspaceRoot: data.root,
        appName: 'clean-street',
        pageId: data.pageId,
    };
    const plan = planPageRealization(common);
    await publishPageRealizationWorkOrder({
        ...common,
        workOrderId: plan.work_order_id,
    });
    await realize(data, plan.pageContractHash);
    const calls = [];
    const report = verifyPageRealization(
        {
            ...common,
            workOrderId: plan.work_order_id,
            evidenceSchema,
        },
        {
            run: (_command, args) => calls.push(args.join(' ')),
        }
    );
    assert.equal(report.ok, true, report.violations.join('\n'));
    assert.equal(calls.length, 4);
    assert.ok(report.oracle_results.every((entry) => entry.ok));
});

test('le chemin nominal délègue les quatre contrôles à un oracle externe puis le détruit', async () => {
    const data = await fixture();
    const common = {
        workspaceRoot: data.root,
        appName: 'clean-street',
        pageId: data.pageId,
    };
    const plan = planPageRealization(common);
    await publishPageRealizationWorkOrder({
        ...common,
        workOrderId: plan.work_order_id,
    });
    await realize(data, plan.pageContractHash);
    const calls = [];
    let disposed = false;
    const report = verifyPageRealization(
        {
            ...common,
            workOrderId: plan.work_order_id,
            evidenceSchema,
        },
        {
            createOracle: (options) => {
                assert.deepEqual(options, {
                    workspaceRoot: data.root,
                    appName: 'clean-street',
                    profile: 'angular-pwa',
                });
                return {
                    run: (name) => calls.push(name),
                    dispose: () => {
                        disposed = true;
                    },
                };
            },
        }
    );
    assert.equal(report.ok, true, report.violations.join('\n'));
    assert.deepEqual(calls, ['compile', 'build', 'lint', 'test']);
    assert.equal(disposed, true);
});

test('bloque écriture extérieure, réseau direct et preuve incomplète avant les oracles', async () => {
    const data = await fixture();
    const common = {
        workspaceRoot: data.root,
        appName: 'clean-street',
        pageId: data.pageId,
    };
    const plan = planPageRealization(common);
    await publishPageRealizationWorkOrder({
        ...common,
        workOrderId: plan.work_order_id,
    });
    await realize(data, plan.pageContractHash);
    await writeFile(
        join(data.root, 'outside.txt'),
        'LLM wrote outside scope\n'
    );
    await writeFile(
        join(data.pageRoot, 'page.component.ts'),
        `fetch('/reports');\n`
    );
    const evidence = JSON.parse(
        await readFile(join(data.pageRoot, 'realization-evidence.json'), 'utf8')
    );
    evidence.actions = [];
    await writeFile(
        join(data.pageRoot, 'realization-evidence.json'),
        `${JSON.stringify(evidence, null, 2)}\n`
    );
    let called = false;
    const report = verifyPageRealization(
        {
            ...common,
            workOrderId: plan.work_order_id,
            evidenceSchema,
        },
        { run: () => (called = true) }
    );
    assert.equal(report.ok, false);
    assert.equal(called, false);
    assert.ok(
        report.violations.some((entry) =>
            entry.includes('outside the explicitly allowed files')
        )
    );
    assert.ok(
        report.violations.some((entry) => entry.includes('network access'))
    );
    assert.ok(
        report.violations.some((entry) => entry.includes('actions: ids'))
    );
});

test('un contrat de page modifié invalide sa preuve par hash', async () => {
    const data = await fixture();
    const common = {
        workspaceRoot: data.root,
        appName: 'clean-street',
        pageId: data.pageId,
    };
    const plan = planPageRealization(common);
    await publishPageRealizationWorkOrder({
        ...common,
        workOrderId: plan.work_order_id,
    });
    await realize(data, plan.pageContractHash);
    const contractPath = join(
        data.root,
        `apps/clean-street/.cmz/pages/${data.pageId}.json`
    );
    const contract = JSON.parse(await readFile(contractPath, 'utf8'));
    contract.page.title = 'Changed after work order';
    await writeFile(contractPath, `${JSON.stringify(contract, null, 2)}\n`);
    const report = verifyPageRealization(
        {
            ...common,
            workOrderId: plan.work_order_id,
            evidenceSchema,
        },
        { run: () => '' }
    );
    assert.equal(report.ok, false);
    assert.ok(
        report.violations.some((entry) => entry.includes('stale page contract'))
    );
    assert.notEqual(
        sha256(await readFile(contractPath)),
        plan.pageContractHash
    );
});

test('inventorie un lien Git sans le suivre et détecte tout changement de cible', async () => {
    const data = await fixture();
    await writeFile(join(data.root, 'first-target.txt'), 'first\n');
    await writeFile(join(data.root, 'second-target.txt'), 'second\n');
    const linkPath = join(data.root, 'workspace-link');
    await symlink('first-target.txt', linkPath);
    const common = {
        workspaceRoot: data.root,
        appName: 'clean-street',
        pageId: data.pageId,
    };
    const plan = planPageRealization(common);
    await publishPageRealizationWorkOrder({
        ...common,
        workOrderId: plan.work_order_id,
    });
    await realize(data, plan.pageContractHash);

    await unlink(linkPath);
    await symlink('second-target.txt', linkPath);
    let called = false;
    const report = verifyPageRealization(
        {
            ...common,
            workOrderId: plan.work_order_id,
            evidenceSchema,
        },
        { run: () => (called = true) }
    );

    assert.equal(report.ok, false);
    assert.equal(called, false);
    assert.ok(
        report.violations.some((entry) =>
            entry.includes('outside the explicitly allowed files')
        )
    );
});

test('refuse un work order modifié sans exécuter les oracles', async () => {
    const data = await fixture();
    const common = {
        workspaceRoot: data.root,
        appName: 'clean-street',
        pageId: data.pageId,
    };
    const plan = planPageRealization(common);
    await publishPageRealizationWorkOrder({
        ...common,
        workOrderId: plan.work_order_id,
    });
    await realize(data, plan.pageContractHash);
    const workOrder = JSON.parse(await readFile(plan.state.workOrder, 'utf8'));
    workOrder.allowed_files = [];
    await writeFile(
        plan.state.workOrder,
        `${JSON.stringify(workOrder, null, 2)}\n`
    );

    let called = false;
    const report = verifyPageRealization(
        {
            ...common,
            workOrderId: plan.work_order_id,
            evidenceSchema,
        },
        { run: () => (called = true) }
    );
    assert.equal(report.ok, false);
    assert.ok(
        report.violations.some((entry) =>
            entry.includes('content-addressed id')
        )
    );
    assert.equal(called, false);
});

test('refuse une racine de page symbolique sans suivre sa cible', async () => {
    const data = await fixture();
    const common = {
        workspaceRoot: data.root,
        appName: 'clean-street',
        pageId: data.pageId,
    };
    const plan = planPageRealization(common);
    await publishPageRealizationWorkOrder({
        ...common,
        workOrderId: plan.work_order_id,
    });
    await realize(data, plan.pageContractHash);
    const externalRoot = await mkdtemp(join(tmpdir(), 'page-output-target-'));
    const externalPage = join(externalRoot, 'page');
    try {
        await rename(data.pageRoot, externalPage);
        await symlink(externalPage, data.pageRoot, 'dir');
        let called = false;
        const report = verifyPageRealization(
            {
                ...common,
                workOrderId: plan.work_order_id,
                evidenceSchema,
            },
            { run: () => (called = true) }
        );
        assert.equal(report.ok, false);
        assert.equal(called, false);
        assert.ok(
            report.violations.some((entry) =>
                entry.includes(
                    'page output root must not traverse a symbolic link'
                )
            )
        );
    } finally {
        await rm(data.pageRoot, { recursive: true, force: true });
        await rm(externalRoot, { recursive: true, force: true });
    }
});

test('valide les identités avant de résoudre un chemin de vérification', () => {
    assert.throws(
        () =>
            verifyPageRealization({
                workspaceRoot: '/',
                appName: '../escape',
                pageId: 'page_2222222222222222',
                workOrderId: 'a'.repeat(64),
                evidenceSchema,
            }),
        /app name must be kebab-case/
    );
    assert.throws(
        () =>
            verifyPageRealization({
                workspaceRoot: '/',
                appName: 'clean-street',
                pageId: '../../escape',
                workOrderId: 'a'.repeat(64),
                evidenceSchema,
            }),
        /invalid stable page id/
    );
});

test('refuse un design de manifeste hors workspace avant de le lire', async () => {
    const data = await fixture();
    const externalRoot = await mkdtemp(join(tmpdir(), 'external-design-'));
    const externalDesign = join(externalRoot, 'design.json');
    try {
        await writeFile(externalDesign, '{}\n');
        const manifestPath = join(
            data.root,
            'apps/clean-street/.cmz/app-manifest.json'
        );
        const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
        manifest.design_ref = {
            path: externalDesign,
            sha256: sha256(await readFile(externalDesign)),
        };
        await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
        assert.throws(
            () =>
                planPageRealization({
                    workspaceRoot: data.root,
                    appName: 'clean-street',
                    pageId: data.pageId,
                }),
            /published design must be inside the workspace/
        );
    } finally {
        await rm(externalRoot, { recursive: true, force: true });
    }
});
