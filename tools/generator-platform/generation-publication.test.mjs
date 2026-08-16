import assert from 'node:assert/strict';
import {
    mkdtemp,
    readFile,
    readdir,
    rm,
    symlink,
    writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { sha256 } from './core/generation-manifest.mjs';
import { generateActionRequest } from './generate-action-request.mjs';
import { generateWorkflowAction } from './generate-workflow-action.mjs';
import { loadJson } from './validate-ir.mjs';

const actionDefinitionUrl = new URL(
    'sources/support-request.definition.json',
    import.meta.url
);
const workflowDefinitionUrl = new URL(
    'sources/requests-workflow.definition.json',
    import.meta.url
);

const extensionContents = {
    angular: `import type { AfterSuccessExtension } from './extension-contract';\n\nexport const afterSuccess: AfterSuccessExtension = async ({ operationId }) => {\n    console.log('angular preserved', operationId);\n};\n`,
    reactjs: `import type { AfterSuccessExtension } from './extension-contract';\n\nexport const afterSuccess: AfterSuccessExtension = async ({ operationId }) => {\n    console.log('reactjs preserved', operationId);\n};\n`,
};

async function editExtensions(outputRoot, contents = extensionContents) {
    for (const [target, content] of Object.entries(contents)) {
        await writeFile(
            resolve(outputRoot, target, 'src/after-success.extension.ts'),
            content
        );
    }
}

async function assertExtensions(outputRoot, contents = extensionContents) {
    for (const [target, content] of Object.entries(contents)) {
        const path = resolve(
            outputRoot,
            target,
            'src/after-success.extension.ts'
        );
        assert.equal(await readFile(path, 'utf8'), content);
        const manifest = await loadJson(
            resolve(outputRoot, target, 'generation-manifest.json')
        );
        assert.equal(
            manifest.files.find(
                ({ path: artifactPath }) =>
                    artifactPath === 'src/after-success.extension.ts'
            ).sha256,
            sha256(content)
        );
    }
}

async function applyActionRequest({
    definitionPath,
    outputRoot,
    target = 'all',
}) {
    const plan = await generateActionRequest({
        definitionPath,
        outputRoot,
        target,
        dryRun: true,
    });
    return generateActionRequest({
        definitionPath,
        outputRoot,
        target,
        applyChangeSetId: plan.changeSet.change_set_id,
    });
}

async function applyWorkflowAction({
    definitionPath,
    outputRoot,
    target = 'all',
}) {
    const plan = await generateWorkflowAction({
        definitionPath,
        outputRoot,
        target,
        dryRun: true,
    });
    return generateWorkflowAction({
        definitionPath,
        outputRoot,
        target,
        applyChangeSetId: plan.changeSet.change_set_id,
    });
}

test('apply publishes one evolved action-request and preserves both stack extensions', async () => {
    const temporaryRoot = await mkdtemp(resolve(tmpdir(), 'cmz-apply-action-'));
    const outputRoot = resolve(temporaryRoot, 'generated-support');
    const evolvedPath = resolve(temporaryRoot, 'support-v2.definition.json');
    try {
        await generateActionRequest({
            definitionPath: fileURLToPath(actionDefinitionUrl),
            outputRoot,
            target: 'all',
        });
        await editExtensions(outputRoot);
        const evolved = await loadJson(actionDefinitionUrl);
        evolved.operations[0].input.fields.push({
            name: 'priority',
            type: { kind: 'primitive', name: 'string', nullable: false },
            required: true,
        });
        await writeFile(evolvedPath, `${JSON.stringify(evolved, null, 2)}\n`);

        const result = await applyActionRequest({
            definitionPath: evolvedPath,
            outputRoot,
            target: 'all',
        });

        assert.equal(result.publication.status, 'applied');
        assert.deepEqual(result.publication.targets, ['angular', 'reactjs']);
        for (const target of ['angular', 'reactjs']) {
            assert.match(
                await readFile(
                    resolve(outputRoot, target, 'src/models.ts'),
                    'utf8'
                ),
                /readonly priority: string;/
            );
        }
        assert.ok(
            (await loadJson(resolve(outputRoot, 'semantic-model.json'))).types
                .find(({ id }) => id === 'contact-support-input')
                .fields.some(({ name }) => name === 'priority')
        );
        await assertExtensions(outputRoot);

        const settled = await generateActionRequest({
            definitionPath: evolvedPath,
            outputRoot,
            target: 'all',
            dryRun: true,
        });
        assert.equal(settled.changeSet.summary.unchanged, 19);
        assert.equal(settled.changeSet.summary.preserve, 2);
        assert.equal(
            (await readdir(temporaryRoot)).some((name) =>
                name.startsWith('.generated-support.generation-transaction-')
            ),
            false
        );
    } finally {
        await rm(temporaryRoot, { recursive: true, force: true });
    }
});

test('apply rejects a stale reviewed Change Set when the desired definition changed', async () => {
    const temporaryRoot = await mkdtemp(
        resolve(tmpdir(), 'cmz-apply-stale-plan-')
    );
    const outputRoot = resolve(temporaryRoot, 'generated-support');
    const evolvedPath = resolve(temporaryRoot, 'support-v2.definition.json');
    const modelPath = resolve(outputRoot, 'angular/src/models.ts');
    try {
        await generateActionRequest({
            definitionPath: fileURLToPath(actionDefinitionUrl),
            outputRoot,
            target: 'all',
        });
        const reviewed = await generateActionRequest({
            definitionPath: fileURLToPath(actionDefinitionUrl),
            outputRoot,
            target: 'all',
            dryRun: true,
        });
        const previousModel = await readFile(modelPath, 'utf8');
        const evolved = await loadJson(actionDefinitionUrl);
        evolved.operations[0].input.fields.push({
            name: 'priority',
            type: { kind: 'primitive', name: 'string', nullable: false },
            required: true,
        });
        await writeFile(evolvedPath, `${JSON.stringify(evolved, null, 2)}\n`);
        await assert.rejects(
            () =>
                generateActionRequest({
                    definitionPath: evolvedPath,
                    outputRoot,
                    target: 'all',
                    applyChangeSetId: reviewed.changeSet.change_set_id,
                }),
            /reviewed Change Set is stale/
        );
        assert.equal(await readFile(modelPath, 'utf8'), previousModel);
    } finally {
        await rm(temporaryRoot, { recursive: true, force: true });
    }
});

test('apply rejects control-plane drift and leaves the existing output untouched', async () => {
    const temporaryRoot = await mkdtemp(resolve(tmpdir(), 'cmz-apply-drift-'));
    const outputRoot = resolve(temporaryRoot, 'generated-support');
    const semanticPath = resolve(outputRoot, 'semantic-model.json');
    try {
        await generateActionRequest({
            definitionPath: fileURLToPath(actionDefinitionUrl),
            outputRoot,
            target: 'all',
        });
        const reviewed = await generateActionRequest({
            definitionPath: fileURLToPath(actionDefinitionUrl),
            outputRoot,
            target: 'all',
            dryRun: true,
        });
        const drifted = `${await readFile(semanticPath, 'utf8')}\n`;
        await writeFile(semanticPath, drifted);
        await assert.rejects(
            () =>
                generateActionRequest({
                    definitionPath: fileURLToPath(actionDefinitionUrl),
                    outputRoot,
                    target: 'all',
                    applyChangeSetId: reviewed.changeSet.change_set_id,
                }),
            /control-plane artifact drifted: semantic-model\.json/
        );
        assert.equal(await readFile(semanticPath, 'utf8'), drifted);
    } finally {
        await rm(temporaryRoot, { recursive: true, force: true });
    }
});

test('candidate validation fails before commit and preserves the previous tree', async () => {
    const temporaryRoot = await mkdtemp(
        resolve(tmpdir(), 'cmz-apply-invalid-extension-')
    );
    const outputRoot = resolve(temporaryRoot, 'generated-support');
    const modelPath = resolve(outputRoot, 'angular/src/models.ts');
    const extensionPath = resolve(
        outputRoot,
        'angular/src/after-success.extension.ts'
    );
    const invalidExtension = `import type { AfterSuccessExtension } from './extension-contract';\nexport const afterSuccess: AfterSuccessExtension = 42;\n`;
    try {
        await generateActionRequest({
            definitionPath: fileURLToPath(actionDefinitionUrl),
            outputRoot,
            target: 'all',
        });
        const previousModel = await readFile(modelPath, 'utf8');
        await writeFile(extensionPath, invalidExtension);
        const reviewed = await generateActionRequest({
            definitionPath: fileURLToPath(actionDefinitionUrl),
            outputRoot,
            target: 'all',
            dryRun: true,
        });
        await assert.rejects(
            () =>
                generateActionRequest({
                    definitionPath: fileURLToPath(actionDefinitionUrl),
                    outputRoot,
                    target: 'all',
                    applyChangeSetId: reviewed.changeSet.change_set_id,
                }),
            /generated target angular does not typecheck/
        );
        assert.equal(await readFile(modelPath, 'utf8'), previousModel);
        assert.equal(await readFile(extensionPath, 'utf8'), invalidExtension);
    } finally {
        await rm(temporaryRoot, { recursive: true, force: true });
    }
});

test('apply refuses an unowned file instead of silently deleting it', async () => {
    const temporaryRoot = await mkdtemp(
        resolve(tmpdir(), 'cmz-apply-unowned-')
    );
    const outputRoot = resolve(temporaryRoot, 'generated-support');
    const unownedPath = resolve(outputRoot, 'angular/src/manual.ts');
    try {
        await generateActionRequest({
            definitionPath: fileURLToPath(actionDefinitionUrl),
            outputRoot,
            target: 'all',
        });
        await writeFile(unownedPath, 'export const manual = true;\n');
        const reviewed = await generateActionRequest({
            definitionPath: fileURLToPath(actionDefinitionUrl),
            outputRoot,
            target: 'all',
            dryRun: true,
        });
        await assert.rejects(
            () =>
                generateActionRequest({
                    definitionPath: fileURLToPath(actionDefinitionUrl),
                    outputRoot,
                    target: 'all',
                    applyChangeSetId: reviewed.changeSet.change_set_id,
                }),
            /unowned artifact in generated output: src\/manual\.ts/
        );
        assert.equal(
            await readFile(unownedPath, 'utf8'),
            'export const manual = true;\n'
        );
    } finally {
        await rm(temporaryRoot, { recursive: true, force: true });
    }
});

test('apply supports workflow-action while preserving Angular and ReactJS extensions', async () => {
    const temporaryRoot = await mkdtemp(
        resolve(tmpdir(), 'cmz-apply-workflow-')
    );
    const outputRoot = resolve(temporaryRoot, 'generated-workflow');
    try {
        await generateWorkflowAction({
            definitionPath: fileURLToPath(workflowDefinitionUrl),
            outputRoot,
            target: 'all',
        });
        await editExtensions(outputRoot);
        const result = await applyWorkflowAction({
            definitionPath: fileURLToPath(workflowDefinitionUrl),
            outputRoot,
            target: 'all',
        });
        assert.equal(result.publication.status, 'applied');
        await assertExtensions(outputRoot);
    } finally {
        await rm(temporaryRoot, { recursive: true, force: true });
    }
});

test('apply can add ReactJS to an existing Angular-only generation', async () => {
    const temporaryRoot = await mkdtemp(
        resolve(tmpdir(), 'cmz-apply-add-target-')
    );
    const outputRoot = resolve(temporaryRoot, 'generated-support');
    const angularOnlyExtension = {
        angular: extensionContents.angular,
    };
    try {
        await generateActionRequest({
            definitionPath: fileURLToPath(actionDefinitionUrl),
            outputRoot,
            target: 'angular',
        });
        await editExtensions(outputRoot, angularOnlyExtension);
        const result = await applyActionRequest({
            definitionPath: fileURLToPath(actionDefinitionUrl),
            outputRoot,
            target: 'all',
        });
        assert.deepEqual(result.publication.targets, ['angular', 'reactjs']);
        await assertExtensions(outputRoot, angularOnlyExtension);
        assert.match(
            await readFile(
                resolve(outputRoot, 'reactjs/src/after-success.extension.ts'),
                'utf8'
            ),
            /AfterSuccessExtension/
        );
    } finally {
        await rm(temporaryRoot, { recursive: true, force: true });
    }
});

test('concurrent initial generations are mutually exclusive and leave one complete output', async () => {
    const temporaryRoot = await mkdtemp(
        resolve(tmpdir(), 'cmz-create-concurrent-')
    );
    const outputRoot = resolve(temporaryRoot, 'generated-support');
    try {
        const attempts = await Promise.allSettled([
            generateActionRequest({
                definitionPath: fileURLToPath(actionDefinitionUrl),
                outputRoot,
                target: 'all',
            }),
            generateActionRequest({
                definitionPath: fileURLToPath(actionDefinitionUrl),
                outputRoot,
                target: 'all',
            }),
        ]);
        assert.equal(
            attempts.filter(({ status }) => status === 'fulfilled').length,
            1
        );
        assert.equal(
            attempts.filter(({ status }) => status === 'rejected').length,
            1
        );
        assert.match(
            attempts.find(({ status }) => status === 'rejected').reason.message,
            /another generation owns|output already exists/
        );
        const settled = await generateActionRequest({
            definitionPath: fileURLToPath(actionDefinitionUrl),
            outputRoot,
            target: 'all',
            dryRun: true,
        });
        assert.equal(settled.changeSet.summary.preserve, 2);
    } finally {
        await rm(temporaryRoot, { recursive: true, force: true });
    }
});

test('planning rejects a symlinked generation root', async () => {
    const temporaryRoot = await mkdtemp(resolve(tmpdir(), 'cmz-root-link-'));
    const realOutput = resolve(temporaryRoot, 'real-output');
    const linkedOutput = resolve(temporaryRoot, 'linked-output');
    try {
        await generateActionRequest({
            definitionPath: fileURLToPath(actionDefinitionUrl),
            outputRoot: realOutput,
            target: 'all',
        });
        await symlink(realOutput, linkedOutput, 'dir');
        await assert.rejects(
            () =>
                generateActionRequest({
                    definitionPath: fileURLToPath(actionDefinitionUrl),
                    outputRoot: linkedOutput,
                    target: 'all',
                    dryRun: true,
                }),
            /generation output must be a real directory/
        );
    } finally {
        await rm(temporaryRoot, { recursive: true, force: true });
    }
});
