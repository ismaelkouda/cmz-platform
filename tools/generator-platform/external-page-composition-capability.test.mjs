// X4-sécurité-3, P-A1 : contrat de capacité de la composition extérieure
// (O-A). Sur une matrice de plans (effet de session ou non, autorisation
// `none` ou `required`, une ou plusieurs commandes), la composition rendue
// publie exactement sa table `api`, n'importe que la liste fermée, ne navigue
// que vers la destination rendue par la session, rend chaque commande froide
// (un seul `defer` en tête) et chaque signal en lecture seule. Le profil
// interne (sans liaison de connectivité) ne reçoit rien de tout cela.
import assert from 'node:assert/strict';
import test from 'node:test';

import ts from 'typescript';

import {
    COMMAND_MEMBER_KINDS,
    externalCompositionApi,
    QUERY_MEMBER_KINDS,
    nodeMembers,
} from './renderers/angular-page-composition-api.mjs';
import { renderAngularPageComposition } from './renderers/angular-page-composition-renderer.mjs';

const SESSION_MODULE = '../../../../../session';
const HOST = Object.freeze({
    schema_version: '1.1.0',
    kind: 'angular-page-host-bindings',
    session: { module: SESSION_MODULE, token: 'APPLICATION_SESSION' },
    connectivity: {
        module: `${SESSION_MODULE}/connectivity`,
        token: 'ApplicationConnectivity',
    },
    services: {},
});
const COMPOSITION = 'src/page-composition.ts';
const API = 'src/page-composition.api.ts';
const SPEC = 'src/page-composition.contract.spec.ts';

const PRODUCER = (node) => ({
    page_id: 'page_0000000000000001',
    action_id: node,
    response_status: 200,
    result_model_id: `${node}-result`,
});

function commandNode(id, { permissions } = {}) {
    return {
        id,
        primitive_ref: {
            uri: `apps/fixture/src/app/generated/actions/${id}-op/execution-model.json`,
            kind: 'action-request-execution-model',
            schema_version: '1.1.0',
            operation_id: `${id}-op`,
        },
        authorization: permissions
            ? {
                  mode: 'required',
                  permissions,
                  denied_behavior: 'hide',
              }
            : { mode: 'none' },
        invalidates: [],
    };
}

function plan(nodes, effects = []) {
    return {
        schema_version: '1.1.0',
        kind: 'page-execution-plan',
        session: { effects },
        query_nodes: [],
        command_nodes: nodes,
    };
}

const establish = (node) => ({
    node_id: node,
    kind: 'establish',
    stage_id: null,
    producer: PRODUCER(node),
    canonical_fields: [{ name: 'credential', source_field: 'credential' }],
});
const complete = (node) => ({
    node_id: node,
    kind: 'complete',
    stage_id: 'review',
    producer: PRODUCER(node),
    canonical_fields: [],
});

// Matrice : effet de session ou non, autorisation `none` ou `required`, une
// ou plusieurs commandes.
const MATRIX = Object.freeze({
    'une commande, établissement, sans autorisation': plan(
        [commandNode('enter')],
        [establish('enter')]
    ),
    'une commande, sans effet, autorisation requise': plan([
        commandNode('archive', { permissions: ['archive.write'] }),
    ]),
    'trois commandes : établissement, étape, autorisation requise': plan(
        [
            commandNode('enter'),
            commandNode('agree'),
            commandNode('purge', { permissions: ['a.read', 'a.write'] }),
        ],
        [establish('enter'), complete('agree')]
    ),
});

function render(document, host = HOST) {
    return renderAngularPageComposition(
        document,
        document.command_nodes.map((node) => ({
            kind: 'command',
            nodeId: node.id,
            target: {
                actionId: node.primitive_ref.operation_id,
                files: { 'src/index.ts': 'export {};\n' },
                artifacts: [
                    { path: 'src/index.ts', artifact_id: 'public-api' },
                ],
            },
        })),
        host,
        {
            externalNodes: Object.fromEntries(
                document.command_nodes.map((node) => [
                    node.id,
                    {
                        root: `actions/${node.primitive_ref.operation_id}/src`,
                        module: `../../../../actions/${node.primitive_ref.operation_id}/src`,
                        sampleInput: { field: 'cmz-contrat' },
                        serviceToken: 'FIXTURE_SERVICE_API_URL',
                    },
                ])
            ),
        }
    ).files;
}

const parse = (text) =>
    ts.createSourceFile(
        'page-composition.ts',
        text,
        ts.ScriptTarget.ES2022,
        true
    );

function compositionClass(file) {
    const found = file.statements.find(
        (statement) =>
            ts.isClassDeclaration(statement) &&
            statement.name?.text === 'PageComposition'
    );
    assert.ok(found, 'classe PageComposition absente');
    return found;
}

const isPublic = (member) =>
    !member.modifiers?.some((modifier) =>
        [ts.SyntaxKind.PrivateKeyword, ts.SyntaxKind.ProtectedKeyword].includes(
            modifier.kind
        )
    ) && !ts.isPrivateIdentifier(member.name);

function publicMembers(file) {
    return compositionClass(file).members.filter(
        (member) => ts.isPropertyDeclaration(member) && isPublic(member)
    );
}

const callee = (node) =>
    ts.isCallExpression(node)
        ? ts.isIdentifier(node.expression)
            ? node.expression.text
            : node.expression.getText()
        : undefined;

function frozenLiteral(member) {
    const initializer = member.initializer;
    assert.equal(callee(initializer), 'Object.freeze', member.name.text);
    const [literal] = initializer.arguments;
    assert.ok(ts.isObjectLiteralExpression(literal), member.name.text);
    return literal;
}

const ALLOWED_IMPORTS = Object.freeze({
    '@angular/core': [
        'DestroyRef',
        'InjectionToken',
        'Service',
        'computed',
        'effect',
        'inject',
        'signal',
        'Signal',
    ],
    '@angular/router': ['Router'],
    rxjs: ['catchError', 'defer', 'map', 'tap', 'throwError', 'Observable'],
    [SESSION_MODULE]: ['APPLICATION_SESSION'],
    [`${SESSION_MODULE}/connectivity`]: ['ApplicationConnectivity'],
});

function assertImports(file, document) {
    const facades = new Map(
        document.command_nodes.map((node) => [
            `../../../../actions/${node.primitive_ref.operation_id}/src/${node.primitive_ref.operation_id}.facade`,
            node,
        ])
    );
    for (const statement of file.statements.filter(ts.isImportDeclaration)) {
        const module = statement.moduleSpecifier.text;
        const names = statement.importClause.namedBindings.elements.map(
            (element) => (element.propertyName ?? element.name).text
        );
        assert.equal(statement.importClause.name, undefined, module);
        if (facades.has(module)) {
            assert.equal(names.length, 1, module);
            assert.match(names[0], /Facade$/, module);
            continue;
        }
        assert.ok(Object.hasOwn(ALLOWED_IMPORTS, module), `import ${module}`);
        for (const name of names)
            assert.ok(
                ALLOWED_IMPORTS[module].includes(name),
                `${name} de ${module}`
            );
    }
}

// La seule forme d'appel sur `Router` : `navigateByUrl(destination, { replaceUrl:
// true })`, où `destination` vient de `this.session.establish` ou `complete`.
function assertNavigation(file) {
    let navigations = 0;
    const destinations = new Set();
    const visit = (node) => {
        if (
            ts.isVariableDeclaration(node) &&
            ts.isIdentifier(node.name) &&
            node.name.text === 'destination'
        ) {
            assert.match(
                callee(node.initializer) ?? '',
                /^this\.session\.(?:establish|complete)$/
            );
            destinations.add(node);
        }
        if (
            ts.isPropertyAccessExpression(node) &&
            node.expression.getText() === 'this.router'
        ) {
            assert.equal(node.name.text, 'navigateByUrl');
            const call = node.parent;
            assert.ok(ts.isCallExpression(call));
            assert.equal(call.arguments.length, 2);
            assert.equal(call.arguments[0].getText(), 'destination');
            assert.equal(
                call.arguments[1].getText().replace(/\s+/g, ' '),
                '{ replaceUrl: true }'
            );
            navigations++;
        }
        ts.forEachChild(node, visit);
    };
    visit(file);
    assert.equal(navigations, destinations.size);
    return navigations;
}

for (const [label, document] of Object.entries(MATRIX)) {
    test(`P-A1 : ${label}`, () => {
        const files = render(document);
        const api = externalCompositionApi(document);
        const file = parse(files[COMPOSITION]);
        // Égalité de la table avec les membres émis.
        const roots = [...new Set(api.map(({ path }) => path.split('.')[0]))];
        const members = publicMembers(file);
        assert.deepEqual(
            members.map((member) => member.name.text).sort(),
            roots.sort()
        );
        for (const member of members) {
            const name = member.name.text;
            if (name === 'online') {
                assert.equal(callee(member.initializer), 'computed');
                continue;
            }
            const literal = frozenLiteral(member);
            const expected = nodeMembers(api, name);
            assert.deepEqual(
                literal.properties.map((property) => property.name.text),
                expected.map(({ member: entry }) => entry)
            );
            for (const property of literal.properties) {
                const kind = COMMAND_MEMBER_KINDS[property.name.text];
                const value = property.initializer;
                if (kind === 'signal')
                    assert.match(
                        callee(value) ?? '',
                        /^computed/,
                        property.name.text
                    );
                else if (kind === 'constant')
                    assert.ok(
                        ts.isStringLiteral(value) ||
                            value.kind === ts.SyntaxKind.NullKeyword,
                        property.name.text
                    );
                else {
                    // Commande froide : une flèche dont le corps est un seul
                    // `defer(...)`, sans instruction avant.
                    assert.ok(ts.isArrowFunction(value), property.name.text);
                    assert.ok(!ts.isBlock(value.body), property.name.text);
                    assert.equal(
                        callee(value.body),
                        'defer',
                        property.name.text
                    );
                }
            }
        }
        // Aucune façade ni autorité brute exposée.
        for (const member of members)
            assert.doesNotMatch(
                member.initializer.getText().split('=>')[0],
                /\binject\(|Facade\b|this\.(?:router|session|connectivity)\b/,
                member.name.text
            );
        assertImports(file, document);
        assert.equal(
            assertNavigation(file),
            (document.session.effects ?? []).length
        );
        // Le code livré n'active jamais la gestion synchrone des erreurs de
        // rxjs ; la spec de contrat, elle, lit ce réglage pour le vérifier.
        for (const [path, content] of Object.entries(files))
            if (path !== SPEC)
                assert.doesNotMatch(
                    content,
                    /useDeprecatedSynchronousErrorHandling/,
                    path
                );
        // Table et spec de contrat publiées à côté de la composition.
        assert.match(files[API], /export type PageCompositionApiProof/);
        for (const { path } of api)
            assert.ok(files[API].includes(JSON.stringify(path)), path);
        assert.match(files[SPEC], /contrat de capacité \(O-A\)/);
    });
}

test('P-A1 : le profil interne (sans liaison de connectivité) ne reçoit ni table, ni spec, ni `online`', () => {
    const document = MATRIX['une commande, établissement, sans autorisation'];
    const { connectivity, ...internal } = HOST;
    void connectivity;
    const files = render(document, internal);
    assert.equal(files[API], undefined);
    assert.equal(files[SPEC], undefined);
    assert.doesNotMatch(
        files[COMPOSITION],
        /\bonline\b|ApplicationConnectivity/
    );
    const external = render(document);
    assert.deepEqual(
        Object.keys(external).sort(),
        [...Object.keys(files), API, SPEC].sort()
    );
});

test('P-A1 : une liaison de connectivité hors forme fait échouer le rendu ; la table api reste de session (X5 : nœuds de lecture admis)', () => {
    const document = MATRIX['une commande, établissement, sans autorisation'];
    assert.throws(
        () =>
            render(document, {
                ...HOST,
                connectivity: {
                    module: 'https://autre',
                    token: 'ApplicationConnectivity',
                },
            }),
        /PAGE_CONNECTIVITY_HOST_BINDING/
    );
    assert.throws(
        () =>
            render(document, {
                ...HOST,
                connectivity: {
                    module: `${SESSION_MODULE}/connectivity`,
                    token: 'Router',
                },
            }),
        /PAGE_CONNECTIVITY_HOST_BINDING/
    );
    // G1 (X5 C4) : la table reste limitée au profil de session…
    assert.throws(
        () => externalCompositionApi({ ...document, schema_version: '1.0.0' }),
        /external composition supports session pages only/
    );
    // … et un nœud de lecture y entre avec ses six membres fermés, seulement.
    const api = externalCompositionApi({
        ...document,
        query_nodes: [{ id: 'list' }],
    });
    assert.deepEqual(
        api
            .filter((entry) => entry.path.startsWith('list.'))
            .map((entry) => [entry.path.slice(5), entry.kind]),
        Object.entries(QUERY_MEMBER_KINDS).sort(([left], [right]) =>
            left < right ? -1 : left > right ? 1 : 0
        )
    );
});

// X5 C5 (Fable, revue de C4) : une page qui mêle des lectures et des
// commandes à permissions est refusée, nommée, dès la génération.
test('X5 : lectures et commande à permissions dans une même page, refus nommé', () => {
    const gated = MATRIX['une commande, sans effet, autorisation requise'];
    assert.throws(
        () =>
            externalCompositionApi({ ...gated, query_nodes: [{ id: 'list' }] }),
        /PAGE_MIXED_READ_PERMISSION: a page with reads and permission-gated commands is not supported yet/
    );
    // Sans lecture, la même page reste composable ; sans permission, une page
    // à lectures aussi.
    assert.ok(externalCompositionApi(gated).length > 0);
    const open = MATRIX['une commande, établissement, sans autorisation'];
    assert.ok(
        externalCompositionApi({ ...open, query_nodes: [{ id: 'list' }] })
            .length > 0
    );
});

// X5 C5 (B+, C-B+1) : `absentText` est une racine réservée ; un nœud qui
// porterait ce nom entrerait en collision avec elle.
test('X5 : un nœud nommé comme la racine réservée absentText est refusé', () => {
    const open = MATRIX['une commande, établissement, sans autorisation'];
    assert.throws(
        () =>
            externalCompositionApi({
                ...open,
                query_nodes: [{ id: 'absent-text' }],
            }),
        /unsafe or duplicate member absent-text/
    );
});

// O-S (Fable, réserve 2), vérifié globalement sur un produit composé entier,
// coque comprise : rxjs garde sa gestion asynchrone des erreurs, et aucun
// fichier ne remplace l'`ErrorHandler` d'Angular. Invariant de coque : le
// gestionnaire par défaut journalise et ne relance pas, donc un écouteur qui
// lève rend encore `false` (O-S-V, comportements 2 et 3).
test('O-S : aucun réglage synchrone de rxjs ni ErrorHandler remplacé, dans tout le produit composé', async (t) => {
    const { composedProduct } =
        await import('./test-support/external-realization-product.mjs');
    const { readdir, readFile } = await import('node:fs/promises');
    const { join, relative } = await import('node:path');
    const product = await composedProduct(t, 'observatory');
    const files = [];
    const walk = async (directory) => {
        for (const entry of await readdir(directory, { withFileTypes: true })) {
            if (entry.name === 'node_modules' || entry.name === '.git')
                continue;
            const path = join(directory, entry.name);
            if (entry.isDirectory()) await walk(path);
            else if (/\.(?:[cm]?[jt]s|json|html)$/.test(entry.name))
                files.push(path);
        }
    };
    await walk(product.root);
    assert.ok(files.length > 50, 'produit incomplet');
    let config;
    for (const path of files) {
        const name = relative(product.root, path);
        const text = await readFile(path, 'utf8');
        if (!name.endsWith('page-composition.contract.spec.ts'))
            assert.doesNotMatch(
                text,
                /useDeprecatedSynchronousErrorHandling/,
                name
            );
        assert.doesNotMatch(
            text,
            /provide:\s*ErrorHandler|extends\s+ErrorHandler|\bErrorHandler\b.*useClass/,
            name
        );
        if (name.endsWith('src/app/app.config.ts')) config = text;
    }
    assert.ok(config, 'app.config.ts absent');
    assert.doesNotMatch(config, /ErrorHandler/);
    assert.match(config, /provideBrowserGlobalErrorListeners\(\)/);
});
