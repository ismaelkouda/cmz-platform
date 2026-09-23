import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import {
    validateBackendContract,
    verifyBackendContractSnapshots,
} from './core/backend-contract.mjs';
import {
    migrateActionRequestV1Definition,
    validateActionRequestV2Definition,
} from './core/action-request-v2.mjs';
import {
    migrateActionRequestFile,
    parseActionRequestMigrationArguments,
} from './migrate-action-request.mjs';
import {
    loadJson,
    repositoryRoot,
    validateJsonSchema,
} from './validate-ir.mjs';

const root = new URL('./', import.meta.url);
const readJson = async (path) =>
    JSON.parse(await readFile(new URL(path, root), 'utf8'));
const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const [backendSchema, v1Schema, v2Schema] = await Promise.all([
    loadJson(new URL('schemas/backend-contract.schema.json', root)),
    loadJson(new URL('schemas/action-request-definition.schema.json', root)),
    loadJson(new URL('schemas/action-request-definition-v2.schema.json', root)),
]);
const [legacy, backend, decisions, expected, activeBackend, activeDefinition] =
    await Promise.all([
        readJson('sources/support-request.definition.json'),
        readJson('fixtures/action-request-v1.backend-contract.json'),
        readJson('fixtures/action-request-v1.migration-decisions.json'),
        readJson('fixtures/support-request.v2.definition.json'),
        readJson('fixtures/forgot-password.backend-contract.json'),
        readJson('fixtures/forgot-password.v2.definition.json'),
    ]);
const backendUri =
    'tools/generator-platform/fixtures/action-request-v1.backend-contract.json';
const backendBytes = await readFile(new URL(`../../${backendUri}`, root));
const backendHash = sha256(backendBytes);

function migrationOptions(overrides = {}) {
    return {
        backendContract: backend,
        backendContractUri: backendUri,
        backendContractSha256: backendHash,
        decisions,
        ...overrides,
    };
}

function validate(definition, contract = backend, options = {}) {
    return validateActionRequestV2Definition(definition, contract, {
        backendContractSha256: options.hash ?? backendHash,
        backendContractUri: options.uri ?? backendUri,
    });
}

test('la v2 référence le backend sans redéclarer HTTP, accès ou DTO', () => {
    assert.deepEqual(validateJsonSchema(legacy, v1Schema), []);
    assert.deepEqual(validateBackendContract(backend, backendSchema), []);
    const migrated = migrateActionRequestV1Definition(
        legacy,
        migrationOptions()
    );
    assert.deepEqual(validateJsonSchema(migrated, v2Schema), []);
    assert.deepEqual(validate(migrated), []);

    const operation = migrated.operations[0];
    assert.deepEqual(operation.operation_ref, {
        operation_id: 'support.contact',
    });
    for (const forbidden of ['http', 'access', 'method', 'path', 'output']) {
        assert.equal(Object.hasOwn(operation, forbidden), false);
    }
    assert.deepEqual(operation.input.fields[0], {
        name: 'email',
        body_field: 'email',
        validations: [
            { kind: 'required' },
            { kind: 'format', format: 'email' },
        ],
    });
});

test('la migration versionnée est exacte, déterministe et idempotente', () => {
    assert.equal(backendHash, expected.backend_contract.sha256);
    const first = migrateActionRequestV1Definition(legacy, migrationOptions());
    const repeated = migrateActionRequestV1Definition(
        legacy,
        migrationOptions()
    );
    const idempotent = migrateActionRequestV1Definition(
        first,
        migrationOptions()
    );
    assert.deepEqual(first, expected);
    assert.deepEqual(repeated, first);
    assert.deepEqual(idempotent, first);
});

test('le cas actif forgot-password prouve un contrat implémenté, public et traçable', async () => {
    const activeUri =
        'tools/generator-platform/fixtures/forgot-password.backend-contract.json';
    const activeBytes = await readFile(new URL(`../../${activeUri}`, root));
    const activeHash = sha256(activeBytes);
    assert.deepEqual(validateBackendContract(activeBackend, backendSchema), []);
    assert.deepEqual(
        await verifyBackendContractSnapshots(activeBackend, repositoryRoot),
        []
    );
    assert.deepEqual(validateJsonSchema(activeDefinition, v2Schema), []);
    assert.deepEqual(
        validateActionRequestV2Definition(activeDefinition, activeBackend, {
            backendContractSha256: activeHash,
            backendContractUri: activeUri,
        }),
        []
    );
    const operation = activeBackend.operations[0];
    assert.equal(activeBackend.contract.status, 'implemented');
    assert.match(
        activeBackend.contract.description,
        /not a verified-live server/
    );
    assert.equal(operation.access.mode, 'public');
    assert.deepEqual(operation.access.security_scheme_ids, []);
    assert.equal(operation.method, 'POST');
});

test('les dérives de référence, mutation, body, mapping et exécution échouent fermées', () => {
    const migrated = structuredClone(expected);

    const wrongHash = structuredClone(migrated);
    wrongHash.backend_contract.sha256 = 'f'.repeat(64);
    assert.match(validate(wrongHash).join('\n'), /sha256.*backend bytes/);

    const traversal = structuredClone(migrated);
    traversal.backend_contract.uri = '../backend.json';
    assert.match(
        validate(traversal).join('\n'),
        /normalized workspace-relative path/
    );

    const queryBackend = structuredClone(backend);
    queryBackend.operations[0].method = 'GET';
    assert.match(
        validate(migrated, queryBackend).join('\n'),
        /requires a mutation/
    );

    const parameterBackend = structuredClone(backend);
    parameterBackend.operations[0].request.parameters.push({
        name: 'tenant',
        in: 'header',
        description: 'Tenant.',
        required: true,
        type: { kind: 'primitive', name: 'string' },
        evidence: [
            { source_id: 'action-request-v1-source', locator: '$.tenant' },
        ],
    });
    assert.match(
        validate(migrated, parameterBackend).join('\n'),
        /parameters are not supported/
    );

    const multipartBackend = structuredClone(backend);
    multipartBackend.operations[0].request.body.media_types = [
        'multipart/form-data',
    ];
    assert.match(
        validate(migrated, multipartBackend).join('\n'),
        /exactly application\/json/
    );

    const nestedBackend = structuredClone(backend);
    nestedBackend.models.push({
        id: 'nested-wire',
        kind: 'object',
        status: 'planned',
        description: 'Unsupported nested model.',
        fields: [],
        evidence: [
            { source_id: 'action-request-v1-source', locator: '$.nested' },
        ],
    });
    nestedBackend.models[0].fields[0].type = {
        kind: 'model',
        model_id: 'nested-wire',
    };
    assert.match(
        validate(migrated, nestedBackend).join('\n'),
        /request body fields must be primitive/
    );

    const duplicateInput = structuredClone(migrated);
    duplicateInput.operations[0].input.fields[1].body_field = 'email';
    assert.match(
        validate(duplicateInput).join('\n'),
        /duplicate email|requires exactly one binding/
    );

    const missingRequired = structuredClone(migrated);
    missingRequired.operations[0].input.fields[0].validations = [
        { kind: 'format', format: 'email' },
    ];
    assert.match(
        validate(missingRequired).join('\n'),
        /required must match backend field/
    );

    const unsafeRetry = structuredClone(migrated);
    unsafeRetry.operations[0].execution.retry = { mode: 'manual' };
    assert.match(
        validate(unsafeRetry).join('\n'),
        /manual retry requires host idempotency/
    );

    const unsafeParallel = structuredClone(migrated);
    unsafeParallel.operations[0].execution.concurrency = 'parallel';
    assert.match(
        validate(unsafeParallel).join('\n'),
        /parallel commands require host idempotency/
    );

    const incompatibleEquals = structuredClone(migrated);
    incompatibleEquals.operations[0].input.fields[0].validations.push({
        kind: 'equals',
        other_field: 'subject',
    });
    const incompatibleBackend = structuredClone(backend);
    incompatibleBackend.models[0].fields[1].type.name = 'integer';
    assert.match(
        validate(incompatibleEquals, incompatibleBackend).join('\n'),
        /equals requires compatible backend field types/
    );
});

test('le migrateur refuse les décisions absentes, ouvertes, inconnues ou ambiguës', () => {
    assert.throws(
        () =>
            migrateActionRequestV1Definition(
                legacy,
                migrationOptions({ decisions: undefined })
            ),
        /migration decisions are required/
    );

    const open = structuredClone(decisions);
    open.operations[0].implicit_retry = true;
    assert.throws(
        () =>
            migrateActionRequestV1Definition(
                legacy,
                migrationOptions({ decisions: open })
            ),
        /closed v1 migration shape/
    );

    const unknownSource = structuredClone(decisions);
    unknownSource.operations[0].input_field_mappings = [
        { source_field: 'missing', target_field: 'email' },
    ];
    assert.throws(
        () =>
            migrateActionRequestV1Definition(
                legacy,
                migrationOptions({ decisions: unknownSource })
            ),
        /unknown source field missing/
    );

    const duplicateSource = structuredClone(decisions);
    duplicateSource.operations[0].input_field_mappings = [
        { source_field: 'email', target_field: 'email' },
        { source_field: 'email', target_field: 'subject' },
    ];
    assert.throws(
        () =>
            migrateActionRequestV1Definition(
                legacy,
                migrationOptions({ decisions: duplicateSource })
            ),
        /duplicate input_field_mappings source email/
    );

    const manyToOne = structuredClone(decisions);
    manyToOne.operations[0].input_field_mappings = [
        { source_field: 'subject', target_field: 'email' },
    ];
    assert.throws(
        () =>
            migrateActionRequestV1Definition(
                legacy,
                migrationOptions({ decisions: manyToOne })
            ),
        /changes request type|required|cover both models exactly/
    );
});

test('le migrateur bloque toute divergence de méthode, chemin, auth, enveloppe ou type', () => {
    for (const [mutate, expectedError] of [
        [(contract) => (contract.operations[0].path = '/other'), /path/],
        [(contract) => (contract.operations[0].method = 'PATCH'), /method/],
        [
            (contract) => (contract.operations[0].access.mode = 'public'),
            /access/,
        ],
        [
            (contract) =>
                (contract.operations[0].responses[0].body.envelope = {
                    kind: 'object',
                    data_field: 'data',
                    error_field: 'error',
                    message_field: 'message',
                }),
            /response_envelope/,
        ],
    ]) {
        const drifted = structuredClone(backend);
        mutate(drifted);
        assert.throws(
            () =>
                migrateActionRequestV1Definition(
                    legacy,
                    migrationOptions({ backendContract: drifted })
                ),
            expectedError
        );
    }

    const wrongType = structuredClone(backend);
    wrongType.models[0].fields[0].type.name = 'integer';
    assert.throws(
        () =>
            migrateActionRequestV1Definition(
                legacy,
                migrationOptions({ backendContract: wrongType })
            ),
        /changes request type/
    );

    const authorizedLegacy = structuredClone(legacy);
    authorizedLegacy.operations[0].access = {
        mode: 'authorized',
        permissions: ['support.create'],
    };
    const authorizedBackend = structuredClone(backend);
    authorizedBackend.operations[0].access = {
        mode: 'authorized',
        security_scheme_ids: ['bearer'],
        permissions: ['support.other'],
    };
    assert.throws(
        () =>
            migrateActionRequestV1Definition(
                authorizedLegacy,
                migrationOptions({ backendContract: authorizedBackend })
            ),
        /permissions/
    );
});

test('la commande écrit une seule sortie et refuse de l’écraser', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'action-request-v2-'));
    try {
        const definitionPath = join(
            repositoryRoot,
            'tools/generator-platform/sources/support-request.definition.json'
        );
        const backendContractPath = join(repositoryRoot, backendUri);
        const decisionsPath = join(
            repositoryRoot,
            'tools/generator-platform/fixtures/action-request-v1.migration-decisions.json'
        );
        const outputPath = join(workspace, 'action.v2.json');
        const result = await migrateActionRequestFile({
            definitionPath,
            backendContractPath,
            decisionsPath,
            outputPath,
            workspaceRoot: repositoryRoot,
        });
        assert.deepEqual(result.definition, expected);
        await assert.rejects(
            migrateActionRequestFile({
                definitionPath,
                backendContractPath,
                decisionsPath,
                outputPath,
                workspaceRoot: repositoryRoot,
            }),
            /EEXIST/
        );
    } finally {
        await rm(workspace, { recursive: true, force: true });
    }
});

test('la CLI garde une surface nominale fermée', () => {
    assert.deepEqual(
        parseActionRequestMigrationArguments([
            '--definition',
            'action.v1.json',
            '--backend-contract',
            'backend.json',
            '--decisions',
            'decisions.json',
            '--out',
            'action.v2.json',
        ]),
        {
            definition: 'action.v1.json',
            'backend-contract': 'backend.json',
            decisions: 'decisions.json',
            out: 'action.v2.json',
        }
    );
    assert.throws(
        () => parseActionRequestMigrationArguments(['--magic', 'yes']),
        /unknown argument/
    );
});
