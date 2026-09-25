import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import {
    cmzAngularActionRequestHostBindings,
    computeAngularActionRequestV2Target,
} from './action-request-v2-targets.mjs';
import { renderAngularActionRequestV2 } from './renderers/angular-action-request-v2-renderer.mjs';

const activeTarget = await computeAngularActionRequestV2Target();

function mutateActive(mutator) {
    const model = structuredClone(activeTarget.model);
    mutator(model.actions[0], model);
    return model;
}

test('rend forgot-password de façon déterministe avec le host Angular réel', async () => {
    const second = await computeAngularActionRequestV2Target();

    assert.deepEqual(second.files, activeTarget.files);
    assert.deepEqual(Object.keys(activeTarget.files).sort(), [
        'src/forgot-password.decoder.ts',
        'src/forgot-password.facade.ts',
        'src/forgot-password.source.ts',
        'src/index.ts',
        'src/models.ts',
        'src/validation.ts',
    ]);

    const source = activeTarget.files['src/forgot-password.source.ts'];
    assert.match(source, /createActionRequestContext/);
    assert.match(source, /inject\(AUTH_API_URL\)/);
    assert.match(source, /\.request<unknown>\(\s*'POST'/);
    assert.match(source, /validateForgotPasswordInput/);
    assert.match(source, /observe: 'response'/);
    assert.match(source, /response\.status !== 200/);
    assert.match(source, /'Content-Type': 'application\/json'/);
    assert.doesNotMatch(
        source,
        /new HttpContextToken|Authorization|Bearer|subscribe\(/
    );

    const validation = activeTarget.files['src/validation.ts'];
    assert.match(validation, /InvalidPayloadError/);
    assert.match(validation, /non-empty string/);
    assert.match(validation, /expected.*email|invalid\([^\n]+email/);
    assert.match(validation, /INPUT_FIELDS/);

    const decoder = activeTarget.files['src/forgot-password.decoder.ts'];
    assert.match(decoder, /ServerResponseError/);
    assert.match(decoder, /WIRE_FIELDS/);
    assert.match(decoder, /ENVELOPE_FIELDS/);
    assert.match(decoder, /typeof message !== 'string'/);

    const facade = activeTarget.files['src/forgot-password.facade.ts'];
    assert.match(facade, /signal<ForgotPasswordState>\('idle'\)/);
    assert.match(facade, /ActionRequestPendingError/);
    assert.match(facade, /this\._state\.set\('submitting'\)/);
    assert.match(facade, /this\._state\.set\('success'\)/);
    assert.match(facade, /this\._state\.set\('error'\)/);
    assert.doesNotMatch(facade, /subscribe\(/);
});

test('lie exhaustivement les six artefacts au modèle réellement compilé', () => {
    assert.equal(
        activeTarget.artifactPlan.input.kind,
        'action-request-execution-model'
    );
    assert.equal(activeTarget.artifacts.length, 6);
    assert.deepEqual(
        activeTarget.artifacts.map(({ artifact_id }) => artifact_id).sort(),
        [
            'domain-model',
            'execution-controller',
            'input-validator',
            'integration-client',
            'public-api',
            'response-decoder',
        ]
    );
    assert.equal(
        activeTarget.manifest.input.model_id,
        activeTarget.model.model_id
    );
});

test('refuse les capacités Angular sans oracle actif', () => {
    assert.throws(
        () =>
            renderAngularActionRequestV2(
                mutateActive((_action, model) => {
                    const second = structuredClone(model.actions[0]);
                    second.id = 'second-action';
                    model.actions.push(second);
                }),
                cmzAngularActionRequestHostBindings
            ),
        /requires exactly one action/
    );

    assert.throws(
        () =>
            renderAngularActionRequestV2(
                mutateActive((action) => {
                    action.access.mode = 'authenticated';
                    action.request_policy.authentication = {
                        mode: 'host',
                        schemes: [{ id: 'session', kind: 'bearer' }],
                    };
                }),
                cmzAngularActionRequestHostBindings
            ),
        /proven public auth omission/
    );

    assert.throws(
        () =>
            renderAngularActionRequestV2(
                mutateActive((action) => {
                    action.controller.execution.retry = { mode: 'manual' };
                }),
                cmzAngularActionRequestHostBindings
            ),
        /execution policy without an oracle/
    );

    assert.throws(
        () =>
            renderAngularActionRequestV2(
                mutateActive((action) => {
                    action.controller.execution.invalidation = {
                        mode: 'caller-declared',
                    };
                }),
                cmzAngularActionRequestHostBindings
            ),
        /execution policy without an oracle/
    );

    assert.throws(
        () =>
            renderAngularActionRequestV2(
                mutateActive((action) => {
                    action.transport.envelope = { kind: 'none' };
                }),
                cmzAngularActionRequestHostBindings
            ),
        /proven JSON object envelope/
    );

    assert.throws(
        () =>
            renderAngularActionRequestV2(
                mutateActive((action) => {
                    action.port.input.fields[0].validations = [
                        { kind: 'required' },
                    ];
                }),
                cmzAngularActionRequestHostBindings
            ),
        /proven email validation/
    );
});

test('refuse les bindings host absents, ouverts ou injectables', () => {
    assert.throws(
        () =>
            renderAngularActionRequestV2(activeTarget.model, { services: {} }),
        /missing closed host binding for authentication-api/
    );

    const open = {
        services: {
            'authentication-api': {
                module: '@cmz/core',
                token: 'AUTH_API_URL',
                fallback: 'invented',
            },
        },
    };
    assert.throws(
        () => renderAngularActionRequestV2(activeTarget.model, open),
        /missing closed host binding for authentication-api/
    );

    assert.throws(
        () =>
            renderAngularActionRequestV2(activeTarget.model, {
                services: {
                    ...cmzAngularActionRequestHostBindings.services,
                    invented: { module: '@cmz/core', token: 'AUTH_API_URL' },
                },
            }),
        /host bindings must declare only authentication-api/
    );

    const unsafe = {
        services: {
            'authentication-api': {
                module: "@cmz/core'; throw new Error('injected') //",
                token: 'AUTH_API_URL',
            },
        },
    };
    assert.throws(
        () => renderAngularActionRequestV2(activeTarget.model, unsafe),
        /unsafe host binding/
    );
});

test('refuse une traversée backend avant toute lecture hors workspace', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'cmz-action-target-'));
    const definitionPath = join(directory, 'definition.json');
    const definition = structuredClone(activeTarget.definition);
    definition.backend_contract.uri = '../../../../../../etc/passwd';
    await writeFile(definitionPath, `${JSON.stringify(definition)}\n`);

    try {
        await assert.rejects(
            computeAngularActionRequestV2Target({ definitionPath }),
            /backend contract uri must stay inside the workspace/
        );
    } finally {
        await rm(directory, { recursive: true, force: true });
    }
});
