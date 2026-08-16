import assert from 'node:assert/strict';
import { access, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { buildGenerationChangeSet } from './core/generation-change-set.mjs';
import { generationTreeSha256, sha256 } from './core/generation-manifest.mjs';
import { generateActionRequest } from './generate-action-request.mjs';
import { loadJson, validateJsonSchema } from './validate-ir.mjs';

const definitionUrl = new URL(
    'sources/support-request.definition.json',
    import.meta.url
);
const changeSetSchemaUrl = new URL(
    'schemas/change-set.schema.json',
    import.meta.url
);

async function pathExists(path) {
    try {
        await access(path);
        return true;
    } catch (error) {
        if (error.code === 'ENOENT') return false;
        throw error;
    }
}

test('dry-run plans a new dual-target generation without writing', async () => {
    const temporaryRoot = await mkdtemp(resolve(tmpdir(), 'cmz-dry-run-new-'));
    const outputRoot = resolve(temporaryRoot, 'generated-support');
    try {
        const first = await generateActionRequest({
            definitionPath: fileURLToPath(definitionUrl),
            outputRoot,
            target: 'all',
            dryRun: true,
        });
        const second = await generateActionRequest({
            definitionPath: fileURLToPath(definitionUrl),
            outputRoot,
            target: 'all',
            dryRun: true,
        });
        const schema = await loadJson(changeSetSchemaUrl);
        assert.deepEqual(validateJsonSchema(first.changeSet, schema), []);
        assert.deepEqual(first.changeSet, second.changeSet);
        assert.equal(first.changeSet.summary.create, 21);
        assert.equal(first.changeSet.summary.replace, 0);
        assert.equal(first.changeSet.summary.delete, 0);
        assert.equal(await pathExists(outputRoot), false);
    } finally {
        await rm(temporaryRoot, { recursive: true, force: true });
    }
});

test('dry-run reports an unchanged generated tree and performs no write', async () => {
    const temporaryRoot = await mkdtemp(
        resolve(tmpdir(), 'cmz-dry-run-unchanged-')
    );
    const outputRoot = resolve(temporaryRoot, 'generated-support');
    try {
        await generateActionRequest({
            definitionPath: fileURLToPath(definitionUrl),
            outputRoot,
            target: 'all',
        });
        const semanticPath = resolve(outputRoot, 'semantic-model.json');
        const before = await readFile(semanticPath, 'utf8');
        const result = await generateActionRequest({
            definitionPath: fileURLToPath(definitionUrl),
            outputRoot,
            target: 'all',
            dryRun: true,
        });
        assert.equal(result.changeSet.summary.unchanged, 19);
        assert.equal(result.changeSet.summary.preserve, 2);
        assert.equal(result.changeSet.summary.create, 0);
        assert.equal(result.changeSet.summary.replace, 0);
        assert.equal(await readFile(semanticPath, 'utf8'), before);
    } finally {
        await rm(temporaryRoot, { recursive: true, force: true });
    }
});

test('dry-run refuses drift in a generator-owned artifact without repairing it', async () => {
    const temporaryRoot = await mkdtemp(
        resolve(tmpdir(), 'cmz-dry-run-drift-')
    );
    const outputRoot = resolve(temporaryRoot, 'generated-support');
    const modelPath = resolve(outputRoot, 'angular/src/models.ts');
    try {
        await generateActionRequest({
            definitionPath: fileURLToPath(definitionUrl),
            outputRoot,
            target: 'all',
        });
        const drifted = `${await readFile(modelPath, 'utf8')}\n// human edit\n`;
        await writeFile(modelPath, drifted);
        await assert.rejects(
            () =>
                generateActionRequest({
                    definitionPath: fileURLToPath(definitionUrl),
                    outputRoot,
                    target: 'all',
                    dryRun: true,
                }),
            /angular:src\/models\.ts: generated artifact drifted/
        );
        assert.equal(await readFile(modelPath, 'utf8'), drifted);
    } finally {
        await rm(temporaryRoot, { recursive: true, force: true });
    }
});

test('dry-run computes replacements for an evolved definition without applying them', async () => {
    const temporaryRoot = await mkdtemp(
        resolve(tmpdir(), 'cmz-dry-run-evolution-')
    );
    const outputRoot = resolve(temporaryRoot, 'generated-support');
    const evolvedPath = resolve(temporaryRoot, 'support-v2.definition.json');
    try {
        await generateActionRequest({
            definitionPath: fileURLToPath(definitionUrl),
            outputRoot,
            target: 'all',
        });
        const before = await loadJson(
            resolve(outputRoot, 'semantic-model.json')
        );
        const evolved = await loadJson(definitionUrl);
        evolved.operations[0].input.fields.push({
            name: 'priority',
            type: { kind: 'primitive', name: 'string', nullable: false },
            required: true,
        });
        await writeFile(evolvedPath, `${JSON.stringify(evolved, null, 2)}\n`);
        const result = await generateActionRequest({
            definitionPath: evolvedPath,
            outputRoot,
            target: 'all',
            dryRun: true,
        });
        assert.ok(result.changeSet.summary.replace > 0);
        assert.ok(
            result.changeSet.targets.every((target) =>
                target.changes.some(
                    ({ path, action }) =>
                        path === 'src/models.ts' && action === 'replace'
                )
            )
        );
        assert.deepEqual(
            await loadJson(resolve(outputRoot, 'semantic-model.json')),
            before
        );
    } finally {
        await rm(temporaryRoot, { recursive: true, force: true });
    }
});

test('the Change Set identifies obsolete generator-owned artifacts without deleting them', async () => {
    const temporaryRoot = await mkdtemp(
        resolve(tmpdir(), 'cmz-dry-run-delete-')
    );
    const outputRoot = resolve(temporaryRoot, 'generated-support');
    try {
        await generateActionRequest({
            definitionPath: fileURLToPath(definitionUrl),
            outputRoot,
            target: 'angular',
        });
        const previous = await loadJson(
            resolve(outputRoot, 'angular/generation-manifest.json')
        );
        const desired = structuredClone(previous);
        desired.files = desired.files.filter(
            ({ path }) => path !== 'src/validation.ts'
        );
        desired.tree_sha256 = generationTreeSha256(desired.files);
        const validationPath = resolve(outputRoot, 'angular/src/validation.ts');
        const before = await readFile(validationPath, 'utf8');
        const changeSet = await buildGenerationChangeSet({
            outputRoot,
            targets: { angular: { manifest: desired } },
        });
        assert.equal(changeSet.summary.delete, 1);
        assert.ok(
            changeSet.targets[0].changes.some(
                ({ path, action }) =>
                    path === 'src/validation.ts' && action === 'delete'
            )
        );
        assert.equal(await readFile(validationPath, 'utf8'), before);
    } finally {
        await rm(temporaryRoot, { recursive: true, force: true });
    }
});

test('dry-run preserves edited human-owned extensions byte-for-byte by observed hash', async () => {
    const temporaryRoot = await mkdtemp(
        resolve(tmpdir(), 'cmz-dry-run-human-owned-')
    );
    const outputRoot = resolve(temporaryRoot, 'generated-support');
    const contents = {
        angular: `import type { AfterSuccessExtension } from './extension-contract';\n\nexport const afterSuccess: AfterSuccessExtension = async ({ operationId }) => {\n    console.log('angular extension', operationId);\n};\n`,
        reactjs: `import type { AfterSuccessExtension } from './extension-contract';\n\nexport const afterSuccess: AfterSuccessExtension = async ({ operationId }) => {\n    console.log('reactjs extension', operationId);\n};\n`,
    };
    try {
        await generateActionRequest({
            definitionPath: fileURLToPath(definitionUrl),
            outputRoot,
            target: 'all',
        });
        for (const [target, content] of Object.entries(contents)) {
            await writeFile(
                resolve(outputRoot, target, 'src/after-success.extension.ts'),
                content
            );
        }
        const result = await generateActionRequest({
            definitionPath: fileURLToPath(definitionUrl),
            outputRoot,
            target: 'all',
            dryRun: true,
        });
        assert.equal(result.changeSet.summary.preserve, 2);
        for (const target of result.changeSet.targets) {
            const change = target.changes.find(
                ({ path }) => path === 'src/after-success.extension.ts'
            );
            assert.deepEqual(change, {
                path: 'src/after-success.extension.ts',
                artifact_id: 'after-success-extension',
                owner: 'human-owned',
                action: 'preserve',
                before_sha256: sha256(contents[target.id]),
                after_sha256: sha256(contents[target.id]),
            });
            assert.equal(
                await readFile(
                    resolve(
                        outputRoot,
                        target.id,
                        'src/after-success.extension.ts'
                    ),
                    'utf8'
                ),
                contents[target.id]
            );
        }
    } finally {
        await rm(temporaryRoot, { recursive: true, force: true });
    }
});

test('dry-run refuses unsupported ownership pairs', async () => {
    const temporaryRoot = await mkdtemp(
        resolve(tmpdir(), 'cmz-dry-run-unsupported-owner-')
    );
    const outputRoot = resolve(temporaryRoot, 'generated-support');
    const manifestPath = resolve(
        outputRoot,
        'angular/generation-manifest.json'
    );
    try {
        await generateActionRequest({
            definitionPath: fileURLToPath(definitionUrl),
            outputRoot,
            target: 'angular',
        });
        const manifest = await loadJson(manifestPath);
        const extension = manifest.files.find(
            ({ path }) => path === 'src/after-success.extension.ts'
        );
        extension.owner = 'configuration-owned';
        manifest.tree_sha256 = generationTreeSha256(manifest.files);
        await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
        await assert.rejects(
            () =>
                generateActionRequest({
                    definitionPath: fileURLToPath(definitionUrl),
                    outputRoot,
                    target: 'angular',
                    dryRun: true,
                }),
            /unsupported ownership policy configuration-owned\/preserve/
        );
    } finally {
        await rm(temporaryRoot, { recursive: true, force: true });
    }
});

test('dry-run rejects a structurally invalid previous manifest fail-closed', async () => {
    const temporaryRoot = await mkdtemp(
        resolve(tmpdir(), 'cmz-dry-run-invalid-manifest-')
    );
    const outputRoot = resolve(temporaryRoot, 'generated-support');
    const manifestPath = resolve(
        outputRoot,
        'angular/generation-manifest.json'
    );
    try {
        await generateActionRequest({
            definitionPath: fileURLToPath(definitionUrl),
            outputRoot,
            target: 'angular',
        });
        const manifest = await loadJson(manifestPath);
        manifest.undeclared_field = true;
        await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

        await assert.rejects(
            () =>
                generateActionRequest({
                    definitionPath: fileURLToPath(definitionUrl),
                    outputRoot,
                    target: 'angular',
                    dryRun: true,
                }),
            /invalid previous generation manifest/
        );
        assert.equal((await loadJson(manifestPath)).undeclared_field, true);
    } finally {
        await rm(temporaryRoot, { recursive: true, force: true });
    }
});

test('dry-run never converts removal of a human extension into delete', async () => {
    const temporaryRoot = await mkdtemp(
        resolve(tmpdir(), 'cmz-dry-run-human-delete-')
    );
    const outputRoot = resolve(temporaryRoot, 'generated-support');
    try {
        await generateActionRequest({
            definitionPath: fileURLToPath(definitionUrl),
            outputRoot,
            target: 'angular',
        });
        const desired = await loadJson(
            resolve(outputRoot, 'angular/generation-manifest.json')
        );
        desired.files = desired.files.filter(
            ({ path }) => path !== 'src/after-success.extension.ts'
        );
        desired.tree_sha256 = generationTreeSha256(desired.files);
        await assert.rejects(
            () =>
                buildGenerationChangeSet({
                    outputRoot,
                    targets: { angular: { manifest: desired } },
                }),
            /removing a human-owned extension requires an explicit migration/
        );
        assert.equal(
            await pathExists(
                resolve(outputRoot, 'angular/src/after-success.extension.ts')
            ),
            true
        );
    } finally {
        await rm(temporaryRoot, { recursive: true, force: true });
    }
});
