import assert from 'node:assert/strict';
import { access, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import test from 'node:test';

import { generateActionRequest } from './generate-action-request.mjs';
import { loadJson, repositoryRoot } from './validate-ir.mjs';

const definitionPath = resolve(
    repositoryRoot,
    'tools/generator-platform/fixtures/forgot-password.v2.definition.json'
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

async function withWorkspace(run) {
    const parent = await mkdtemp(
        resolve(tmpdir(), 'cmz-action-request-v2-publish-')
    );
    try {
        await run({
            outputRoot: resolve(parent, 'output'),
            evolvedDefinitionPath: resolve(
                parent,
                'forgot-password.evolved.definition.json'
            ),
        });
    } finally {
        await rm(parent, { recursive: true, force: true });
    }
}

test('v2 publishes both targets, settles, and applies only the reviewed evolution', async () => {
    await withWorkspace(async ({ outputRoot, evolvedDefinitionPath }) => {
        const created = await generateActionRequest({
            definitionPath,
            outputRoot,
            target: 'all',
        });

        assert.equal(created.publication.status, 'created');
        assert.equal(created.modelKind, 'action-request-execution-model');
        assert.deepEqual(created.targets, ['angular', 'reactjs']);
        assert.equal(
            (await loadJson(resolve(outputRoot, 'artifact-plan.json'))).input
                .kind,
            'action-request-execution-model'
        );
        assert.equal(
            (
                await loadJson(
                    resolve(outputRoot, 'action-request-execution-model.json')
                )
            ).model_id,
            'authentication-password-recovery-action-request-execution'
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

        const angularSourcePath = resolve(
            outputRoot,
            'angular/src/forgot-password.source.ts'
        );
        const reactClientPath = resolve(
            outputRoot,
            'reactjs/src/forgot-password.client.ts'
        );
        const [angularSource, reactClient] = await Promise.all([
            readFile(angularSourcePath, 'utf8'),
            readFile(reactClientPath, 'utf8'),
        ]);

        const settled = await generateActionRequest({
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
            unchanged: 14,
        });

        const evolvedDefinition = JSON.parse(
            await readFile(definitionPath, 'utf8')
        );
        evolvedDefinition.feature.description =
            'Public password-reset request with reviewed copy.';
        await writeFile(
            evolvedDefinitionPath,
            `${JSON.stringify(evolvedDefinition, null, 2)}\n`,
            'utf8'
        );

        const reviewed = await generateActionRequest({
            definitionPath: evolvedDefinitionPath,
            outputRoot,
            target: 'all',
            dryRun: true,
        });
        assert.deepEqual(reviewed.changeSet.summary, {
            create: 0,
            replace: 2,
            preserve: 0,
            delete: 0,
            unchanged: 12,
        });
        assert.equal(
            (
                await loadJson(
                    resolve(outputRoot, 'action-request-execution-model.json')
                )
            ).domain.description,
            'Public request for password-reset instructions.'
        );

        const applied = await generateActionRequest({
            definitionPath: evolvedDefinitionPath,
            outputRoot,
            target: 'all',
            applyChangeSetId: reviewed.changeSet.change_set_id,
        });
        assert.equal(applied.publication.status, 'applied');
        assert.notEqual(applied.modelSha256, created.modelSha256);
        assert.equal(
            (
                await loadJson(
                    resolve(outputRoot, 'action-request-execution-model.json')
                )
            ).domain.description,
            evolvedDefinition.feature.description
        );
        assert.equal(await readFile(angularSourcePath, 'utf8'), angularSource);
        assert.equal(await readFile(reactClientPath, 'utf8'), reactClient);
    });
});

test('v2 rejects v1-only layered targets before creating output', async () => {
    await withWorkspace(async ({ outputRoot }) => {
        await assert.rejects(
            generateActionRequest({
                definitionPath,
                outputRoot,
                target: 'all-layered',
                dryRun: true,
            }),
            /does not support --target all-layered/
        );
        assert.equal(await exists(outputRoot), false);
    });
});

test('the command rejects an unknown schema version before publication', async () => {
    await withWorkspace(async ({ outputRoot, evolvedDefinitionPath }) => {
        const definition = JSON.parse(await readFile(definitionPath, 'utf8'));
        definition.schema_version = '3.0.0';
        await writeFile(
            evolvedDefinitionPath,
            `${JSON.stringify(definition, null, 2)}\n`,
            'utf8'
        );

        await assert.rejects(
            generateActionRequest({
                definitionPath: evolvedDefinitionPath,
                outputRoot,
                dryRun: true,
            }),
            /unsupported action-request definition schema_version 3\.0\.0/
        );
        assert.equal(await exists(outputRoot), false);
    });
});
