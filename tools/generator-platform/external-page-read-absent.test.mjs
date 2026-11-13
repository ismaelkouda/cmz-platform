// X5 C5b : texte d'absence (A1 à A4) et positions permises (revue de Fable
// sur la v2, décisions du pilote, relecture de D contre la v3). Chaque refus
// est nommé par son code ; la page de référence est le témoin accepté.
import assert from 'node:assert/strict';
import test from 'node:test';

import {
    CELL,
    EMPTY,
    ERROR,
    H,
    LI,
    T,
    readGrammarFixture,
    refused,
    swap,
} from './test-support/read-page-grammar-fixture.mjs';

test('C5b A1 à A4 : texte d’absence par son seul puits, jamais recopié ni masqué ; vide n’est pas absent', async (t) => {
    const fixture = await readGrammarFixture(t);
    const ref = fixture.reference;
    refused(
        fixture,
        swap(
            ref,
            T,
            'this.composition.absentText.catalogueRows',
            "this.composition.absentText.catalogueRows ?? 'x'"
        ),
        'A1',
        /PAGE_ABSENT_ACCESS/,
        'A1 corps'
    );
    // A2 : F1 avec pipe et F2 acceptés.
    const piped = swap(
        swap(
            swap(
                ref,
                H,
                CELL,
                '{{ (row.label | uppercase) ?? catalogueRowsAbsent() }}'
            ),
            T,
            "import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';",
            "import { UpperCasePipe } from '@angular/common';\nimport { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';"
        ),
        T,
        '    providers: [...PAGE_COMPOSITION_PROVIDERS],',
        '    imports: [UpperCasePipe],\n    providers: [...PAGE_COMPOSITION_PROVIDERS],'
    );
    assert.deepEqual(fixture.violations(piped), [], 'F1 avec pipe');
    const F2 =
        '<li>{{ row.id }} @if (row.label === null || row.label === undefined) { {{ catalogueRowsAbsent() }} } @else { {{ row.label }} }</li>';
    assert.deepEqual(fixture.violations(swap(ref, H, LI, F2)), [], 'F2');
    for (const [label, text] of [
        ['lecture nue', '<li>{{ row.label }}</li>'],
        [
            'vide traité comme absent',
            "<li>@if (row.label === null || row.label === undefined || row.label === '') { {{ catalogueRowsAbsent() }} } @else { {{ row.label }} }</li>",
        ],
        [
            '@let',
            '<li>@let l = row.label; {{ l ?? catalogueRowsAbsent() }}</li>',
        ],
        [
            'F2 sans puits',
            '<li>@if (row.label === null || row.label === undefined) { - } @else { {{ row.label }} }</li>',
        ],
    ])
        refused(
            fixture,
            swap(ref, H, LI, text),
            'A2',
            /PAGE_ABSENT_FIELD_UNGUARDED/,
            label
        );
    refused(
        fixture,
        swap(ref, H, ERROR, '<p class="state">{{ catalogueRowsAbsent() }}</p>'),
        'A2',
        /PAGE_ABSENT_SINK/,
        'puits hors champ'
    );
    refused(
        fixture,
        swap(ref, H, '<li>', '<li [title]="catalogueRowsAbsent()">'),
        'A2',
        /PAGE_ABSENT_SINK/,
        'puits en attribut'
    );
    refused(
        fixture,
        swap(
            ref,
            H,
            '<li>',
            '<li [title]="row.label ?? catalogueRowsAbsent()">'
        ),
        'A2',
        /PAGE_ABSENT_SINK/,
        'F1 en attribut'
    );
    for (const [label, text] of [
        ['texte', '<p class="state">Non renseigné</p>'],
        ['entité', '<p class="state">Non renseign&eacute;</p>'],
        ['attribut', '<p class="state" title="Non renseigné">No item.</p>'],
        ['littéral', '<p class="state">{{ \'Non renseigné\' }}</p>'],
    ])
        refused(
            fixture,
            swap(ref, H, EMPTY, text),
            'A3',
            /PAGE_ABSENT_TEXT_COPY/,
            label
        );
    for (const attribute of [
        'i18n',
        'hidden',
        'aria-hidden="true"',
        '[hidden]="false"',
        '[attr.hidden]="null"',
        '[attr.aria-hidden]="null"',
        '[style.display]="\'block\'"',
        '[style.visibility]="\'visible\'"',
        '[style.opacity]="\'1\'"',
    ])
        refused(
            fixture,
            swap(ref, H, '<li>', `<li ${attribute}>`),
            'A4',
            /PAGE_ABSENT_HIDDEN/,
            attribute
        );
});

// Revue de Fable sur la note v2 (décisions du pilote) : styles, accès d'une
// ligne, positions permises, imbrication, élément contenant.
test('C5b B-C5b-1 à 3, D-C5b-1 et 2 : positions permises seulement', async (t) => {
    const fixture = await readGrammarFixture(t);
    const ref = fixture.reference;
    const SUCCESS_LIST =
        '<ul data-cmz-id="catalogue-list" aria-label="Catalogue">';
    // B-C5b-1 : toute liaison de style, et [attr.style], masque.
    for (const attribute of [
        '[style.color]="\'red\'"',
        '[style.maxHeight]="\'0\'"',
        '[style.fontSize]="\'0\'"',
        '[attr.style]="null"',
    ]) {
        refused(
            fixture,
            swap(ref, H, '<li>', `<li ${attribute}>`),
            'A4',
            /PAGE_ABSENT_HIDDEN/,
            attribute
        );
        refused(
            fixture,
            swap(
                ref,
                H,
                '<main data-cmz-id="main"',
                `<main ${attribute} data-cmz-id="main"`
            ),
            'LE2',
            /PAGE_READ_STATE_BRANCH_HIDDEN/,
            `branches ${attribute}`
        );
    }
    // D-C5b-2 : l'élément qui contient directement le puits compte.
    refused(
        fixture,
        swap(ref, H, CELL, `<span [hidden]="false">${CELL}</span>`),
        'A4',
        /PAGE_ABSENT_HIDDEN/,
        'élément contenant'
    );
    // B-C5b-2 : `row?.f` canonisé (A2 s'applique, F1 accepté) ; indexé et
    // ligne entière refusés.
    assert.deepEqual(
        fixture.violations(
            swap(ref, H, CELL, '{{ row?.label ?? catalogueRowsAbsent() }}')
        ),
        [],
        'row?.label en F1'
    );
    refused(
        fixture,
        swap(ref, H, LI, '<li>{{ row?.label }}</li>'),
        'A2',
        /PAGE_ABSENT_FIELD_UNGUARDED/,
        'row?.label nu'
    );
    for (const [label, text] of [
        [
            "row['label']",
            "<li>{{ row['label'] ?? catalogueRowsAbsent() }}</li>",
        ],
        [
            "row?.['label']",
            "<li>{{ row?.['label'] ?? catalogueRowsAbsent() }}</li>",
        ],
        ['ligne entière', '<li>{{ row }}</li>'],
    ])
        refused(
            fixture,
            swap(ref, H, LI, text),
            'LE5',
            /PAGE_READ_ROW_ACCESS/,
            label
        );
    // B-C5b-3 : alias @let d'un point d'accès, d'une ligne ou d'un champ.
    for (const [label, text, code, message] of [
        [
            '@let ligne',
            '<li>@let r = row; {{ row.id }}</li>',
            'LE5',
            /PAGE_READ_LET_ALIAS/,
        ],
        [
            '@let champ',
            '<li>@let id = row.id; {{ id }}</li>',
            'LE5',
            /PAGE_READ_LET_ALIAS/,
        ],
        [
            '@let lignes',
            '<li>@let rows = catalogueItems(); {{ row.id }}</li>',
            'LE5',
            /PAGE_READ_ROWS_OUTSIDE_SUCCESS/,
        ],
        [
            '@let état',
            '<li>@let s = catalogueState(); {{ row.id }}</li>',
            'LE4',
            /PAGE_READ_STATE_OUTSIDE_GUARD/,
        ],
        [
            '@let online',
            '<li>@let o = online(); {{ row.id }}</li>',
            'LE6',
            /PAGE_READ_OFFLINE_BRANCH/,
        ],
        [
            '@let puits',
            '<li>@let a = catalogueRowsAbsent(); {{ row.id }}</li>',
            'A2',
            /PAGE_ABSENT_SINK/,
        ],
    ])
        refused(fixture, swap(ref, H, LI, text), code, message, label);
    // Lignes : seulement l'itérable du @for gouverné par === 'success'.
    for (const [label, files] of [
        [
            'interpolation',
            swap(ref, H, SUCCESS_LIST, `${SUCCESS_LIST}{{ catalogueItems() }}`),
        ],
        [
            'liaison',
            swap(
                ref,
                H,
                SUCCESS_LIST,
                '<ul data-cmz-id="catalogue-list" aria-label="Catalogue" [title]="catalogueItems()">'
            ),
        ],
        [
            '@for sous une garde plus proche',
            swap(
                swap(
                    ref,
                    H,
                    '                    @for (row of catalogueItems(); track $index) {',
                    '                    @if (catalogueItems().length) {\n                    @for (row of catalogueItems(); track $index) {'
                ),
                H,
                '                    }\n                </ul>',
                '                    }\n                    }\n                </ul>'
            ),
        ],
    ])
        refused(fixture, files, 'LE5', /PAGE_READ_ROWS_OUTSIDE_SUCCESS/, label);
    // D-C5b-1 : second aiguillage imbriqué (doublon) ou voisin (doublon ou
    // code mort) ; branche décorative vide.
    refused(
        fixture,
        swap(
            ref,
            H,
            SUCCESS_LIST,
            `@if (catalogueState() === 'success') {\n<p>x</p>\n}\n${SUCCESS_LIST}`
        ),
        'LE2',
        /PAGE_READ_STATE_BRANCH_DUPLICATE: a second/,
        'aiguillage imbriqué'
    );
    refused(
        fixture,
        swap(
            ref,
            H,
            '\n</main>',
            "\n@switch (catalogueState()) {\n@case ('idle') {\n<p>x</p>\n}\n}\n</main>"
        ),
        'LE2',
        /PAGE_READ_STATE_BRANCH_DUPLICATE: a second/,
        'aiguillage voisin'
    );
    refused(
        fixture,
        swap(
            ref,
            H,
            '<p class="state">Waiting.</p>',
            '<span class="state"></span>'
        ),
        'LE2',
        /PAGE_READ_STATE_BRANCH_EMPTY/,
        'branche décorative'
    );
    // Masquage qui n'enveloppe QUE l'aiguillage (pas la branche hors ligne).
    refused(
        fixture,
        swap(
            swap(
                ref,
                H,
                '        @switch (catalogueState()) {',
                '        <div [hidden]="false">\n        @switch (catalogueState()) {'
            ),
            H,
            '        }\n    }\n</main>',
            '        }\n        </div>\n    }\n</main>'
        ),
        'LE2',
        /PAGE_READ_STATE_BRANCH_HIDDEN: \[hidden\] on an ancestor of the branches/,
        'aiguillage seul masqué'
    );
    // F1 dans une interpolation d'ATTRIBUT : pas une interpolation de texte.
    refused(
        fixture,
        swap(
            ref,
            H,
            '<li>',
            '<li title="{{ row.label ?? catalogueRowsAbsent() }}">'
        ),
        'A2',
        /PAGE_ABSENT_SINK/,
        'F1 en interpolation d’attribut'
    );
    // Relecture contre la v3 : placement de l'aiguillage et du hors ligne ;
    // masquage À L'INTÉRIEUR d'une branche d'état ou hors ligne.
    const wrapSwitch = swap(
        swap(
            ref,
            H,
            '        @switch (catalogueState()) {',
            '        @if (catalogueItems().length) {\n        @switch (catalogueState()) {'
        ),
        H,
        '        }\n    }\n</main>',
        '        }\n        }\n    }\n</main>'
    );
    refused(
        fixture,
        wrapSwitch,
        'LE2',
        /PAGE_READ_STATE_BRANCH_PLACEMENT/,
        'aiguillage sous une garde quelconque'
    );
    const wrapAll = swap(
        swap(
            ref,
            H,
            '    @if (online() === false) {',
            '    @if (catalogueItems().length) {\n    @if (online() === false) {'
        ),
        H,
        '    }\n</main>',
        '    }\n    }\n</main>'
    );
    refused(
        fixture,
        wrapAll,
        'LE6',
        /PAGE_READ_OFFLINE_BRANCH: the offline branch sits at the page root/,
        'hors ligne hors racine'
    );
    refused(
        fixture,
        swap(ref, H, ERROR, '<p class="state" hidden>Loading failed.</p>'),
        'LE2',
        /PAGE_READ_STATE_BRANCH_HIDDEN: hidden inside/,
        'contenu de branche masqué'
    );
    refused(
        fixture,
        swap(
            ref,
            H,
            '<p class="state">Network access is unavailable.</p>',
            '<p class="state" aria-hidden="true">Network access is unavailable.</p>'
        ),
        'LE2',
        /PAGE_READ_STATE_BRANCH_HIDDEN: aria-hidden inside/,
        'contenu hors ligne masqué'
    );
    // « Racine » = racine de FLUX DE CONTRÔLE : des éléments de mise en page
    // peuvent envelopper l'aiguillage (sous A4 et LE2-HIDDEN). La page de
    // référence le place déjà dans <main> ; ici, <main><section>.
    assert.deepEqual(
        fixture.violations(
            swap(
                swap(
                    ref,
                    H,
                    '        @switch (catalogueState()) {',
                    '        <section class="states">\n        @switch (catalogueState()) {'
                ),
                H,
                '        }\n    }\n</main>',
                '        }\n        </section>\n    }\n</main>'
            )
        ),
        [],
        'aiguillage dans <main><section>'
    );
});
