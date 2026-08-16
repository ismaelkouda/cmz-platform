import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { compileActionRequestDefinition } from './core/action-request-authoring.mjs';
import { assertPermissionRuntimeOracle } from './core/permission-runtime-oracle.mjs';
import { materializeGeneratedRuntime } from './core/runtime-harness.mjs';
import { generateActionRequest } from './generate-action-request.mjs';
import { computeTargetsForSemantic } from './render-targets.mjs';
import {
    loadJson,
    repositoryRoot,
    validateJsonSchema,
} from './validate-ir.mjs';

const moduleRoot = fileURLToPath(new URL('.', import.meta.url));
export const directorContractPath = resolve(
    moduleRoot,
    'acceptance/evolvable-composition.contract.json'
);
const definitionSchemaPath = resolve(
    moduleRoot,
    'schemas/action-request-definition.schema.json'
);

function sha256(content) {
    return createHash('sha256').update(content).digest('hex');
}

function clone(value) {
    return JSON.parse(JSON.stringify(value));
}

function assertContract(contract) {
    assert.equal(contract.schema_version, '1.0.0');
    assert.equal(contract.status, 'characterization');
    assert.deepEqual(contract.targets, ['angular', 'reactjs']);
    assert.ok(contract.evolution?.data?.add_required_field);
    assert.ok(contract.evolution?.permissions?.replace_access);
    assert.ok(contract.evolution?.behavior_graph?.edges?.length);
    assert.ok(contract.evolution?.presentation?.steps?.length);
    assert.ok(contract.evolution?.extensions?.slots?.length);
    assert.ok(contract.expected_supported?.length);
    assert.ok(contract.expected_gaps?.length);
}

export function buildSupportedProjection(definition, contract) {
    const projected = clone(definition);
    const operation = projected.operations[0];
    operation.input.fields.push({
        ...clone(contract.evolution.data.add_required_field),
        required: true,
    });
    operation.access = clone(contract.evolution.permissions.replace_access);
    return projected;
}

export async function computeEvolvableCompositionTargets() {
    const contract = await loadJson(directorContractPath);
    assertContract(contract);
    const definitionPath = resolve(repositoryRoot, contract.source.definition);
    const [definitionContent, definitionSchema] = await Promise.all([
        readFile(definitionPath, 'utf8'),
        loadJson(definitionSchemaPath),
    ]);
    const definition = JSON.parse(definitionContent);
    const projected = buildSupportedProjection(definition, contract);
    assert.deepEqual(validateJsonSchema(projected, definitionSchema), []);
    const compiled = compileActionRequestDefinition(projected, {
        sourceUri: contract.source.definition,
        sourceSha256: sha256(JSON.stringify(projected)),
    });
    const targets = await computeTargetsForSemantic(compiled.semantic);
    return {
        compiled,
        contract,
        definitionPath,
        definitionSchema,
        projected,
        targets,
    };
}

function allRenderedFiles(targets) {
    return [
        ...Object.values(targets.angular.files),
        ...Object.values(targets.react.files),
    ];
}

function containsFrameworkReference(files, pattern) {
    return Object.values(files).some((content) => pattern.test(content));
}

async function probeExistingOutput(definitionPath) {
    const temporaryRoot = await mkdtemp(
        resolve(tmpdir(), 'cmz-composition-evolution-')
    );
    const outputRoot = resolve(temporaryRoot, 'generated');
    try {
        await generateActionRequest({
            definitionPath,
            outputRoot,
            target: 'all',
        });
        const cleanDryRun = await generateActionRequest({
            definitionPath,
            outputRoot,
            target: 'all',
            dryRun: true,
        });
        const extensionContents = {
            angular: `import type { AfterSuccessExtension } from './extension-contract';\n\nexport const afterSuccess: AfterSuccessExtension = async ({ operationId }) => {\n    console.log('angular human extension', operationId);\n};\n`,
            reactjs: `import type { AfterSuccessExtension } from './extension-contract';\n\nexport const afterSuccess: AfterSuccessExtension = async ({ operationId }) => {\n    console.log('reactjs human extension', operationId);\n};\n`,
        };
        for (const [target, content] of Object.entries(extensionContents)) {
            await writeFile(
                resolve(outputRoot, target, 'src/after-success.extension.ts'),
                content
            );
        }
        const extensionDryRun = await generateActionRequest({
            definitionPath,
            outputRoot,
            target: 'all',
            dryRun: true,
        });
        const extensionPreserved = extensionDryRun.changeSet.targets.every(
            (target) => {
                const expected = extensionContents[target.id];
                const expectedHash = sha256(expected);
                const change = target.changes.find(
                    ({ path }) => path === 'src/after-success.extension.ts'
                );
                return (
                    change?.action === 'preserve' &&
                    change.before_sha256 === expectedHash &&
                    change.after_sha256 === expectedHash
                );
            }
        );
        for (const [target, content] of Object.entries(extensionContents)) {
            assert.equal(
                await readFile(
                    resolve(
                        outputRoot,
                        target,
                        'src/after-success.extension.ts'
                    ),
                    'utf8'
                ),
                content
            );
        }
        const publication = await generateActionRequest({
            definitionPath,
            outputRoot,
            target: 'all',
            applyChangeSetId: extensionDryRun.changeSet.change_set_id,
        });
        const existingOutput =
            publication.publication?.status === 'applied' &&
            publication.publication.targets.join(',') === 'angular,reactjs';
        for (const [target, content] of Object.entries(extensionContents)) {
            assert.equal(
                await readFile(
                    resolve(
                        outputRoot,
                        target,
                        'src/after-success.extension.ts'
                    ),
                    'utf8'
                ),
                content
            );
        }
        const modelPath = resolve(outputRoot, 'angular/src/models.ts');
        const drifted = `${await readFile(modelPath, 'utf8')}\n// drift probe\n`;
        await writeFile(modelPath, drifted);
        let driftDetected = false;
        try {
            await generateActionRequest({
                definitionPath,
                outputRoot,
                target: 'all',
                dryRun: true,
            });
        } catch (error) {
            assert.match(error.message, /generated artifact drifted/);
            driftDetected = true;
        }
        assert.equal(await readFile(modelPath, 'utf8'), drifted);
        return {
            existingOutput,
            extensionPreserved,
            dryRun:
                cleanDryRun.changeSet.summary.unchanged === 19 &&
                cleanDryRun.changeSet.summary.preserve === 2 &&
                driftDetected,
        };
    } finally {
        await rm(temporaryRoot, { recursive: true, force: true });
    }
}

async function probePermissionRuntime(targets, contract) {
    const runtime = await materializeGeneratedRuntime(targets);
    try {
        await assertPermissionRuntimeOracle(runtime, {
            permissions:
                contract.evolution.permissions.replace_access.permissions,
            input: {
                email: 'person@example.com',
                subject: 'Cannot open a report',
                message: 'The report remains unavailable.',
                priority: 'high',
            },
            result: {
                request_id: 'support-42',
                message: 'Request accepted',
            },
            angularMethod: 'contactSupport',
            reactHook: 'useContactSupport',
        });
        return true;
    } finally {
        await runtime.cleanup();
    }
}

export async function probeEvolvableComposition() {
    const {
        compiled,
        contract,
        definitionPath,
        definitionSchema,
        projected,
        targets,
    } = await computeEvolvableCompositionTargets();
    const rendered = allRenderedFiles(targets);
    const permission =
        contract.evolution.permissions.replace_access.permissions[0];
    const behaviorDefinition = {
        ...projected,
        behavior_graph: contract.evolution.behavior_graph,
    };
    const presentationDefinition = {
        ...projected,
        presentation: contract.evolution.presentation,
    };
    const extensionOwned = [targets.angular, targets.react].every((target) =>
        target.manifest.files.some(
            (file) =>
                file.owner === 'human-owned' && file.write_policy === 'preserve'
        )
    );
    const [outputProbe, permissionRuntimeEnforcement] = await Promise.all([
        probeExistingOutput(definitionPath),
        probePermissionRuntime(targets, contract),
    ]);
    const supported = {
        'data.canonical-model':
            compiled.semantic.types
                .find((type) => type.id === 'contact-support-input')
                ?.fields.some((field) => field.name === 'priority') === true &&
            targets.angular.files['src/models.ts'].includes(
                'readonly priority: string;'
            ) &&
            targets.react.files['src/models.ts'].includes(
                'readonly priority: string;'
            ),
        'permissions.canonical-model':
            compiled.semantic.operations[0].access.mode === 'authorized' &&
            compiled.semantic.operations[0].access.permissions?.includes(
                permission
            ) === true,
        'permissions.runtime-enforcement': permissionRuntimeEnforcement,
        'planning.shared-artifact-plan':
            targets.artifactPlan.input.sha256 ===
                targets.angular.manifest.input.sha256 &&
            targets.angular.manifest.plan.sha256 ===
                targets.react.manifest.plan.sha256 &&
            [targets.angular, targets.react].every((target) =>
                target.manifest.files.every((file) => {
                    const planned = targets.artifactPlan.artifacts.find(
                        ({ id }) => id === file.artifact_id
                    );
                    return (
                        planned !== undefined &&
                        file.owner === planned.owner &&
                        file.write_policy === planned.write_policy
                    );
                })
            ),
        'extensions.human-owned-preservation':
            extensionOwned && outputProbe.extensionPreserved,
        'regeneration.dry-run-drift-detection': outputProbe.dryRun,
        'regeneration.existing-output': outputProbe.existingOutput,
        'targets.angular': Object.keys(targets.angular.files).length > 0,
        'targets.reactjs': Object.keys(targets.react.files).length > 0,
        'targets.shared-semantic-input':
            targets.angular.manifest.input.sha256 ===
            targets.react.manifest.input.sha256,
        'targets.renderer-separation':
            !containsFrameworkReference(targets.angular.files, /\breact\b/i) &&
            !containsFrameworkReference(targets.react.files, /@angular\//),
    };
    const capabilities = {
        'behavior.graph':
            validateJsonSchema(behaviorDefinition, definitionSchema).length ===
            0,
        'composition.persisted-instance': rendered.some((content) =>
            content.includes(contract.contract_id)
        ),
        'presentation.flow':
            validateJsonSchema(presentationDefinition, definitionSchema)
                .length === 0 &&
            rendered.some((content) => content.includes("'confirmation'")),
    };

    const actualSupported = Object.entries(supported)
        .filter(([, value]) => value)
        .map(([id]) => id)
        .sort();
    const regressions = Object.entries(supported)
        .filter(([, value]) => !value)
        .map(([id]) => id)
        .sort();
    const actualGaps = Object.entries(capabilities)
        .filter(([, value]) => !value)
        .map(([id]) => id)
        .sort();
    const unexpectedlyImplemented = Object.entries(capabilities)
        .filter(([, value]) => value)
        .map(([id]) => id)
        .sort();

    return {
        contract_id: contract.contract_id,
        mode: contract.status,
        decision_satisfied: regressions.length === 0 && actualGaps.length === 0,
        actual_supported: actualSupported,
        actual_gaps: actualGaps,
        regressions,
        unexpectedly_implemented: unexpectedlyImplemented,
        expected_supported: [...contract.expected_supported].sort(),
        expected_gaps: [...contract.expected_gaps].sort(),
        target_tree_sha256: {
            angular: targets.angular.manifest.tree_sha256,
            reactjs: targets.react.manifest.tree_sha256,
        },
    };
}

export function assertCharacterization(report) {
    assert.deepEqual(
        report.regressions,
        [],
        'a currently supported director capability regressed'
    );
    assert.deepEqual(
        report.actual_supported,
        report.expected_supported,
        'supported capabilities changed: update implementation and contract together'
    );
    assert.deepEqual(
        report.actual_gaps,
        report.expected_gaps,
        'known gaps changed: update implementation and contract together'
    );
    assert.deepEqual(
        report.unexpectedly_implemented,
        [],
        'a capability is now implemented but remains declared as a gap'
    );
}

async function main() {
    const report = await probeEvolvableComposition();
    assertCharacterization(report);
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    process.stdout.write(
        'Characterization gate: PASS. The target decision is not yet satisfied; known gaps remain explicitly non-blocking.\n'
    );
}

if (
    process.argv[1] &&
    import.meta.url === pathToFileURL(process.argv[1]).href
) {
    await main();
}
