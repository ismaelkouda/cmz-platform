// X5 C5b : couverture des 9 mutants survivants de E (validation de C5b,
// V-C5b-3). Chaque cas vise le code et le message exacts que le mutant fait
// disparaître ; E-cls-arguments est ÉQUIVALENT (voir l'addendum 2 de C5b).
import assert from 'node:assert/strict';
import test from 'node:test';

import {
    CELL,
    ERROR,
    H,
    T,
    readGrammarFixture,
    refusedAt,
    swap,
} from './test-support/read-page-grammar-fixture.mjs';

const ROWS_END = '                        }\n                    </ul>';

// Aiguillage en forme @if, la garde de la branche `error` complétée.
const ifForm = (ref, errorGuardExtra) =>
    swap(
        ref,
        H,
        ref[H].slice(
            ref[H].indexOf('        @switch'),
            ref[H].lastIndexOf('    }\n</main>')
        ),
        `        @if (catalogueState() === 'success') {
            <ul data-cmz-id="catalogue-list" aria-label="Catalogue">
                @for (row of catalogueItems(); track $index) {
                    <li>{{ row.id }} ${CELL}</li>
                }
            </ul>
        } @else if (catalogueState() === 'idle' || catalogueState() === 'loading' || catalogueState() === 'reloading') {
            <p class="state">Loading.</p>
        } @else if (catalogueState() === 'empty') {
            <p class="state">No item.</p>
        } @else if (catalogueState() === 'error'${errorGuardExtra}) {
            ${ERROR}
        }
`
    );

test('E-cls-visibilité : un point d’accès privé est refusé en LE1', async (t) => {
    const fixture = await readGrammarFixture(t);
    const needle = 'private readonly catalogueState';
    refusedAt(
        fixture,
        swap(fixture.reference, T, 'protected readonly catalogueState', needle),
        needle,
        'LE1',
        /PAGE_READ_MEMBER_ALIAS: declare protected readonly catalogueState/,
        'point d’accès privé',
        T
    );
});

test('E-tpl : track, garde principale, @switch, @empty et nœud étranger sont examinés', async (t) => {
    const fixture = await readGrammarFixture(t);
    const ref = fixture.reference;
    // E-tpl-track : en défense derrière H8 (track = $index, ligne, ligne.n).
    refusedAt(
        fixture,
        swap(ref, H, 'track $index', 'track catalogueItems()'),
        'track catalogueItems()',
        'LE5',
        /PAGE_READ_ROWS_OUTSIDE_SUCCESS/,
        'track'
    );
    // E-tpl-if-lecture : seule l'analyse de la garde principale les refuse.
    refusedAt(
        fixture,
        ifForm(ref, ' || online() === false'),
        'online() === false) {\n            <p class="state">Loading failed',
        'LE6',
        /PAGE_READ_OFFLINE_BRANCH: online\(\) only in the offline guard/,
        'garde principale + online'
    );
    refusedAt(
        fixture,
        ifForm(ref, " || catalogueState() === 'Non renseigné'"),
        "'Non renseigné'",
        'A3',
        /PAGE_ABSENT_TEXT_COPY: a string literal/,
        'garde principale + copie'
    );
    // E-tpl-switch : l'expression d'un @switch quelconque.
    const indexed =
        "@switch (catalogueItems()[0].id) {\n@case ('x') {\n<p>x</p>\n}\n}";
    refusedAt(
        fixture,
        swap(ref, H, ERROR, indexed),
        'catalogueItems()[0].id',
        'LE5',
        /PAGE_READ_ROWS_OUTSIDE_SUCCESS/,
        '@switch indexé'
    );
    // E-tpl-empty et E-tpl-statique-empty : le bloc @empty de @for.
    const empty = (inner) =>
        swap(
            ref,
            H,
            ROWS_END,
            `                        } @empty {\n                        <li>${inner}</li>\n                        }\n                    </ul>`
        );
    refusedAt(
        fixture,
        empty('{{ catalogueState() }}'),
        'catalogueState() }}',
        'LE4',
        /PAGE_READ_STATE_OUTSIDE_GUARD/,
        '@empty état'
    );
    refusedAt(
        fixture,
        empty('Non renseigné'),
        'Non renseigné</li>',
        'A3',
        /PAGE_ABSENT_TEXT_COPY: a text copies/,
        '@empty copie'
    );
    // E-tpl-autres-nœuds : en défense derrière H0/H2 (nœuds fermés).
    const foreign = '<ng-template><p>{{ catalogueState() }}</p></ng-template>';
    refusedAt(
        fixture,
        swap(ref, H, ERROR, foreign),
        'catalogueState() }}',
        'LE4',
        /PAGE_READ_STATE_OUTSIDE_GUARD/,
        'ng-template'
    );
});

// E-tpl-nonvide-groupes : une branche dont le seul contenu est un @switch
// interne qui rend du texte n'est PAS vide (sinon, faux refus).
test('E-tpl-nonvide-groupes : une branche à seul @switch interne qui rend du texte est acceptée', async (t) => {
    const fixture = await readGrammarFixture(t);
    assert.deepEqual(
        fixture.violations(
            swap(
                fixture.reference,
                H,
                '<p class="state">Waiting.</p>',
                '@switch (catalogueItems().length) {\n@case (0) {\n<p class="state">Waiting.</p>\n}\n}'
            )
        ),
        []
    );
});
