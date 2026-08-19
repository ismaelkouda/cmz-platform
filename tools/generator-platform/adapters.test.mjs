import assert from 'node:assert/strict';
import test from 'node:test';

import { legacyAdapterInternals } from './adapters/legacy-typescript-adapter.mjs';
import {
    buildSemanticModel,
    readJson,
    validateObservation,
} from './core/action-request-model.mjs';
import { verifyAdapters } from './check-adapters.mjs';

const root = new URL('./', import.meta.url);

test('legacy TypeScript and structured specification converge on one canonical IR', async () => {
    const result = await verifyAdapters();
    assert.match(result.observationHash, /^[a-f0-9]{64}$/);
    assert.match(result.semanticHash, /^[a-f0-9]{64}$/);
    assert.equal(result.legacyEvidence.sources.length, 18);
    assert.equal(result.structuredEvidence.sources.length, 2);
});

test('normalized observation rejects undeclared source properties', async () => {
    const observation = await readJson(
        new URL('sources/action-request.spec.json', root)
    );
    observation.operations[0].framework = 'target leakage';
    assert.throws(
        () => validateObservation(observation),
        /unsupported property framework/
    );
});

test('legacy validator extraction fails closed on an unknown branch', () => {
    const source = legacyAdapterInternals.parseSource(
        `function validate(contract: LoginRequestContract) {
      if (contract.email === 'forbidden') throw new Error();
    }`,
        'mutation.ts'
    );
    const fields = [
        {
            name: 'email',
            sourceName: 'email',
            type: { kind: 'primitive', name: 'string', nullable: false },
            required: false,
        },
    ];
    assert.throws(
        () =>
            legacyAdapterInternals.applyValidator(
                source,
                fields,
                'login',
                'mutation.ts'
            ),
        /unsupported validation branch/
    );
});

test('a structured endpoint mutation changes the canonical IR', async () => {
    const [observation, policy, expected] = await Promise.all([
        readJson(new URL('sources/action-request.spec.json', root)),
        readJson(new URL('policies/action-request.policy.json', root)),
        readJson(new URL('fixtures/action-request.semantic.json', root)),
    ]);
    observation.operations[0].http.path = 'login-v2';
    assert.notDeepEqual(buildSemanticModel(observation, policy), expected);
});
