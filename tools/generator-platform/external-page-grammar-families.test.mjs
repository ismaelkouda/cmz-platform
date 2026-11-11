// X4-sécurité-3, O-G (conception v1 §6.3) : un contre-test anodin par
// famille du constat de X4-sécurité-2 (57 formes nommées). Chaque mutation est
// une variante inoffensive de la page adaptée : la grammaire seule la refuse
// (ni monde fermé par symbole, ni diagnostic du vérificateur), par une
// violation située dans le texte inséré.
import assert from 'node:assert/strict';
import test from 'node:test';

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
