import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { adaptLegacyTypescript } from './adapters/legacy-typescript-adapter.mjs';
import { adaptStructuredSpec } from './adapters/structured-spec-adapter.mjs';
import { buildSemanticModel, readJson } from './core/action-request-model.mjs';
import { buildEvidenceModel } from './core/evidence-model.mjs';
import { sha256, stableStringify } from './core/generation-manifest.mjs';
import {
    repositoryRoot,
    validateEvidence,
    validateSemantic,
} from './validate-ir.mjs';

const moduleDirectory = fileURLToPath(new URL('.', import.meta.url));
const paths = {
    evidenceSchema: resolve(moduleDirectory, 'schemas/evidence.schema.json'),
    policy: resolve(moduleDirectory, 'policies/action-request.policy.json'),
    semanticFixture: resolve(
        moduleDirectory,
        'fixtures/action-request.semantic.json'
    ),
    semanticSchema: resolve(
        moduleDirectory,
        'schemas/semantic-model.schema.json'
    ),
    structuredSpec: resolve(
        moduleDirectory,
        'sources/action-request.spec.json'
    ),
};

async function policyDescriptor() {
    const content = await readFile(paths.policy);
    return {
        id: 'source.semantic-policy',
        kind: 'human_decision',
        uri: 'tools/generator-platform/policies/action-request.policy.json',
        sha256: createHash('sha256').update(content).digest('hex'),
    };
}

export async function verifyAdapters() {
    const [
        legacy,
        structured,
        policy,
        evidenceSchema,
        semanticSchema,
        expected,
    ] = await Promise.all([
        adaptLegacyTypescript(repositoryRoot),
        adaptStructuredSpec(paths.structuredSpec),
        readJson(paths.policy),
        readJson(paths.evidenceSchema),
        readJson(paths.semanticSchema),
        readJson(paths.semanticFixture),
    ]);
    assert.deepEqual(
        legacy.observation,
        structured.observation,
        'legacy TypeScript and structured specification observations diverge'
    );

    const legacySemantic = buildSemanticModel(legacy.observation, policy);
    const structuredSemantic = buildSemanticModel(
        structured.observation,
        policy
    );
    assert.deepEqual(
        legacySemantic,
        structuredSemantic,
        'adapters do not produce the same canonical semantic model'
    );
    assert.deepEqual(
        legacySemantic,
        expected,
        'generated semantic model drifted from its versioned fixture'
    );

    const policySource = await policyDescriptor();
    const legacyEvidence = buildEvidenceModel({
        adapter: 'legacy-typescript',
        sources: legacy.sources,
        policySource,
    });
    const structuredEvidence = buildEvidenceModel({
        adapter: 'structured-spec',
        sources: [structured.source],
        policySource,
    });
    const [legacyEvidenceErrors, structuredEvidenceErrors] = await Promise.all([
        validateEvidence(legacyEvidence, evidenceSchema),
        validateEvidence(structuredEvidence, evidenceSchema),
    ]);
    assert.deepEqual(
        legacyEvidenceErrors,
        [],
        'legacy evidence model is invalid'
    );
    assert.deepEqual(
        structuredEvidenceErrors,
        [],
        'structured evidence model is invalid'
    );
    assert.deepEqual(
        validateSemantic(legacySemantic, semanticSchema, legacyEvidence),
        [],
        'legacy semantic model is invalid'
    );
    assert.deepEqual(
        validateSemantic(
            structuredSemantic,
            semanticSchema,
            structuredEvidence
        ),
        [],
        'structured semantic model is invalid'
    );

    return {
        legacyEvidence,
        observationHash: sha256(stableStringify(legacy.observation)),
        semanticHash: sha256(stableStringify(legacySemantic)),
        structuredEvidence,
    };
}

async function main() {
    const result = await verifyAdapters();
    console.log('Generator platform adapter equivalence: OK');
    console.log(`  normalized observation sha256: ${result.observationHash}`);
    console.log(`  canonical semantic IR sha256: ${result.semanticHash}`);
    console.log(
        `  evidence sources: legacy=${result.legacyEvidence.sources.length}, structured=${result.structuredEvidence.sources.length}`
    );
}

if (
    process.argv[1] &&
    import.meta.url === pathToFileURL(process.argv[1]).href
) {
    await main();
}
