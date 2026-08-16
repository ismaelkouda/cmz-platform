import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import test from 'node:test';

import { compileActionRequestDefinition } from './core/action-request-authoring.mjs';
import {
    buildCompositionInstance,
    reloadAndRegenerate,
    verifyCompositionInstanceIntegrity,
} from './core/composition-instance.mjs';
import {
    buildSupportedProjection,
    computeEvolvableCompositionTargets,
    directorContractPath,
} from './check-evolvable-composition.mjs';
import { computeTargetsForSemantic } from './render-targets.mjs';
import {
    loadJson,
    repositoryRoot,
    validateJsonSchema,
} from './validate-ir.mjs';

const moduleRoot = new URL('.', import.meta.url).pathname;
const compositionInstanceSchemaPath = resolve(
    moduleRoot,
    'schemas/composition-instance.schema.json'
);

async function buildFixture() {
    const contract = await loadJson(directorContractPath);
    const definitionPath = resolve(repositoryRoot, contract.source.definition);
    const definition = JSON.parse(await readFile(definitionPath, 'utf8'));
    const projected = buildSupportedProjection(definition, contract);
    const schema = await loadJson(compositionInstanceSchemaPath);
    const { targets } = await computeEvolvableCompositionTargets();
    const computeTargetsForDefinition = async (candidate) => {
        const recompiled = compileActionRequestDefinition(candidate, {
            sourceUri: contract.source.definition,
            sourceSha256: 'a'.repeat(64),
        });
        return computeTargetsForSemantic(recompiled.semantic);
    };
    const instance = buildCompositionInstance({
        instanceId: 'instance.contact-support-action-request-semantic',
        recordedAt: '2026-08-16T00:00:00.000Z',
        definitionUri: contract.source.definition,
        definitionSha256: 'a'.repeat(64),
        contractId: contract.contract_id,
        projectedDefinition: projected,
        targets,
    });
    return { computeTargetsForDefinition, contract, instance, schema, targets };
}

test('a freshly built instance is schema-valid and self-consistent', async () => {
    const { instance, schema } = await buildFixture();
    assert.deepEqual(verifyCompositionInstanceIntegrity(instance, schema), []);
    assert.deepEqual(validateJsonSchema(instance, schema), []);
});

test('an instance never carries promotion or reusability fields (ADR-0032 separation)', async () => {
    const { instance } = await buildFixture();
    assert.equal(instance.kind, 'composition-instance');
    assert.equal(Object.hasOwn(instance, 'promotion'), false);
    assert.equal(Object.hasOwn(instance, 'reusable_invariants'), false);
    assert.equal(Object.hasOwn(instance, 'pattern_id'), false);
});

test('writing and reading an instance from disk round-trips byte-for-byte', async () => {
    const { instance } = await buildFixture();
    const root = await mkdtemp(resolve(tmpdir(), 'cmz-instance-roundtrip-'));
    try {
        const path = resolve(root, 'instance.json');
        await writeFile(path, JSON.stringify(instance, null, 2));
        const reloaded = JSON.parse(await readFile(path, 'utf8'));
        assert.deepEqual(reloaded, instance);
    } finally {
        await rm(root, { recursive: true, force: true });
    }
});

test('reload and regenerate reproduces byte-identical (hash-identical) targets', async () => {
    const { computeTargetsForDefinition, contract, instance, schema } =
        await buildFixture();
    const { regenerated } = await reloadAndRegenerate(instance, schema, {
        contractId: contract.contract_id,
        computeTargetsForDefinition,
    });
    assert.equal(
        regenerated.angular.manifest_tree_sha256,
        instance.targets.angular.manifest_tree_sha256
    );
    assert.equal(
        regenerated.reactjs.manifest_tree_sha256,
        instance.targets.reactjs.manifest_tree_sha256
    );
});

test('a tampered envelope (payload changed, hash left stale) fails closed on reload', async () => {
    const { computeTargetsForDefinition, contract, instance, schema } =
        await buildFixture();
    const tampered = {
        ...instance,
        projected_definition: {
            ...instance.projected_definition,
            feature: {
                ...instance.projected_definition.feature,
                id: `${instance.projected_definition.feature.id}-mutated`,
            },
        },
    };
    await assert.rejects(
        () =>
            reloadAndRegenerate(tampered, schema, {
                contractId: contract.contract_id,
                computeTargetsForDefinition,
            }),
        /invalid or corrupted instance/
    );
});

test('a missing required field fails schema validation instead of loading partially', async () => {
    const { instance, schema } = await buildFixture();
    const missingIntegrity = { ...instance };
    delete missingIntegrity.integrity;
    const errors = verifyCompositionInstanceIntegrity(missingIntegrity, schema);
    assert.ok(errors.length > 0);
});

test('a wrong contract_ref fails closed even when the envelope hash is valid', async () => {
    const { computeTargetsForDefinition, instance, schema } =
        await buildFixture();
    await assert.rejects(
        () =>
            reloadAndRegenerate(instance, schema, {
                contractId: 'director.some-other-contract',
                computeTargetsForDefinition,
            }),
        /contract mismatch/
    );
});

test('a recorded tree hash that no longer matches regeneration fails closed, not silently drifts', async () => {
    // Simulates a *validly persisted* instance (self-hash intact) whose
    // recorded tree hash was correct at persistence time but the definition
    // it carries would now regenerate differently — the strongest form of
    // drift, and the one a naive "trust the recorded hash" implementation
    // would miss. buildCompositionInstance re-signs the envelope so
    // integrity verification passes; only the regeneration cross-check can
    // catch this.
    const { computeTargetsForDefinition, contract, instance } =
        await buildFixture();
    const schema = await loadJson(compositionInstanceSchemaPath);
    const flippedHash =
        instance.targets.angular.manifest_tree_sha256.slice(0, -1) +
        (instance.targets.angular.manifest_tree_sha256.at(-1) === '0'
            ? '1'
            : '0');
    const resigned = buildCompositionInstance({
        instanceId: instance.instance_id,
        recordedAt: instance.recorded_at,
        definitionUri: instance.source.definition_uri,
        definitionSha256: instance.source.definition_sha256,
        contractId: instance.contract_ref.contract_id,
        projectedDefinition: instance.projected_definition,
        targets: {
            angular: {
                manifest: {
                    target: { profile_id: 'angular-nx' },
                    tree_sha256: flippedHash,
                    input: {
                        sha256: instance.targets.angular.manifest_input_sha256,
                    },
                },
            },
            react: {
                manifest: {
                    target: { profile_id: 'react-typescript' },
                    tree_sha256: instance.targets.reactjs.manifest_tree_sha256,
                    input: {
                        sha256: instance.targets.reactjs.manifest_input_sha256,
                    },
                },
            },
        },
    });
    assert.deepEqual(verifyCompositionInstanceIntegrity(resigned, schema), []);
    await assert.rejects(
        () =>
            reloadAndRegenerate(resigned, schema, {
                contractId: contract.contract_id,
                computeTargetsForDefinition,
            }),
        /diverged/
    );
});
