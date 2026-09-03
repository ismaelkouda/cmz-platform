import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { compileOpenApiBackendContract } from './adapters/openapi-adapter.mjs';
import { parseStructuredSource } from './core/source-document.mjs';

const backendContractSchema = JSON.parse(
    await readFile(
        new URL('./schemas/backend-contract.schema.json', import.meta.url),
        'utf8'
    )
);

function validDocument() {
    return {
        openapi: '3.1.1',
        info: {
            title: 'Clean Street API',
            version: '1.0.0',
            description: 'Target API contract.',
        },
        servers: [
            {
                url: 'https://api.clean-street.example/v1',
                'x-cmz-environment': 'production',
            },
        ],
        'x-cmz-contract': {
            authority: 'declared',
            contract_id: 'clean-street-api',
            lifecycle: 'planned',
            service_id: 'public-api',
            source_id: 'clean-street-openapi',
        },
        security: [{ BearerAuth: [] }],
        components: {
            securitySchemes: {
                BearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    description: 'Citizen access token.',
                },
            },
            schemas: {
                CreateReport: {
                    type: 'object',
                    description: 'New waste report.',
                    additionalProperties: false,
                    required: ['description'],
                    properties: {
                        description: {
                            type: 'string',
                            description: 'Visible report description.',
                            minLength: 3,
                            maxLength: 500,
                        },
                        photo: {
                            type: ['string', 'null'],
                            format: 'binary',
                            description: 'Optional report photo.',
                        },
                    },
                },
                Report: {
                    type: 'object',
                    description: 'Persisted waste report.',
                    additionalProperties: false,
                    required: ['id', 'status'],
                    properties: {
                        id: {
                            type: 'string',
                            format: 'uuid',
                            description: 'Stable report identifier.',
                        },
                        status: {
                            type: 'string',
                            description: 'Processing status.',
                            enum: ['received', 'processing', 'resolved'],
                        },
                    },
                },
            },
        },
        paths: {
            '/reports': {
                post: {
                    operationId: 'createReport',
                    description: 'Create one geolocated report.',
                    security: [{ BearerAuth: ['report:create'] }],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: '#/components/schemas/CreateReport',
                                },
                            },
                        },
                    },
                    responses: {
                        201: {
                            description: 'Report created.',
                            content: {
                                'application/json': {
                                    schema: {
                                        $ref: '#/components/schemas/Report',
                                    },
                                },
                            },
                        },
                        400: { description: 'Invalid report.' },
                    },
                },
            },
        },
    };
}

function compile(document = validDocument()) {
    return compileOpenApiBackendContract({
        document,
        snapshotUri: 'contracts/clean-street.openapi.yaml',
        snapshotSha256: 'a'.repeat(64),
        backendContractSchema,
    });
}

test('projette OpenAPI vers le contrat canonique sans fuite de format source', () => {
    const contract = compile();
    assert.equal(contract.contract.status, 'planned');
    assert.equal(contract.sources[0].kind, 'openapi');
    assert.equal(
        contract.services[0].base_urls[0].url,
        'https://api.clean-street.example/v1/'
    );
    assert.deepEqual(
        contract.security_schemes.map((scheme) => scheme.id),
        ['bearer-auth']
    );
    assert.deepEqual(
        contract.models.map((model) => model.id),
        ['create-report', 'report']
    );
    assert.deepEqual(contract.operations[0].access, {
        mode: 'authorized',
        security_scheme_ids: ['bearer-auth'],
        permissions: ['report:create'],
    });
    assert.equal(contract.operations[0].request.body.model_id, 'create-report');
    assert.equal(contract.operations[0].responses[0].body.model_id, 'report');
});

test('parse JSON et YAML strictement avec clés YAML dupliquées interdites', () => {
    assert.equal(parseStructuredSource('{"openapi":"3.1.1"}').openapi, '3.1.1');
    assert.equal(parseStructuredSource('openapi: 3.1.1\n').openapi, '3.1.1');
    assert.throws(
        () => parseStructuredSource('openapi: 3.1.1\nopenapi: 3.0.0\n'),
        /Map keys must be unique/
    );
});

test('refuse une maturité OpenAPI qui ne correspond pas à son autorité', () => {
    const document = validDocument();
    document['x-cmz-contract'].lifecycle = 'implemented';
    assert.throws(
        () => compile(document),
        /implemented requires authoritative/
    );
});

test('refuse secrets, query et fragment dans une URL serveur', () => {
    for (const [url, message] of [
        ['https://user:secret@api.example/v1', /credentials/],
        ['https://api.example/v1?token=secret', /query or fragment/],
        ['https://api.example/v1#internal', /query or fragment/],
    ]) {
        const document = validDocument();
        document.servers[0].url = url;
        assert.throws(() => compile(document), message);
    }
});

test('refuse les références externes et les bodies inline', () => {
    const external = validDocument();
    external.paths['/reports'].post.responses[201].content[
        'application/json'
    ].schema.$ref = 'other.yaml#/components/schemas/Report';
    assert.throws(() => compile(external), /only local component references/);

    const inline = validDocument();
    inline.paths['/reports'].post.requestBody.content[
        'application/json'
    ].schema = { type: 'object' };
    assert.throws(() => compile(inline), /only local component references/);
});

test('refuse les alternatives de sécurité impossibles à exprimer sans perte', () => {
    const document = validDocument();
    document.paths['/reports'].post.security = [{ BearerAuth: [] }, {}];
    assert.throws(() => compile(document), /security alternatives/);
});

test('refuse union, callbacks, headers et codes de réponse génériques', () => {
    const union = validDocument();
    union.components.schemas.Report.properties.status.oneOf = [
        { type: 'string' },
        { type: 'integer' },
    ];
    assert.throws(() => compile(union), /oneOf is not representable/);

    const callback = validDocument();
    callback.paths['/reports'].post.callbacks = { done: {} };
    assert.throws(() => compile(callback), /callbacks are not represented/);

    const header = validDocument();
    header.paths['/reports'].post.responses[201].headers = { Location: {} };
    assert.throws(() => compile(header), /response headers/);

    const generic = validDocument();
    generic.paths['/reports'].post.responses['2XX'] =
        generic.paths['/reports'].post.responses[201];
    delete generic.paths['/reports'].post.responses[201];
    assert.throws(() => compile(generic), /only exact HTTP status codes/);
});
