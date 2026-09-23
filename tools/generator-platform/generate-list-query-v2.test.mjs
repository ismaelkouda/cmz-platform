import assert from 'node:assert/strict';
import { access, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import test from 'node:test';

import { typecheckGenerated } from './core/typecheck-generated.mjs';
import { generateListQuery } from './generate-list-query.mjs';
import { computeListQueryV2Targets } from './list-query-v2-targets.mjs';
import {
    loadJson,
    repositoryRoot,
    validateJsonSchema,
} from './validate-ir.mjs';

const definitionPath = resolve(
    repositoryRoot,
    'tools/generator-platform/fixtures/site-group-select.v2.definition.json'
);
const evolvedDefinitionPath = resolve(
    repositoryRoot,
    'tools/generator-platform/fixtures/editorial-blocks.v2.definition.json'
);

async function exists(path) {
    try {
        await access(path);
        return true;
    } catch (error) {
        if (error.code === 'ENOENT') return false;
        throw error;
    }
}

async function withOutput(run) {
    const parent = await mkdtemp(
        resolve(tmpdir(), 'cmz-list-query-v2-publish-')
    );
    const outputRoot = resolve(parent, 'output');
    try {
        await run(outputRoot);
    } finally {
        await rm(parent, { recursive: true, force: true });
    }
}

test('v2 materializes one schema-valid target-neutral plan across Angular and React', async () => {
    const [computed, schema] = await Promise.all([
        computeListQueryV2Targets({ definitionPath }),
        loadJson(new URL('schemas/artifact-plan.schema.json', import.meta.url)),
    ]);

    assert.deepEqual(validateJsonSchema(computed.artifactPlan, schema), []);
    assert.equal(
        computed.artifactPlan.input.kind,
        'list-query-execution-model'
    );
    assert.equal(
        computed.angular.manifest.plan.sha256,
        computed.react.manifest.plan.sha256
    );
    assert.equal(
        computed.angular.manifest.input.sha256,
        computed.react.manifest.input.sha256
    );
    const planned = new Set(
        computed.artifactPlan.artifacts.map(({ id }) => id)
    );
    for (const target of [computed.angular, computed.react]) {
        assert.deepEqual(
            new Set(
                target.manifest.files.map(({ artifact_id }) => artifact_id)
            ),
            planned
        );
    }
});

test('v2 publishes durably, settles deterministically, and evolves only through a reviewed change set', async () => {
    await withOutput(async (outputRoot) => {
        const created = await generateListQuery({
            definitionPath,
            outputRoot,
            target: 'all',
        });

        assert.equal(created.publication.status, 'created');
        assert.equal(created.modelKind, 'list-query-execution-model');
        assert.deepEqual(created.targets, ['angular', 'reactjs']);
        assert.equal(
            (await loadJson(resolve(outputRoot, 'artifact-plan.json'))).input
                .kind,
            'list-query-execution-model'
        );
        assert.equal(
            (
                await loadJson(
                    resolve(outputRoot, 'list-query-execution-model.json')
                )
            ).model_id,
            'coverage-area-site-groups-list-query-execution'
        );
        assert.equal(
            await exists(resolve(outputRoot, 'semantic-model.json')),
            false
        );
        assert.equal(
            await exists(resolve(outputRoot, 'evidence-model.json')),
            false
        );
        for (const target of created.targets) {
            const manifest = await loadJson(
                resolve(outputRoot, target, 'generation-manifest.json')
            );
            assert.equal(manifest.input.sha256, created.modelSha256);
        }

        const settled = await generateListQuery({
            definitionPath,
            outputRoot,
            target: 'all',
            dryRun: true,
        });
        assert.deepEqual(settled.changeSet.summary, {
            create: 0,
            replace: 0,
            preserve: 0,
            delete: 0,
            unchanged: 13,
        });

        const reviewed = await generateListQuery({
            definitionPath: evolvedDefinitionPath,
            outputRoot,
            target: 'all',
            dryRun: true,
        });
        assert.ok(reviewed.changeSet.summary.create > 0);
        assert.ok(reviewed.changeSet.summary.delete > 0);
        assert.equal(
            await exists(
                resolve(outputRoot, 'angular/src/list-site-groups.facade.ts')
            ),
            true
        );

        const applied = await generateListQuery({
            definitionPath: evolvedDefinitionPath,
            outputRoot,
            target: 'all',
            applyChangeSetId: reviewed.changeSet.change_set_id,
        });
        assert.equal(applied.publication.status, 'applied');
        assert.equal(
            await exists(
                resolve(outputRoot, 'angular/src/list-site-groups.facade.ts')
            ),
            false
        );
        assert.match(
            await readFile(
                resolve(
                    outputRoot,
                    'reactjs/src/list-home-block-infos.client.ts'
                ),
                'utf8'
            ),
            /class ListHomeBlockInfosClient/
        );
    });
});

test('v2 rejects the v1-only layered target before creating output', async () => {
    await withOutput(async (outputRoot) => {
        await assert.rejects(
            generateListQuery({
                definitionPath,
                outputRoot,
                target: 'angular-layered',
                dryRun: true,
            }),
            /does not support --target angular-layered/
        );
        assert.equal(await exists(outputRoot), false);
    });
});

test('generated typechecking resolves declared workspace ports but rejects an unknown alias', () => {
    assert.throws(
        () =>
            typecheckGenerated(
                {
                    'src/index.ts':
                        "import type { Missing } from '@cmz/not-a-real-port';\nexport type Probe = Missing;\n",
                },
                'unknown-host-port',
                repositoryRoot
            ),
        /Cannot find module '@cmz\/not-a-real-port'/
    );
});
