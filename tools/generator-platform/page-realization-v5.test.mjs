import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile, rm, symlink, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';

import {
    planPageRealization,
    publishPageRealizationWorkOrder,
    verifyPageRealization,
} from './core/page-realization.mjs';
import {
    evidenceSchema,
    layoutBindingSchema,
    layoutExampleSetSchema,
    pageRealizationFixture,
    realizeAngularPage,
    realizeReactPage,
    sha256,
    writeLayoutBindingAndCommit,
} from './page-realization.fixture.mjs';

async function v5Fixture(t, profile = 'angular-pwa') {
    const data = await pageRealizationFixture(profile);
    t.after(() => rm(data.root, { recursive: true, force: true }));
    const layout = await writeLayoutBindingAndCommit(data);
    const common = {
        workspaceRoot: data.root,
        appName: 'clean-street',
        pageId: data.pageId,
        layoutBindingPath: layout.bindingPath,
        layoutBindingSchema,
        layoutExampleSetSchema,
        authorityCommitSha: layout.baseCommitSha,
        baseCommitSha: layout.baseCommitSha,
    };
    return { data, layout, common };
}

async function commitJsonMutation(root, path, mutate, message) {
    const absolute = join(root, path);
    const value = JSON.parse(await readFile(absolute, 'utf8'));
    await mutate(value);
    await writeFile(absolute, `${JSON.stringify(value, null, 2)}\n`);
    execFileSync('git', ['add', '.'], { cwd: root });
    execFileSync('git', ['commit', '-qm', message], { cwd: root });
    return execFileSync('git', ['rev-parse', 'HEAD'], {
        cwd: root,
        encoding: 'utf8',
    }).trim();
}

test(
    'prépare, publie et vérifie un work order v5 depuis les blobs Git',
    { timeout: 15_000 },
    async (t) => {
        const { data, layout, common } = await v5Fixture(t);
        const first = planPageRealization(common);
        const second = planPageRealization(common);

        assert.equal(first.workOrder.schema_version, '5.0.0');
        assert.equal(first.work_order_id, second.work_order_id);
        assert.deepEqual(first.workOrder, second.workOrder);
        assert.equal(
            first.workOrder.authority_commit_sha,
            layout.baseCommitSha
        );
        assert.equal(first.workOrder.base_commit_sha, layout.baseCommitSha);
        assert.equal(
            first.workOrder.layout_guidance.authority,
            'layout-guidance-only'
        );
        assert.equal(
            Object.hasOwn(first.workOrder.layout_guidance, 'status'),
            false,
            'a local JSON field must not impersonate human approval'
        );
        assert.deepEqual(first.workOrder.layout_guidance.capabilities, [
            {
                id: 'create',
                status: 'declared',
                authorized_by: {
                    kind: 'page-action',
                    action_id: 'submit-report',
                },
            },
        ]);
        assert.ok(
            first.workOrder.layout_guidance.authority_sources.every(
                ({ mode }) => mode === '100644' || mode === '100755'
            )
        );
        assert.ok(
            first.workOrder.rules.some((rule) =>
                rule.includes('cannot create or override backend')
            )
        );
        assert.equal(
            planPageRealization({
                workspaceRoot: data.root,
                appName: 'clean-street',
                pageId: data.pageId,
            }).workOrder.schema_version,
            '4.0.0'
        );

        await publishPageRealizationWorkOrder({
            ...common,
            workOrderId: first.work_order_id,
        });
        assert.equal(
            (
                await publishPageRealizationWorkOrder({
                    ...common,
                    workOrderId: first.work_order_id,
                })
            ).already_published,
            true
        );
        await realizeAngularPage(data, first.pageContractHash);
        const calls = [];
        const report = verifyPageRealization(
            {
                workspaceRoot: data.root,
                appName: 'clean-street',
                pageId: data.pageId,
                workOrderId: first.work_order_id,
                evidenceSchema,
                layoutBindingSchema,
                layoutExampleSetSchema,
            },
            { run: (command, args) => calls.push([command, ...args]) }
        );
        assert.equal(report.ok, true, report.violations.join('\n'));
        assert.equal(calls.length, 4);
    }
);

test(
    'applique la même autorité v5 au renderer React sans partager son code UI',
    { timeout: 15_000 },
    async (t) => {
        const { data, common } = await v5Fixture(t, 'react-spa');
        const plan = planPageRealization(common);
        assert.deepEqual(plan.workOrder.target, {
            profile: 'react-spa',
            archetype_stack: 'reactjs',
        });
        await publishPageRealizationWorkOrder({
            ...common,
            workOrderId: plan.work_order_id,
        });
        await realizeReactPage(data, plan.pageContractHash);
        let calls = 0;
        const report = verifyPageRealization(
            {
                workspaceRoot: data.root,
                appName: 'clean-street',
                pageId: data.pageId,
                workOrderId: plan.work_order_id,
                evidenceSchema,
                layoutBindingSchema,
                layoutExampleSetSchema,
            },
            { run: () => (calls += 1) }
        );
        assert.equal(report.ok, true, report.violations.join('\n'));
        assert.equal(calls, 4);
    }
);

test(
    'refuse une préparation v5 sale ou une autorité différente de la base',
    { timeout: 15_000 },
    async (t) => {
        const { data, common } = await v5Fixture(t);
        const parent = execFileSync('git', ['rev-parse', 'HEAD^'], {
            cwd: data.root,
            encoding: 'utf8',
        }).trim();
        assert.throws(
            () =>
                planPageRealization({ ...common, authorityCommitSha: parent }),
            /authority_commit_sha must equal base_commit_sha/
        );
        await writeFile(
            join(data.root, 'untracked.txt'),
            'not authoritative\n'
        );
        assert.throws(
            () => planPageRealization(common),
            /requires a clean Git worktree and index/
        );
    }
);

test(
    'refuse un fichier autorisé créé avant le work order puis masqué localement',
    { timeout: 15_000 },
    async (t) => {
        const { data, common } = await v5Fixture(t);
        await writeFile(
            join(data.pageRoot, 'page.filters.component.ts'),
            'export const plantedBeforeApproval = true;\n'
        );
        await writeFile(
            join(data.root, '.git/info/exclude'),
            'apps/clean-street/src/app/pages/page_2222222222222222/page.filters.component.ts\n'
        );
        assert.throws(
            () =>
                planPageRealization({
                    ...common,
                    additionalFiles: ['page.filters.component.ts'],
                }),
            /requires a clean Git worktree|existed before the work order/
        );
    }
);

test(
    'canonicalise l’ordre des sources par points de code sans dépendre de la locale',
    { timeout: 15_000 },
    async (t) => {
        const { data, layout, common } = await v5Fixture(t);
        const unicodePath = 'ä.layout-binding.json';
        execFileSync('git', ['mv', layout.bindingPath, unicodePath], {
            cwd: data.root,
        });
        execFileSync('git', ['commit', '-qm', 'use unicode binding path'], {
            cwd: data.root,
        });
        const head = execFileSync('git', ['rev-parse', 'HEAD'], {
            cwd: data.root,
            encoding: 'utf8',
        }).trim();
        const plan = planPageRealization({
            ...common,
            layoutBindingPath: unicodePath,
            authorityCommitSha: head,
            baseCommitSha: head,
        });
        const paths = plan.workOrder.layout_guidance.authority_sources.map(
            ({ path }) => path
        );
        assert.deepEqual(paths, [...paths].sort());
        assert.equal(paths.at(-1), unicodePath);
    }
);

test(
    'refuse une base qui ne correspond plus au HEAD propre de préparation',
    { timeout: 15_000 },
    async (t) => {
        const { data, common } = await v5Fixture(t);
        await writeFile(join(data.root, 'later.txt'), 'later commit\n');
        execFileSync('git', ['add', '.'], { cwd: data.root });
        execFileSync('git', ['commit', '-qm', 'advance head'], {
            cwd: data.root,
        });
        assert.throws(
            () => planPageRealization(common),
            /base_commit_sha must equal HEAD during v5 preparation/
        );
    }
);

for (const entry of [
    {
        label: 'action inconnue',
        mutate: (binding) => {
            binding.capabilities[0].authorized_by.action_id = 'missing-action';
        },
        expected: /references an unknown page action/,
    },
    {
        label: 'capacité de shell',
        mutate: (binding) => {
            binding.capabilities[0].id = 'workspace-tabs';
        },
        expected: /belongs to the application shell/,
    },
    {
        label: 'région incompatible',
        mutate: (binding) => {
            binding.selections[0].regions = ['data-grid'];
        },
        expected: /invalid authoritative region set/,
    },
    {
        label: 'budget de sélections',
        mutate: (binding) => {
            binding.selections = Array.from({ length: 33 }, () =>
                structuredClone(binding.selections[0])
            );
        },
        expected: /selections must contain at most 32 entries/,
    },
]) {
    test(
        `refuse l’autorité de layout invalide : ${entry.label}`,
        { timeout: 15_000 },
        async (t) => {
            const { data, layout, common } = await v5Fixture(t);
            const head = await commitJsonMutation(
                data.root,
                layout.bindingPath,
                entry.mutate,
                entry.label
            );
            assert.throws(
                () =>
                    planPageRealization({
                        ...common,
                        authorityCommitSha: head,
                        baseCommitSha: head,
                    }),
                entry.expected
            );
        }
    );
}

test(
    'résout puis ferme contrat, opération et paramètres backend',
    { timeout: 20_000 },
    async (t) => {
        const { data, layout, common } = await v5Fixture(t);
        const pageContractPath = `apps/clean-street/.cmz/pages/${data.pageId}.json`;
        const pageContractAbsolute = join(data.root, pageContractPath);
        const pageContract = JSON.parse(
            await readFile(pageContractAbsolute, 'utf8')
        );
        const backendRef = pageContract.backend_contracts[0];
        const backendAbsolute = join(data.root, backendRef.snapshot_uri);
        const backend = JSON.parse(await readFile(backendAbsolute, 'utf8'));
        const operation = backend.operations[0];
        operation.request.parameters = [{ name: 'search' }];
        const backendContent = Buffer.from(
            `${JSON.stringify(backend, null, 2)}\n`
        );
        await writeFile(backendAbsolute, backendContent);
        backendRef.sha256 = sha256(backendContent);
        const pageContent = Buffer.from(
            `${JSON.stringify(pageContract, null, 2)}\n`
        );
        await writeFile(pageContractAbsolute, pageContent);

        const manifestAbsolute = join(data.root, layout.exampleSetPath);
        const manifest = JSON.parse(await readFile(manifestAbsolute, 'utf8'));
        manifest.sources[0].capabilities_shown = ['search'];
        const manifestContent = Buffer.from(
            `${JSON.stringify(manifest, null, 2)}\n`
        );
        await writeFile(manifestAbsolute, manifestContent);

        const bindingAbsolute = join(data.root, layout.bindingPath);
        const validBinding = JSON.parse(
            await readFile(bindingAbsolute, 'utf8')
        );
        validBinding.page_contract_sha256 = sha256(pageContent);
        validBinding.example_sets[0].sha256 = sha256(manifestContent);
        validBinding.capabilities = [
            {
                id: 'search',
                status: 'declared',
                authorized_by: {
                    kind: 'backend-parameter',
                    contract_id: backendRef.id,
                    operation_id: operation.id,
                    parameters: ['search'],
                },
            },
        ];
        await writeFile(
            bindingAbsolute,
            `${JSON.stringify(validBinding, null, 2)}\n`
        );
        execFileSync('git', ['add', '.'], { cwd: data.root });
        execFileSync('git', ['commit', '-qm', 'add backend layout authority'], {
            cwd: data.root,
        });
        let head = execFileSync('git', ['rev-parse', 'HEAD'], {
            cwd: data.root,
            encoding: 'utf8',
        }).trim();
        const validPlan = planPageRealization({
            ...common,
            authorityCommitSha: head,
            baseCommitSha: head,
        });
        assert.deepEqual(
            validPlan.workOrder.layout_guidance.capabilities[0].authorized_by,
            validBinding.capabilities[0].authorized_by
        );

        for (const mutation of [
            {
                label: 'unknown backend contract',
                apply: (binding) => {
                    binding.capabilities[0].authorized_by.contract_id =
                        'missing-contract';
                },
                expected: /unknown backend contract/,
            },
            {
                label: 'unknown backend operation',
                apply: (binding) => {
                    binding.capabilities[0].authorized_by.operation_id =
                        'missing-operation';
                },
                expected: /unknown operation/,
            },
            {
                label: 'unknown backend parameter',
                apply: (binding) => {
                    binding.capabilities[0].authorized_by.parameters = [
                        'missing_parameter',
                    ];
                },
                expected: /unknown parameter/,
            },
        ]) {
            const invalid = structuredClone(validBinding);
            mutation.apply(invalid);
            await writeFile(
                bindingAbsolute,
                `${JSON.stringify(invalid, null, 2)}\n`
            );
            execFileSync('git', ['add', '.'], { cwd: data.root });
            execFileSync('git', ['commit', '-qm', mutation.label], {
                cwd: data.root,
            });
            head = execFileSync('git', ['rev-parse', 'HEAD'], {
                cwd: data.root,
                encoding: 'utf8',
            }).trim();
            assert.throws(
                () =>
                    planPageRealization({
                        ...common,
                        authorityCommitSha: head,
                        baseCommitSha: head,
                    }),
                mutation.expected
            );
        }
    }
);

test(
    'refuse une source de rendu modifiée dans la fermeture d’autorité',
    { timeout: 15_000 },
    async (t) => {
        const { data, common } = await v5Fixture(t);
        await writeFile(
            join(
                data.root,
                'examples/presentation/proof-layout-examples/mockup.html'
            ),
            '<main>drift</main>\n'
        );
        execFileSync('git', ['add', '.'], { cwd: data.root });
        execFileSync('git', ['commit', '-qm', 'drift render source'], {
            cwd: data.root,
        });
        const head = execFileSync('git', ['rev-parse', 'HEAD'], {
            cwd: data.root,
            encoding: 'utf8',
        }).trim();
        assert.throws(
            () =>
                planPageRealization({
                    ...common,
                    authorityCommitSha: head,
                    baseCommitSha: head,
                }),
            /render source .* (?:byte length|sha256) drifted/
        );
    }
);

test(
    'refuse un PNG invalide même lorsque tous les hashes concordent',
    { timeout: 15_000 },
    async (t) => {
        const { data, layout, common } = await v5Fixture(t);
        const invalidImage = Buffer.from('not-a-png');
        await writeFile(join(data.root, layout.imagePath), invalidImage);
        const manifestPath = join(data.root, layout.exampleSetPath);
        const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
        manifest.sources[0].bytes = invalidImage.byteLength;
        manifest.sources[0].sha256 = sha256(invalidImage);
        const manifestContent = Buffer.from(
            `${JSON.stringify(manifest, null, 2)}\n`
        );
        await writeFile(manifestPath, manifestContent);
        const head = await commitJsonMutation(
            data.root,
            layout.bindingPath,
            (binding) => {
                binding.example_sets[0].sha256 = sha256(manifestContent);
            },
            'forge invalid png with consistent hashes'
        );
        assert.throws(
            () =>
                planPageRealization({
                    ...common,
                    authorityCommitSha: head,
                    baseCommitSha: head,
                }),
            /is not a PNG payload/
        );
    }
);

test(
    'refuse un binding Git symbolique même si sa cible existe',
    { timeout: 15_000 },
    async (t) => {
        const { data, layout, common } = await v5Fixture(t);
        const absolute = join(data.root, layout.bindingPath);
        const target = join(data.root, 'designs/binding-target.json');
        await writeFile(target, await readFile(absolute));
        await unlink(absolute);
        await symlink('binding-target.json', absolute);
        execFileSync('git', ['add', '.'], { cwd: data.root });
        execFileSync('git', ['commit', '-qm', 'replace binding with symlink'], {
            cwd: data.root,
        });
        const head = execFileSync('git', ['rev-parse', 'HEAD'], {
            cwd: data.root,
            encoding: 'utf8',
        }).trim();
        assert.throws(
            () =>
                planPageRealization({
                    ...common,
                    authorityCommitSha: head,
                    baseCommitSha: head,
                }),
            /layout binding must not be a symbolic link/
        );
    }
);

test(
    'refuse les dérives d’autorité committées plutôt que de les relire localement',
    { timeout: 15_000 },
    async (t) => {
        const { data, layout, common } = await v5Fixture(t);
        await writeFile(
            join(data.root, layout.imagePath),
            Buffer.concat([
                Buffer.from('89504e470d0a1a0a', 'hex'),
                Buffer.from('changed-in-new-commit'),
            ])
        );
        execFileSync('git', ['add', '.'], { cwd: data.root });
        execFileSync('git', ['commit', '-qm', 'drift layout image'], {
            cwd: data.root,
        });
        const head = execFileSync('git', ['rev-parse', 'HEAD'], {
            cwd: data.root,
            encoding: 'utf8',
        }).trim();
        assert.throws(
            () =>
                planPageRealization({
                    ...common,
                    authorityCommitSha: head,
                    baseCommitSha: head,
                }),
            /example proof-layout\/expanded-create (?:byte length|sha256) drifted/
        );
    }
);

test(
    'refuse toute altération du document v5 avant les oracles',
    { timeout: 15_000 },
    async (t) => {
        const { data, common } = await v5Fixture(t);
        const plan = planPageRealization(common);
        await publishPageRealizationWorkOrder({
            ...common,
            workOrderId: plan.work_order_id,
        });
        await realizeAngularPage(data, plan.pageContractHash);
        const stored = JSON.parse(await readFile(plan.state.workOrder, 'utf8'));
        stored.layout_guidance.sources[0].regions = [];
        await writeFile(
            plan.state.workOrder,
            `${JSON.stringify(stored, null, 2)}\n`
        );
        let calls = 0;
        const report = verifyPageRealization(
            {
                workspaceRoot: data.root,
                appName: 'clean-street',
                pageId: data.pageId,
                workOrderId: plan.work_order_id,
                evidenceSchema,
                layoutBindingSchema,
                layoutExampleSetSchema,
            },
            { run: () => (calls += 1) }
        );
        assert.equal(report.ok, false);
        assert.match(report.violations.join('\n'), /content-addressed id/);
        assert.equal(calls, 0);
    }
);

test(
    'refuse une substitution locale d’autorité avant les oracles',
    { timeout: 15_000 },
    async (t) => {
        const { data, layout, common } = await v5Fixture(t);
        const plan = planPageRealization(common);
        await publishPageRealizationWorkOrder({
            ...common,
            workOrderId: plan.work_order_id,
        });
        await realizeAngularPage(data, plan.pageContractHash);
        await writeFile(
            join(data.root, layout.imagePath),
            Buffer.concat([
                Buffer.from('89504e470d0a1a0a', 'hex'),
                Buffer.from('substituted-layout'),
            ])
        );
        let calls = 0;
        assert.throws(
            () =>
                verifyPageRealization(
                    {
                        workspaceRoot: data.root,
                        appName: 'clean-street',
                        pageId: data.pageId,
                        workOrderId: plan.work_order_id,
                        evidenceSchema,
                        layoutBindingSchema,
                        layoutExampleSetSchema,
                    },
                    { run: () => (calls += 1) }
                ),
            /candidate changed protected paths/
        );
        assert.equal(calls, 0);
    }
);

test(
    'refuse downgrade, omission, champ inconnu et base non ancêtre avant les oracles',
    { timeout: 20_000 },
    async (t) => {
        const { data, common } = await v5Fixture(t);
        const plan = planPageRealization(common);
        await publishPageRealizationWorkOrder({
            ...common,
            workOrderId: plan.work_order_id,
        });
        await realizeAngularPage(data, plan.pageContractHash);
        const original = JSON.parse(
            await readFile(plan.state.workOrder, 'utf8')
        );
        const orphanTree = execFileSync('git', ['mktree'], {
            cwd: data.root,
            input: '',
            encoding: 'utf8',
        }).trim();
        const orphan = execFileSync(
            'git',
            ['commit-tree', orphanTree, '-m', 'orphan'],
            {
                cwd: data.root,
                encoding: 'utf8',
            }
        ).trim();
        const cases = [
            {
                label: 'guidance retirée',
                mutate: (workOrder) => delete workOrder.layout_guidance,
                expected: /requires layout_guidance/,
            },
            {
                label: 'downgrade v4',
                mutate: (workOrder) => (workOrder.schema_version = '4.0.0'),
                expected: /v4 work order must not contain v5 authority fields/,
            },
            {
                label: 'base non ancêtre',
                mutate: (workOrder) => {
                    workOrder.authority_commit_sha = orphan;
                    workOrder.base_commit_sha = orphan;
                },
                expected: /must be an ancestor of the candidate HEAD/,
            },
            {
                label: 'commit inexistant',
                mutate: (workOrder) => {
                    workOrder.authority_commit_sha = '0'.repeat(40);
                    workOrder.base_commit_sha = '0'.repeat(40);
                },
                expected: /git cat-file failed/,
            },
        ];
        let calls = 0;
        for (const entry of cases) {
            const mutated = structuredClone(original);
            entry.mutate(mutated);
            await writeFile(
                plan.state.workOrder,
                `${JSON.stringify(mutated, null, 2)}\n`
            );
            assert.throws(
                () =>
                    verifyPageRealization(
                        {
                            workspaceRoot: data.root,
                            appName: 'clean-street',
                            pageId: data.pageId,
                            workOrderId: plan.work_order_id,
                            evidenceSchema,
                            layoutBindingSchema,
                            layoutExampleSetSchema,
                        },
                        { run: () => (calls += 1) }
                    ),
                entry.expected,
                entry.label
            );
        }

        const unknown = structuredClone(original);
        unknown.unreviewed_field = true;
        await writeFile(
            plan.state.workOrder,
            `${JSON.stringify(unknown, null, 2)}\n`
        );
        const report = verifyPageRealization(
            {
                workspaceRoot: data.root,
                appName: 'clean-street',
                pageId: data.pageId,
                workOrderId: plan.work_order_id,
                evidenceSchema,
                layoutBindingSchema,
                layoutExampleSetSchema,
            },
            { run: () => (calls += 1) }
        );
        assert.equal(report.ok, false);
        assert.match(report.violations.join('\n'), /content-addressed id/);
        assert.equal(calls, 0);
    }
);

test(
    'refuse toute tentative de faire référencer le work order par le binding amont',
    { timeout: 15_000 },
    async (t) => {
        const { data, layout, common } = await v5Fixture(t);
        const path = join(data.root, layout.bindingPath);
        const binding = JSON.parse(await readFile(path, 'utf8'));
        binding.work_order_id = 'a'.repeat(64);
        await writeFile(path, `${JSON.stringify(binding, null, 2)}\n`);
        execFileSync('git', ['add', '.'], { cwd: data.root });
        execFileSync('git', ['commit', '-qm', 'introduce authority cycle'], {
            cwd: data.root,
        });
        const head = execFileSync('git', ['rev-parse', 'HEAD'], {
            cwd: data.root,
            encoding: 'utf8',
        }).trim();
        assert.throws(
            () =>
                planPageRealization({
                    ...common,
                    authorityCommitSha: head,
                    baseCommitSha: head,
                }),
            /binding violates schema/
        );
    }
);
