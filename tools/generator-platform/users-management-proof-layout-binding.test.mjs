// La liaison de mise en page C5 est une autorité versionnée : un work order v5
// ne peut être préparé que si elle se résout contre le contrat de page et les
// exemples réellement présents dans le dépôt. Ce test fait rougir `main` dès
// qu'un de ces éléments dérive, au lieu de laisser la préparation échouer plus
// tard.
//
// Il lit le worktree pour signaler la dérive avant le commit. Il ne prouve pas
// l'autorité Git : celle-ci n'existe qu'après commit, par
// `prepare:page-realization --layout-binding … --dry-run` (ADR-0098).
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { lstatSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

import { resolvePresentationLayoutBinding } from './core/presentation-layout-binding.mjs';
import { usersManagementProof } from './test-support/users-management-proof.mjs';
import { repositoryRoot } from './validate-ir.mjs';

const BINDING = 'designs/users-management-proof.layout-binding.json';
const REACT_PAGE_CONTRACT =
    'apps/users-management-react-proof/.cmz/pages/page_6666666666666666.json';
const COMPACT = 'examples/presentation/compact-data-view-layout-examples';
const DATA_VIEW = 'examples/presentation/data-view-layout-examples';
const COMPACT_SET = 'generic-compact-data-view-layout-2026-10-03';
const DATA_VIEW_SET = 'generic-data-view-layout-2026-10-03';

const COMPACT_LIST = [
    'collection-header',
    'search-controls',
    'card-list',
    'floating-action',
];
const COMPACT_SHEET = ['bottom-sheet', 'modal-backdrop'];
const TABLE = ['table-toolbar', 'data-grid', 'horizontal-scroll-rail'];
const TABLE_WITH_FILTERS = [
    'table-toolbar',
    'data-grid',
    'filter-panel',
    'horizontal-scroll-rail',
];

// set/source → [classe, espace, état, régions conservées, capacités omises]
const SELECTIONS = {
    [`${COMPACT_SET}/compact-filter-detail`]: [
        'compact',
        'constrained',
        'filter-detail',
        COMPACT_SHEET,
        [],
    ],
    [`${COMPACT_SET}/compact-filter-summary`]: [
        'compact',
        'constrained',
        'filter-summary',
        COMPACT_SHEET,
        [],
    ],
    [`${COMPACT_SET}/compact-list`]: [
        'compact',
        'constrained',
        'filters-closed',
        COMPACT_LIST,
        [],
    ],
    [`${COMPACT_SET}/compact-search-active`]: [
        'compact',
        'constrained',
        'search-active',
        COMPACT_LIST,
        [],
    ],
    [`${DATA_VIEW_SET}/expanded-filter-panel`]: [
        'expanded',
        'comfortable',
        'filters-open',
        TABLE_WITH_FILTERS,
        ['export'],
    ],
    [`${DATA_VIEW_SET}/expanded-row-actions`]: [
        'expanded',
        'comfortable',
        'filters-closed',
        TABLE,
        ['export', 'row-actions'],
    ],
    [`${DATA_VIEW_SET}/medium-constrained-filter-panel`]: [
        'medium',
        'constrained',
        'filters-open',
        TABLE_WITH_FILTERS,
        ['export'],
    ],
    [`${DATA_VIEW_SET}/medium-constrained-row-actions`]: [
        'medium',
        'constrained',
        'filters-closed',
        TABLE,
        ['export', 'row-actions'],
    ],
};

// Fermeture des sources : tout ce que le work order v5 lira pour cette page,
// et rien d'autre. Les onglets de workspace relèvent de l'hôte, pas de la page.
const AUTHORITY_SOURCES = [
    ['page-contract', usersManagementProof.pageContractUri],
    ['layout-binding', BINDING],
    ['layout-example', `${COMPACT}/compact-filter-detail.proposed.png`],
    ['layout-example', `${COMPACT}/compact-filter-summary.proposed.png`],
    ['layout-example', `${COMPACT}/compact-list.proposed.png`],
    ['layout-example', `${COMPACT}/compact-search-active.proposed.png`],
    ['example-set', `${COMPACT}/example-set.json`],
    ['render-source', `${COMPACT}/mockup.css`],
    ['render-source', `${COMPACT}/mockup.html`],
    ['render-source', `${COMPACT}/render.mjs`],
    ['example-set', `${DATA_VIEW}/example-set.json`],
    ['layout-example', `${DATA_VIEW}/expanded-filter-panel.proposed.png`],
    ['layout-example', `${DATA_VIEW}/expanded-row-actions.proposed.png`],
    [
        'layout-example',
        `${DATA_VIEW}/medium-constrained-filter-panel.proposed.png`,
    ],
    [
        'layout-example',
        `${DATA_VIEW}/medium-constrained-row-actions.proposed.png`,
    ],
    ['render-source', `${DATA_VIEW}/mockup.css`],
    ['render-source', `${DATA_VIEW}/mockup.html`],
    ['render-source', `${DATA_VIEW}/render.mjs`],
    [
        'backend-contract',
        'tools/generator-platform/fixtures/users-list.backend-contract.json',
    ],
];

function sha256(content) {
    return createHash('sha256').update(content).digest('hex');
}

function schema(name) {
    return JSON.parse(
        readFileSync(new URL(`./schemas/${name}`, import.meta.url), 'utf8')
    );
}

// Même forme que le lecteur de blobs Git du work order v5, mais sur le disque.
function readWorkspaceSource(path) {
    const absolute = resolve(repositoryRoot, path);
    const executable = (lstatSync(absolute).mode & 0o111) !== 0;
    return {
        path,
        mode: executable ? '100755' : '100644',
        content: readFileSync(absolute),
    };
}

function resolveFor(pageContractPath, readSource = readWorkspaceSource) {
    const pageContractContent = readSource(pageContractPath).content;
    return resolvePresentationLayoutBinding({
        layoutBindingPath: BINDING,
        layoutBindingSchema: schema('presentation-layout-binding.schema.json'),
        layoutExampleSetSchema: schema(
            'presentation-layout-example-set.schema.json'
        ),
        pageContract: JSON.parse(pageContractContent.toString('utf8')),
        pageContractPath,
        pageContractContent,
        readSource,
    });
}

test('la liaison C5 se résout en une guidance de mise en page exacte', () => {
    const guidance = resolveFor(usersManagementProof.pageContractUri);

    assert.equal(guidance.binding_id, 'users-management-layout-2026-10-09');
    assert.equal(guidance.page_id, usersManagementProof.pageId);
    assert.equal(guidance.authority, 'layout-guidance-only');
    assert.equal(
        guidance.page_contract_sha256,
        sha256(
            readWorkspaceSource(usersManagementProof.pageContractUri).content
        )
    );
    assert.deepEqual(guidance.manifest, {
        path: BINDING,
        sha256: sha256(readWorkspaceSource(BINDING).content),
    });
    assert.deepEqual(
        guidance.example_sets.map(({ set_id }) => set_id),
        [COMPACT_SET, DATA_VIEW_SET]
    );
    assert.deepEqual(
        guidance.capabilities.map(({ id, status }) => `${id}:${status}`),
        [
            'column-filters:declared',
            'create:declared',
            'create-fab:declared',
            'export:absent',
            'filter-panel:declared',
            'filter-trigger:declared',
            'progressive-loading:declared',
            'refresh:declared',
            'row-actions:absent',
            'row-rank:declared',
            'search:declared',
        ]
    );
    assert.deepEqual(
        Object.fromEntries(
            guidance.sources.map((source) => [
                `${source.set_id}/${source.id}`,
                [
                    source.layout_class,
                    source.space,
                    source.state,
                    source.regions,
                    source.omitted_capabilities,
                ],
            ])
        ),
        SELECTIONS
    );
    for (const source of guidance.sources) {
        assert.equal(source.trust, 'untrusted-content');
        assert.deepEqual(source.page_state_ids, ['ready']);
    }
});

test('la guidance C5 ne lit que des sources fermées et intactes', () => {
    const guidance = resolveFor(usersManagementProof.pageContractUri);

    assert.deepEqual(
        guidance.authority_sources.map(({ kind, path }) => [kind, path]),
        AUTHORITY_SOURCES
    );
    for (const source of guidance.authority_sources) {
        const { content } = readWorkspaceSource(source.path);
        assert.equal(source.bytes, content.byteLength, source.path);
        assert.equal(source.sha256, sha256(content), source.path);
    }
    const examples = guidance.authority_sources
        .filter(({ kind }) => kind === 'layout-example')
        .map(({ path }) => path);
    assert.deepEqual(
        guidance.sources.map(({ path }) => path),
        examples
    );
});

test('la même liaison vaut pour les répliques Angular et React du contrat de page', () => {
    const angular = resolveFor(usersManagementProof.pageContractUri);
    const react = resolveFor(REACT_PAGE_CONTRACT);
    const withoutPageContractPath = (guidance) => ({
        ...guidance,
        authority_sources: guidance.authority_sources.filter(
            ({ kind }) => kind !== 'page-contract'
        ),
    });
    assert.deepEqual(
        withoutPageContractPath(react),
        withoutPageContractPath(angular)
    );
    assert.equal(react.page_contract_sha256, angular.page_contract_sha256);
});

test('refuse la liaison dès que le contrat de page, un manifeste ou un exemple dérive', () => {
    const drifted = (target) => (path) => {
        const entry = readWorkspaceSource(path);
        if (path !== target) return entry;
        return {
            ...entry,
            content: Buffer.concat([entry.content, Buffer.from('\n')]),
        };
    };
    const resolveWithDrift = (target) => () =>
        resolveFor(usersManagementProof.pageContractUri, drifted(target));

    assert.throws(
        resolveWithDrift(usersManagementProof.pageContractUri),
        /page contract drifted since the binding was written/
    );
    assert.throws(
        resolveWithDrift(`${COMPACT}/example-set.json`),
        /example set generic-compact-data-view-layout-2026-10-03 sha256 drifted/
    );
    assert.throws(
        resolveWithDrift(`${DATA_VIEW}/expanded-filter-panel.proposed.png`),
        /byte length drifted/
    );
});
