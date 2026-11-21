// X5 C6 N5-1 (avis Fable 5769aba7 et 989d31c3) : identifiants des racines de
// branche d'une page à lectures, mesurées par N5.
// - Forme `<node_id>-state-<état>` pour une branche d'état, `offline-branch`
//   pour la branche hors ligne (sans l'infixe : familles disjointes).
// - (a) toute la famille est réservée : un contrat qui en prend la forme est
//   refusé ; (b) la forme dérivée est revalidée en sortie ; (c) chaque racine
//   porte EXACTEMENT son identifiant, et cet identifiant n'est nulle part
//   ailleurs. Attendus en LITTÉRAL (leçon Q4/Q6).
import assert from 'node:assert/strict';
import test from 'node:test';

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { pageGrammarFindings } from './core/page-grammar/index.mjs';
import { isReservedBranchId, readStateBranchId } from './core/read-access.mjs';
import {
    nullableLabel,
    queryPage,
    readWorkOrderOf,
} from './test-support/external-query-page.mjs';
import {
    ABSENT_TEXT,
    ERROR,
    H,
    readGrammarFixture,
    refused,
    refusedAt,
    swap,
} from './test-support/read-page-grammar-fixture.mjs';
import {
    composedProduct,
    prepare,
    realization,
    workOrderOf,
} from './test-support/external-realization-product.mjs';

const BRANCH_IDS = {
    idle: 'catalogue-state-idle',
    loading: 'catalogue-state-loading',
    success: 'catalogue-state-success',
    empty: 'catalogue-state-empty',
    error: 'catalogue-state-error',
    reloading: 'catalogue-state-reloading',
};

test('N5-1 : identifiants de branche publiés au bon de travail, sur les deux produits', async (t) => {
    for (const domain of ['observatory', 'equipment-hire']) {
        const fixture = await readGrammarFixture(t, domain);
        const states = fixture.workOrder.read_states;
        assert.equal(states.offline_branch_id, 'offline-branch', domain);
        assert.equal(states.reads[0].node_id, 'catalogue', domain);
        assert.deepEqual(states.reads[0].branch_ids, BRANCH_IDS, domain);
        assert.deepEqual(fixture.violations(fixture.reference), [], domain);
    }
});

test('N5-1 (b) : forme dérivée revalidée en sortie ; (a) famille réservée entière', () => {
    assert.equal(
        readStateBranchId('catalogue', 'idle'),
        'catalogue-state-idle'
    );
    for (const [nodeId, state, message] of [
        [
            'Catalogue',
            'idle',
            /^Error: unsafe read state branch id "Catalogue-state-idle"$/,
        ],
        [
            'a b',
            'idle',
            /^Error: unsafe read state branch id "a b-state-idle"$/,
        ],
        ['', 'idle', /^Error: unsafe read state branch id "-state-idle"$/],
        [
            'catalogue',
            'offline',
            /^Error: read state "offline" is not declared$/,
        ],
    ])
        assert.throws(() => readStateBranchId(nodeId, state), message);
    for (const id of [
        'offline-branch',
        'catalogue-state-idle',
        'x-state-reloading',
        'a.b-state-error',
    ])
        assert.equal(isReservedBranchId(id), true, id);
    for (const id of [
        'catalogue-list',
        'catalogue-state-offline',
        'Bad-state-idle',
        'state-idle',
        '-state-idle',
        'offline-branches',
        'page-offline',
    ])
        assert.equal(isReservedBranchId(id), false, id);
});

test('N5-1 (a) : un contrat de page qui prend la forme réservée est refusé', async (t) => {
    // Au bon de travail : fermé, par son nom.
    for (const reserved of ['list-state-error', 'offline-branch']) {
        const { options } = await queryPage(t, 'observatory', (input) => {
            nullableLabel('observatory', ABSENT_TEXT)(input);
            const page = input.design.pages.find(
                (entry) => entry.loads.length > 0
            );
            page.regions[0].elements.find(
                (element) => element.id === 'catalogue-list'
            ).id = reserved;
        });
        await assert.rejects(
            readWorkOrderOf(options),
            new RegExp(
                `^Error: external application: PAGE_READ_BRANCH_ID_RESERVED: contract id ${reserved} takes the reserved branch id form$`
            )
        );
    }
    // À la grammaire, en défense : même contrat, même refus.
    const fixture = await readGrammarFixture(t);
    const pageContract = structuredClone(fixture.pageContract);
    pageContract.page.regions[0].elements.push({ id: 'x-state-idle' });
    assert.deepEqual(
        pageGrammarFindings({
            files: fixture.reference,
            workOrder: fixture.workOrder,
            pageContract,
        }).map((entry) => `${entry.code} ${entry.message}`),
        [
            'LE2 PAGE_READ_BRANCH_ID_RESERVED: contract id "x-state-idle" takes the reserved branch id form',
        ]
    );
});

test('N5-1 (c) : chaque racine porte exactement son identifiant, nulle part ailleurs', async (t) => {
    const fixture = await readGrammarFixture(t);
    const ref = fixture.reference;
    const idleRoot = '<div data-cmz-id="catalogue-state-idle">';
    refused(
        fixture,
        swap(ref, H, idleRoot, '<div>'),
        'LE2',
        /^LE2 PAGE_READ_BRANCH_ROOT: the content of branch idle of catalogueState is exactly one element with data-cmz-id="catalogue-state-idle"$/,
        'identifiant retiré'
    );
    const wrong = swap(
        ref,
        H,
        idleRoot,
        '<div data-cmz-id="catalogue-state-loading">'
    );
    refused(
        fixture,
        wrong,
        'LE2',
        /^LE2 PAGE_READ_BRANCH_ROOT: the content of branch idle of catalogueState is exactly one element with data-cmz-id="catalogue-state-idle"$/,
        'identifiant d’un autre état'
    );
    refused(
        fixture,
        wrong,
        'LE2',
        /^LE2 PAGE_READ_BRANCH_ID_MISPLACED: data-cmz-id="catalogue-state-loading" is only on the root of its branch$/,
        'identifiant d’un autre état, hors de sa racine'
    );
    refused(
        fixture,
        swap(ref, H, idleRoot, `<p class="state">Before.</p>\n${idleRoot}`),
        'LE2',
        /^LE2 PAGE_READ_BRANCH_ROOT: the content of branch idle of catalogueState is exactly one element with data-cmz-id="catalogue-state-idle"$/,
        'deux nœuds dans la branche'
    );
    refused(
        fixture,
        swap(ref, H, '<div data-cmz-id="offline-branch">', '<div>'),
        'LE6',
        /^LE6 PAGE_READ_BRANCH_ROOT: the content of the offline branch is exactly one element with data-cmz-id="offline-branch"$/,
        'hors ligne sans identifiant'
    );
    const inner = '<p class="state" data-cmz-id="catalogue-state-error">';
    refusedAt(
        fixture,
        swap(ref, H, ERROR, ERROR.replace('<p class="state">', inner)),
        inner,
        'LE2',
        /^LE2 PAGE_READ_BRANCH_ID_MISPLACED: data-cmz-id="catalogue-state-error" is only on the root of its branch$/,
        'identifiant d’état sous sa racine'
    );
    const heading = '<h1 data-cmz-id="offline-branch">';
    refusedAt(
        fixture,
        swap(ref, H, '<h1 data-cmz-id="report-heading">', heading),
        heading,
        'LE6',
        /^LE6 PAGE_READ_BRANCH_ID_MISPLACED: data-cmz-id="offline-branch" is only on the root of its branch$/,
        'identifiant hors ligne ailleurs'
    );
});

test('N5-1 : un identifiant publié absent ou altéré refuse la page, fermé', async (t) => {
    const fixture = await readGrammarFixture(t);
    const findings = (edit) => {
        const workOrder = structuredClone(fixture.workOrder);
        edit(workOrder.read_states);
        return pageGrammarFindings({
            files: fixture.reference,
            workOrder,
            pageContract: fixture.pageContract,
        }).map((entry) => `${entry.code} ${entry.message}`);
    };
    assert.deepEqual(
        findings((states) => {
            states.reads[0].branch_ids.idle = 'catalogue-state-x';
        }),
        [
            'T0 acceptor failure: published branch id of catalogue idle differs from catalogue-state-idle',
        ]
    );
    assert.deepEqual(
        findings((states) => {
            delete states.reads[0].branch_ids;
        }),
        [
            'T0 acceptor failure: published branch id of catalogue idle differs from catalogue-state-idle',
        ]
    );
    for (const edit of [
        (states) => {
            states.offline_branch_id = 'page-state-offline';
        },
        // E-b8 : l'identifiant hors ligne publié ABSENT est refusé aussi.
        (states) => {
            delete states.offline_branch_id;
        },
    ])
        assert.deepEqual(findings(edit), [
            'T0 acceptor failure: published offline branch id differs',
        ]);
});

// Survivants d'E sur 51e3d5f5 : refus EXACTS, deux produits.
const findingsOf = (fixture, files) =>
    fixture.findings(files).map((entry) => `${entry.code} ${entry.message}`);
const IDLE_ROOT = '<div data-cmz-id="catalogue-state-idle">';
const ROOT_IDLE =
    'LE2 PAGE_READ_BRANCH_ROOT: the content of branch idle of catalogueState is exactly one element with data-cmz-id="catalogue-state-idle"';
const MISPLACED_IDLE =
    'LE2 PAGE_READ_BRANCH_ID_MISPLACED: data-cmz-id="catalogue-state-idle" is only on the root of its branch';

test('N5-1 (c), E-c1 et E-c2 : racine à deux identifiants, racine suivie d’un frère', async (t) => {
    for (const domain of ['observatory', 'equipment-hire']) {
        const fixture = await readGrammarFixture(t, domain);
        const ref = fixture.reference;
        // E-c1 : le second identifiant est un identifiant VALIDE du contrat :
        // seule la règle de racine refuse (aucun H3).
        assert.deepEqual(
            findingsOf(
                fixture,
                swap(
                    ref,
                    H,
                    IDLE_ROOT,
                    '<div data-cmz-id="catalogue-state-idle" data-cmz-id="catalogue-list">'
                )
            ),
            [ROOT_IDLE, MISPLACED_IDLE],
            `${domain} E-c1`
        );
        // E-c2 : la racine exacte, puis un frère APRÈS elle.
        const idle = ref[H].slice(ref[H].indexOf(IDLE_ROOT));
        const block = idle.slice(0, idle.indexOf('</div>') + '</div>'.length);
        assert.deepEqual(
            findingsOf(
                fixture,
                swap(
                    ref,
                    H,
                    block,
                    `${block}\n                <p class="state">Extra.</p>`
                )
            ),
            [ROOT_IDLE, MISPLACED_IDLE],
            `${domain} E-c2`
        );
    }
});

// E-a2, E-a7 (rider D de Fable) : la famille réservée ne vise QUE les pages à
// lectures. Une page de COMMANDES dont un identifiant prend la forme
// `x-state-idle` reste acceptée, au bon de travail comme à la grammaire.
test('N5-1 (a) : une page de commandes garde un identifiant en forme x-state-idle', async (t) => {
    for (const domain of ['observatory', 'equipment-hire']) {
        const product = await composedProduct(t, domain, {
            edit: ({ design }) => {
                const page = design.pages.find(
                    (entry) => entry.loads.length === 0
                );
                page.regions[0].elements.find(
                    (element) => element.kind === 'heading'
                ).id = 'x-state-idle';
            },
        });
        await prepare(product);
        const workOrder = await workOrderOf(product);
        assert.equal('read_states' in workOrder, false, domain);
        const pageContract = JSON.parse(
            await readFile(
                join(product.app, workOrder.page_contract.path),
                'utf8'
            )
        );
        const files = await realization(product, workOrder);
        assert.match(files[H], /<h1 data-cmz-id="x-state-idle">/, domain);
        assert.deepEqual(
            pageGrammarFindings({ files, workOrder, pageContract }),
            [],
            domain
        );
    }
});

// E-p5 : la règle publiée de read_states, en LITTÉRAL (racine unique rendue).
test('N5-1 et F1 : texte exact de read_states.rule publié', async (t) => {
    const fixture = await readGrammarFixture(t);
    assert.equal(
        fixture.workOrder.read_states.rule,
        'Render one non-empty branch of its own for every state of every read in read_states and one for offline, each holding exactly one rendered root element (not ng-container or ng-template) whose data-cmz-id is its published branch_ids entry or offline_branch_id; render rows only in the success branch (only items().length is allowed elsewhere); show a field listed in absent_fields through its binding absent_text_path, never a copy of the text and never a lone symbol.'
    );
});

// X5 C6 F1 (décision du pilote, riders A–C de Fable) : ng-container et
// ng-template ne rendent aucun élément (OBSERVÉ dans la pile Angular réelle :
// stack-tests/angular/branch-root-witness.spec.ts) ; la mesure N5 ne
// trouverait pas leur data-cmz-id. Refus à la RACINE de branche seulement.
const unrendered = (tag, label, id) =>
    `PAGE_READ_BRANCH_ROOT_UNRENDERED: the root of ${label} is <${tag}>, which renders no element; use one rendered element with data-cmz-id="${id}"`;
test('F1 : ng-container et ng-template refusés comme racine de branche, admis ailleurs', async (t) => {
    const IDLE = [
        '<div data-cmz-id="catalogue-state-idle">',
        '<p class="state">Waiting.</p>',
        'branch idle of catalogueState',
        'catalogue-state-idle',
        'LE2',
    ];
    const OFFLINE = [
        '<div data-cmz-id="offline-branch">',
        '<p class="state">Network access is unavailable.</p>',
        'the offline branch',
        'offline-branch',
        'LE6',
    ];
    for (const domain of ['observatory', 'equipment-hire']) {
        const fixture = await readGrammarFixture(t, domain);
        const ref = fixture.reference;
        for (const [open, inner, label, id, code] of [IDLE, OFFLINE]) {
            const start = ref[H].indexOf(open);
            const block = ref[H].slice(
                start,
                ref[H].indexOf('</div>', start) + '</div>'.length
            );
            assert.ok(block.includes(inner), `${domain} ${id}`);
            const as = (tag) =>
                swap(
                    ref,
                    H,
                    block,
                    block
                        .replace('<div ', `<${tag} `)
                        .replace(/<\/div>$/, `</${tag}>`)
                );
            // Nouvelle couverture : ng-container (accepté avant F1).
            assert.deepEqual(
                findingsOf(fixture, as('ng-container')),
                [
                    `${code} ${unrendered('ng-container', label, id)}`,
                    `${code} PAGE_READ_BRANCH_ID_MISPLACED: data-cmz-id="${id}" is only on the root of its branch`,
                ],
                `${domain} ${id} ng-container`
            );
            // Rider A : ng-template, déjà refusé par H2 et H0, reçoit aussi
            // le refus nommé : les deux chemins ne divergent pas en silence.
            assert.deepEqual(
                findingsOf(fixture, as('ng-template')),
                [
                    'H2 element ng-template is not allowed',
                    'H0 template node Template is not allowed',
                    `${code} ${unrendered('ng-template', label, id)}`,
                ],
                `${domain} ${id} ng-template`
            );
        }
        // Rider B : ng-container reste admis HORS de la racine de branche.
        assert.deepEqual(
            findingsOf(
                fixture,
                swap(
                    ref,
                    H,
                    '<p class="state">Waiting.</p>',
                    '<ng-container><p class="state">Waiting.</p></ng-container>'
                )
            ),
            [],
            `${domain} ng-container sous la racine`
        );
    }
});
