// X5 C2 : profil extérieur d'une lecture list-query v2 (D-X5-2, D-X5-4,
// D-X5-6). Compilateur, validateur, portes de rendu et décodeur projeté
// exécuté (TypeScript transpilé). Le comportement de la façade de session est
// prouvé dans stack-tests/angular/list-query-external-session.spec.ts.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';

import {
    EXTERNAL_LIST_QUERY_EXECUTION,
    EXTERNAL_QUERY_STATES,
} from './core/list-query-external-profile.mjs';
import {
    compileListQueryV2ExecutionModel,
    validateListQueryV2ExecutionModel,
} from './core/list-query-v2-compiler.mjs';
import { renderAngularExternalListQuery } from './renderers/angular-external-list-query.mjs';
import { renderAngularListQueryV2 } from './renderers/angular-list-query-v2-renderer.mjs';
import { cmzAngularListQueryHostBindings } from './list-query-v2-targets.mjs';

const ITEM = 'users-list-item-wire';
const BINDING = Object.freeze({ module: '../session', token: 'USERS_API_URL' });
const fixture = (name) =>
    readFile(new URL(`./fixtures/${name}`, import.meta.url), 'utf8').then(
        JSON.parse
    );

// Contrat dont l'élément porte, en plus, des champs NON lus de types que le
// décodeur interne refuse : modèle imbriqué et booléen.
async function inputs({ unread = true, execution } = {}) {
    const contract = await fixture('users-list.backend-contract.json');
    const definition = await fixture('users-list.v2.definition.json');
    const item = contract.models.find((model) => model.id === ITEM);
    if (unread) {
        const base = item.fields.find((field) => field.name === 'created_at');
        item.fields.push(
            {
                ...structuredClone(base),
                name: 'manager',
                type: { kind: 'model', model_id: ITEM },
            },
            {
                ...structuredClone(base),
                name: 'is_active',
                type: { kind: 'primitive', name: 'boolean' },
            }
        );
    }
    if (execution) definition.operations[0].execution = execution;
    const document = Buffer.from(JSON.stringify(contract));
    definition.backend_contract.sha256 = createHash('sha256')
        .update(document)
        .digest('hex');
    return { definition, document };
}
const compile = ({ definition, document }, profile) =>
    compileListQueryV2ExecutionModel({
        definition,
        backendContractDocument: document,
        backendContractUri: definition.backend_contract.uri,
        ...(profile ? { profile } : {}),
    });
const external = () => structuredClone(EXTERNAL_LIST_QUERY_EXECUTION);

test('compilateur : le profil extérieur projette sur les champs lus ; l’interne refuse toujours un champ non lu indécodable', async () => {
    await assert.rejects(
        async () => compile(await inputs({ execution: external() })),
        /wire field manager uses unsupported model type/
    );
    const model = compile(await inputs({ execution: external() }), 'external');
    const query = model.queries[0];
    const read = query.read_model.fields.map((field) => field.source_field);
    assert.deepEqual(
        query.wire_model.fields.map((field) => field.name),
        read
    );
    assert.equal(read.includes('created_at'), false);
    assert.equal(query.wire_model.unknown_fields, 'ignore');
    assert.deepEqual(query.controller.execution, external());
    assert.deepEqual(query.request_policy.cache, { mode: 'bypass' });
    assert.deepEqual(validateListQueryV2ExecutionModel(model), []);
});

test('compilateur : sans profil, le modèle interne est celui du profil interne déclaré', async () => {
    const data = await inputs({ unread: false });
    assert.deepEqual(compile(data), compile(data, 'internal'));
    assert.equal(compile(data).queries[0].wire_model.unknown_fields, 'reject');
    assert.throws(() => compile(data, 'public'), /unknown profile public/);
});

test('compilateur : refus nommés de la politique extérieure', async () => {
    await assert.rejects(
        async () => compile(await inputs(), 'external'),
        /LIST_QUERY_EXTERNAL_CACHE_HOST/
    );
    const preserve = external();
    preserve.stale_data.on_error = 'preserve';
    await assert.rejects(
        async () => compile(await inputs({ execution: preserve }), 'external'),
        /LIST_QUERY_EXTERNAL_EXECUTION/
    );
});

test('validateur : `ignore` n’est valide qu’avec toute la politique extérieure', async () => {
    const model = compile(await inputs({ execution: external() }), 'external');
    const extraField = structuredClone(model);
    extraField.queries[0].wire_model.fields.push({
        ...structuredClone(extraField.queries[0].wire_model.fields[0]),
        name: 'created_at',
    });
    assert.match(
        validateListQueryV2ExecutionModel(extraField).join('\n'),
        /an ignoring decoder must decode exactly the read fields/
    );
    const preserve = structuredClone(model);
    preserve.queries[0].controller.execution.stale_data.on_error = 'preserve';
    preserve.queries[0].request_policy.cache = {
        ...preserve.queries[0].controller.execution.cache,
    };
    assert.match(
        validateListQueryV2ExecutionModel(preserve).join('\n'),
        /LIST_QUERY_EXTERNAL_EXECUTION/
    );
    const host = structuredClone(model);
    host.queries[0].controller.execution.cache = {
        mode: 'host',
        scope: 'principal',
        refresh: 'bypass',
    };
    host.queries[0].request_policy.cache = structuredClone(
        host.queries[0].controller.execution.cache
    );
    assert.match(
        validateListQueryV2ExecutionModel(host).join('\n'),
        /LIST_QUERY_EXTERNAL_CACHE_HOST/
    );
});

test('rendu : chaque profil n’a que son rendu', async () => {
    const externalModel = compile(
        await inputs({ execution: external() }),
        'external'
    );
    const internalModel = compile(await inputs({ unread: false }));
    assert.throws(
        () =>
            renderAngularListQueryV2(
                externalModel,
                cmzAngularListQueryHostBindings
            ),
        /uses the external profile without its renderer/
    );
    assert.throws(
        () => renderAngularExternalListQuery(internalModel, BINDING),
        /must use the external profile/
    );
    const source = renderAngularExternalListQuery(externalModel, BINDING).files[
        'src/list-users.source.ts'
    ];
    assert.match(source, /new HttpContext\(\)\.set\(SKIP_AUTH, false\)/);
    // B-C5-1 : l'union `State` de la façade est EXACTEMENT la source unique
    // EXTERNAL_QUERY_STATES (une liste recopiée en dur dériverait).
    const facade = renderAngularExternalListQuery(externalModel, BINDING).files[
        'src/list-users.facade.ts'
    ];
    const union = facade.match(/export type \w+State = ([^;]+);/)[1];
    assert.deepEqual(
        union
            .split(' | ')
            .map((entry) => JSON.parse(entry.replaceAll("'", '"'))),
        [...EXTERNAL_QUERY_STATES]
    );
    assert.doesNotMatch(
        source,
        /BYPASS_CACHE|createListQueryRequestContext|REQUEST_POLICY|isRefresh|@cmz\//
    );
});

// Ligne valide pour chaque champ décodé, et réponse paginée qui la porte.
const validRow = (query) =>
    Object.fromEntries(
        query.wire_model.fields.map((field) => [
            field.name,
            field.allowed_values?.[0] ?? 'x',
        ])
    );
function pagePayload(query, item) {
    const envelope = query.transport.envelope;
    const { result } = query.transport;
    return {
        [envelope.error_field]: false,
        [envelope.message_field]: 'OK',
        [envelope.data_field]: {
            [result.items_field]: [item],
            ...Object.fromEntries(
                Object.values(result.page_fields).map((field) => [
                    field.source_field,
                    1,
                ])
            ),
        },
    };
}

async function decoderModule(model, internal = false) {
    const files = internal
        ? renderAngularListQueryV2(model, cmzAngularListQueryHostBindings).files
        : renderAngularExternalListQuery(model, BINDING).files;
    const errorsModule = internal ? '@cmz/shared-domain' : BINDING.module;
    const stub = `export class InvalidPayloadError extends Error { constructor(path, expected) { super(path + ': ' + expected); this.path = path; } }
export class ServerResponseError extends Error {}`;
    const source = ts
        .transpileModule(files['src/list-users.decoder.ts'], {
            compilerOptions: {
                target: ts.ScriptTarget.ES2022,
                module: ts.ModuleKind.ESNext,
            },
        })
        .outputText.replace(
            `from '${errorsModule}'`,
            `from 'data:text/javascript;base64,${Buffer.from(stub).toString('base64')}'`
        );
    return import(
        'data:text/javascript;base64,' + Buffer.from(source).toString('base64')
    );
}

test('décodeur projeté exécuté : champ non lu ignoré, champ lu strict', async () => {
    const model = compile(await inputs({ execution: external() }), 'external');
    const query = model.queries[0];
    const { decodeListUsersResponse } = await decoderModule(model);
    const row = validRow(query);
    const payload = (item) => pagePayload(query, item);
    const decoded = decodeListUsersResponse(
        payload({
            ...row,
            created_at: { not: 'a string' },
            manager: null,
            is_active: 'yes',
            unknown: 1,
        })
    );
    assert.deepEqual(
        Object.keys(decoded.items[0]).sort(),
        query.read_model.fields.map((field) => field.name).sort()
    );
    const readField = query.wire_model.fields.find(
        (field) => field.required && !field.nullable
    );
    const missing = { ...row };
    delete missing[readField.name];
    for (const [label, item] of [
        ['lu manquant', missing],
        ['lu nul non nullable', { ...row, [readField.name]: null }],
        ['lu de mauvais type', { ...row, [readField.name]: 42 }],
    ])
        assert.throws(
            () => decodeListUsersResponse(payload(item)),
            new RegExp(readField.name),
            label
        );
});

test('décodeur interne exécuté : un champ inconnu reste refusé (Π1)', async () => {
    const model = compile(await inputs({ unread: false }));
    const query = model.queries[0];
    const { decodeListUsersResponse } = await decoderModule(model, true);
    const row = validRow(query);
    assert.equal(
        decodeListUsersResponse(pagePayload(query, row)).items.length,
        1
    );
    assert.throws(
        () =>
            decodeListUsersResponse(pagePayload(query, { ...row, unknown: 1 })),
        /unknown: declared field/
    );
});

test('E5 : un nom lu de prototype est refusé à la compilation et à la validation', async () => {
    const data = await inputs({ execution: external() });
    data.definition.operations[0].read_model.fields[0].name = '__proto__';
    assert.throws(
        () => compile(data, 'external'),
        /LIST_QUERY_EXTERNAL_READ_NAME: read field __proto__/
    );
    const model = compile(await inputs({ execution: external() }), 'external');
    const forged = structuredClone(model);
    forged.queries[0].read_model.fields[0].name = 'toString';
    assert.match(
        validateListQueryV2ExecutionModel(forged).join('\n'),
        /LIST_QUERY_EXTERNAL_READ_NAME: read field toString/
    );
    // Exclusion nommée de la grammaire : `name` et `length` restent lisibles.
    const named = await inputs({ execution: external() });
    named.definition.operations[0].read_model.fields[0].name = 'name';
    assert.equal(
        compile(named, 'external').queries[0].read_model.fields[0].name,
        'name'
    );
});

test('O-C5-1 : une lecture extérieure à paramètre de chemin est refusée, nommée', async () => {
    const definition = await fixture(
        'tasks-actions-processing-type.v2.definition.json'
    );
    const document = await readFile(
        new URL(
            './fixtures/tasks-actions-processing-type.backend-contract.json',
            import.meta.url
        )
    );
    // Le profil interne accepte cette lecture (Π1)…
    assert.doesNotThrow(() =>
        compileListQueryV2ExecutionModel({
            definition,
            backendContractDocument: document,
            backendContractUri: definition.backend_contract.uri,
        })
    );
    // … le profil extérieur la refuse, nommée.
    definition.operations[0].execution = external();
    assert.throws(
        () =>
            compileListQueryV2ExecutionModel({
                definition,
                backendContractDocument: document,
                backendContractUri: definition.backend_contract.uri,
                profile: 'external',
            }),
        /LIST_QUERY_EXTERNAL_PATH_PARAMETER: an external read cannot take a path parameter yet/
    );
});
