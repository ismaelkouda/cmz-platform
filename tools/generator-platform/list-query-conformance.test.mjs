// X5 C3b : test de conformité de contrat généré dans le produit (D-X5-2,
// mécanisme 1 ; option (a) : synthèse depuis les types, refus nommé de ce qui
// ne se synthétise pas). La spec générée est EXÉCUTÉE ici (TypeScript
// transpilé, substitut minimal de vitest) contre le décodeur généré.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';

import { EXTERNAL_LIST_QUERY_EXECUTION } from './core/list-query-external-profile.mjs';
import { compileListQueryV2ExecutionModel } from './core/list-query-v2-compiler.mjs';
import {
    conformanceFixture,
    synthesizeObject,
} from './core/list-query-conformance.mjs';
import { renderAngularExternalListQuery } from './renderers/angular-external-list-query.mjs';
import { renderListQueryConformanceSpec } from './renderers/angular-list-query-conformance-spec.mjs';
import { typecheckGenerated } from './core/typecheck-generated.mjs';
import { repositoryRoot } from './validate-ir.mjs';

const ITEM = 'users-list-item-wire';
const BINDING = Object.freeze({ module: '../session', token: 'USERS_API_URL' });
const fixture = (name) =>
    readFile(new URL(`./fixtures/${name}`, import.meta.url), 'utf8').then(
        JSON.parse
    );
const field = (name, type, extra = {}) => ({
    name,
    description: 'Champ fictif.',
    required: true,
    nullable: false,
    type,
    evidence: [],
    ...extra,
});
const model = (id, fields) => ({
    id,
    kind: 'object',
    status: 'implemented',
    description: 'Modèle fictif.',
    fields,
    evidence: [],
});

// Contrat fictif de forme Régions : créateur imbriqué NULLABLE dont l'id est
// un uuid, objet-valeur SANS champ, booléen et horodatage non lus.
async function contract() {
    const data = await fixture('users-list.backend-contract.json');
    data.models.push(
        model('fictive-creator', [
            field('id', { kind: 'primitive', name: 'uuid' }),
            field('label', { kind: 'primitive', name: 'string' }),
        ]),
        model('fictive-contact', [])
    );
    data.models
        .find((entry) => entry.id === ITEM)
        .fields.push(
            field(
                'created_by',
                { kind: 'model', model_id: 'fictive-creator' },
                { nullable: true }
            ),
            field('contact', { kind: 'model', model_id: 'fictive-contact' }),
            field('is_active', { kind: 'primitive', name: 'boolean' }),
            field('seen_at', { kind: 'primitive', name: 'datetime' })
        );
    return data;
}

async function external(data) {
    const definition = await fixture('users-list.v2.definition.json');
    definition.operations[0].execution = structuredClone(
        EXTERNAL_LIST_QUERY_EXECUTION
    );
    const document = Buffer.from(JSON.stringify(data));
    definition.backend_contract.sha256 = createHash('sha256')
        .update(document)
        .digest('hex');
    return compileListQueryV2ExecutionModel({
        definition,
        backendContractDocument: document,
        backendContractUri: definition.backend_contract.uri,
        profile: 'external',
    });
}

function generated(compiled, data) {
    const query = compiled.queries[0];
    const resolveModel = (id) => data.models.find((entry) => entry.id === id);
    const page = resolveModel(query.transport.result.page_model_id);
    const item = resolveModel(ITEM);
    return {
        query,
        decoder: renderAngularExternalListQuery(compiled, BINDING).files[
            `src/${query.id}.decoder.ts`
        ],
        spec: renderListQueryConformanceSpec(
            query,
            conformanceFixture({
                item,
                page,
                itemsField: query.transport.result.items_field,
                resolveModel,
            })
        ),
    };
}

const url = (source) =>
    'data:text/javascript;base64,' + Buffer.from(source).toString('base64');
const js = (source) =>
    ts.transpileModule(source, {
        compilerOptions: {
            target: ts.ScriptTarget.ES2022,
            module: ts.ModuleKind.ESNext,
        },
    }).outputText;

// Substitut minimal de vitest : `describe`, `it`, `expect(…).toEqual` et
// `toThrow`, résultats collectés.
const VITEST = `
export const results = [];
export function describe(_name, body) { body(); }
export function it(name, body) {
    try { body(); results.push([name, 'pass']); }
    catch (error) { results.push([name, 'fail: ' + error.message]); }
}
const same = (a, b) => JSON.stringify(sort(a)) === JSON.stringify(sort(b));
function sort(value) {
    if (Array.isArray(value)) return value.map(sort);
    if (value && typeof value === 'object')
        return Object.fromEntries(Object.keys(value).sort().map((k) => [k, sort(value[k])]));
    return value;
}
export function expect(actual) {
    return {
        toEqual(expected) { if (!same(actual, expected)) throw new Error('toEqual ' + JSON.stringify(actual)); },
        toThrow() { let thrown = false; try { actual(); } catch { thrown = true; } if (!thrown) throw new Error('toThrow'); },
    };
}`;
const ERRORS = `export class InvalidPayloadError extends Error { constructor(path, expected) { super(path + ': ' + expected); } }
export class ServerResponseError extends Error {}`;

// Un module de substitut par exécution : les modules importés restent en cache,
// les résultats ne doivent pas se cumuler d'une exécution à l'autre.
let runs = 0;
async function runSpec({ query, decoder, spec }) {
    const vitest = url(`${VITEST}\n// exécution ${(runs += 1)}`);
    const decoderUrl = url(
        js(decoder).replace(`from '${BINDING.module}'`, `from '${url(ERRORS)}'`)
    );
    await import(
        url(
            js(spec)
                .replace("from 'vitest'", `from '${vitest}'`)
                .replace(`from './${query.id}.decoder'`, `from '${decoderUrl}'`)
        )
    );
    return (await import(vitest)).results;
}

test('C3b : la spec de conformité générée passe contre le décodeur projeté', async () => {
    const data = await contract();
    const rendered = generated(await external(data), data);
    const results = await runSpec(rendered);
    assert.equal(results.length, 3);
    assert.deepEqual(
        results.map(([, verdict]) => verdict),
        ['pass', 'pass', 'pass'],
        JSON.stringify(results)
    );
    // Fixture complète : uuid canonique dans l'imbriqué nullable, `{}` pour
    // l'objet sans champ, champs non lus tous présents.
    assert.match(
        rendered.spec,
        /"created_by":\{"id":"00000000-0000-4000-8000-000000000000","label":"x"\}/
    );
    assert.match(rendered.spec, /"contact":\{\}/);
    assert.match(rendered.spec, /"seen_at":"2000-01-01T00:00:00Z"/);
    assert.match(
        rendered.spec,
        /UNREAD: readonly string\[\] = \["created_at","created_by","contact","is_active","seen_at"\]/
    );
});

test('C3b : la spec rougit si le décodeur refuse un champ non lu ou accepte un lu faux', async () => {
    const data = await contract();
    const rendered = generated(await external(data), data);
    const strict = {
        ...rendered,
        decoder: rendered.decoder.replace(
            '    return {\n',
            "    for (const key of Object.keys(record)) if (!['id'].includes(key) && !(key in ({} as Record<string, unknown>))) invalid(`${path}.${key}`, 'declared field');\n    return {\n"
        ),
    };
    assert.notEqual(strict.decoder, rendered.decoder);
    const strictResults = await runSpec(strict);
    assert.match(strictResults[0][1], /^fail/);
    const lax = {
        ...rendered,
        decoder: rendered.decoder.replaceAll(
            /if \(!\((typeof value === '[a-z]+'[^)]*)\)\) invalid/g,
            'if (false) invalid'
        ),
    };
    assert.notEqual(lax.decoder, rendered.decoder);
    const laxResults = await runSpec(lax);
    assert.match(laxResults[2][1], /^fail/);
});

test('C3b : synthèse depuis les types, bornes et valeurs permises', () => {
    const resolve = () => undefined;
    const { value } = synthesizeObject(
        'item',
        model('m', [
            field(
                'count',
                { kind: 'primitive', name: 'integer' },
                {
                    constraints: { minimum: 2.5, maximum: 9 },
                }
            ),
            field(
                'ratio',
                { kind: 'primitive', name: 'number' },
                {
                    constraints: { maximum: -3 },
                }
            ),
            field(
                'label',
                { kind: 'primitive', name: 'string' },
                {
                    constraints: { min_length: 3, max_length: 5 },
                }
            ),
            field(
                'state',
                { kind: 'primitive', name: 'string' },
                {
                    allowed_values: ['open', 'closed'],
                }
            ),
            field('day', { kind: 'primitive', name: 'date' }),
            field('nothing', { kind: 'primitive', name: 'null' }),
            field(
                'tags',
                {
                    kind: 'array',
                    items: { kind: 'primitive', name: 'string' },
                },
                { constraints: { min_items: 2 } }
            ),
            field(
                'note',
                { kind: 'primitive', name: 'string' },
                {
                    required: false,
                    nullable: true,
                }
            ),
        ]),
        resolve
    );
    assert.deepEqual(value, {
        count: 3,
        ratio: -3,
        label: 'xxx',
        state: 'open',
        day: '2000-01-01',
        nothing: null,
        tags: ['x', 'x'],
        note: 'x',
    });
});

test('C3b : refus nommés de ce que l’atelier ne sait pas synthétiser', () => {
    const resolve = (id) =>
        id === 'loop'
            ? model('loop', [
                  field('self', { kind: 'model', model_id: 'loop' }),
              ])
            : undefined;
    for (const [label, entry, message] of [
        [
            'pattern',
            field(
                'code',
                { kind: 'primitive', name: 'string' },
                {
                    constraints: { pattern: '^[A-Z]{2}$' },
                }
            ),
            /field item\.code has constraint pattern/,
        ],
        [
            'json',
            field('raw', { kind: 'primitive', name: 'json' }),
            /field item\.raw has type json without a canonical form/,
        ],
        [
            'binary',
            field('blob', { kind: 'primitive', name: 'binary' }),
            /field item\.blob has type binary without a canonical form/,
        ],
        [
            'intervalle numérique vide',
            field(
                'n',
                { kind: 'primitive', name: 'integer' },
                {
                    constraints: { minimum: 5, maximum: 4 },
                }
            ),
            /field item\.n has an empty numeric range/,
        ],
        [
            'longueur vide',
            field(
                's',
                { kind: 'primitive', name: 'string' },
                {
                    constraints: { min_length: 4, max_length: 2 },
                }
            ),
            /field item\.s has an empty length range/,
        ],
        [
            'cycle de modèles',
            field('self', { kind: 'model', model_id: 'loop' }),
            /field item\.self\.self forms a model cycle loop/,
        ],
        [
            'modèle non résolu',
            field('ghost', { kind: 'model', model_id: 'ghost' }),
            /field item\.ghost references an unresolved model ghost/,
        ],
    ])
        assert.throws(
            () => synthesizeObject('item', model('item', [entry]), resolve),
            new RegExp(
                `^Error: LIST_QUERY_CONFORMANCE_UNSYNTHESIZABLE: ${message.source}`
            ),
            label
        );
});

test('C3b : la spec générée se type en mode strict ; une fixture incomplète ne se type pas', async () => {
    const data = await contract();
    const compiled = await external(data);
    const rendered = generated(compiled, data);
    const files = renderAngularExternalListQuery(compiled, BINDING).files;
    const session = `export class InvalidPayloadError extends Error {
    constructor(readonly path: string, readonly expected: string) { super(path); }
}
export class ServerResponseError extends Error {}
`;
    const tree = (spec) => ({
        'session.ts': session,
        'src/models.ts': files['src/models.ts'],
        [`src/${rendered.query.id}.decoder.ts`]: rendered.decoder,
        [`src/${rendered.query.id}.contract.spec.ts`]: spec,
    });
    typecheckGenerated(tree(rendered.spec), 'c3b-conformance', repositoryRoot);
    // Forme complète et typée : retirer un champ requis de la fixture (ici
    // l'objet-valeur sans champ) est une erreur de type.
    const incomplete = rendered.spec.replace('"contact":{},', '');
    assert.notEqual(incomplete, rendered.spec);
    assert.throws(
        () =>
            typecheckGenerated(
                tree(incomplete),
                'c3b-conformance',
                repositoryRoot
            ),
        /does not typecheck[\s\S]*contact/
    );
});
