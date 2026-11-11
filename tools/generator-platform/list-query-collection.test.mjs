// X5, D-X5-1 : résolveur unique des éléments d'une page (forme nommée ou en
// ligne), partagé par le validateur, le compilateur et la liaison de données.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import test from 'node:test';

import { compileListQueryV2ExecutionModel } from './core/list-query-v2-compiler.mjs';
import { validateListQueryV2Definition } from './core/list-query-v2.mjs';
import {
    assertQueryOutputBinding,
    resolveDataBindingSourceModel,
} from './core/data-binding-projection.mjs';
import {
    contractModels,
    resolvePageCollection,
} from './core/list-query-collection.mjs';
import { renderAngularListQueryV2 } from './renderers/angular-list-query-v2-renderer.mjs';
import { renderReactListQueryV2 } from './renderers/react-list-query-v2-renderer.mjs';
import { cmzAngularListQueryHostBindings } from './list-query-v2-targets.mjs';

const fixture = (name) =>
    readFile(new URL(`./fixtures/${name}`, import.meta.url), 'utf8').then(
        JSON.parse
    );
const PAGE = 'users-list-page-wire';
const NAMED = 'users-list-items-wire';
const ITEM = 'users-list-item-wire';

// Le même contrat fictif, sous ses deux formes.
async function forms() {
    const named = await fixture('users-list.backend-contract.json');
    const inline = structuredClone(named);
    const page = inline.models.find((model) => model.id === PAGE);
    const data = page.fields.find((field) => field.name === 'data');
    data.type = { kind: 'array', items: { kind: 'model', model_id: ITEM } };
    inline.models = inline.models.filter((model) => model.id !== NAMED);
    return { named, inline };
}

async function compile(contract) {
    const definition = await fixture('users-list.v2.definition.json');
    const document = Buffer.from(JSON.stringify(contract));
    definition.backend_contract.sha256 = createHash('sha256')
        .update(document)
        .digest('hex');
    return compileListQueryV2ExecutionModel({
        definition,
        backendContractDocument: document,
        backendContractUri: definition.backend_contract.uri,
    });
}

function rendered(model) {
    return {
        angular: renderAngularListQueryV2(
            model,
            cmzAngularListQueryHostBindings
        ).files,
        react: renderReactListQueryV2(model).files,
    };
}

test('D-X5-1 : le même contrat sous ses deux formes génère un produit identique', async () => {
    const { named, inline } = await forms();
    const [fromNamed, fromInline] = await Promise.all([
        compile(named),
        compile(inline),
    ]);
    assert.deepEqual(rendered(fromInline), rendered(fromNamed));
    // Seul le modèle référencé par une liaison diffère : le modèle tableau
    // pour la forme nommée, le modèle élément pour la forme en ligne.
    assert.equal(fromNamed.queries[0].transport.collection_model_id, NAMED);
    assert.equal(fromInline.queries[0].transport.collection_model_id, ITEM);
    const strip = (model) => {
        const copy = structuredClone(model);
        delete copy.queries[0].transport.collection_model_id;
        delete copy.backend_contract.sha256;
        return copy;
    };
    assert.deepEqual(strip(fromInline), strip(fromNamed));
    // P1 (b) : la représentation commune n'ajoute aucun champ sérialisé.
    assert.equal(
        Object.hasOwn(fromInline.queries[0].transport, 'item_model_id'),
        false
    );
});

const DEGENERATE = {
    'tableau de primitifs': [
        /inline collection items must be a model/,
        (field) => {
            field.type = {
                kind: 'array',
                items: { kind: 'primitive', name: 'string' },
            };
        },
    ],
    'tableau de tableaux': [
        /inline collection items cannot be arrays/,
        (field) => {
            field.type = {
                kind: 'array',
                items: {
                    kind: 'array',
                    items: { kind: 'model', model_id: ITEM },
                },
            };
        },
    ],
    'data nullable': [
        /items field must be required and non-null/,
        (field) => {
            field.nullable = true;
        },
    ],
    'data facultatif': [
        /items field must be required and non-null/,
        (field) => {
            field.required = false;
        },
    ],
    'élément non objet': [
        /inline collection item must be an object model/,
        (field, contract) => {
            contract.models.push({
                id: 'users-list-scalar-item',
                kind: 'scalar',
                status: 'implemented',
                description: 'Élément dégénéré.',
                type: { kind: 'primitive', name: 'string' },
                evidence: [],
            });
            field.type.items.model_id = 'users-list-scalar-item';
        },
    ],
};

for (const [name, [message, degrade]] of Object.entries(DEGENERATE)) {
    test(`D-X5-1 : forme en ligne dégénérée refusée — ${name}`, async () => {
        const { inline } = await forms();
        const page = inline.models.find((model) => model.id === PAGE);
        degrade(
            page.fields.find((field) => field.name === 'data'),
            inline
        );
        const resolved = resolvePageCollection(
            contractModels(inline),
            page,
            'data'
        );
        assert.match(resolved.error ?? '', message, name);
        const definition = await fixture('users-list.v2.definition.json');
        const errors = validateListQueryV2Definition(definition, inline, {});
        assert.ok(
            errors.some((error) =>
                error.startsWith('$.operations[0].result.items_field:')
            ),
            errors.join('\n')
        );
        await assert.rejects(compile(inline));
    });
}

test('D-X5-1 : la forme nommée dégénérée reste refusée', async () => {
    const { named } = await forms();
    named.models.find((model) => model.id === NAMED).kind = 'object';
    await assert.rejects(compile(named), /must resolve to an array model/);
});

test('D-X5-1 : la liaison de données traverse la forme en ligne jusqu’au modèle élément', async () => {
    const { named, inline } = await forms();
    for (const [contract, modelId] of [
        [named, NAMED],
        [inline, ITEM],
    ]) {
        const errors = [];
        const model = resolveDataBindingSourceModel({
            binding: { model_id: modelId, source_path: ['data'] },
            responseModelId: PAGE,
            resolveModel: contractModels(contract),
            path: '$',
            errors,
        });
        assert.deepEqual(errors, []);
        assert.equal(model.id, modelId);
        const operation = (await compile(contract)).queries[0];
        assertQueryOutputBinding(
            {
                id: 'rows',
                response_status: 200,
                model_id: modelId,
                source_path: ['data'],
            },
            operation,
            (message) => assert.fail(message)
        );
    }
    // Les éléments en ligne terminent le chemin.
    const errors = [];
    resolveDataBindingSourceModel({
        binding: { model_id: ITEM, source_path: ['data', 'id'] },
        responseModelId: PAGE,
        resolveModel: contractModels(inline),
        path: '$',
        errors,
    });
    assert.deepEqual(errors, [
        '$.source_path[0]: inline items must end the path',
    ]);
    // Un champ d'éléments en ligne nullable ne peut pas porter une liaison.
    inline.models
        .find((model) => model.id === PAGE)
        .fields.find((field) => field.name === 'data').nullable = true;
    const nullable = [];
    resolveDataBindingSourceModel({
        binding: { model_id: ITEM, source_path: ['data'] },
        responseModelId: PAGE,
        resolveModel: contractModels(inline),
        path: '$',
        errors: nullable,
    });
    assert.deepEqual(nullable, [
        '$.source_path[0]: items field must be required and non-null',
    ]);
});

// Condition (a) du pilote : aucun site de code ne lit `collection_model_id`
// hors du résolveur. Le compilateur l'écrit ; les fixtures et tests nommés
// ci-dessous l'emploient pour fabriquer des liaisons de test.
const COLLECTION_MODEL_ID_SITES = Object.freeze({
    'tools/generator-platform/core/list-query-collection.mjs':
        'résolveur unique : seule lecture',
    'tools/generator-platform/core/list-query-v2-compiler.mjs':
        'écriture du modèle d’exécution',
    'tools/generator-platform/list-query-collection.test.mjs': 'ce test',
    'tools/generator-platform/list-query-v2-compiler.test.mjs':
        'attendu du compilateur',
    'tools/generator-platform/page-composition.fixture.mjs':
        'fixture : liaisons de test',
    'tools/generator-platform/page-execution-plan.test.mjs':
        'test : liaisons de test',
});

test('P1 (a) : collection_model_id n’est lu que par le résolveur (liste fermée)', () => {
    const root = new URL('../../', import.meta.url);
    const found = execFileSync(
        'git',
        [
            'grep',
            '--untracked',
            '-l',
            'collection_model_id',
            '--',
            '*.mjs',
            '*.js',
            '*.ts',
            '*.tsx',
        ],
        { cwd: root, encoding: 'utf8' }
    )
        .split('\n')
        .filter(Boolean)
        .sort();
    assert.deepEqual(found, Object.keys(COLLECTION_MODEL_ID_SITES).sort());
});
