import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { validateBackendContract } from './core/backend-contract.mjs';
import {
    migrateListQueryV1Definition,
    validateListQueryV2Definition,
} from './core/list-query-v2.mjs';
import {
    migrateListQueryFile,
    parseListQueryMigrationArguments,
} from './migrate-list-query.mjs';
import {
    loadJson,
    repositoryRoot,
    validateJsonSchema,
} from './validate-ir.mjs';

const root = new URL('./', import.meta.url);
const [backendSchema, v1Schema, v2Schema] = await Promise.all([
    loadJson(new URL('schemas/backend-contract.schema.json', root)),
    loadJson(new URL('schemas/list-query-definition.schema.json', root)),
    loadJson(new URL('schemas/list-query-definition-v2.schema.json', root)),
]);
const legacyDefinition = JSON.parse(
    await readFile(
        new URL('fixtures/editorial-blocks.v1.definition.json', root),
        'utf8'
    )
);
const [persistedBackendContract, persistedDecisions, expectedV2Definition] =
    await Promise.all(
        [
            'fixtures/list-query-v1.backend-contract.json',
            'fixtures/list-query-v1.migration-decisions.json',
            'fixtures/editorial-blocks.v2.definition.json',
        ].map(async (path) =>
            JSON.parse(await readFile(new URL(path, root), 'utf8'))
        )
    );

function evidence(locator = '$') {
    return [{ source_id: 'source', locator }];
}

function backendType(legacyType) {
    return {
        kind: 'primitive',
        name: legacyType.name === 'decimal' ? 'number' : legacyType.name,
    };
}

function backendContractFor(
    definition,
    {
        operationId = 'cms.list-home-block-infos',
        path = '/cms/home-block-infos/actives/pwa',
        access = 'public',
        wireFields,
    } = {}
) {
    const item = definition.operations[0].item;
    const fields =
        wireFields ??
        item.fields.map((field) => ({
            name: field.name,
            required: field.required,
            nullable: field.type.nullable,
            type: backendType(field.type),
        }));
    const securitySchemes =
        access === 'public'
            ? []
            : [
                  {
                      id: 'bearer',
                      kind: 'bearer',
                      status: 'planned',
                      description: 'Session bearer token.',
                      evidence: evidence('$.security.bearer'),
                  },
              ];
    return {
        schema_version: '1.0.0',
        kind: 'backend-contract',
        contract: {
            id: 'cmz-settings-api',
            title: 'CMZ Settings API',
            version: '1.0.0',
            status: 'planned',
            description: 'Backend authority used by the list-query v2 proof.',
        },
        sources: [
            {
                id: 'source',
                kind: 'manual',
                authority: 'declared',
                status: 'planned',
                snapshot_uri: 'contracts/settings-api.json',
                sha256: 'a'.repeat(64),
            },
        ],
        services: [
            {
                id: 'settings-api',
                status: 'planned',
                description: 'Settings service.',
                base_urls: [
                    {
                        environment: 'production',
                        url: 'https://settings.example/api/',
                    },
                ],
                evidence: evidence('$.services.settings-api'),
            },
        ],
        security_schemes: securitySchemes,
        models: [
            {
                id: 'home-block-info-wire',
                kind: 'object',
                status: 'planned',
                description: 'Wire item.',
                fields: fields.map((field) => ({
                    ...field,
                    description: `Wire field ${field.name}.`,
                    evidence: evidence(`$.models.item.${field.name}`),
                })),
                evidence: evidence('$.models.item'),
            },
            {
                id: 'home-block-info-list-wire',
                kind: 'array',
                status: 'planned',
                description: 'Wire list.',
                items: { kind: 'model', model_id: 'home-block-info-wire' },
                evidence: evidence('$.models.list'),
            },
        ],
        operations: [
            {
                id: operationId,
                service_id: 'settings-api',
                status: 'planned',
                description: 'Loads the requested list.',
                method: 'GET',
                path,
                access: {
                    mode: access,
                    security_scheme_ids: access === 'public' ? [] : ['bearer'],
                    permissions: [],
                },
                request: { parameters: [] },
                responses: [
                    {
                        status: 200,
                        outcome: 'success',
                        description: 'List available.',
                        body: {
                            media_type: 'application/json',
                            model_id: 'home-block-info-list-wire',
                            envelope: {
                                kind: 'object',
                                data_field: 'data',
                                error_field: 'error',
                                message_field: 'message',
                            },
                            evidence: evidence('$.responses.200.body'),
                        },
                        evidence: evidence('$.responses.200'),
                    },
                ],
                evidence: evidence('$.operations.list'),
            },
        ],
    };
}

function execution({ scope = 'public' } = {}) {
    return {
        cache: { mode: 'host', scope, refresh: 'bypass' },
        concurrency: 'latest-wins',
        cancellation: { on_superseded: true, on_destroy: true },
        retry: { mode: 'none' },
        stale_data: { on_reload: 'preserve', on_error: 'preserve' },
    };
}

function decisions(
    operationId = 'list-home-block-infos',
    backendOperationId = 'cms.list-home-block-infos',
    extra = {}
) {
    return {
        schema_version: '1.0.0',
        kind: 'list-query-v1-migration-decisions',
        operations: [
            {
                source_operation_id: operationId,
                backend_operation_id: backendOperationId,
                success_response_status: 200,
                execution: execution(),
                ...extra,
            },
        ],
    };
}

function sha256(value) {
    return createHash('sha256').update(value).digest('hex');
}

function migrate(definition = legacyDefinition, options = {}) {
    const backendContract =
        options.backendContract ?? backendContractFor(definition);
    const backendBytes = `${JSON.stringify(backendContract, null, 2)}\n`;
    return migrateListQueryV1Definition(definition, {
        backendContract,
        backendContractUri: 'contracts/cmz-settings-api.json',
        backendContractSha256: sha256(backendBytes),
        decisions: options.decisions ?? decisions(),
    });
}

test('la v2 référence le backend autoritaire sans redéclarer HTTP, auth ou DTO', () => {
    assert.deepEqual(validateJsonSchema(legacyDefinition, v1Schema), []);
    const backendContract = backendContractFor(legacyDefinition);
    assert.deepEqual(
        validateBackendContract(backendContract, backendSchema),
        []
    );
    const backendBytes = `${JSON.stringify(backendContract, null, 2)}\n`;
    const migrated = migrate(legacyDefinition, { backendContract });
    assert.deepEqual(validateJsonSchema(migrated, v2Schema), []);
    assert.deepEqual(
        validateListQueryV2Definition(migrated, backendContract, {
            backendContractSha256: sha256(backendBytes),
        }),
        []
    );
    const operation = migrated.operations[0];
    assert.deepEqual(operation.operation_ref, {
        operation_id: 'cms.list-home-block-infos',
    });
    assert.equal(Object.hasOwn(operation, 'http'), false);
    assert.equal(Object.hasOwn(operation, 'access'), false);
    assert.equal(Object.hasOwn(operation, 'item'), false);
});

test('le migrateur est déterministe et idempotent sur une définition v2 valide', () => {
    const backendContract = backendContractFor(legacyDefinition);
    const backendBytes = `${JSON.stringify(backendContract, null, 2)}\n`;
    const first = migrate(legacyDefinition, { backendContract });
    const second = migrateListQueryV1Definition(first, {
        backendContract,
        backendContractUri: 'contracts/cmz-settings-api.json',
        backendContractSha256: sha256(backendBytes),
        decisions: decisions(),
    });
    assert.deepEqual(second, first);
});

test('les fixtures versionnées prouvent exactement la migration avant/après', async () => {
    const backendBytes = await readFile(
        new URL('fixtures/list-query-v1.backend-contract.json', root)
    );
    const backendContractSha256 = sha256(backendBytes);
    assert.equal(
        backendContractSha256,
        expectedV2Definition.backend_contract.sha256
    );
    assert.deepEqual(
        validateBackendContract(persistedBackendContract, backendSchema),
        []
    );
    const migrated = migrateListQueryV1Definition(legacyDefinition, {
        backendContract: persistedBackendContract,
        backendContractUri:
            'tools/generator-platform/fixtures/list-query-v1.backend-contract.json',
        backendContractSha256,
        decisions: persistedDecisions,
    });
    assert.deepEqual(migrated, expectedV2Definition);
    assert.deepEqual(validateJsonSchema(migrated, v2Schema), []);
});

test('les mutants de référence, méthode, mapping et exécution échouent fermés', () => {
    const backendContract = backendContractFor(legacyDefinition);
    const backendBytes = `${JSON.stringify(backendContract, null, 2)}\n`;
    const migrated = migrate(legacyDefinition, { backendContract });

    const wrongHash = structuredClone(migrated);
    wrongHash.backend_contract.sha256 = 'f'.repeat(64);
    assert.match(
        validateListQueryV2Definition(wrongHash, backendContract, {
            backendContractSha256: sha256(backendBytes),
        }).join('\n'),
        /sha256: does not match backend bytes/
    );

    const wrongPath = structuredClone(migrated);
    wrongPath.backend_contract.uri = 'contracts/other.json';
    assert.match(
        validateListQueryV2Definition(wrongPath, backendContract, {
            backendContractSha256: sha256(backendBytes),
            backendContractUri: 'contracts/cmz-settings-api.json',
        }).join('\n'),
        /uri: does not match backend path/
    );

    const traversal = structuredClone(migrated);
    traversal.backend_contract.uri = '../contracts/backend.json';
    assert.match(
        validateListQueryV2Definition(traversal, backendContract, {
            backendContractSha256: sha256(backendBytes),
        }).join('\n'),
        /normalized workspace-relative path/
    );

    const duplicateField = structuredClone(migrated);
    duplicateField.operations[0].read_model.fields[1].name =
        duplicateField.operations[0].read_model.fields[0].name;
    assert.match(
        validateListQueryV2Definition(duplicateField, backendContract, {
            backendContractSha256: sha256(backendBytes),
        }).join('\n'),
        /read_model\.fields.*duplicate/
    );

    const invalidExecution = structuredClone(migrated);
    invalidExecution.operations[0].execution.cache.scope = 'principal';
    invalidExecution.operations[0].execution.cancellation.on_superseded = false;
    const executionErrors = validateListQueryV2Definition(
        invalidExecution,
        backendContract,
        { backendContractSha256: sha256(backendBytes) }
    ).join('\n');
    assert.match(executionErrors, /public query requires public scope/);
    assert.match(executionErrors, /latest-wins requires cancellation/);

    const postContract = structuredClone(backendContract);
    postContract.operations[0].method = 'POST';
    assert.match(
        validateListQueryV2Definition(migrated, postContract, {
            backendContractSha256: sha256(backendBytes),
        }).join('\n'),
        /list-query requires GET/
    );
});

test('la migration vérifie l’enveloppe de la réponse explicitement sélectionnée', () => {
    const backendContract = backendContractFor(legacyDefinition);
    const partial = structuredClone(backendContract.operations[0].responses[0]);
    partial.status = 206;
    partial.body.envelope = { kind: 'none' };
    backendContract.operations[0].responses.unshift(partial);
    assert.doesNotThrow(() => migrate(legacyDefinition, { backendContract }));
});

test('le migrateur bloque les décisions non déductibles et toute dérive backend', () => {
    assert.throws(
        () =>
            migrateListQueryV1Definition(legacyDefinition, {
                backendContract: backendContractFor(legacyDefinition),
                backendContractUri: 'contracts/cmz-settings-api.json',
                backendContractSha256: 'a'.repeat(64),
                decisions: undefined,
            }),
        /migration decisions are required/
    );

    const wrongPath = backendContractFor(legacyDefinition);
    wrongPath.operations[0].path = '/another-list';
    assert.throws(
        () => migrate(legacyDefinition, { backendContract: wrongPath }),
        /disagrees with backend authority on path/
    );

    const wrongType = backendContractFor(legacyDefinition);
    wrongType.models[0].fields[0].type.name = 'string';
    assert.throws(
        () => migrate(legacyDefinition, { backendContract: wrongType }),
        /changes wire type, required or nullable semantics/
    );

    const malformedDecisions = decisions();
    malformedDecisions.operations[0].field_mappings = {};
    assert.throws(
        () => migrate(legacyDefinition, { decisions: malformedDecisions }),
        /closed v1 migration shape/
    );
});

test('le contrat représente le mapping du cas actif site-group-select sans vocabulaire SEOS', () => {
    const definition = {
        schema_version: '1.0.0',
        kind: 'list-query',
        feature: {
            id: 'coverage-area-site-groups',
            name: 'Site group options',
            description: 'Options used by a coverage area form.',
        },
        operations: [
            {
                id: 'list-site-groups',
                description: 'Loads site groups.',
                item: {
                    id: 'select-option',
                    description: 'A selectable option.',
                    fields: [
                        {
                            name: 'value',
                            type: {
                                kind: 'primitive',
                                name: 'string',
                                nullable: false,
                            },
                            required: true,
                        },
                        {
                            name: 'label',
                            type: {
                                kind: 'primitive',
                                name: 'string',
                                nullable: false,
                            },
                            required: true,
                        },
                    ],
                },
                access: { mode: 'authenticated' },
                http: {
                    method: 'GET',
                    path: 'infrastructures/site-groups',
                    authentication: 'bearer',
                    response_envelope: 'simple',
                },
            },
        ],
    };
    const backendContract = backendContractFor(definition, {
        operationId: 'coverage-areas.list-site-groups',
        path: '/infrastructures/site-groups',
        access: 'authenticated',
        wireFields: [
            {
                name: 'id',
                required: true,
                nullable: false,
                type: { kind: 'primitive', name: 'string' },
            },
            {
                name: 'name',
                required: true,
                nullable: false,
                type: { kind: 'primitive', name: 'string' },
            },
            {
                name: 'description',
                required: true,
                nullable: false,
                type: { kind: 'primitive', name: 'string' },
            },
        ],
    });
    const migrated = migrate(definition, {
        backendContract,
        decisions: decisions(
            'list-site-groups',
            'coverage-areas.list-site-groups',
            {
                execution: execution({ scope: 'principal' }),
                field_mappings: [
                    { target_field: 'value', source_field: 'id' },
                    { target_field: 'label', source_field: 'name' },
                ],
            }
        ),
    });
    assert.deepEqual(migrated.operations[0].read_model.fields, [
        { name: 'value', source_field: 'id' },
        { name: 'label', source_field: 'name' },
    ]);
});

test('la commande écrit une seule sortie et refuse de l’écraser', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'list-query-v2-'));
    try {
        const definitionPath = join(
            repositoryRoot,
            'tools/generator-platform/fixtures/editorial-blocks.v1.definition.json'
        );
        const backendPath = join(
            repositoryRoot,
            'tools/generator-platform/fixtures/list-query-v1.backend-contract.json'
        );
        const decisionsPath = join(
            repositoryRoot,
            'tools/generator-platform/fixtures/list-query-v1.migration-decisions.json'
        );
        const outputPath = join(workspace, 'query.v2.json');
        const result = await migrateListQueryFile({
            definitionPath,
            backendContractPath: backendPath,
            decisionsPath,
            outputPath,
            workspaceRoot: repositoryRoot,
        });
        assert.equal(result.definition.schema_version, '2.0.0');
        await assert.rejects(
            migrateListQueryFile({
                definitionPath,
                backendContractPath: backendPath,
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

test('la CLI expose une seule commande nominale aux arguments fermés', () => {
    assert.deepEqual(
        parseListQueryMigrationArguments([
            '--definition',
            'query.v1.json',
            '--backend-contract',
            'backend.json',
            '--decisions',
            'decisions.json',
            '--out',
            'query.v2.json',
        ]),
        {
            definition: 'query.v1.json',
            'backend-contract': 'backend.json',
            decisions: 'decisions.json',
            out: 'query.v2.json',
        }
    );
    assert.throws(
        () => parseListQueryMigrationArguments(['--magic', 'yes']),
        /unknown argument/
    );
});
