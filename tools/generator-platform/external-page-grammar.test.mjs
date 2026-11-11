// X4-sécurité-3, O-G et O-S (conception v1 §6.2 et §6.3, v2 §3.2 et §5) :
// corpus positif (chaque production et chaque entrée de liste blanche a une
// variante anodine acceptée qui en dépend), un contre-test anodin par
// famille du constat de X4-sécurité-2 (57), et la grammaire sans levée de la
// méthode de soumission. Le refus vient de la grammaire seule : ni monde
// fermé par symbole, ni diagnostic du vérificateur.
import assert from 'node:assert/strict';
import test from 'node:test';

import { CSS_AT_RULES, CSS_FUNCTIONS } from './core/page-grammar/style.mjs';
import {
    BOUND_PROPERTIES,
    ELEMENT_ATTRIBUTES,
    STYLE_PROPERTIES,
    TEMPLATE_ELEMENTS,
    TEMPLATE_PIPES,
} from './core/page-grammar/template.mjs';
import {
    grammarFixture,
    insertAt,
    insideInterval,
} from './test-support/page-grammar-fixture.mjs';

const TS = 'page.component.ts';
const HTML = 'page.component.html';
const SCSS = 'page.component.scss';
const MEMBER = '    private readonly outcome';
const IMPORT_END = "} from '@angular/core';\n";
const DECORATOR_END = '    host: {';
const TEMPLATE_SLOT = '    <div class="status">';
const VOID = new Set(['input', 'img', 'br', 'wbr', 'hr', 'col']);

// Ajoute des membres à la classe, des imports et des clés au décorateur.
function variant(
    base,
    { members = '', imports = '', decorator = '', module = '', html, scss }
) {
    let ts = base[TS];
    if (imports) ts = ts.replace(IMPORT_END, IMPORT_END + imports);
    if (module) ts = ts.replace('\n@Component(', `\n${module}\n@Component(`);
    if (decorator) ts = ts.replace(DECORATOR_END, decorator + DECORATOR_END);
    if (members) ts = ts.replace(MEMBER, members + MEMBER);
    return {
        ...base,
        [TS]: ts,
        ...(html === undefined
            ? {}
            : {
                  [HTML]: base[HTML].replace(
                      TEMPLATE_SLOT,
                      html + TEMPLATE_SLOT
                  ),
              }),
        ...(scss === undefined ? {} : { [SCSS]: base[SCSS] + scss }),
    };
}

const accepted = (fixture, files, label) => {
    const found = fixture.violations(files);
    assert.deepEqual(found, [], label);
};

test('O-G §6.2 : corpus positif TypeScript, une variante par production', async (t) => {
    const fixture = await grammarFixture(t);
    accepted(fixture, fixture.adapted, 'page adaptée');
    const ts = (spec) => variant(fixture.adapted, spec);
    const cases = {
        'table de tableau as const typée': {
            module: 'const LIMITS: readonly number[] = [1, 2] as const;',
        },
        'table imbriquée, booléens et null': {
            module: 'const FLAGS = { open: true, closed: false, none: null, inner: { depth: 2 } };',
        },
        'champ signal à table': {
            members:
                "    protected readonly items = signal<readonly string[]>(['a']);\n",
        },
        'champ table': {
            members: "    protected readonly choices = ['a', 'b'];\n",
        },
        'méthode privée sans retour': {
            members:
                "    private touch(): void {\n        this.outcome.set('ready');\n    }\n",
        },
        'méthode sans type de retour, return valeur': {
            members:
                '    protected label(code: string): string {\n        return code;\n    }\n'.replace(
                    ': string {',
                    ' {'
                ),
        },
        'paramètres typés': {
            members:
                "    protected typed(a: number, b: boolean, c: null, d: undefined, e: 'x' | 'y', f: readonly string[], g: Readonly<Record<string, number>>, h: PageState): void {\n        if (a === 1 && b && c === null && d === undefined && e === 'x' && f && g && h) this.outcome.set('ready');\n    }\n",
        },
        'if/else et bloc': {
            members:
                "    protected flip(flag: boolean): void {\n        if (flag) {\n            this.outcome.set('ready');\n        } else this.outcome.set('failed');\n    }\n",
        },
        opérateurs: {
            members:
                '    protected readonly arithmetic = computed(() => (this.count() + 1 - 2) * 3 / 4 % 5 < 6 || this.count() <= 7 || this.count() > 8 || this.count() >= 9 || -this.count() !== 0 || !this.flag() || (this.flag() ?? false));\n    protected readonly count = signal(0);\n    protected readonly flag = signal(false);\n',
        },
        'conditionnelle et parenthèses': {
            members:
                "    protected readonly tone = computed(() => (this.state() === 'ready' ? 'ok' : 'ko'));\n",
        },
        'lectures de données': {
            members:
                "    protected readonly reads = computed(() => this.values().a ?? this.values()?.b ?? this.values()['c'] ?? this.values()?.['d']);\n",
        },
        'lecture de table par clé et par membre': {
            members:
                '    protected readonly read = computed(() => ANNOUNCEMENTS[this.state()] ?? ANNOUNCEMENTS.submitting);\n',
        },
        'littéraux d’objet et de tableau': {
            members:
                "    protected merge(key: string, value: string): void {\n        const list = [value, ...[value]];\n        this.values.update((current) => ({ ...current, [key]: value, 'other': list ? value : '' }));\n    }\n",
        },
        'appel de méthode de la page': {
            members:
                "    protected again(control: string): void {\n        this.edit(control, '');\n    }\n",
        },
        'constante publiée de la composition': {
            members:
                '    protected readonly denied = computed(() => this.composition.enter.deniedBehavior);\n',
        },
        'signal publié de la composition': {
            members:
                "    protected readonly busy = computed(() => this.composition.enter.state() === 'submitting');\n",
        },
        'clés d’hôte role, [class.x], [attr.aria-x]': { decorator: '' },
    };
    for (const [label, spec] of Object.entries(cases))
        accepted(fixture, ts(spec), label);
    const alias = fixture.adapted[TS].replace(
        '\nconst ANNOUNCEMENTS',
        "\ntype Mode = 'a';\n\nconst ANNOUNCEMENTS"
    );
    accepted(
        fixture,
        { ...fixture.adapted, [TS]: alias },
        'alias de type à un littéral'
    );
    const host = fixture.adapted[TS].replace(
        "        class: 'page-host',",
        "        class: 'page-host',\n        role: 'region',\n        '[class.busy]': \"state() === 'submitting'\",\n        '[attr.aria-busy]': \"state() === 'submitting'\","
    );
    accepted(fixture, { ...fixture.adapted, [TS]: host }, 'hôte');
});

test('O-G §6.2 : corpus positif du gabarit, une variante par entrée de liste blanche', async (t) => {
    const fixture = await grammarFixture(t);
    const imports = (names, from) =>
        `import { ${names.join(', ')} } from '${from}';\n`;
    const html = (markup, extra = {}) =>
        variant(fixture.adapted, { html: markup, ...extra });
    let count = 0;
    for (const element of TEMPLATE_ELEMENTS) {
        let markup;
        if (element.startsWith(':svg:')) {
            const name = element.slice(5);
            markup =
                name === 'svg'
                    ? '<svg></svg>'
                    : `<svg><${name}></${name}></svg>`;
        } else if (element === 'form')
            markup = '<form (submit)="submit()"></form>';
        else
            markup = VOID.has(element)
                ? `<${element}>`
                : `<${element}></${element}>`;
        accepted(fixture, html(markup), element);
        count++;
    }
    const VALUES = {
        type: { input: 'text', button: 'button' },
        dir: 'ltr',
        tabindex: '0',
        id: 'v1',
        href: '#v1',
        src: 'data:image/png;base64,AA==',
    };
    for (const [element, attributes] of Object.entries(ELEMENT_ATTRIBUTES))
        for (const attribute of attributes) {
            if (attribute === 'routerLink') continue;
            const value =
                typeof VALUES[attribute] === 'object'
                    ? VALUES[attribute][element]
                    : (VALUES[attribute] ?? '1');
            const name = element.startsWith(':svg:')
                ? element.slice(5)
                : element;
            const tag = VOID.has(name)
                ? `<${name} ${attribute}="${value}">`
                : `<${name} ${attribute}="${value}"></${name}>`;
            let markup = element.startsWith(':svg:')
                ? name === 'svg'
                    ? tag
                    : `<svg>${tag}</svg>`
                : tag;
            if (element === 'form')
                markup = `<form ${attribute}="${value}" (submit)="submit()"></form>`;
            if (attribute === 'href') markup += '<span id="v1"></span>';
            accepted(fixture, html(markup), `${element}[${attribute}]`);
            count++;
        }
    for (const attribute of [
        'id',
        'class',
        'role',
        'title',
        'lang',
        'dir',
        'hidden',
        'tabindex',
        'aria-label',
        'data-cmz-id',
    ]) {
        const value =
            attribute === 'data-cmz-id' ? 'ready' : (VALUES[attribute] ?? 'x');
        accepted(
            fixture,
            html(`<span ${attribute}="${value}"></span>`),
            `[${attribute}]`
        );
        count++;
    }
    const routes = fixture.workOrder.grammar.routes;
    accepted(
        fixture,
        html(`<a routerLink="${routes[0]}">x</a>`, {
            imports: imports(['RouterLink'], '@angular/router'),
            decorator: '    imports: [RouterLink],\n',
        }),
        'routerLink'
    );
    for (const property of BOUND_PROPERTIES)
        accepted(
            fixture,
            html(`<input [${property}]="announcement()">`),
            `[${property}]`
        );
    for (const attribute of ['aria-label', 'role', 'for', 'colspan', 'rowspan'])
        accepted(
            fixture,
            html(`<td [attr.${attribute}]="announcement()"></td>`),
            `[attr.${attribute}]`
        );
    accepted(
        fixture,
        html(
            '<p [class.active]="state() === \'ready\'" [class]="announcement()"></p>'
        ),
        'classes'
    );
    for (const property of STYLE_PROPERTIES)
        accepted(
            fixture,
            html(`<p [style.${property}]="announcement()"></p>`),
            `[style.${property}]`
        );
    for (const unit of ['px', '%', 'em', 'rem', 'vh', 'vw', 'ch', 'deg'])
        accepted(
            fixture,
            html(`<p [style.width.${unit}]="1"></p>`),
            `unit ${unit}`
        );
    for (const event of [
        'click',
        'dblclick',
        'input',
        'change',
        'focus',
        'blur',
        'focusin',
        'focusout',
        'mouseenter',
        'mouseleave',
        'keydown',
        'keyup',
        'keydown.enter',
        'keyup.escape',
        'keydown.shift.tab',
    ])
        accepted(
            fixture,
            html(`<button type="button" (${event})="edit('a', 'b')"></button>`),
            `(${event})`
        );
    for (const [pipe, name] of Object.entries(TEMPLATE_PIPES)) {
        const from = '@angular/common';
        const argument =
            {
                slice: ':0:1',
                date: ":'short'",
                number: ":'1.0-0'",
                currency: ":'EUR'",
                percent: '',
            }[pipe] ?? '';
        accepted(
            fixture,
            html(`<p>{{ announcement() | ${pipe}${argument} }}</p>`, {
                imports: imports([name], from),
                decorator: `    imports: [${name}],\n`,
            }),
            `| ${pipe}`
        );
    }
    const blocks = {
        '@if/@else':
            "@if (state() === 'ready') {<p>a</p>} @else if (state() === 'failed') {<p>b</p>} @else {<p>c</p>}",
        '@for track $index, @empty':
            "@for (message of fieldErrors()['identity'] ?? []; track $index; let first = $first) {<p>{{ message }} {{ first }}</p>} @empty {<p>vide</p>}",
        '@for track item':
            "@for (message of fieldErrors()['identity'] ?? []; track message) {<p>{{ message }}</p>}",
        '@for track item.n':
            "@for (message of fieldErrors()['identity'] ?? []; track message.id) {<p>{{ message }}</p>}",
        '@switch littéral': "@switch (state()) { @case ('ready') {<p>a</p>} }",
        '@let': '@let current = state();<p>{{ current }}</p>',
        'références value et checked':
            '<input #first type="checkbox" (change)="edit(\'a\', first.value)"><input #second type="checkbox" (change)="toggle(second.checked)">',
    };
    for (const [label, markup] of Object.entries(blocks)) {
        const extra = label.startsWith('références')
            ? {
                  members:
                      "    protected toggle(on: boolean): void {\n        if (on) this.outcome.set('ready');\n    }\n",
              }
            : {};
        accepted(fixture, html(markup, extra), label);
    }
    assert.ok(count > 250, `${count}`);
});

test('O-G §6.2 : corpus positif SCSS, une variante par at-rule et par fonction', async (t) => {
    const fixture = await grammarFixture(t);
    const scss = (text) => variant(fixture.adapted, { scss: text });
    const rules = {
        container: '@container (min-width: 1px) { .page { color: red; } }',
        keyframes:
            '@keyframes fade { from { opacity: 0; } to { opacity: 1; } }',
        layer: '@layer page { .page { color: red; } }',
        media: '@media (min-width: 30rem) { .page { gap: 2rem; } }',
        'starting-style': '@starting-style { .page { opacity: 0; } }',
        supports: '@supports (display: grid) { .page { display: grid; } }',
    };
    assert.deepEqual(Object.keys(rules).sort(), [...CSS_AT_RULES].sort());
    for (const [label, text] of Object.entries(rules))
        accepted(fixture, scss(`\n${text}\n`), `@${label}`);
    for (const name of CSS_FUNCTIONS) {
        const argument = name === 'var' ? '--x' : '1';
        accepted(
            fixture,
            scss(`\n.page { --v: ${name}(${argument}); }\n`),
            `${name}()`
        );
    }
    accepted(
        fixture,
        {
            ...fixture.adapted,
            [SCSS]:
                '@use "sass:math";\n' +
                fixture.adapted[SCSS] +
                '\n.page { width: math.div(10px, 2); }\n/* commentaire permis */\n',
        },
        'sass:math en tête'
    );
});

// v1 §6.3 : un contre-test anodin par famille. Chaque famille nomme les
// sondes du constat qu'elle couvre ; la violation attendue est située dans
// le texte inséré.
const FAMILIES = [
    {
        codes: ['T1'],
        names: [
            'X5-ts-ignore-erreur-de-type',
            'X5-ts-expect-error-erreur-de-type',
            'X5-ts-nocheck-erreur-de-type',
        ],
        insert: [
            TS,
            MEMBER,
            '    // une ligne de prose\n    // @ts-expect-error\n',
            false,
        ],
    },
    {
        codes: ['T8'],
        names: [
            'X5-ts-surcharge-methode-navigation',
            'X5-ts-surcharge-methode-gabarit-navigation',
            'X5-html-evenement-methode-surchargee',
        ],
        insert: [
            TS,
            '    protected edit(control: string, value: string): void {',
            '    protected edit(control: string, value: string): void;\n',
            false,
        ],
    },
    {
        codes: ['T0', 'T3'],
        names: [
            'X5-ts-surcharge-fonction-top-niveau',
            'X5-ts-surcharge-cible-href-ancre',
        ],
        insert: [TS, '\n@Component(', '\nfunction idle(): void {}\n', false],
    },
    {
        codes: ['T0', 'T13'],
        names: [
            'X5-ts-type-fonction-unknown-navigation',
            'X5-ts-ecriture-innerHTML-par-unknown',
        ],
        insert: [
            TS,
            MEMBER,
            "    private hold(value: unknown): void {\n        if (value) this.outcome.set('ready');\n    }\n",
            false,
        ],
    },
    {
        codes: ['T0', 'T13'],
        names: ['X5-ts-ecriture-action-formulaire-par-unknown'],
        insert: [
            TS,
            MEMBER,
            "    private call(next: () => void): void {\n        if (next) this.outcome.set('ready');\n    }\n",
            false,
        ],
    },
    {
        codes: ['T0', 'T9'],
        names: ['X5-ts-ecriture-src-image-par-unknown'],
        insert: [
            TS,
            "        this.outcome.set('submitting');\n",
            '        const local = 1;\n        local = 2;\n',
        ],
    },
    {
        codes: ['T5'],
        names: ['X5-ts-classe-etend-HTMLInputElement'],
        insert: [TS, 'export class PageComponent {', '', false],
        replace: [
            'export class PageComponent {',
            'export class PageComponent extends Object {',
        ],
    },
    {
        codes: ['T10'],
        names: ['X5-ts-instanceof-classe-page-structurelle'],
        insert: [TS, '        const values = this.values();\n', '', false],
        replace: [
            '        const values = this.values();\n',
            '        const values = this.values();\n        const same = values instanceof Object;\n',
        ],
    },
    {
        codes: ['T4'],
        names: ['X5-ts-routeur-destructure-navigateByUrl'],
        insert: [TS, IMPORT_END, "import { Router } from '@angular/router';\n"],
    },
    {
        codes: ['T0', 'T9'],
        names: ['X5-ts-injector-get-destructure'],
        insert: [
            TS,
            '        this.values.update((current) => ({ ...current, [control]: value }));\n',
            '        const { submitting } = ANNOUNCEMENTS;\n',
        ],
    },
    {
        codes: ['T2'],
        names: [
            'X5-ts-stockage-echappement-unicode',
            'X5-ts-lecture-cookie-echappement',
        ],
        insert: [TS, "    submitting: '',", '', false],
        replace: ["    submitting: '',", "    submitting: '\\u0073',"],
    },
    {
        codes: ['T12'],
        names: ['X5-ts-chaine-cookie-navigation'],
        insert: [
            TS,
            MEMBER,
            '    protected readonly pi = computed(() => Math.PI);\n',
            false,
        ],
    },
    {
        codes: ['T11'],
        names: [
            'X5-ts-chaine-mot-de-passe-navigation',
            'X5-ts-chaine-stockage-navigation',
        ],
        insert: [
            TS,
            MEMBER,
            '    protected readonly text = computed(() => this.values().toString());\n',
            false,
        ],
    },
    {
        codes: ['T0', 'T8'],
        names: ['X5-ts-generateur'],
        insert: [TS, '    protected edit(', '', false],
        replace: ['    protected edit(', '    protected *edit('],
    },
    {
        codes: ['H4'],
        names: [
            'X5-html-propriete-download',
            'X5-html-propriete-formTarget',
            'X5-html-propriete-hreflang',
            'X5-html-propriete-innerText',
            'X5-html-propriete-name',
            'X5-html-propriete-referrerPolicy',
            'X5-html-propriete-target',
        ],
        insert: [
            HTML,
            TEMPLATE_SLOT,
            '    <input [spellcheck]="true">\n',
            false,
        ],
    },
    {
        codes: ['H6'],
        names: ['X5-html-reference-deux-fois-dans-un-appel'],
        insert: [
            HTML,
            TEMPLATE_SLOT,
            '    <input #whole (input)="edit(\'a\', whole)">\n',
            false,
        ],
    },
    {
        codes: ['H7'],
        names: ['X5-html-evenement-this-explicite'],
        insert: [HTML, TEMPLATE_SLOT, '    <p>{{ this.state() }}</p>\n', false],
    },
    {
        codes: ['H6'],
        names: [],
        insert: [
            HTML,
            TEMPLATE_SLOT,
            '    <button type="button" (click)="edit(\'a\', $event)"></button>\n',
            false,
        ],
    },
    {
        codes: ['H7'],
        names: [
            'X5-html-expression-injecteur-champ',
            'X5-html-expression-routeur-champ',
        ],
        insert: [HTML, TEMPLATE_SLOT, '    <p>{{ composition }}</p>\n', false],
    },
    {
        codes: ['H7'],
        names: ['X5-html-let-chaine-appel'],
        insert: [
            HTML,
            TEMPLATE_SLOT,
            '    @let named = state;<p>{{ named() }}</p>\n',
            false,
        ],
    },
    {
        codes: ['H3'],
        names: ['X5-html-ngModel-sans-import'],
        insert: [HTML, TEMPLATE_SLOT, '    <input ngModel>\n', false],
    },
    {
        codes: ['H0'],
        names: [
            'X5-html-ngTemplateOutlet-sans-import',
            'X5-html-ngComponentOutlet-sans-import',
        ],
        insert: [
            HTML,
            TEMPLATE_SLOT,
            '    <ng-template></ng-template>\n',
            false,
        ],
    },
    {
        codes: ['T6'],
        names: [
            'X5-meta-templateUrl-double-ignore',
            'X5-meta-providers-double-ignore',
        ],
        insert: [TS, "    templateUrl: './page.component.html',\n", '', false],
        replace: [
            "    templateUrl: './page.component.html',\n",
            "    templateUrl: './page.component.html',\n    selector: 'app-page-a73b5db1',\n",
        ],
    },
    {
        codes: ['T6'],
        names: [
            'X5-meta-hote-double-ignore-clic-fenetre',
            'X5-meta-hote-double-ignore-navigation',
            'X5-meta-hote-double-nocheck-navigation',
        ],
        insert: [
            TS,
            "        class: 'page-host',",
            "\n        class: 'page-host',",
        ],
    },
    {
        codes: ['T6'],
        names: ['X5-meta-interpolation-ignore'],
        insert: [
            TS,
            DECORATOR_END,
            "    interpolation: ['{{', '}}'],\n",
            false,
        ],
    },
    {
        codes: ['C3'],
        names: [
            'X5-scss-batterie-url',
            'X5-scss-clip-path-url',
            'X5-scss-content-url',
            'X5-scss-cursor-url',
            'X5-scss-offset-path',
            'X5-scss-shape-outside',
        ],
        insert: [SCSS, '.page {', '\n    fill: url(#gradient);', true],
    },
    {
        codes: ['C3'],
        names: [
            'X5-scss-image-set',
            'X5-scss-image-set-url',
            'X5-scss-src-fonction',
        ],
        insert: [SCSS, '.page {', '\n    color: contrast-color(red);'],
    },
    {
        codes: ['C2'],
        names: ['X5-scss-font-face'],
        insert: [SCSS, '.page {', '@font-face { font-family: page; }\n', false],
    },
    {
        codes: ['C1', 'C2'],
        names: ['X5-scss-batterie-import', 'X5-scss-import-chaine'],
        insert: [SCSS, '.page {', '@import "page.component.css";\n', false],
    },
    {
        codes: ['C1'],
        names: [
            'X5-scss-import-fichier-hors-page',
            'X5-scss-use-fichier-produit',
        ],
        prepend: [SCSS, '@use "page-partial";\n'],
    },
];

test('O-G §6.3 : un contre-test anodin par famille du constat, refusé par la grammaire dans le texte inséré', async (t) => {
    const fixture = await grammarFixture(t);
    const covered = new Set();
    for (const family of FAMILIES) {
        let files;
        let interval;
        if (family.prepend) {
            const [file, text] = family.prepend;
            files = {
                ...fixture.adapted,
                [file]: text + fixture.adapted[file],
            };
            interval = { file, start: 0, end: text.length };
        } else if (family.replace) {
            const [from, to] = family.replace;
            const file = family.insert[0];
            const source = fixture.adapted[file];
            assert.equal(source.split(from).length, 2, from);
            const start = source.indexOf(from);
            files = { ...fixture.adapted, [file]: source.replace(from, to) };
            interval = { file, start, end: start + to.length };
        } else {
            const [file, anchor, text, after = true] = family.insert;
            ({ files, interval } = insertAt(
                fixture.adapted,
                file,
                anchor,
                text,
                { after }
            ));
        }
        const found = fixture.findings(files);
        const inside = found.filter((entry) => insideInterval(entry, interval));
        assert.ok(
            inside.some((entry) => family.codes.includes(entry.code)),
            `${family.names.join(', ') || family.codes.join('/')} : ${found.map((entry) => `${entry.code} ${entry.message}`).join(' | ')}`
        );
        for (const name of family.names) covered.add(name);
    }
    assert.equal(covered.size, 57);
});

test('O-S §3.2 : la méthode de soumission n’admet que des formes sans levée', async (t) => {
    const fixture = await grammarFixture(t);
    const submit = (body) =>
        fixture.adapted[TS].replace(
            / {4}protected submit\(\): false \{[\s\S]*?\n {4}\}\n\}\n$/,
            `    protected submit(): false {\n${body}\n    }\n}\n`
        );
    const accepted = [
        '        return false;',
        "        if (this.state() !== 'ready') {\n            return false;\n        }\n        const values = this.values();\n        this.outcome.set(values?.['identity'] ? 'ready' : 'failed');\n        this.values.update((current) => ({ ...current, mode: '' }));\n        return false;",
        "        this.composition.enter.submit({ identity: this.values()?.identity ?? '', passphrase: '' }).subscribe({ error: () => this.outcome.set('failed') });\n        return false;",
    ];
    for (const body of accepted)
        assert.deepEqual(
            fixture.violations({ ...fixture.adapted, [TS]: submit(body) }),
            [],
            body
        );
    const refused = {
        'accès non optionnel':
            "        const values = this.values();\n        this.outcome.set(values['identity'] ? 'ready' : 'failed');\n        return false;",
        arithmétique:
            "        const total = this.values()?.['n'] + 1;\n        return false;",
        'comparaison d’ordre':
            "        if (this.values()?.['n'] < 1) {\n            return false;\n        }\n        return false;",
        'décomposition de tableau':
            '        const list = [...[1]];\n        return false;',
        'appel de méthode de la page':
            "        this.edit('a', 'b');\n        return false;",
        'retour final absent': "        this.outcome.set('ready');",
        else: "        if (this.state() === 'ready') {\n            return false;\n        } else {\n            return false;\n        }\n        return false;",
        'computed non sûr':
            '        if (this.size() === 0) {\n            return false;\n        }\n        return false;',
    };
    for (const [label, body] of Object.entries(refused)) {
        const text = submit(body).replace(
            MEMBER,
            '    protected readonly size = computed(() => this.state().length + 0);\n' +
                MEMBER
        );
        const found = fixture.findings({ ...fixture.adapted, [TS]: text });
        assert.ok(
            found.some((entry) => ['S1', 'S2'].includes(entry.code)),
            `${label} : ${found.map((entry) => entry.code).join(',')}`
        );
    }
});

test('R-B §5 : routerLink, littéral statique d’une route déclarée, sur a seulement', async (t) => {
    const fixture = await grammarFixture(t);
    const [route] = fixture.workOrder.grammar.routes;
    const html = (markup) =>
        variant(fixture.adapted, {
            html: markup,
            imports: "import { RouterLink } from '@angular/router';\n",
            decorator: '    imports: [RouterLink],\n',
        });
    accepted(fixture, html(`<a routerLink="${route}">x</a>`), route);
    for (const [label, markup, code] of [
        ['route non déclarée', '<a routerLink="/ailleurs">x</a>', 'H3'],
        ['protocole relatif', '<a routerLink="//exemple.invalid">x</a>', 'H3'],
        ['remontée', `<a routerLink="${route}/../x">x</a>`, 'H3'],
        ['liaison', `<a [routerLink]="'${route}'">x</a>`, 'H4'],
        [
            'autre élément',
            `<button type="button" routerLink="${route}">x</button>`,
            'H3',
        ],
    ]) {
        const found = fixture.findings(html(markup));
        assert.ok(
            found.some((entry) => entry.code === code),
            `${label} : ${found.map((entry) => entry.code).join(',')}`
        );
    }
});
