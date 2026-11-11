// X4-sécurité-3, O-C (conception v2 §4) : couverture fermée, jusqu'au jeton et
// aux trivia. Les registres sont lus dans les modules installés et comparés à
// leur copie épinglée ; chaque genre absent des tables approuvées est présenté
// au dispatch sous forme synthétique et doit être refusé ; les trivia et les
// caractères invisibles sont testés genre par genre ; une mutation d'un seul
// jeton est refusée. Le refus vient de la grammaire seule : aucun programme,
// aucun vérificateur de types, aucun monde fermé par symbole.
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import test from 'node:test';

import * as angular from '@angular/compiler';
import * as cssTree from 'css-tree';
import ts from 'typescript';

import { TemplateGrammar } from './core/page-grammar/index.mjs';
import {
    angularExpressionClasses,
    cssNodeTypes,
    cssTokenTypes,
    htmlNodeKinds,
    PROTOTYPE_NAMES,
    templateNodeClasses,
    typescriptKinds,
} from './core/page-grammar/registries.mjs';
import {
    CSS_NODE_TYPES,
    CSS_REFUSED_TOKENS,
    StyleGrammar,
} from './core/page-grammar/style.mjs';
import {
    RAW_HTML_NODES,
    TEMPLATE_EXPRESSIONS,
    TEMPLATE_VISITED_NODES,
} from './core/page-grammar/template.mjs';
import { characterViolations, triviaKinds } from './core/page-grammar/text.mjs';
import {
    TYPESCRIPT_PRODUCTIONS,
    TypeScriptGrammar,
} from './core/page-grammar/typescript.mjs';
import {
    grammarFixture,
    insertAt,
    insideInterval,
} from './test-support/page-grammar-fixture.mjs';

const PINS = JSON.parse(
    await readFile(
        new URL('./test-support/page-grammar-registries.json', import.meta.url),
        'utf8'
    )
);
const TS = 'page.component.ts';
const HTML = 'page.component.html';
const SCSS = 'page.component.scss';
const emptyFacts = {
    text: '',
    fields: new Map(),
    methods: new Map(),
    decoratorImports: [],
    host: [],
};
const emptyContract = { ids: new Set(), routes: new Set() };

test('O-C §4.1 : registres itérés depuis les modules installés, égaux à leur copie épinglée', () => {
    assert.equal(ts.version, PINS.typescript.version);
    assert.deepEqual([...typescriptKinds().values()], PINS.typescript.kinds);
    assert.equal(PINS.typescript.kinds.length, 360);
    assert.deepEqual(
        triviaKinds().map((entry) => entry.name),
        PINS.typescript_trivia
    );
    assert.deepEqual(angularExpressionClasses(), PINS.angular_expressions);
    assert.deepEqual(templateNodeClasses(), PINS.angular_template_nodes);
    assert.deepEqual(htmlNodeKinds(), PINS.angular_html_nodes);
    assert.deepEqual(cssNodeTypes(), PINS.css_nodes);
    assert.deepEqual(cssTokenTypes(), PINS.css_tokens);
    assert.deepEqual(PROTOTYPE_NAMES, PINS.prototype_names);
});

// MU2 : les tables approuvées sont épinglées ; ajouter une entrée prise dans
// l'ensemble refusé change la table publiée et fait échouer ce test.
test('O-C §4.1 (MU2) : tables approuvées égales à leur copie épinglée', async () => {
    const typescript = await import('./core/page-grammar/typescript.mjs');
    const template = await import('./core/page-grammar/template.mjs');
    const style = await import('./core/page-grammar/style.mjs');
    assert.deepEqual(
        JSON.parse(
            JSON.stringify({
                typescript_productions: typescript.TYPESCRIPT_PRODUCTIONS,
                imports: typescript.IMPORTS,
                composition_imports: typescript.COMPOSITION_IMPORTS,
                decorator_keys: typescript.DECORATOR_KEYS,
                host_key: typescript.HOST_KEY.source,
                binary_operators: typescript.BINARY_OPERATORS.length,
                template_elements: template.TEMPLATE_ELEMENTS,
                element_attributes: template.ELEMENT_ATTRIBUTES,
                bound_properties: template.BOUND_PROPERTIES,
                bound_attributes: template.BOUND_ATTRIBUTES.source,
                style_properties: template.STYLE_PROPERTIES,
                pipes: template.TEMPLATE_PIPES,
                raw_html_nodes: template.RAW_HTML_NODES,
                template_visited_nodes: template.TEMPLATE_VISITED_NODES,
                template_expressions: template.TEMPLATE_EXPRESSIONS,
                css_at_rules: style.CSS_AT_RULES,
                css_functions: style.CSS_FUNCTIONS,
                css_node_types: style.CSS_NODE_TYPES,
                css_refused_tokens: style.CSS_REFUSED_TOKENS,
            })
        ),
        PINS.approved
    );
});

test('O-C §4.1 (MC4) : un genre ajouté par une version future change le registre itéré', () => {
    const fakeTs = {
        SyntaxKind: { ...ts.SyntaxKind, FutureKind: 9999, 9999: 'FutureKind' },
    };
    assert.notDeepEqual(
        [...typescriptKinds(fakeTs).values()],
        PINS.typescript.kinds
    );
    class FutureExpression extends angular.AST {}
    assert.ok(
        angularExpressionClasses({ ...angular, FutureExpression }).includes(
            'FutureExpression'
        )
    );
    assert.ok(
        templateNodeClasses({ ...angular, TmplAstFuture: class {} }).includes(
            'TmplAstFuture'
        )
    );
    class FutureVisitor extends angular.RecursiveVisitor {
        visitFuture() {
            return undefined;
        }
    }
    assert.ok(
        htmlNodeKinds({ ...angular, RecursiveVisitor: FutureVisitor }).includes(
            'Future'
        )
    );
    const fakeCss = {
        lexer: { structure: { ...cssTree.lexer.structure, Future: {} } },
        tokenTypes: { ...cssTree.tokenTypes, Future: 99 },
    };
    assert.ok(cssNodeTypes(fakeCss).includes('Future'));
    assert.ok(cssTokenTypes(fakeCss).includes('Future'));
});

test('O-C §4.1 : chaque genre TypeScript hors table est refusé, dans chaque contexte du dispatch', () => {
    const grammar = new TypeScriptGrammar({ name: TS, text: '', context: {} });
    let checked = 0;
    for (const [context, names] of Object.entries(TYPESCRIPT_PRODUCTIONS)) {
        const approved = new Set(names.map((name) => ts.SyntaxKind[name]));
        for (const kind of typescriptKinds().keys()) {
            if (approved.has(kind)) continue;
            const mark = grammar.found.length;
            assert.equal(
                grammar.dispatch(context, { kind, pos: 0, end: 0 }),
                false
            );
            assert.equal(
                grammar.found[mark]?.code,
                'T0',
                `${context} ${ts.SyntaxKind[kind]}`
            );
            checked++;
        }
    }
    assert.ok(checked > 2000, `${checked}`);
});

test('O-C §4.1 : chaque expression Angular hors table est refusée (H7)', () => {
    const grammar = new TemplateGrammar({
        text: '',
        facts: emptyFacts,
        contract: emptyContract,
    });
    for (const name of angularExpressionClasses()) {
        if (TEMPLATE_EXPRESSIONS.includes(name)) continue;
        const node = Object.assign(Object.create(angular[name].prototype), {
            sourceSpan: { start: 0, end: 0 },
        });
        const mark = grammar.found.length;
        assert.equal(grammar.classify(node, new Map()), 'invalid', name);
        assert.equal(grammar.found[mark]?.code, 'H7', name);
    }
});

test('O-C §4.1 : chaque nœud de gabarit hors table est refusé par le visiteur fermé (H0)', () => {
    const grammar = new TemplateGrammar({
        text: '',
        facts: emptyFacts,
        contract: emptyContract,
    });
    const visitor = grammar.visitor(new Map());
    let checked = 0;
    for (const name of templateNodeClasses()) {
        const kind = name.slice('TmplAst'.length);
        if (TEMPLATE_VISITED_NODES.includes(kind)) continue;
        const prototype = angular[name].prototype;
        // Base abstraite sans `visit` : aucun nœud ne l'a pour seul genre.
        if (typeof prototype.visit !== 'function') {
            assert.equal(name, 'TmplAstBlockNode');
            continue;
        }
        const node = Object.assign(Object.create(prototype), {
            sourceSpan: { start: { offset: 0 }, end: { offset: 0 } },
        });
        const mark = grammar.found.length;
        try {
            node.visit(visitor);
        } catch (error) {
            // Nœud que le compilateur refuse lui-même de visiter (hôte) :
            // il ne peut pas figurer dans un gabarit de page.
            assert.match(error.message, /cannot be visited/, name);
            continue;
        }
        assert.equal(grammar.found[mark]?.code, 'H0', name);
        checked++;
    }
    assert.ok(checked >= 30, `${checked}`);
});

test('O-C §4.1 : chaque nœud HTML brut hors table est refusé (H0 ou H1)', () => {
    const grammar = new TemplateGrammar({
        text: '',
        facts: emptyFacts,
        contract: emptyContract,
    });
    const visitor = grammar.rawVisitor();
    for (const kind of htmlNodeKinds()) {
        if (RAW_HTML_NODES.includes(kind)) continue;
        const mark = grammar.found.length;
        visitor[`visit${kind}`]({
            sourceSpan: { start: { offset: 0 }, end: { offset: 0 } },
        });
        assert.match(grammar.found[mark]?.code ?? '', /^H[01]$/, kind);
    }
});

test('O-C §4.1 : chaque nœud CSS hors table est refusé (C0), et les jetons url, bad-url, CDO, CDC (C3)', () => {
    const grammar = new StyleGrammar({ text: 'a{}' });
    for (const type of cssNodeTypes()) {
        if (CSS_NODE_TYPES.includes(type)) continue;
        const mark = grammar.found.length;
        grammar.node({ type, loc: null });
        assert.equal(grammar.found[mark]?.code, 'C0', type);
    }
    for (const name of CSS_REFUSED_TOKENS)
        assert.ok(cssTokenTypes().includes(name), name);
    // Jetons du CSS compilé, jugés directement (Sass ne rend pas de bad-url).
    for (const [label, css] of [
        ['Url', '.p{background:url(/x.png)}'],
        ['BadUrl', '.p{background:url(/x y.png)}'],
        ['CDO', '<!-- .p{color:red}'],
        ['CDC', '.p{color:red} -->'],
    ]) {
        const grammar = new StyleGrammar({ text: css });
        grammar.css(css);
        assert.ok(
            grammar.found.some((entry) => entry.code === 'C3'),
            label
        );
    }
});

test('O-C §4.3 : trivia TypeScript genre par genre, à quatre positions ; gabarit et caractères invisibles', async (t) => {
    const fixture = await grammarFixture(t);
    const base = fixture.adapted;
    assert.deepEqual(fixture.findings(base), []);
    const ts4 = [
        [
            'avant les imports',
            (text) => ({
                files: { ...base, [TS]: text + base[TS] },
                interval: { file: TS, start: 0, end: text.length },
            }),
        ],
        [
            'entre deux membres',
            (text) =>
                insertAt(base, TS, '    private readonly outcome', text, {
                    after: false,
                }),
        ],
        [
            'dans une expression',
            (text) =>
                insertAt(base, TS, 'this.composition.online()', text, {
                    after: false,
                }),
        ],
        [
            'en fin de fichier',
            (text) => ({
                files: { ...base, [TS]: base[TS] + text },
                interval: {
                    file: TS,
                    start: base[TS].length,
                    end: base[TS].length + text.length,
                },
            }),
        ],
    ];
    const comments = {
        '//': '// commentaire\n',
        '/* */': '/* commentaire */ ',
        '/** */': '/** JSDoc */\n',
        '///': '/// <reference lib="es2022" />\n',
        '#!': '#!/usr/bin/env node\n',
        'marqueur de conflit': '\n<<<<<<< HEAD\n',
        '@ts-* sans effet': '// @ts-expect-error\n',
    };
    for (const [kind, text] of Object.entries(comments))
        for (const [position, at] of ts4) {
            const { files, interval } = at(text);
            const found = fixture.findings(files);
            assert.ok(found.length > 0, `${kind} ${position}`);
            assert.ok(
                found.some(
                    (entry) =>
                        insideInterval(entry, interval) &&
                        ['T0', 'T1'].includes(entry.code)
                ),
                `${kind} ${position}`
            );
        }
    const html4 = [
        [
            'avant tout',
            (text) => insertAt(base, HTML, '<main', text, { after: false }),
        ],
        [
            'entre deux éléments',
            (text) =>
                insertAt(base, HTML, '    <div class="status">', text, {
                    after: false,
                }),
        ],
        [
            'dans un élément',
            (text) => insertAt(base, HTML, '<div class="status">', text),
        ],
        [
            'en fin de fichier',
            (text) => ({
                files: { ...base, [HTML]: base[HTML] + text },
                interval: {
                    file: HTML,
                    start: base[HTML].length,
                    end: base[HTML].length + text.length,
                },
            }),
        ],
    ];
    for (const [position, at] of html4) {
        const { files, interval } = at('<!-- commentaire -->');
        assert.ok(
            fixture
                .findings(files)
                .some(
                    (entry) =>
                        insideInterval(entry, interval) && entry.code === 'H1'
                ),
            position
        );
    }
    // Sous-classes Cf, U+2028, contrôles : dans les trois fichiers.
    const characters = {
        'bidi enchâssement et forçage': ['‪', '‫', '‬', '‭', '‮'],
        'bidi isolement': ['⁦', '⁧', '⁨', '⁩'],
        marques: ['‎', '‏', '؜'],
        'largeur nulle': ['​', '‌', '‍', '⁠'],
        'U+FEFF': ['﻿'],
        'trait d’union conditionnel': ['­'],
        séparateurs: [' ', ' '],
        'contrôles C0 et C1': [
            '\u0000',
            '\u0007',
            '\u001B',
            '\u007F',
            '\u0085',
            '\u009F',
        ],
    };
    for (const [label, list] of Object.entries(characters))
        for (const character of list)
            for (const [file, anchor] of [
                [TS, "    submitting: '',"],
                [HTML, '<h1'],
                [SCSS, '.page {'],
            ]) {
                const { files, interval } = insertAt(
                    base,
                    file,
                    anchor,
                    character
                );
                assert.ok(
                    fixture
                        .findings(files)
                        .some(
                            (entry) =>
                                insideInterval(entry, interval) &&
                                entry.code === 'T2'
                        ),
                    `${label} U+${character.codePointAt(0).toString(16)} ${file}`
                );
            }
    // Tabulation, saut de ligne et retour chariot restent permis.
    for (const character of ['\t', '\n', '\r'])
        assert.deepEqual(characterViolations(TS, `a${character}b`), []);
});

test('O-C §4.2 (MC5) : un diagnostic du seul analyseur refuse le fichier', async (t) => {
    const fixture = await grammarFixture(t);
    const { files, interval } = insertAt(
        fixture.adapted,
        TS,
        "    submitting: '',",
        '\n    retries: 1_,'
    );
    const found = fixture.findings(files);
    assert.ok(
        found.some(
            (entry) =>
                entry.code === 'T0' &&
                /parser diagnostic/.test(entry.message) &&
                insideInterval(entry, interval)
        )
    );
});

// MC1 : un seul jeton (mot-clé, modificateur ou ponctuation, tiré des
// intervalles de l'énuméré réel) inséré à cinq classes de position.
test('O-C §4.2 (MC1) : toute mutation d’un seul jeton est refusée, sauf variante du corpus positif', async (t) => {
    const fixture = await grammarFixture(t);
    const base = fixture.adapted[TS];
    const tokens = [];
    for (const [first, last] of [
        [ts.SyntaxKind.FirstKeyword, ts.SyntaxKind.LastKeyword],
        [ts.SyntaxKind.FirstPunctuation, ts.SyntaxKind.LastPunctuation],
    ])
        for (let kind = first; kind <= last; kind++) {
            const text = ts.tokenToString(kind);
            if (text && !tokens.includes(text)) tokens.push(text);
        }
    const positions = {
        'avant un membre': ['    private readonly outcome', '', ' '],
        'avant un paramètre': [
            'protected edit(control: string',
            'protected edit(',
            ' ',
        ],
        'entre modificateurs': [
            '    private readonly outcome',
            '    private',
            ' ',
        ],
        'après return': [
            '            return false;\n        }',
            '            return',
            ' ',
        ],
        'dans un littéral d’objet': ["    submitting: '',", '    ', ' '],
    };
    const accepted = [];
    let checked = 0;
    for (const token of tokens)
        for (const [label, [anchor, prefix, space]] of Object.entries(
            positions
        )) {
            const start = base.indexOf(anchor) + prefix.length;
            assert.ok(base.split(anchor).length === 2, label);
            const text =
                base.slice(0, start) +
                space +
                token +
                space +
                base.slice(start);
            const found = fixture.findings({ ...fixture.adapted, [TS]: text });
            checked++;
            if (found.length === 0) accepted.push(`${label}: ${token}`);
        }
    assert.ok(tokens.length > 120, `${tokens.length}`);
    assert.equal(checked, tokens.length * 5);
    // Variantes acceptées : seulement des réécritures équivalentes à la base.
    assert.deepEqual(accepted, []);
});

test('O-C : l’accepteur n’importe ni programme ni vérificateur de types, et juge sans environnement', async () => {
    const directory = new URL('./core/page-grammar/', import.meta.url);
    for (const name of await readdir(directory)) {
        const source = await readFile(new URL(name, directory), 'utf8');
        assert.doesNotMatch(
            source,
            /createProgram|getTypeChecker|TypeChecker|getSemanticDiagnostics|getPreEmitDiagnostics/,
            name
        );
    }
});

// Relecture de Fable, I-1 : la classe de caractères des écarts est porteuse.
// Les espaces Zs (U+00A0, U+2000…) sont balayés en WhitespaceTrivia : seule la
// classe de caractères les refuse. Les candidats viennent du balayeur
// TypeScript installé lui-même (source unique), point de code par point de
// code : un écart qui en contient un est accepté si et seulement si c'est
// U+0020, U+0009, U+000A ou U+000D.
test('O-C §4.3 (I-1) : chaque espace reconnu par le balayeur TypeScript, accepté seulement s’il est l’un des quatre permis', async (t) => {
    const fixture = await grammarFixture(t);
    const candidates = [];
    for (let point = 0; point <= 0x10ffff; point++) {
        if (point >= 0xd800 && point <= 0xdfff) continue;
        if (ts.isWhiteSpaceLike(point)) candidates.push(point);
    }
    const allowed = new Set([0x20, 0x09, 0x0a, 0x0d]);
    for (const point of [
        ...allowed,
        0xa0,
        0x2000,
        0x202f,
        0x3000,
        0xfeff,
        0x2028,
    ])
        assert.ok(candidates.includes(point), point.toString(16));
    for (const point of candidates) {
        const { files, interval } = insertAt(
            fixture.adapted,
            TS,
            '    private readonly outcome',
            String.fromCodePoint(point),
            { after: false }
        );
        const found = fixture.findings(files);
        const label = `U+${point.toString(16).toUpperCase().padStart(4, '0')}`;
        if (allowed.has(point)) assert.deepEqual(found, [], label);
        else
            assert.ok(
                found.some(
                    (entry) =>
                        insideInterval(entry, interval) &&
                        ['T1', 'T2'].includes(entry.code)
                ),
                `${label} : ${found.map((entry) => entry.code).join(',')}`
            );
    }
});

// Équivalence exacte du mutant « genre de trivia relâché seul » (confirmée par
// Fable) : tout écart fait des seuls quatre caractères permis est balayé en
// WhitespaceTrivia ou NewLineTrivia ; la condition de caractères implique donc
// la condition de genre. Preuve mécanisée sur toutes les suites de longueur 1
// à 4.
test('O-C §4.3 : les quatre caractères permis ne forment que des trivia d’espacement (équivalence du mutant de genre)', () => {
    const kinds = new Set();
    const visit = (text, depth) => {
        if (text) {
            const scanner = ts.createScanner(
                ts.ScriptTarget.Latest,
                false,
                ts.LanguageVariant.Standard,
                text
            );
            let kind;
            while ((kind = scanner.scan()) !== ts.SyntaxKind.EndOfFileToken)
                kinds.add(kind);
        }
        if (depth === 0) return;
        for (const character of [' ', '\t', '\n', '\r'])
            visit(text + character, depth - 1);
    };
    visit('', 4);
    assert.deepEqual(
        [...kinds].sort(),
        [ts.SyntaxKind.NewLineTrivia, ts.SyntaxKind.WhitespaceTrivia].sort()
    );
});
