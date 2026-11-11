// CI #389 : fermeture des replis silencieux. Une donnée attendue absente
// arrête le rendu, la grammaire ou la preuve avec un refus nommé ; un repli
// restant porte sa justification sur son site.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import * as angular from '@angular/compiler';

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

// Garde structurel (E, validation W) : un champ gouverné par le contrat de
// l'analyseur (errors, directives, unknownBlocks, parseDiagnostics) n'est lu
// que par parserList. Un marqueur « repli justifié » ne peut donc pas le
// contourner. Portée par motif de fichier, sans liste de sites : la grammaire
// et la chaîne de sécurité de la réalisation.
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
    const READ = /\.(errors|directives|unknownBlocks|parseDiagnostics)\b/g;
    const unguarded = [];
    let reads = 0;
    for (const path of scoped) {
        const text = await readFile(
            new URL(`./${path}`, import.meta.url),
            'utf8'
        );
        for (const match of text.matchAll(READ)) {
            reads++;
            const before = text.slice(
                Math.max(0, match.index - 80),
                match.index
            );
            if (!/parserList\(\s*[\w.?]*$/.test(before))
                unguarded.push(
                    `${path}:${text.slice(0, match.index).split('\n').length}`
                );
        }
    }
    assert.ok(reads >= 7, `lectures trouvées : ${reads}`);
    assert.deepEqual(unguarded, []);
});
