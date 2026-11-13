// X5 C5b : règles d'une page à lectures (conception C5b v2). Chaque refus est
// nommé par son code ; chaque règle a son témoin accepté (page de référence
// des deux produits fictifs, et formes permises).
import assert from 'node:assert/strict';
import test from 'node:test';

import { readStates } from './core/external-read-states.mjs';
import { ONLINE_ACCESS, READ_ACCESS_SUFFIXES } from './core/read-access.mjs';
import { externalCompositionApi } from './renderers/angular-page-composition-api.mjs';
import { SESSION_FIXTURE_DOMAINS } from './test-support/external-session-fixture.mjs';
import {
    EMPTY,
    ERROR,
    H,
    LAST_TS,
    LI,
    T,
    readGrammarFixture,
    readPageFiles,
    refused,
    swap,
} from './test-support/read-page-grammar-fixture.mjs';

// Les suffixes sont la source unique ; ce test casse si l'un change.
test('C5b : invariant des suffixes d’accès (non-collision par construction)', () => {
    const suffixes = Object.values(READ_ACCESS_SUFFIXES);
    assert.deepEqual(suffixes, ['State', 'Items', 'Absent']);
    assert.equal(new Set(suffixes).size, suffixes.length);
    for (const left of suffixes)
        for (const right of suffixes)
            if (left !== right)
                assert.ok(!left.endsWith(right), `${left} / ${right}`);
    for (const suffix of suffixes)
        assert.ok(!ONLINE_ACCESS.endsWith(suffix), suffix);
});

// Noms piégés, sur les vraies fonctions : lectures `a-items` et `a`, liaison
// `a-items-state` (texte d'absence) de la lecture `a`.
test('C5b : noms piégés, tous les noms d’accès restent distincts', () => {
    const presentation = { loading_state_id: 'loading' };
    const plan = {
        schema_version: '1.1.0',
        query_nodes: [
            { id: 'a-items', presentation },
            { id: 'a', presentation },
        ],
        command_nodes: [],
        output_bindings: [
            {
                id: 'a-items-state',
                producer_node_id: 'a',
                output: { kind: 'list' },
                absent_text: 'Non renseigné',
            },
        ],
    };
    assert.ok(externalCompositionApi(plan).length > 0);
    const model = {
        read_model: {
            fields: [{ name: 'label', required: true, nullable: true }],
        },
    };
    const reads = readStates(
        plan,
        new Map([
            [
                'a-items',
                {
                    read_model: {
                        fields: [
                            { name: 'label', required: true, nullable: false },
                        ],
                    },
                },
            ],
            ['a', model],
        ])
    );
    const names = [
        ONLINE_ACCESS,
        ...reads.flatMap((read) => [
            read.access.state,
            read.access.items,
            ...read.bindings.map((binding) => binding.absent_access),
        ]),
    ].filter(Boolean);
    assert.deepEqual(names.sort(), [
        'aItems',
        'aItemsItems',
        'aItemsState',
        'aItemsStateAbsent',
        'aState',
        'online',
    ]);
});

test('C5b : la page de référence est acceptée sur les deux produits fictifs, champ de composition quel que soit son nom', async (t) => {
    for (const domain of SESSION_FIXTURE_DOMAINS) {
        const fixture = await readGrammarFixture(t, domain);
        assert.deepEqual(fixture.violations(fixture.reference), [], domain);
        assert.deepEqual(
            fixture.violations(
                readPageFiles(fixture.workOrder, { field: 'page' })
            ),
            [],
            domain
        );
    }
});

test('C5b LE1 : points d’accès uniques, alias et dérivés refusés', async (t) => {
    const fixture = await readGrammarFixture(t);
    const ref = fixture.reference;
    const LE1 = /PAGE_READ_MEMBER_ALIAS/;
    for (const [label, files] of [
        [
            'nœud entier',
            swap(
                ref,
                T,
                LAST_TS,
                `    protected readonly node = computed(() => this.composition.catalogue);\n${LAST_TS}`
            ),
        ],
        [
            'calcul dérivé des lignes',
            swap(
                ref,
                T,
                LAST_TS,
                `    protected readonly first = computed(() => this.catalogueItems()[0]);\n${LAST_TS}`
            ),
        ],
        [
            'corps différent',
            swap(
                ref,
                T,
                'computed(() => this.composition.catalogue.state())',
                "computed(() => this.composition.catalogue.state() ?? 'idle')"
            ),
        ],
        [
            'accès indexé',
            swap(
                ref,
                T,
                LAST_TS,
                `    protected readonly node = computed(() => this.composition['catalogue'].state());\n${LAST_TS}`
            ),
        ],
        [
            'déstructuration',
            swap(
                ref,
                T,
                LAST_TS,
                `    protected peek(): void {\n        const { catalogue } = this.composition;\n    }\n${LAST_TS}`
            ),
        ],
        [
            'accès manquant',
            swap(
                ref,
                T,
                '    protected readonly online = computed(() => this.composition.online());\n',
                ''
            ),
        ],
    ])
        refused(fixture, files, 'LE1', LE1, label);
    for (const [label, line, code, message] of [
        [
            'this indexé',
            "    protected readonly node = computed(() => this['composition'].catalogue.state());\n",
            'LE1',
            LE1,
        ],
        [
            'second accès à online',
            '    protected readonly net = computed(() => this.composition.online());\n',
            'LE1',
            LE1,
        ],
        [
            'second accès aux lignes',
            '    protected readonly rows = computed(() => this.composition.catalogue.items());\n',
            'LE1',
            LE1,
        ],
        [
            'second accès au texte d’absence',
            '    protected readonly copy = computed(() => this.composition.absentText.catalogueRows);\n',
            'A1',
            /PAGE_ABSENT_ACCESS/,
        ],
    ])
        refused(
            fixture,
            swap(ref, T, LAST_TS, `${line}${LAST_TS}`),
            code,
            message,
            label
        );
    // Corps constant : aucune lecture de la composition, seul le contrôle du
    // corps le refuse.
    refused(
        fixture,
        swap(
            ref,
            T,
            'computed(() => this.composition.catalogue.state())',
            "computed(() => 'success')"
        ),
        'LE1',
        LE1,
        'corps constant'
    );
});

test('C5b LE2 et LE3 : aiguillage complet, non vide, sans défaut, garde des lignes exacte', async (t) => {
    const fixture = await readGrammarFixture(t);
    const ref = fixture.reference;
    refused(
        fixture,
        swap(
            ref,
            H,
            '            @case (\'idle\') {\n                <p class="state">Waiting.</p>\n            }\n',
            ''
        ),
        'LE2',
        /PAGE_READ_STATE_BRANCH_MISSING: .*idle/,
        'état manquant'
    );
    refused(
        fixture,
        swap(ref, H, '<p class="state">Waiting.</p>', ''),
        'LE2',
        /PAGE_READ_STATE_BRANCH_EMPTY/,
        'branche vide'
    );
    refused(
        fixture,
        swap(ref, H, "@case ('idle')", "@case ('loading')"),
        'LE2',
        /PAGE_READ_STATE_BRANCH_DUPLICATE/,
        'état en double'
    );
    refused(
        fixture,
        swap(ref, H, "@case ('empty')", '@default'),
        'LE2',
        /PAGE_READ_STATE_BRANCH_DEFAULT/,
        '@default'
    );
    refused(
        fixture,
        swap(
            ref,
            H,
            '<main data-cmz-id="main"',
            '<main [hidden]="false" data-cmz-id="main"'
        ),
        'LE2',
        /PAGE_READ_STATE_BRANCH_HIDDEN/,
        'branches masquées'
    );
    refused(
        fixture,
        swap(
            ref,
            H,
            "            @case ('success') {",
            "            @case ('empty')\n            @case ('success') {"
        ),
        'LE3',
        /PAGE_READ_ROWS_GUARD/,
        'succès groupé'
    );
    // Forme @if : `||` permis hors succès ; un @else final est refusé.
    const ifForm = swap(
        ref,
        H,
        ref[H].slice(
            ref[H].indexOf('        @switch'),
            ref[H].lastIndexOf('    }\n</main>')
        ),
        `        @if (catalogueState() === 'success') {
            <ul data-cmz-id="catalogue-list" aria-label="Catalogue">
                @for (row of catalogueItems(); track $index) {
                    ${LI}
                }
            </ul>
        } @else if (catalogueState() === 'idle' || catalogueState() === 'loading' || catalogueState() === 'reloading') {
            <p class="state">Loading.</p>
        } @else if (catalogueState() === 'empty') {
            ${EMPTY}
        } @else if (catalogueState() === 'error') {
            ${ERROR}
        }
`
    );
    assert.deepEqual(fixture.violations(ifForm), []);
    refused(
        fixture,
        swap(
            ifForm,
            H,
            "} @else if (catalogueState() === 'error') {",
            '} @else {'
        ),
        'LE2',
        /PAGE_READ_STATE_BRANCH_DEFAULT/,
        '@else final'
    );
    refused(
        fixture,
        swap(
            ifForm,
            H,
            "@if (catalogueState() === 'success') {",
            "@if (catalogueState() === 'success' || catalogueState() === 'empty') {"
        ),
        'LE3',
        /PAGE_READ_ROWS_GUARD/,
        'succès en ||'
    );
});

test('C5b LE4, LE5, LE6 : état seulement en garde, lignes seulement en succès, hors ligne unique', async (t) => {
    const fixture = await readGrammarFixture(t);
    const ref = fixture.reference;
    for (const [label, text] of [
        ['interpolation', '<p class="state">{{ catalogueState() }}</p>'],
        [
            'ternaire',
            "<p class=\"state\">{{ catalogueState() === 'error' ? 'x' : 'y' }}</p>",
        ],
        ['!== en garde', "@if (catalogueState() !== 'empty') {\n<p>x</p>\n}"],
        ['négation', "@if (!(catalogueState() === 'empty')) {\n<p>x</p>\n}"],
    ])
        refused(
            fixture,
            swap(ref, H, ERROR, text),
            'LE4',
            /PAGE_READ_STATE_OUTSIDE_GUARD/,
            label
        );
    for (const [label, text] of [
        [
            'lecture indexée',
            '<p class="state">{{ catalogueItems()[0].id }}</p>',
        ],
        [
            '@for hors succès',
            '@for (r of catalogueItems(); track $index) {\n<p>{{ r.id }}</p>\n}',
        ],
    ])
        refused(
            fixture,
            swap(ref, H, ERROR, text),
            'LE5',
            /PAGE_READ_ROWS_OUTSIDE_SUCCESS/,
            label
        );
    assert.deepEqual(
        fixture.violations(
            swap(
                ref,
                H,
                ERROR,
                '<p class="state">{{ catalogueItems().length }}</p>'
            )
        ),
        [],
        '.length admis hors succès'
    );
    refused(
        fixture,
        swap(ref, H, '@if (online() === false)', '@if (!online())'),
        'LE6',
        /PAGE_READ_OFFLINE_BRANCH/,
        '!online()'
    );
    refused(
        fixture,
        swap(ref, H, ERROR, '@if (online() === false) {\n<p>x</p>\n}'),
        'LE6',
        /PAGE_READ_OFFLINE_BRANCH/,
        'deux branches hors ligne'
    );
    refused(
        fixture,
        swap(ref, H, ERROR, '<p>{{ online() }}</p>'),
        'LE6',
        /PAGE_READ_OFFLINE_BRANCH/,
        'online() affiché'
    );
});
