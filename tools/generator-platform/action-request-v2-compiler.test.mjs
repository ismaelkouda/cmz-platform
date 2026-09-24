import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
    compileActionRequestV2ExecutionModel,
    validateActionRequestV2ExecutionModel,
} from './core/action-request-v2-compiler.mjs';

const root = new URL('./', import.meta.url);
const forgotBackendUri =
    'tools/generator-platform/fixtures/forgot-password.backend-contract.json';
const supportBackendUri =
    'tools/generator-platform/fixtures/action-request-v1.backend-contract.json';
const [forgotDefinitionDocument, forgotBackendDocument] = await Promise.all([
    readFile(new URL('fixtures/forgot-password.v2.definition.json', root)),
    readFile(new URL('fixtures/forgot-password.backend-contract.json', root)),
]);
const [supportDefinitionDocument, supportBackendDocument] = await Promise.all([
    readFile(new URL('fixtures/support-request.v2.definition.json', root)),
    readFile(new URL('fixtures/action-request-v1.backend-contract.json', root)),
]);
const forgotDefinition = JSON.parse(forgotDefinitionDocument.toString('utf8'));
const forgotBackend = JSON.parse(forgotBackendDocument.toString('utf8'));
const supportDefinition = JSON.parse(
    supportDefinitionDocument.toString('utf8')
);
const supportBackend = JSON.parse(supportBackendDocument.toString('utf8'));

function compile({
    definition = forgotDefinition,
    backendContract = forgotBackend,
    backendContractDocument,
    backendContractUri = forgotBackendUri,
} = {}) {
    const document =
        backendContractDocument ??
        (backendContract === forgotBackend
            ? forgotBackendDocument
            : Buffer.from(`${JSON.stringify(backendContract, null, 2)}\n`));
    const input = structuredClone(definition);
    input.backend_contract.sha256 = createHash('sha256')
        .update(document)
        .digest('hex');
    return compileActionRequestV2ExecutionModel({
        definition: input,
        backendContractDocument: document,
        backendContractUri,
    });
}

test('compile le cas actif public en modèle neutre strict et déterministe', () => {
    const definitionBefore = structuredClone(forgotDefinition);
    const backendBefore = structuredClone(forgotBackend);
    const first = compile();
    const second = compile();

    assert.deepEqual(first, second);
    assert.deepEqual(forgotDefinition, definitionBefore);
    assert.deepEqual(forgotBackend, backendBefore);
    assert.deepEqual(validateActionRequestV2ExecutionModel(first), []);
    assert.equal(first.kind, 'action-request-execution-model');
    assert.equal(first.actions.length, 1);

    const action = first.actions[0];
    assert.deepEqual(action.port, {
        input: {
            kind: 'object',
            fields: [
                {
                    name: 'email',
                    type: { kind: 'primitive', name: 'string' },
                    required: true,
                    nullable: false,
                    validations: [
                        { kind: 'required' },
                        { kind: 'format', format: 'email' },
                    ],
                },
            ],
        },
        output: { kind: 'result', model_id: 'forgot-password-result' },
    });
    assert.deepEqual(action.request_policy, {
        authentication: { mode: 'omit' },
        idempotency: { mode: 'none' },
    });
    assert.deepEqual(action.transport, {
        operation_id: 'authentication.forgot-password',
        service_id: 'authentication-api',
        method: 'POST',
        path: '/forgot-password',
        request_media_type: 'application/json',
        request_model_id: 'forgot-password-request-wire',
        success_response_status: 200,
        response_media_type: 'application/json',
        response_model_id: 'forgot-password-result-wire',
        envelope: {
            kind: 'object',
            data_field: 'data',
            error_field: 'error',
            message_field: 'message',
        },
    });
    assert.deepEqual(action.request_model, {
        id: 'forgot-password-request-wire',
        unknown_fields: 'reject',
        fields: [
            {
                name: 'email',
                source_field: 'email',
                type: { kind: 'primitive', name: 'string' },
                required: true,
                nullable: false,
            },
        ],
    });
    assert.deepEqual(action.response_wire_model.fields, [
        {
            name: 'message',
            type: { kind: 'primitive', name: 'string' },
            required: true,
            nullable: false,
        },
    ]);
    assert.deepEqual(action.result_model.fields, [
        {
            name: 'message',
            source_field: 'message',
            type: { kind: 'primitive', name: 'string' },
            required: true,
            nullable: false,
        },
    ]);
    assert.doesNotMatch(
        JSON.stringify(first),
        /angular|react|rxjs|httpclient|usemutation/i
    );
});

test('calcule l’empreinte sur les octets backend réellement compilés', () => {
    const changedBytes = Buffer.concat([
        forgotBackendDocument,
        Buffer.from(' '),
    ]);
    assert.throws(
        () =>
            compileActionRequestV2ExecutionModel({
                definition: forgotDefinition,
                backendContractDocument: changedBytes,
                backendContractUri: forgotBackendUri,
            }),
        /sha256: does not match backend bytes/
    );
});

test('délègue au host l’authentification et l’idempotence déclarées', () => {
    const model = compile({
        definition: supportDefinition,
        backendContract: supportBackend,
        backendContractDocument: supportBackendDocument,
        backendContractUri: supportBackendUri,
    });
    const action = model.actions[0];
    assert.deepEqual(action.request_policy.authentication, {
        mode: 'host',
        schemes: [{ id: 'bearer', kind: 'bearer' }],
    });
    assert.deepEqual(action.request_policy.idempotency, { mode: 'none' });
    assert.equal(action.request_model.fields.length, 3);
    assert.equal(action.transport.path, '/support/requests');
});

test('conserve séparément champs métier, payload wire et contraintes backend', () => {
    const definition = structuredClone(forgotDefinition);
    const backendContract = structuredClone(forgotBackend);
    definition.operations[0].input.fields[0].name = 'accountEmail';
    definition.operations[0].result_model.fields[0].name = 'confirmation';
    backendContract.models[0].fields[0].constraints = { min_length: 3 };

    const action = compile({ definition, backendContract }).actions[0];
    assert.deepEqual(action.port.input.fields[0], {
        name: 'accountEmail',
        type: { kind: 'primitive', name: 'string' },
        required: true,
        nullable: false,
        validations: [
            { kind: 'required' },
            { kind: 'format', format: 'email' },
        ],
        constraints: { min_length: 3 },
    });
    assert.deepEqual(action.request_model.fields[0], {
        name: 'email',
        source_field: 'accountEmail',
        type: { kind: 'primitive', name: 'string' },
        required: true,
        nullable: false,
        constraints: { min_length: 3 },
    });
    assert.equal(action.result_model.fields[0].name, 'confirmation');
    assert.equal(action.result_model.fields[0].source_field, 'message');
});

test('sépare définitivement le commit distant de l’effet local', () => {
    const definition = structuredClone(forgotDefinition);
    definition.operations[0].execution.post_success = {
        mode: 'host',
        effect_id: 'notify-password-recovery',
        failure_state: 'committed-with-local-error',
    };
    const action = compile({ definition }).actions[0];

    assert.deepEqual(action.controller.commands, [
        'submit',
        'retry-post-success',
    ]);
    assert.deepEqual(action.controller.state_rules, {
        submit: 'submitting',
        remote_failure: 'error',
        remote_success: 'applying-post-success',
        post_success_success: 'success',
        post_success_failure: 'committed-with-local-error',
        retry_post_success: 'applying-post-success',
    });
    assert.deepEqual(action.controller.commit_boundary, {
        event: 'remote-success',
        retry_remote_after_commit: 'forbidden',
    });
    assert.deepEqual(action.failures.post_success, {
        mode: 'host-propagated',
        failure_state: 'committed-with-local-error',
    });
});

test('projette les erreurs HTTP sans inventer une erreur métier', () => {
    const backendContract = structuredClone(forgotBackend);
    backendContract.operations[0].responses.push({
        status: 422,
        outcome: 'error',
        description: 'Invalid account email.',
        body: {
            media_type: 'application/json',
            model_id: 'forgot-password-result-wire',
            envelope: { kind: 'none' },
            evidence: backendContract.operations[0].responses[0].body.evidence,
        },
        evidence: backendContract.operations[0].responses[0].evidence,
    });
    assert.deepEqual(compile({ backendContract }).actions[0].failures, {
        invalid_input: 'invalid-input',
        invalid_response: 'invalid-response',
        backend_declared: {
            kind: 'envelope-flag',
            error_field: 'error',
            message_field: 'message',
        },
        http_responses: [
            {
                status: 422,
                body_model_id: 'forgot-password-result-wire',
                body_model_kind: 'object',
            },
        ],
        transport: 'host-propagated',
        post_success: { mode: 'none' },
    });
});

test('le validateur tue les dérives de mapping, auth, décodage et commit', () => {
    const model = compile();

    const unknownInput = structuredClone(model);
    unknownInput.actions[0].request_model.fields[0].source_field = 'missing';
    assert.match(
        validateActionRequestV2ExecutionModel(unknownInput).join('\n'),
        /invalid input mapping/
    );

    const leakedAuthentication = structuredClone(model);
    leakedAuthentication.actions[0].request_policy.authentication = {
        mode: 'host',
        schemes: [{ id: 'session', kind: 'bearer' }],
    };
    assert.match(
        validateActionRequestV2ExecutionModel(leakedAuthentication).join('\n'),
        /authentication: contradicts access/
    );

    const permissiveDecoder = structuredClone(model);
    permissiveDecoder.actions[0].response_wire_model.unknown_fields = 'allow';
    assert.match(
        validateActionRequestV2ExecutionModel(permissiveDecoder).join('\n'),
        /decoder must reject unknown fields/
    );

    const replayRemote = structuredClone(model);
    replayRemote.actions[0].controller.commit_boundary.retry_remote_after_commit =
        'allowed';
    assert.match(
        validateActionRequestV2ExecutionModel(replayRemote).join('\n'),
        /commit-safe transition contract/
    );

    const wrongOutput = structuredClone(model);
    wrongOutput.actions[0].port.output.model_id = 'other';
    assert.match(
        validateActionRequestV2ExecutionModel(wrongOutput).join('\n'),
        /does not match result model/
    );

    const inventedFailure = structuredClone(model);
    inventedFailure.actions[0].failures.magic = 'retry';
    assert.match(
        validateActionRequestV2ExecutionModel(inventedFailure).join('\n'),
        /nested contracts must use closed shapes/
    );

    const resultTypeDrift = structuredClone(model);
    resultTypeDrift.actions[0].result_model.fields[0].type.name = 'integer';
    assert.match(
        validateActionRequestV2ExecutionModel(resultTypeDrift).join('\n'),
        /unresolved wire source message/
    );
});

test('refuse un contrat backend illisible ou une forme non prouvée', () => {
    assert.throws(
        () =>
            compileActionRequestV2ExecutionModel({
                definition: forgotDefinition,
                backendContractDocument: Buffer.from('{'),
                backendContractUri: forgotBackendUri,
            }),
        /backend contract is not valid JSON/
    );

    const backendContract = structuredClone(forgotBackend);
    backendContract.models[0].fields[0].type = {
        kind: 'model',
        model_id: 'forgot-password-result-wire',
    };
    assert.throws(
        () => compile({ backendContract }),
        /request body fields must be primitive/
    );
});
