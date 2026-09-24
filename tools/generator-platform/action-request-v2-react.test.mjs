import assert from 'node:assert/strict';
import test from 'node:test';

import {
    computeActionRequestV2Targets,
    computeReactActionRequestV2Target,
} from './action-request-v2-targets.mjs';
import { renderReactActionRequestV2 } from './renderers/react-action-request-v2-renderer.mjs';

const activeTarget = await computeReactActionRequestV2Target();

function mutateActive(mutator) {
    const model = structuredClone(activeTarget.model);
    mutator(model.actions[0], model);
    return model;
}

test('rend forgot-password de façon déterministe derrière un port host React', async () => {
    const second = await computeReactActionRequestV2Target();

    assert.deepEqual(second.files, activeTarget.files);
    assert.deepEqual(Object.keys(activeTarget.files).sort(), [
        'src/forgot-password.client.ts',
        'src/forgot-password.decoder.ts',
        'src/index.ts',
        'src/models.ts',
        'src/use-forgot-password.ts',
        'src/validation.ts',
    ]);

    const client = activeTarget.files['src/forgot-password.client.ts'];
    assert.match(client, /ActionRequestFetchPort/);
    assert.match(client, /serviceId: 'authentication-api'/);
    assert.match(client, /authentication:\s*{\s*mode: 'omit'/);
    assert.match(client, /validateForgotPasswordInput/);
    assert.match(client, /response\.status !== 200/);
    assert.match(client, /'Content-Type': 'application\/json'/);
    assert.doesNotMatch(
        client,
        /Authorization|Bearer|HttpClient|HttpContextToken|globalThis\.fetch|window\.fetch/
    );

    const hooks = activeTarget.files['src/use-forgot-password.ts'];
    assert.match(hooks, /pendingRef/);
    assert.match(hooks, /ActionRequestPendingError/);
    assert.match(hooks, /mountedRef\.current/);
    assert.doesNotMatch(hooks, /AbortController|\.abort\(/);
});

test('partage exactement le modèle et le plan avec Angular', async () => {
    const targets = await computeActionRequestV2Targets();

    assert.equal(
        targets.angular.manifest.input.sha256,
        targets.react.manifest.input.sha256
    );
    assert.equal(
        targets.angular.manifest.input.model_id,
        targets.react.manifest.input.model_id
    );
    assert.equal(
        targets.angular.files['src/models.ts'],
        targets.react.files['src/models.ts']
    );
    assert.deepEqual(
        targets.react.artifacts.map(({ artifact_id }) => artifact_id).sort(),
        [
            'domain-model',
            'execution-controller',
            'input-validator',
            'integration-client',
            'public-api',
            'response-decoder',
        ]
    );
});

test('refuse côté React les capacités sans oracle au lieu de les approximer', () => {
    assert.throws(
        () =>
            renderReactActionRequestV2(
                mutateActive((action) => {
                    action.transport.method = 'PUT';
                })
            ),
        /proven JSON POST shape/
    );

    assert.throws(
        () =>
            renderReactActionRequestV2(
                mutateActive((action) => {
                    action.access.mode = 'authenticated';
                    action.request_policy.authentication = {
                        mode: 'host',
                        schemes: [{ id: 'session', kind: 'bearer' }],
                    };
                })
            ),
        /proven public auth omission/
    );

    assert.throws(
        () =>
            renderReactActionRequestV2(
                mutateActive((action) => {
                    action.controller.execution.concurrency = 'parallel';
                })
            ),
        /execution policy without an oracle/
    );

    assert.throws(
        () =>
            renderReactActionRequestV2(
                mutateActive((action) => {
                    action.transport.path = '/forgot-password/{id}';
                })
            ),
        /proven JSON POST shape/
    );
});
