// CI #389 : fermeture des replis silencieux. Une donnée attendue absente
// arrête le rendu, la grammaire ou la preuve avec un refus nommé ; un repli
// restant porte sa justification sur son site.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import * as angular from '@angular/compiler';
import ts from 'typescript';

import { templateViolations } from './core/external-page-realization-structure.mjs';
import { parserList } from './core/page-grammar/parser-contract.mjs';
import { grammarSection } from './core/page-grammar/work-order.mjs';
import { angularPageHostBindings } from './page-composition.fixture.mjs';
import { renderAngularPageComposition } from './renderers/angular-page-composition-renderer.mjs';
import {
    composedProduct,
    realizationChecker,
} from './test-support/external-realization-product.mjs';

const HTML = 'page.component.html';
const SESSION_MODULE = '../../../../../session';
const SESSION_HOST = Object.freeze({
    schema_version: '1.1.0',
    kind: 'angular-page-host-bindings',
    session: { module: SESSION_MODULE, token: 'APPLICATION_SESSION' },
    connectivity: {
        module: `${SESSION_MODULE}/connectivity`,
        token: 'ApplicationConnectivity',
    },
    services: {},
});

test('parserList : un tableau passe, null seulement si le contrat le documente, tout autre refus est nommé', () => {
    const list = [1];
    assert.equal(parserList(list, 'x'), list);
    assert.deepEqual(parserList(null, 'x', { nullable: true }), []);
    for (const value of [undefined, null, {}, 'a', 0])
        assert.throws(
            () => parserList(value, 'template errors'),
            /^Error: page grammar: parser contract changed \(template errors\)$/
        );
    assert.throws(
        () => parserList(undefined, 'x', { nullable: true }),
        /parser contract changed \(x\)/
    );
});

// Nœud de commande `required`, permissions présentes, absentes ou vides.
function commandNode(permissions) {
    return {
        id: 'archive',
        primitive_ref: {
            uri: 'apps/fixture/src/app/generated/actions/archive-op/execution-model.json',
            kind: 'action-request-execution-model',
            schema_version: '1.1.0',
            operation_id: 'archive-op',
        },
        authorization: {
            mode: 'required',
            ...(permissions === undefined ? {} : { permissions }),
            denied_behavior: 'hide',
        },
        invalidates: [],
    };
}

const RENDERED = Object.freeze([
    {
        kind: 'command',
        nodeId: 'archive',
        target: {
            actionId: 'archive-op',
            files: { 'src/index.ts': 'export {};\n' },
            artifacts: [{ path: 'src/index.ts', artifact_id: 'public-api' }],
        },
    },
]);

const PROFILES = Object.freeze({
    interne: (node) =>
        renderAngularPageComposition(
            {
                schema_version: '1.0.0',
                kind: 'page-execution-plan',
                query_nodes: [],
                command_nodes: [node],
            },
            RENDERED,
            angularPageHostBindings
        ),
    extérieur: (node, session = { effects: [] }) =>
        renderAngularPageComposition(
            {
                schema_version: '1.1.0',
                kind: 'page-execution-plan',
                session,
                query_nodes: [],
                command_nodes: [node],
            },
            RENDERED,
            SESSION_HOST,
            {
                externalNodes: {
                    archive: {
                        root: 'actions/archive-op/src',
                        module: '../../../../actions/archive-op/src',
                        sampleInput: { field: 'cmz-contrat' },
                        serviceToken: 'FIXTURE_SERVICE_API_URL',
                    },
                },
            }
        ),
});

// Priorité du pilote : en mode `required`, une liste de permissions absente
// ou vide rendait `[].every()` vrai, donc l'action autorisée sans permission.
for (const [profile, render] of Object.entries(PROFILES))
    test(`composition ${profile} : permissions absentes ou vides en mode required → refus nommé`, () => {
        const files = render(commandNode(['archive.write'])).files;
        assert.match(
            Object.values(files).join('\n'),
            /PermissionSignals = \["archive\.write"\]/
        );
        for (const permissions of [undefined, [], [''], [7]])
            assert.throws(
                () => render(commandNode(permissions)),
                /page composition: archive authorization required without permissions/,
                JSON.stringify(permissions)
            );
    });

test('composition extérieure : une session sans effets déclarés → refus nommé', () => {
    assert.throws(
        () => PROFILES.extérieur(commandNode(['archive.write']), {}),
        /page composition: session without declared effects/
    );
});

test('bon de travail : routes déclarées exigées, sinon refus nommé', () => {
    const pageId = 'page_0000000000000001';
    const section = grammarSection({
        pageId,
        pageContract: {
            experience: {
                session: { routes: [{ path: '/b' }, { path: '/a' }] },
            },
        },
    });
    assert.deepEqual(section.routes, ['/a', '/b']);
    for (const experience of [
        undefined,
        {},
        { session: {} },
        { session: { routes: [] } },
        { session: { routes: [{}] } },
    ])
        assert.throws(
            () => grammarSection({ pageId, pageContract: { experience } }),
            /page grammar: work order without declared routes/,
            JSON.stringify(experience)
        );
});

// 4e repli (X4-sécurité-2, 52d4d77f) : le balayage des éléments interdits ne
// suivait que `children` ; les cas d'une expansion ICU lui échappaient.
const forbiddenIn = (text) =>
    templateViolations({ name: HTML, text, declaredIds: undefined }).violations;

test('structure seule : un élément interdit est vu partout dans l’arbre brut, cas ICU compris', () => {
    for (const text of [
        '<script></script>',
        '<p><iframe></iframe></p>',
        '@if (on) {<object></object>}',
        '<p>{count, plural, =0 {<embed>} other {x}}</p>',
        '<p>{count, select, a {<p><base></p>} other {x}}</p>',
    ])
        assert.ok(
            forbiddenIn(text).some((entry) =>
                entry.startsWith(`element forbidden in ${HTML}: <`)
            ),
            text
        );
});

test('structure seule (layersOf) : élément interdit dans un cas ICU de la page réalisée', async (t) => {
    const product = await composedProduct(t, 'observatory');
    const { good, layersOf } = await realizationChecker(product);
    const files = {
        ...good,
        [HTML]: `${good[HTML]}\n<p>{count, plural, =0 {<iframe></iframe>} other {x}}</p>\n`,
    };
    assert.ok(
        layersOf(files).includes(`element forbidden in ${HTML}: <iframe>`),
        layersOf(files).join(' | ')
    );
});

test('le visiteur récursif d’Angular visite les 12 genres épinglés de l’arbre brut', async () => {
    const registries = JSON.parse(
        await readFile(
            new URL(
                './test-support/page-grammar-registries.json',
                import.meta.url
            ),
            'utf8'
        )
    );
    const kinds = registries.angular_html_nodes;
    assert.equal(kinds.length, 12);
    for (const kind of kinds)
        assert.equal(
            typeof angular.RecursiveVisitor.prototype[`visit${kind}`],
            'function',
            kind
        );
});

// Balayage : chaque repli `?? []`, `?? {}`, `|| []` ou `|| {}` du périmètre
// porte sa justification sur son site, même ligne ou ligne au-dessus.
const SWEPT = [
    'core/page-grammar/index.mjs',
    'core/page-grammar/parser-contract.mjs',
    'core/page-grammar/registries.mjs',
    'core/page-grammar/style.mjs',
    'core/page-grammar/template-element.mjs',
    'core/page-grammar/template.mjs',
    'core/page-grammar/text.mjs',
    'core/page-grammar/typescript-class.mjs',
    'core/page-grammar/typescript-expression.mjs',
    'core/page-grammar/typescript.mjs',
    'core/page-grammar/work-order.mjs',
    'core/external-page-realization-structure.mjs',
    'renderers/angular-page-composition-renderer.mjs',
    'renderers/page-composition-guards.mjs',
    'proof-support/external-page-realization-native.mjs',
];
const FALLBACK = /\?\? \[\]|\?\? \{\}|\|\| \[\]|\|\| \{\}/;
const MARKER = '// repli justifié : ';

test('balayage : aucun repli sans sa justification sur le site', async () => {
    const unmarked = [];
    for (const path of SWEPT) {
        const lines = (
            await readFile(new URL(`./${path}`, import.meta.url), 'utf8')
        ).split('\n');
        lines.forEach((line, index) => {
            if (
                FALLBACK.test(line) &&
                !line.includes(MARKER) &&
                !(lines[index - 1] ?? '').includes(MARKER)
            )
                unmarked.push(`${path}:${index + 1}`);
        });
    }
    assert.deepEqual(unmarked, []);
});

// Garde structurel (E, validations W et Z) : un champ gouverné par le contrat
// de l'analyseur (errors, directives, unknownBlocks, parseDiagnostics) n'est
// lu que par parserList, sous TOUTE forme de lecture : accès par point, par
// crochets avec un littéral, déstructuration (déclaration ou affectation).
// Le balayage passe par l'arbre TypeScript, pas par une expression régulière :
// un marqueur « repli justifié » ne peut donc pas le contourner. Portée par
// motif de fichier, sans liste de sites : la grammaire et la chaîne de
// sécurité de la réalisation.
//
// G-1 (Fable) : un balayage par nom ne voit pas une clé non écrite. Sont donc
// refusées PAR CONSTRUCTION dans ce périmètre, quel que soit le nom lu : toute
// mention de Reflect, getOwnPropertyDescriptor(s) (alias et crochets compris),
// et toute clé calculée en déstructuration. La déstructuration est suivie à
// toute profondeur, en déclaration comme en affectation.
// Limites DÉCLARÉES, non bannies pour éviter les faux positifs (`arr[i]`,
// `{ ...options }`) : un accès par crochets à clé non littérale
// (`parsed[key]`) et l'énumération (Object.entries/values/keys, décomposition
// `...`) ne sont pas vus. Un test les épingle.
const PARSER_FIELDS = new Set([
    'errors',
    'directives',
    'unknownBlocks',
    'parseDiagnostics',
]);
const literalName = (node) =>
    node &&
    (ts.isIdentifier(node) ||
        ts.isStringLiteral(node) ||
        ts.isNoSubstitutionTemplateLiteral(node))
        ? node.text
        : undefined;
const guardedByParserList = (node) =>
    ts.isCallExpression(node.parent) &&
    node.parent.arguments[0] === node &&
    ts.isIdentifier(node.parent.expression) &&
    node.parent.expression.text === 'parserList';
const REFLECTIVE_NAMES = new Set([
    'Reflect',
    'getOwnPropertyDescriptor',
    'getOwnPropertyDescriptors',
]);
// Un littéral objet ou tableau est une cible de déstructuration s'il est, à
// n'importe quelle profondeur, le côté gauche d'une affectation `=` ou la
// variable d'une boucle for…of / for…in.
const destructuringTarget = (literal) => {
    const parent = literal.parent;
    if (!parent) return false;
    if (
        ts.isBinaryExpression(parent) &&
        parent.operatorToken.kind === ts.SyntaxKind.EqualsToken
    )
        return parent.left === literal;
    if (
        (ts.isForOfStatement(parent) || ts.isForInStatement(parent)) &&
        parent.initializer === literal
    )
        return true;
    if (
        ts.isParenthesizedExpression(parent) ||
        ts.isArrayLiteralExpression(parent) ||
        ts.isSpreadElement(parent) ||
        ts.isSpreadAssignment(parent)
    )
        return destructuringTarget(parent);
    if (ts.isPropertyAssignment(parent) && parent.initializer === literal)
        return destructuringTarget(parent.parent);
    return false;
};

function parserFieldReads(text, name = 'module.mjs') {
    const file = ts.createSourceFile(
        name,
        text,
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.JS
    );
    const reads = [];
    const read = (node, guarded, kind = 'field') =>
        reads.push({
            line: file.getLineAndCharacterOfPosition(node.getStart()).line + 1,
            guarded,
            kind,
        });
    const visit = (node) => {
        if (REFLECTIVE_NAMES.has(literalName(node)))
            read(node, false, 'reflective');
        else if (
            ts.isBindingElement(node) &&
            ts.isObjectBindingPattern(node.parent) &&
            node.propertyName &&
            ts.isComputedPropertyName(node.propertyName)
        )
            read(node, false, 'computed-key');
        else if (
            ts.isPropertyAssignment(node) &&
            ts.isComputedPropertyName(node.name) &&
            ts.isObjectLiteralExpression(node.parent) &&
            destructuringTarget(node.parent)
        )
            read(node, false, 'computed-key');
        else if (
            ts.isPropertyAccessExpression(node) &&
            PARSER_FIELDS.has(node.name.text)
        )
            read(node, guardedByParserList(node));
        else if (
            ts.isElementAccessExpression(node) &&
            PARSER_FIELDS.has(literalName(node.argumentExpression))
        )
            read(node, guardedByParserList(node));
        else if (
            ts.isBindingElement(node) &&
            ts.isObjectBindingPattern(node.parent) &&
            PARSER_FIELDS.has(literalName(node.propertyName ?? node.name))
        )
            read(node, false);
        else if (
            (ts.isShorthandPropertyAssignment(node) ||
                ts.isPropertyAssignment(node)) &&
            ts.isObjectLiteralExpression(node.parent) &&
            destructuringTarget(node.parent) &&
            PARSER_FIELDS.has(literalName(node.name))
        )
            read(node, false);
        ts.forEachChild(node, visit);
    };
    visit(file);
    return reads;
}

test('garde structurel : chaque forme de lecture d’un champ de l’analyseur est vue', () => {
    const verdict = (code) =>
        parserFieldReads(code).map(({ guarded }) => guarded);
    // Gardées : premier argument de parserList, par point ou par crochets.
    assert.deepEqual(verdict("parserList(parsed.errors, 'x');"), [true]);
    assert.deepEqual(verdict("parserList(parsed['errors'], 'x');"), [true]);
    assert.deepEqual(verdict("parserList(file?.parseDiagnostics, 'x');"), [
        true,
    ]);
    // Refusées, marqueur ou non.
    for (const code of [
        'parsed.errors.length;',
        '// repli justifié : contournement.\nconst list = parsed.errors ?? [];',
        "parsed['errors'];",
        'node[`directives`];',
        'const { errors } = parsed;',
        'const { unknownBlocks: blocks } = node;',
        "const { 'parseDiagnostics': found } = file;",
        'let errors; ({ errors } = parsed);',
        'other(parsed.errors);',
        "parserList('x', parsed.errors);",
    ])
        assert.ok(
            verdict(code).some((guarded) => !guarded),
            code
        );
    // Un champ du même nom écrit (et non lu) n'est pas une lecture.
    assert.deepEqual(verdict('const result = { errors: [] };'), []);
    // G-1 : refus par construction, quel que soit le nom lu.
    const kinds = (code) =>
        parserFieldReads(code)
            .filter(({ guarded }) => !guarded)
            .map(({ kind }) => kind);
    for (const [code, kind] of [
        ["Reflect.get(parsed, 'errors');", 'reflective'],
        ['const read = Reflect.get;', 'reflective'],
        ["Reflect['get'](parsed, key);", 'reflective'],
        ["globalThis['Reflect'].get(parsed, key);", 'reflective'],
        ["Object.getOwnPropertyDescriptor(parsed, 'errors');", 'reflective'],
        ['Object.getOwnPropertyDescriptors(parsed);', 'reflective'],
        ["Object['getOwnPropertyDescriptor'](parsed, key);", 'reflective'],
        ['const { getOwnPropertyDescriptor: d } = Object;', 'reflective'],
        ["const { ['errors']: found } = parsed;", 'computed-key'],
        ['const { [key]: found } = parsed;', 'computed-key'],
        ['let found; ({ [key]: found } = parsed);', 'computed-key'],
    ])
        assert.ok(kinds(code).includes(kind), `${code} → ${kinds(code)}`);
    // Déstructuration imbriquée, à toute profondeur.
    for (const code of [
        'const { a: { b: { errors } } } = parsed;',
        'function f({ a: { directives } }) {}',
        'let errors; ({ a: { errors } } = parsed);',
        'let errors; ({ a: { b: { errors } } } = parsed);',
        'let errors; ({ a: [{ errors }] } = parsed);',
        'let errors; ({ a: { errors } = {} } = parsed);',
        'let errors; [{ errors }] = list;',
        'for ({ errors } of list);',
    ])
        assert.ok(
            verdict(code).some((guarded) => !guarded),
            code
        );
    // Une valeur par défaut ÉCRITE n'est pas une cible de déstructuration.
    assert.deepEqual(
        verdict('let x; ({ a: x = { errors: [] } } = parsed);'),
        []
    );
    // Limites DÉCLARÉES (G-1) : clé non littérale et énumération non vues.
    assert.deepEqual(verdict('parsed[key];'), []);
    assert.deepEqual(verdict('Object.entries(parsed);'), []);
    assert.deepEqual(verdict('const copy = { ...parsed };'), []);
});

test('garde structurel : les champs du contrat de l’analyseur ne se lisent que par parserList', async () => {
    const { readdir } = await import('node:fs/promises');
    const scoped = [
        ...(await readdir(new URL('./core/page-grammar/', import.meta.url)))
            .filter((name) => name.endsWith('.mjs'))
            .map((name) => `core/page-grammar/${name}`),
        ...(await readdir(new URL('./core/', import.meta.url)))
            .filter((name) => /^external-page-realization-.*\.mjs$/.test(name))
            .map((name) => `core/${name}`),
    ];
    assert.ok(scoped.length >= 12, scoped.join(', '));
    const unguarded = [];
    let reads = 0;
    for (const path of scoped) {
        const text = await readFile(
            new URL(`./${path}`, import.meta.url),
            'utf8'
        );
        for (const { line, guarded, kind } of parserFieldReads(text, path)) {
            if (kind === 'field') reads++;
            if (!guarded) unguarded.push(`${path}:${line} (${kind})`);
        }
    }
    assert.ok(reads >= 7, `lectures trouvées : ${reads}`);
    assert.deepEqual(unguarded, []);
});
