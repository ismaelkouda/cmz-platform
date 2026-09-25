import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
    validateBackendContract,
    verifyBackendContractSnapshots,
} from './core/backend-contract.mjs';
import { compileActionRequestV2ExecutionModel } from './core/action-request-v2-compiler.mjs';
import { compileListQueryV2ExecutionModel } from './core/list-query-v2-compiler.mjs';
import {
    loadJson,
    repositoryRoot,
    validateJsonSchema,
} from './validate-ir.mjs';

const backendSchema = await loadJson(
    new URL('./schemas/backend-contract.schema.json', import.meta.url)
);
const actionSchema = await loadJson(
    new URL(
        './schemas/action-request-definition-v2.schema.json',
        import.meta.url
    )
);
const querySchema = await loadJson(
    new URL('./schemas/list-query-definition-v2.schema.json', import.meta.url)
);

async function fixture(name) {
    const uri = `tools/generator-platform/fixtures/${name}`;
    const document = await readFile(
        new URL(`./fixtures/${name}`, import.meta.url)
    );
    return { uri, document, value: JSON.parse(document.toString('utf8')) };
}

test('valide les quatre nouveaux artefacts C5 contre schémas, provenance et références', async () => {
    const [
        profilesBackend,
        profilesDefinition,
        createBackend,
        createDefinition,
    ] = await Promise.all([
        fixture('profiles-select.backend-contract.json'),
        fixture('profiles-select.v2.definition.json'),
        fixture('create-user.backend-contract.json'),
        fixture('create-user.v2.definition.json'),
    ]);

    for (const backend of [profilesBackend, createBackend]) {
        assert.deepEqual(
            validateBackendContract(backend.value, backendSchema),
            []
        );
        assert.deepEqual(
            await verifyBackendContractSnapshots(backend.value, repositoryRoot),
            []
        );
    }
    assert.deepEqual(
        validateJsonSchema(profilesDefinition.value, querySchema),
        []
    );
    assert.deepEqual(
        validateJsonSchema(createDefinition.value, actionSchema),
        []
    );

    const profilesModel = compileListQueryV2ExecutionModel({
        definition: profilesDefinition.value,
        backendContractDocument: profilesBackend.document,
        backendContractUri: profilesBackend.uri,
    });
    const createModel = compileActionRequestV2ExecutionModel({
        definition: createDefinition.value,
        backendContractDocument: createBackend.document,
        backendContractUri: createBackend.uri,
    });

    assert.equal(profilesModel.queries[0].id, 'list-user-profiles');
    assert.equal(createModel.actions[0].id, 'create-user');
    assert.equal(
        createModel.actions[0].transport.envelope.kind,
        'status-object'
    );
    assert.equal(
        createModel.actions[0].request_policy.authentication.mode,
        'host'
    );
    assert.equal(
        createModel.actions[0].controller.execution.invalidation.mode,
        'caller-declared'
    );
});

test('ferme la forme status-object au lieu de tolérer un faux champ data', async () => {
    const createBackend = await fixture('create-user.backend-contract.json');
    const mutation = structuredClone(createBackend.value);
    mutation.operations[0].responses[0].body.envelope.data_field = 'data';

    assert.ok(
        validateBackendContract(mutation, backendSchema).some((error) =>
            error.includes('invalid closed shape for status-object')
        )
    );

    const invalidFlag = structuredClone(createBackend.value);
    invalidFlag.models[1].fields[0].type.name = 'string';
    assert.ok(
        validateBackendContract(invalidFlag, backendSchema).some((error) =>
            error.includes('required non-null boolean model field')
        )
    );
});
