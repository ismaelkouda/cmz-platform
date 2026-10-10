// Cycle de vie des références de présentation (ADR-0099).
//
// Deux catégories seulement vivent dans l'arbre : une preuve de page publiée
// (`designs/*.presentation-evidence.json`) et les exemples génériques de mise
// en page (`examples/presentation/`). Une référence rejetée ou remplacée est
// supprimée ; Git en garde la mémoire. Ce garde refuse qu'elle revienne.
//
// Il ne réserve ni identifiant de source ni nom de fichier : un `source.id`
// n'est unique que dans son manifeste, et une intention retirée peut être
// reconstruite sous un nom déjà employé.
import assert from 'node:assert/strict';
import {
    existsSync,
    mkdirSync,
    mkdtempSync,
    readFileSync,
    readdirSync,
    rmSync,
    writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';

import { repositoryRoot } from './validate-ir.mjs';

const EVIDENCE_SUFFIX = '.presentation-evidence.json';
const GENERIC_EXAMPLES_ROOT = 'examples/presentation/';
// Racine des références de la page « Gestion des utilisateurs », supprimée.
const RETIRED_REFERENCE_ROOT = 'examples/users-management-proof/presentation/';
// Preuve de page C5 du 2026-10-04, contredite par la liaison de mise en page.
const RETIRED_PRESENTATION_IDS = new Set(['presentation_5627f087550dd218']);
/**
 * Violations du cycle de vie, calculées sur des faits passés en argument.
 * @param {{
 *   examplePaths: readonly string[],
 *   evidences: readonly { path: string, manifest: { presentation_id?: string, sources?: { snapshot_uri?: string }[] } }[],
 * }} facts
 */
function lifecycleViolations({ examplePaths, evidences }) {
    const violations = [];
    for (const path of examplePaths) {
        if (path.split('/').includes('historical'))
            violations.push(
                `${path} : aucune archive ne vit dans l'arbre ; Git est la mémoire des références retirées.`
            );
        if (`${path}/`.startsWith(RETIRED_REFERENCE_ROOT))
            violations.push(
                `${path} : cette racine de références a été supprimée.`
            );
    }
    for (const { path, manifest } of evidences) {
        if (RETIRED_PRESENTATION_IDS.has(manifest.presentation_id))
            violations.push(
                `${path} : la preuve ${manifest.presentation_id} a été retirée.`
            );
        for (const source of manifest.sources ?? []) {
            const uri = source.snapshot_uri ?? '';
            if (uri.startsWith(GENERIC_EXAMPLES_ROOT))
                violations.push(
                    `${path} : ${uri} est un exemple générique, pas la preuve d'une page.`
                );
            if (uri.startsWith(RETIRED_REFERENCE_ROOT))
                violations.push(
                    `${path} : ${uri} appartient à une racine de références supprimée.`
                );
            if (uri.split('/').includes('historical'))
                violations.push(
                    `${path} : ${uri} désigne une archive, jamais une preuve active.`
                );
        }
    }
    return violations;
}

function filesUnder(root, relativeRoot) {
    if (!existsSync(join(root, relativeRoot))) return [];
    return readdirSync(join(root, relativeRoot), {
        recursive: true,
        withFileTypes: true,
    })
        .map(
            (entry) =>
                `${entry.parentPath.slice(root.length + 1)}/${entry.name}`
        )
        .map((path) => path.split('\\').join('/'))
        .sort();
}

function factsOf(root) {
    const designPaths = filesUnder(root, 'designs');
    return {
        examplePaths: filesUnder(root, 'examples'),
        designPaths,
        evidences: designPaths
            .filter((path) => path.endsWith(EVIDENCE_SUFFIX))
            .map((path) => ({
                path,
                manifest: JSON.parse(readFileSync(join(root, path), 'utf8')),
            })),
    };
}

const CLEAN = {
    examplePaths: [
        'examples/presentation/data-view-layout-examples/example-set.json',
    ],
    evidences: [
        {
            path: 'designs/app.presentation-evidence.json',
            manifest: {
                presentation_id: 'presentation_0123456789abcdef',
                sources: [
                    {
                        id: 'runtime-ready',
                        snapshot_uri: 'examples/app/runtime/ready.png',
                    },
                ],
            },
        },
    ],
};

function evidence(manifest) {
    return [{ path: 'designs/app.presentation-evidence.json', manifest }];
}

test('le dépôt ne conserve aucune référence de présentation retirée', () => {
    const facts = factsOf(repositoryRoot);
    assert.deepEqual(lifecycleViolations(facts), []);
    // État voulu, pas une vacuité : C5 est guidée par sa liaison de mise en
    // page. Une nouvelle preuve de page exige une approbation explicite
    // (ADR-0066) ; ce test devra alors la nommer.
    assert.deepEqual(
        facts.evidences.map(({ path }) => path),
        [],
        'aucune preuve de page n’est publiée aujourd’hui'
    );
    assert.equal(
        existsSync(
            join(
                repositoryRoot,
                'designs/users-management-proof.layout-binding.json'
            )
        ),
        true
    );
});

// Sans ce test, une lecture cassée du dépôt rendrait le garde vide de sens.
test('lit réellement les exemples, les designs et les preuves d’un arbre', (t) => {
    const root = mkdtempSync(join(tmpdir(), 'presentation-lifecycle-'));
    t.after(() => rmSync(root, { recursive: true, force: true }));
    const write = (path, content) => {
        mkdirSync(dirname(join(root, path)), { recursive: true });
        writeFileSync(join(root, path), content);
    };
    write('examples/app/historical/old.png', 'x');
    write('examples/users-management-proof/presentation/new.png', 'x');
    write(
        'designs/app.presentation-evidence.json',
        JSON.stringify({
            presentation_id: 'presentation_5627f087550dd218',
            sources: [],
        })
    );
    write('designs/app.layout-binding.json', '{}');

    const facts = factsOf(root);
    assert.deepEqual(facts.designPaths, [
        'designs/app.layout-binding.json',
        'designs/app.presentation-evidence.json',
    ]);
    assert.deepEqual(facts.examplePaths, [
        'examples/app',
        'examples/app/historical',
        'examples/app/historical/old.png',
        'examples/users-management-proof',
        'examples/users-management-proof/presentation',
        'examples/users-management-proof/presentation/new.png',
    ]);
    assert.deepEqual(lifecycleViolations(facts), [
        "examples/app/historical : aucune archive ne vit dans l'arbre ; Git est la mémoire des références retirées.",
        "examples/app/historical/old.png : aucune archive ne vit dans l'arbre ; Git est la mémoire des références retirées.",
        'examples/users-management-proof/presentation : cette racine de références a été supprimée.',
        'examples/users-management-proof/presentation/new.png : cette racine de références a été supprimée.',
        'designs/app.presentation-evidence.json : la preuve presentation_5627f087550dd218 a été retirée.',
    ]);

    // Le vrai dépôt est lu par la même fonction, et elle y voit du contenu.
    const repository = factsOf(repositoryRoot);
    assert.ok(
        repository.examplePaths.includes(
            'examples/presentation/data-view-layout-examples/example-set.json'
        )
    );
    assert.ok(
        repository.designPaths.includes(
            'designs/users-management-proof.layout-binding.json'
        )
    );
});

test('accepte une preuve de page neuve et des exemples génériques', () => {
    assert.deepEqual(lifecycleViolations(CLEAN), []);
});

test('refuse le retour d’une archive dans l’arbre des exemples', () => {
    for (const path of [
        'examples/app/historical',
        'examples/presentation/workspace-shell-layout-examples/historical/a/b.png',
    ])
        assert.deepEqual(
            lifecycleViolations({ ...CLEAN, examplePaths: [path] }),
            [
                `${path} : aucune archive ne vit dans l'arbre ; Git est la mémoire des références retirées.`,
            ]
        );
    // Le mot dans un nom de fichier n'est pas un dossier d'archive.
    assert.deepEqual(
        lifecycleViolations({
            ...CLEAN,
            examplePaths: ['examples/app/historical-trend.png'],
        }),
        []
    );
});

test('refuse le retour de la racine de références supprimée', () => {
    for (const path of [
        'examples/users-management-proof/presentation',
        'examples/users-management-proof/presentation/ready.png',
    ])
        assert.deepEqual(
            lifecycleViolations({ ...CLEAN, examplePaths: [path] }),
            [`${path} : cette racine de références a été supprimée.`]
        );
    // Le reste de l'application et un dossier au nom voisin restent libres.
    assert.deepEqual(
        lifecycleViolations({
            ...CLEAN,
            examplePaths: [
                'examples/users-management-proof/project-brief.md',
                'examples/users-management-proof/presentation-notes.md',
            ],
        }),
        []
    );
});

test('refuse la republication de la preuve retirée, sans réserver les identifiants de source', () => {
    assert.deepEqual(
        lifecycleViolations({
            ...CLEAN,
            evidences: evidence({
                presentation_id: 'presentation_5627f087550dd218',
                sources: [],
            }),
        }),
        [
            'designs/app.presentation-evidence.json : la preuve presentation_5627f087550dd218 a été retirée.',
        ]
    );
    // `compact-filter-summary` désignait une source retirée ; c'est aussi
    // l'identifiant d'un exemple générique actif. Il reste utilisable.
    assert.deepEqual(
        lifecycleViolations({
            ...CLEAN,
            evidences: evidence({
                presentation_id: 'presentation_0123456789abcdef',
                sources: [
                    {
                        id: 'compact-filter-summary',
                        snapshot_uri: 'examples/app/new.png',
                    },
                ],
            }),
        }),
        []
    );
});

test('refuse qu’une preuve de page pointe vers un exemple générique, une racine supprimée ou une archive', () => {
    const cases = {
        'examples/presentation/data-view-layout-examples/expanded-filter-panel.proposed.png':
            /est un exemple générique, pas la preuve d'une page/,
        'examples/users-management-proof/presentation/progressive-filter-candidates/medium-one-filter.proposed.png':
            /appartient à une racine de références supprimée/,
        'examples/app/historical/ready.png':
            /désigne une archive, jamais une preuve active/,
    };
    for (const [snapshot_uri, expected] of Object.entries(cases)) {
        const violations = lifecycleViolations({
            ...CLEAN,
            evidences: evidence({
                presentation_id: 'presentation_0123456789abcdef',
                sources: [{ id: 'runtime-ready', snapshot_uri }],
            }),
        });
        assert.equal(violations.length, 1, snapshot_uri);
        assert.match(violations[0], expected);
    }
});
