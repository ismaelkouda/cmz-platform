// X4-sécurité 2 : monde fermé par symbole résolu (TypeScript de la page) et
// langage d'expression réduit (gabarit). Une entrée de liste, un cas ; un
// symbole hors liste est refusé par défaut ; la page de référence passe.
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';

import { REVIEWED_VERSIONS } from './core/external-page-realization-program.mjs';
import { FORBIDDEN_PATTERNS } from './core/external-page-realization-rules.mjs';
import {
    DENIED_PROPERTIES,
    FORBIDDEN_ELEMENTS,
    RESOURCE_ATTRIBUTES,
    TEMPLATE_PIPES,
} from './core/external-page-realization-structure.mjs';
import {
    ANGULAR_REFUSED,
    ANGULAR_SYMBOLS,
    DOM_GLOBALS,
    DOM_MEMBERS,
    ES_EXCLUDED,
    ES_GLOBALS,
    ES_INTERFACES,
} from './core/external-page-realization-symbols.mjs';
import {
    EXTERNAL_CSP_HEADER,
    EXTERNAL_CSP_META,
    renderCspHeaderTemplate,
} from './renderers/external-content-security-policy.mjs';
import {
    composedProduct,
    realizationChecker,
} from './test-support/external-realization-product.mjs';
import {
    ANGULAR_REFUSED_SOURCES,
    ANGULAR_SAMPLES,
    ES_EXCLUDED_SAMPLES,
    ES_SAMPLES,
    PINNED,
    REFERENCE_USES,
} from './test-support/external-realization-symbol-samples.mjs';

const TS = 'page.component.ts';
const HTML = 'page.component.html';
const SUBMIT = '    protected submit(event: Event): void {';

const symbol = (kind, key) => `symbol not allowed in ${TS}: ${kind} ${key}`;

test('X4-sécurité 2 : monde fermé par symbole résolu, une entrée de liste par cas', async (t) => {
    const product = await composedProduct(t, 'observatory');
    const { good, violationsOf } = await realizationChecker(product);
    const append = (text) => ({ ...good, [TS]: good[TS] + text });
    const prepend = (text) => ({ ...good, [TS]: text + good[TS] });
    const sample = (imports, expression) => ({
        ...good,
        [TS]: imports + good[TS] + `\nexport const probe = ${expression};\n`,
    });
    // Page de référence de X4, inchangée hors de l'assertion de type
    // devenue interdite (I-1 du modèle) : aucune violation.
    assert.deepEqual(violationsOf(good), []);
    assert.equal(/ as (?!const)/.test(good[TS]), false);

    for (const name of ES_GLOBALS)
        assert.deepEqual(
            violationsOf(append(`\nexport const probe = ${name};\n`)),
            [],
            `global ES ${name}`
        );
    assert.deepEqual(Object.keys(ES_SAMPLES).sort(), [...ES_INTERFACES].sort());
    for (const [entry, expression] of Object.entries(ES_SAMPLES))
        assert.deepEqual(
            violationsOf(sample('', expression)),
            [],
            `interface ES ${entry}`
        );
    assert.deepEqual(
        Object.keys(ES_EXCLUDED_SAMPLES).sort(),
        [...ES_EXCLUDED].sort()
    );
    for (const [entry, [expression, key]] of Object.entries(
        ES_EXCLUDED_SAMPLES
    ))
        assert.ok(
            violationsOf(sample('', expression)).includes(
                symbol('es', key ?? entry)
            ),
            `exclu ES ${entry}`
        );
    // Lib DOM : la page de référence utilise les globaux et quatre membres ;
    // le cinquième a son exemple. Tout autre membre est refusé.
    assert.deepEqual(
        [...DOM_GLOBALS, ...DOM_MEMBERS].filter(
            (entry) =>
                entry !== 'KeyboardEvent.key' &&
                !good[TS].includes(entry.split('.').pop())
        ),
        []
    );
    assert.deepEqual(
        violationsOf(
            append(
                '\nexport function key(event: KeyboardEvent): string {\n    return event.key;\n}\n'
            )
        ),
        []
    );
    // Chaque entrée Angular a son exemple, ou la page de référence l'utilise.
    assert.deepEqual(
        Object.entries(ANGULAR_SYMBOLS)
            .flatMap(([pkg, names]) => names.map((name) => `${pkg}:${name}`))
            .sort(),
        [
            ...Object.entries(ANGULAR_SAMPLES).flatMap(([pkg, samples]) =>
                Object.keys(samples).map((name) => `${pkg}:${name}`)
            ),
            ...[...REFERENCE_USES].map((name) => `@angular/core:${name}`),
        ].sort()
    );
    for (const [pkg, samples] of Object.entries(ANGULAR_SAMPLES))
        for (const [name, [imports, expression]] of Object.entries(samples)) {
            assert.deepEqual(
                violationsOf(sample(imports, expression)),
                [],
                `Angular ${pkg}:${name}`
            );
        }
    for (const name of ANGULAR_REFUSED) {
        const violations = violationsOf(
            prepend(
                `import { ${name} } from '${ANGULAR_REFUSED_SOURCES[name]}';\nvoid ${name};\n`
            )
        );
        assert.ok(
            violations.some((violation) =>
                new RegExp(`[: ]${name}\\b`).test(violation)
            ),
            `Angular refusé ${name} : ${violations.join(' | ')}`
        );
    }

    // Monde fermé : un membre DOM, Angular ou Node hors liste est refusé.
    assert.deepEqual(
        violationsOf(
            append(
                '\nexport function stop(event: Event): void {\n    event.stopPropagation();\n}\n'
            )
        ),
        [symbol('dom', 'Event.stopPropagation')]
    );
    assert.deepEqual(
        violationsOf(
            sample(
                "import { NgZone } from '@angular/core';\n",
                '() => inject(NgZone)'
            )
        ),
        [
            symbol('angular', '@angular/core:NgZone'),
            `inject forbidden in ${TS}: only composition tokens, Injector, ChangeDetectorRef, DestroyRef and Router`,
        ]
    );
    const node = violationsOf(
        prepend(
            '/// <reference types="node" />\nexport const probe = process.platform;\n'
        )
    );
    // Avec les types de Node, `Event` est aussi déclaré hors de la lib DOM :
    // le paramètre de la méthode n'est plus un type DOM.
    for (const expected of [
        `triple-slash reference forbidden in ${TS}`,
        symbol('other', 'process'),
        symbol('other', 'global.NodeJS.Process.platform'),
        `component method must type its $event or reference parameter with a DOM type in ${TS}: submit`,
    ])
        assert.ok(node.includes(expected), `${expected} : ${node.join(' | ')}`);
    assert.deepEqual(
        violationsOf(prepend('/// <reference lib="esnext" />\n')),
        [`triple-slash reference forbidden in ${TS}`]
    );
    // Globaux ES hors liste.
    for (const name of ['Function', 'Proxy', 'Reflect'])
        assert.deepEqual(
            violationsOf(append(`\nexport const probe = ${name};\n`)),
            [symbol('es', name)],
            name
        );
    // Symbole non résolu, et `globalThis.fetch` résolu puis refusé.
    assert.ok(
        violationsOf(append('\nexport const probe = notDeclared;\n')).includes(
            `unresolved symbol in ${TS}: notDeclared`
        )
    );
    assert.deepEqual(
        violationsOf(append('\nexport const probe = globalThis.fetch;\n')),
        [symbol('dom', 'fetch'), `unresolved symbol in ${TS}: globalThis`]
    );

    // Règles d'usage d'Angular.
    assert.deepEqual(
        violationsOf(
            edit(good, (text) =>
                text.replace(
                    'this.injector.get(PageComposition)',
                    'this.injector.get(Injector).get(PageComposition)'
                )
            )
        ),
        [`injector lookup forbidden in ${TS}: only composition tokens`]
    );
    assert.deepEqual(
        violationsOf(
            sample(
                "import { Router } from '@angular/router';\n",
                "() => inject(Router).navigateByUrl('//exemple.invalid/')"
            )
        ),
        [`router navigation must use one literal application path in ${TS}`]
    );

    // Refusés par construction.
    const refused = {
        'déclaration ambiante': [
            "\ndeclare const location: { assign(url: string): void };\nexport const probe = () => location.assign('/x');\n",
            `ambient declaration (declare) forbidden in ${TS}`,
        ],
        'declare global': [
            '\ndeclare global {\n    interface Window {\n        probe: string;\n    }\n}\n',
            `ambient declaration (declare) forbidden in ${TS}`,
        ],
        'assertion as': [
            '\nexport const probe = (1 as unknown) as number;\n',
            `type assertion forbidden in ${TS} (only as const)`,
        ],
        'assertion <T>': [
            '\nexport const probe = <number>(<unknown>1);\n',
            `type assertion forbidden in ${TS} (only as const)`,
        ],
        'prédicat de type': [
            "\nexport function probe(value: unknown): value is string {\n    return typeof value === 'string';\n}\n",
            `type predicate forbidden in ${TS}`,
        ],
        'signature asserts': [
            "\nexport function probe(value: unknown): asserts value {\n    if (!value) throw new Error('x');\n}\n",
            `type predicate forbidden in ${TS}`,
        ],
        any: [
            "\nexport const probe = JSON.parse('1');\n",
            `expression of type any forbidden in ${TS}`,
        ],
        'clé sans type littéral': [
            '\nconst TABLE: Record<string, number> = { a: 1 };\nexport const probe = (k: string) => TABLE[k];\n',
            `computed key without a literal type forbidden in ${TS}`,
        ],
        'clé calculée en déstructuration': [
            '\nexport function probe(key: string): unknown {\n    const { [key]: value } = { a: 1 };\n    return value;\n}\n',
            `computed key without a literal type forbidden in ${TS}`,
        ],
        'déstructuration en affectation': [
            '\nlet slot = 0;\nexport const probe = () => ({ a: slot } = { a: 1 });\n',
            `destructuring assignment forbidden in ${TS}`,
        ],
        'prototype par littéral': [
            '\nexport const probe = { __proto__: null };\n',
            `prototype assignment forbidden in ${TS}`,
        ],
        'chaîne par join': [
            "\nexport const probe = ['/a', 'b'].join('');\n",
            `string assembled from literals forbidden in ${TS}`,
        ],
        'chaîne par concat': [
            "\nexport const probe = '/a'.concat('b');\n",
            `string assembled from literals forbidden in ${TS}`,
        ],
        'chaîne par gabarit de constante': [
            "\nconst A = '/a';\nexport const probe = `${A}b`;\n",
            `string assembled from literals forbidden in ${TS}`,
        ],
        'chaîne par +': [
            "\nexport const probe = '/a' + 'b';\n",
            `string assembled from literals forbidden in ${TS}`,
        ],
    };
    for (const [label, [text, expected]] of Object.entries(refused)) {
        const violations = violationsOf(append(text));
        assert.ok(
            violations.includes(expected),
            `${label} : ${violations.join(' | ')}`
        );
    }
    // Une page qui ne type pas est refusée, même sans autre violation.
    assert.deepEqual(
        violationsOf(append("\nexport const probe: number = 'x';\n")),
        [
            `page does not type-check in ${TS}: TS2322 Type 'string' is not assignable to type 'number'.`,
        ]
    );
    assert.deepEqual(
        violationsOf(append("\nexport const probe = ['a', 'b'] as const;\n")),
        [],
        'as const'
    );
    assert.deepEqual(
        violationsOf(
            append("\nexport const probe = ANNOUNCEMENTS['submitting'];\n")
        ),
        [],
        'clé littérale'
    );

    // Un objet du DOM ne change pas de type : il n'est lu que par un membre
    // listé, comparé, ou passé entier à une méthode au paramètre typé DOM.
    const host = `host object used outside a listed member access in ${TS}`;
    const flows = {
        'vers Angular': [
            '\nexport const probe = (event: Event) => signal(event);\n',
            host,
        ],
        'vers un objet de la page': [
            '\nexport function probe(event: Event, box: { last: unknown }): void {\n    box.last = event;\n}\n',
            host,
        ],
        retourné: [
            '\nexport function probe(event: Event): EventTarget | null {\n    return event.target;\n}\n',
            host,
        ],
        'par une fonction générique': [
            '\nconst same = <T,>(value: T): T => value;\nexport const probe = (event: Event) => same(event.target);\n',
            host,
        ],
        'par une annotation structurelle': [
            '\nexport function probe(event: Event): void {\n    const target: { value?: string } | null = event.target;\n    void target;\n}\n',
            host,
        ],
        'par in': [
            "\nexport function probe(event: Event): void {\n    const target = event.target;\n    if (target !== null && 'href' in target) target.href = '/x';\n}\n",
            `unresolved symbol in ${TS}: href`,
        ],
    };
    for (const [label, [text, expected]] of Object.entries(flows)) {
        const violations = violationsOf(append(text));
        assert.ok(
            violations.includes(expected),
            `${label} : ${violations.join(' | ')}`
        );
    }
    // Référence passée par le gabarit : paramètre typé DOM, membres listés.
    const link = (parameter) => ({
        ...good,
        [TS]: good[TS].replace(
            SUBMIT,
            `    protected go(link: ${parameter}): void {\n        link.href = '/x';\n    }\n\n${SUBMIT}`
        ),
        [HTML]:
            good[HTML] +
            '<a #lien>x</a><button type="button" (click)="go(lien)">x</button>\n',
    });
    assert.deepEqual(violationsOf(link('{ href: string }')), [
        `component method must type its $event or reference parameter with a DOM type in ${TS}: go`,
    ]);
    assert.deepEqual(violationsOf(link('HTMLAnchorElement')), [
        symbol('dom', 'HTMLHyperlinkElementUtils.href'),
    ]);
});

test('X4-sécurité 2 : gabarit réduit, une entrée de liste par cas, politique épinglée', async (t) => {
    const product = await composedProduct(t, 'equipment-hire');
    const { good, violationsOf } = await realizationChecker(product);
    const html = (text) => ({ ...good, [HTML]: good[HTML] + text });
    // Une seule violation, celle de l'entrée ; un motif lexical qui nomme le
    // même mot la précède (défense en profondeur).
    const one = (files, expected, label) =>
        assert.deepEqual(
            violationsOf(files),
            [
                ...FORBIDDEN_PATTERNS.filter(([, pattern]) =>
                    pattern.test(files[HTML])
                ).map(
                    ([kind, pattern]) =>
                        `${kind} forbidden in ${HTML}: ${pattern}`
                ),
                expected,
            ],
            label
        );
    for (const name of DENIED_PROPERTIES)
        one(
            html(`<p>{{ values().${name} }}</p>\n`),
            `property access forbidden in ${HTML}: ${name}`,
            `propriété ${name}`
        );
    one(
        html('<p>{{ values().bypassSecurityTrustHtml }}</p>\n'),
        `property access forbidden in ${HTML}: bypassSecurityTrustHtml`
    );
    const VOID = new Set(['base', 'embed', 'link', 'meta']);
    for (const name of FORBIDDEN_ELEMENTS)
        one(
            html(VOID.has(name) ? `<${name}>\n` : `<${name}></${name}>\n`),
            `element forbidden in ${HTML}: <${name}>`,
            `élément ${name}`
        );
    for (const name of RESOURCE_ATTRIBUTES)
        one(
            html(`<span ${name}="x"></span>\n`),
            `resource attribute forbidden in ${HTML}: ${name}`,
            `attribut ${name}`
        );
    for (const name of TEMPLATE_PIPES)
        assert.deepEqual(
            violationsOf(html(`<p>{{ announcement() | ${name} }}</p>\n`)),
            [],
            `pipe ${name}`
        );
    one(
        html('<p>{{ announcement() | json }}</p>\n'),
        `pipe not allowed in ${HTML}: json`
    );
    // Attribut à espace de noms : jugé par son nom local.
    one(
        html('<svg><use xlink:href="//exemple.invalid/s.svg#a"></use></svg>\n'),
        `resource attribute forbidden in ${HTML}: :xlink:href`
    );
    assert.deepEqual(
        violationsOf(html('<svg><use xlink:href="#a"></use></svg>\n')),
        []
    );
    // `$event` et `#ref` entiers, en argument d'une méthode du composant.
    const opaque = {
        '$event.target':
            '<button type="button" (click)="submit($event.target)">x</button>\n',
        '$event[...]':
            '<button type="button" (click)="submit($event[\'view\'])">x</button>\n',
        'ref.value': '<input #champ><p>{{ champ.value }}</p>\n',
        'alias @let': '<input #champ>\n@let alias = champ;\n',
        'hors méthode du composant':
            '<button type="button" (click)="online.set($event)">x</button>\n',
    };
    for (const [label, text] of Object.entries(opaque)) {
        const violations = violationsOf(html(text));
        assert.ok(
            violations.some((violation) =>
                / must be passed whole to a component method in page\.component\.html$/.test(
                    violation
                )
            ),
            `${label} : ${violations.join(' | ')}`
        );
    }
    assert.deepEqual(
        violationsOf(
            html(
                '<button type="button" (click)="submit($any($event))">x</button>\n'
            )
        ),
        [
            `type assertion $any forbidden in ${HTML}`,
            `$event must be passed whole to a component method in ${HTML}`,
        ]
    );
    // Garde des métadonnées de @Component : une seule violation chacune.
    const anchor = '    providers: [...PAGE_COMPOSITION_PROVIDERS],';
    for (const text of [
        "\n    ...{ host: { '[attr.href]': \"'//exemple.invalid/'\" } },",
        '\n    ...{ imports: [] },',
    ])
        one(
            { ...good, [TS]: good[TS].replace(anchor, anchor + text) },
            '@Component metadata must use plain named properties'
        );
    // Politique de la coque, chaîne exacte.
    assert.equal(
        EXTERNAL_CSP_META,
        "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; worker-src 'self'; manifest-src 'self'; frame-src 'none'; object-src 'none'; form-action 'self'; base-uri 'self'; require-trusted-types-for 'script'; trusted-types angular angular#bundler cmz-sw"
    );
    assert.equal(
        EXTERNAL_CSP_HEADER,
        `${EXTERNAL_CSP_META}; frame-ancestors 'none'`
    );
    assert.match(
        renderCspHeaderTemplate(),
        /^add_header Cross-Origin-Opener-Policy "same-origin" always;$/m
    );
});

test('X4-sécurité 2 : listes publiées épinglées', () => {
    assert.deepEqual(
        {
            DENIED_PROPERTIES,
            FORBIDDEN_ELEMENTS,
            RESOURCE_ATTRIBUTES,
            TEMPLATE_PIPES,
            ES_GLOBALS,
            DOM_GLOBALS,
            DOM_MEMBERS,
            ANGULAR_REFUSED,
        },
        PINNED
    );
});

test('X4-sécurité 2 : listes revues contre des versions précises', async (t) => {
    const product = await composedProduct(t, 'observatory');
    const { good, violationsOf } = await realizationChecker(product);
    const path = join(product.root, 'node_modules', 'rxjs', 'package.json');
    const original = await readFile(path, 'utf8');
    await writeFile(
        path,
        original.replace(
            `"version": "${REVIEWED_VERSIONS.rxjs}"`,
            '"version": "7.8.1"'
        )
    );
    assert.deepEqual(violationsOf(good), [
        `type environment differs from the reviewed versions: rxjs 7.8.1 (reviewed ${REVIEWED_VERSIONS.rxjs})`,
    ]);
    await writeFile(path, original);
    assert.deepEqual(violationsOf(good), []);
});

function edit(files, change) {
    return { ...files, [TS]: change(files[TS]) };
}
