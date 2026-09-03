import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { compilePostmanBackendContract } from './adapters/postman-adapter.mjs';

const backendContractSchema = JSON.parse(
    await readFile(
        new URL('./schemas/backend-contract.schema.json', import.meta.url),
        'utf8'
    )
);

function variables() {
    return {
        baseUrl: 'https://reference.example/api',
        cmz_contract_id: 'reference-api',
        cmz_contract_version: '1.0.0',
        cmz_environment: 'reference',
        cmz_service_id: 'mobile-api',
        cmz_source_id: 'reference-postman',
    };
}

function validCollection() {
    return {
        info: {
            name: 'Reference mobile API',
            description: 'Observed collection from an analogous project.',
            schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
        },
        variable: Object.entries(variables()).map(([key, value]) => ({
            key,
            value,
        })),
        auth: {
            type: 'bearer',
            bearer: [{ key: 'token', value: '{{token}}' }],
        },
        item: [
            {
                name: 'Requests',
                item: [
                    {
                        name: 'Get request details',
                        request: {
                            method: 'GET',
                            description: 'Read one observed request.',
                            url: {
                                raw: '{{baseUrl}}/requests/:id?include=history',
                                variable: [
                                    {
                                        key: 'id',
                                        description:
                                            'Observed request identifier.',
                                    },
                                ],
                                query: [
                                    {
                                        key: 'include',
                                        value: 'history',
                                        description: 'Optional related data.',
                                    },
                                ],
                            },
                        },
                        response: [
                            {
                                name: 'OK',
                                status: 'OK',
                                code: 200,
                                header: [
                                    {
                                        key: 'Content-Type',
                                        value: 'application/json; charset=utf-8',
                                    },
                                ],
                                body: '{"id":"request-1","status":"received"}',
                            },
                        ],
                    },
                    {
                        name: 'Create request',
                        request: {
                            method: 'POST',
                            description: 'Create one observed request.',
                            header: [
                                {
                                    key: 'Content-Type',
                                    value: 'application/json',
                                },
                            ],
                            body: {
                                mode: 'raw',
                                raw: '{"description":"waste"}',
                            },
                            url: { raw: '{{baseUrl}}/requests' },
                        },
                        response: [
                            {
                                name: 'Created',
                                status: 'Created',
                                code: 201,
                                header: [
                                    {
                                        key: 'Content-Type',
                                        value: 'application/json',
                                    },
                                ],
                                body: '{"id":"request-2"}',
                            },
                        ],
                    },
                ],
            },
        ],
    };
}

function compile(document = validCollection()) {
    return compilePostmanBackendContract({
        document,
        snapshotUri: 'contracts/reference.postman.json',
        snapshotSha256: 'b'.repeat(64),
        backendContractSchema,
    });
}

test('projette Postman comme référence opaque sans inventer de champs', () => {
    const contract = compile();
    assert.equal(contract.contract.status, 'reference');
    assert.deepEqual(contract.sources[0], {
        id: 'reference-postman',
        kind: 'postman',
        authority: 'observational',
        status: 'reference',
        snapshot_uri: 'contracts/reference.postman.json',
        sha256: 'b'.repeat(64),
    });
    assert.deepEqual(
        contract.security_schemes.map((scheme) => scheme.id),
        ['bearer-auth']
    );
    assert.equal(contract.operations[0].path, '/requests/{id}');
    assert.deepEqual(
        contract.operations[0].request.parameters.map((parameter) => [
            parameter.name,
            parameter.in,
            parameter.required,
        ]),
        [
            ['id', 'path', true],
            ['include', 'query', false],
        ]
    );
    assert.ok(contract.models.every((model) => model.kind === 'scalar'));
    assert.ok(
        contract.models.every(
            (model) =>
                !Object.hasOwn(model, 'fields') && model.type.name === 'json'
        )
    );
    assert.equal(contract.operations[1].request.body.required, false);
});

test('refuse toute collection qui ne prouve pas une réponse de succès', () => {
    const collection = validCollection();
    collection.item[0].item[0].response[0].code = 404;
    assert.throws(() => compile(collection), /saved success response/);
});

test('refuse de déduire un schéma depuis form-data ou urlencoded', () => {
    for (const mode of ['formdata', 'urlencoded']) {
        const collection = validCollection();
        collection.item[0].item[1].request.body = { mode, [mode]: [] };
        assert.throws(() => compile(collection), /only raw bodies/);
    }
});

test('refuse les métadonnées absentes, versions et auth non supportées', () => {
    const missing = validCollection();
    missing.variable = missing.variable.filter(
        (entry) => entry.key !== 'cmz_contract_version'
    );
    assert.throws(() => compile(missing), /missing metadata variable/);

    const version = validCollection();
    version.info.schema =
        'https://schema.getpostman.com/json/collection/v2.0.0/collection.json';
    assert.throws(() => compile(version), /v2.1.0 is required/);

    const auth = validCollection();
    auth.auth = { type: 'digest' };
    assert.throws(() => compile(auth), /unsupported auth type/);
});

test('refuse les URLs extérieures à baseUrl et les secrets dans baseUrl', () => {
    const external = validCollection();
    external.item[0].item[0].request.url.raw =
        'https://evil.example/requests/:id';
    assert.throws(() => compile(external), /must start with/);

    const credentials = validCollection();
    credentials.variable.find((entry) => entry.key === 'baseUrl').value =
        'https://user:password@reference.example/api';
    assert.throws(() => compile(credentials), /credentials are forbidden/);
});
