// X5, D-X5-1 : résolveur unique des éléments d'une page (forme nommée ou en
// ligne), partagé par le validateur, le compilateur et la liaison de données.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import test from 'node:test';
import ts from 'typescript';

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
    'champ d’éléments absent': [
        /items field is not declared/,
        (field) => {
            field.name = 'rows';
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

// Condition (a) du pilote, au grain du SITE (C1-a, Fable) : en production, le
// modèle de liaison d'une lecture compilée n'est lu QUE par
// queryBindingModelId, et n'est écrit QUE par le compilateur. Balayage par
// l'arbre TypeScript : toute autre mention du nom (lecture par point ou par
// crochets, déstructuration, clé calculée, chaîne) est un accès refusé. Les
// tests lisent le modèle compilé pour leurs assertions : admis au grain du
// fichier, en liste fermée.
const BINDING_FIELD = 'collection_model_id';
const PRODUCTION_SITES = Object.freeze([
    'tools/generator-platform/core/list-query-collection.mjs:read:queryBindingModelId',
    'tools/generator-platform/core/list-query-v2-compiler.mjs:write:compileQuery',
]);
const TEST_FILES = Object.freeze([
    'tools/generator-platform/list-query-collection.test.mjs',
    'tools/generator-platform/list-query-v2-compiler.test.mjs',
]);

function bindingFieldSites(path, text) {
    const file = ts.createSourceFile(
        path,
        text,
        ts.ScriptTarget.Latest,
        true,
        /\.tsx?$/.test(path) ? ts.ScriptKind.TSX : ts.ScriptKind.JS
    );
    const sites = [];
    const enclosing = (node) => {
        for (let current = node.parent; current; current = current.parent)
            if (
                (ts.isFunctionDeclaration(current) ||
                    ts.isMethodDeclaration(current)) &&
                current.name
            )
                return current.name.text;
        return '<module>';
    };
    const visit = (node) => {
        if (
            (ts.isIdentifier(node) ||
                ts.isStringLiteral(node) ||
                ts.isNoSubstitutionTemplateLiteral(node)) &&
            node.text === BINDING_FIELD
        ) {
            const parent = node.parent;
            const write =
                ts.isPropertyAssignment(parent) &&
                parent.name === node &&
                ts.isObjectLiteralExpression(parent.parent) &&
                !(
                    ts.isBinaryExpression(parent.parent.parent) &&
                    parent.parent.parent.left === parent.parent
                );
            const read =
                ts.isPropertyAccessExpression(parent) &&
                parent.name === node &&
                !(
                    ts.isBinaryExpression(parent.parent) &&
                    parent.parent.left === parent
                ) &&
                !ts.isDeleteExpression(parent.parent);
            sites.push(
                `${path}:${write ? 'write' : read ? 'read' : 'other'}:${enclosing(node)}`
            );
        }
        ts.forEachChild(node, visit);
    };
    visit(file);
    return sites;
}

test('P1 (a) : collection_model_id, une lecture et une écriture en production (grain du site)', async () => {
    const root = new URL('../../', import.meta.url);
    const files = execFileSync(
        'git',
        [
            'grep',
            '--untracked',
            '-l',
            BINDING_FIELD,
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
    const production = [];
    for (const path of files) {
        if (TEST_FILES.includes(path)) continue;
        const text = await readFile(new URL(path, root), 'utf8');
        production.push(...bindingFieldSites(path, text));
    }
    assert.deepEqual(production.sort(), [...PRODUCTION_SITES].sort());
});

test('P1 (a) : le balayage par site voit toute forme d’accès', () => {
    const kinds = (code) =>
        bindingFieldSites('x.mjs', code).map((site) => site.split(':')[1]);
    assert.deepEqual(
        kinds('function f(o) { return o.transport.collection_model_id; }'),
        ['read']
    );
    assert.deepEqual(kinds('const x = { collection_model_id: 1 };'), ['write']);
    for (const code of [
        "o.transport['collection_model_id'];",
        'const { collection_model_id } = o.transport;',
        'const { collection_model_id: m } = o.transport;',
        "const { ['collection_model_id']: m } = o.transport;",
        "Reflect.get(o.transport, 'collection_model_id');",
        'o.transport.collection_model_id = 1;',
        'delete o.transport.collection_model_id;',
        '({ collection_model_id: m } = o.transport);',
    ])
        assert.deepEqual(kinds(code), ['other'], code);
});
