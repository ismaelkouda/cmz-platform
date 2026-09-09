import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import {
    mkdir,
    mkdtemp,
    readFile,
    realpath,
    rm,
    writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';

import { executeLibraryRecipe } from './recipe-execution.mjs';

async function put(root, path, content) {
    await mkdir(dirname(join(root, path)), { recursive: true });
    await writeFile(join(root, path), content);
}

async function fixture(t) {
    const root = await realpath(await mkdtemp(join(tmpdir(), 'cmz-recipe-')));
    t.after(() => rm(root, { recursive: true, force: true }));
    for (const path of ['candidate', 'repo', 'cache', 'home'])
        await mkdir(join(root, path));
    await put(root, 'candidate/apps/demo/project.json', '{"name":"demo"}\n');
    await put(
        root,
        'candidate/apps/demo/.cmz/libraries.json',
        '{"schema_version":"1.0.0","kind":"app-library-manifest","platform":"angular","libraries":[]}\n'
    );
    await put(root, 'candidate/node_modules/nx/dist/bin/nx.js', '');
    await put(root, 'candidate/node_modules/prettier/bin/prettier.cjs', '');
    return root;
}

const recipe = {
    library: 'angular-material',
    platform: 'angular',
    install: {
        method: 'official-schematic',
        command: {
            executable: 'nx',
            argv: ['g', 'material:add', '--project', '{{app}}'],
        },
    },
};

test('borne toutes les écritures de recette à l’app et ajoute le manifeste', async (t) => {
    const root = await fixture(t);
    const result = executeLibraryRecipe({
        repository: join(root, 'repo'),
        candidate: { workspace: join(root, 'candidate') },
        recipe,
        track: { packages: { material: '1.0.0' } },
        app: 'demo',
        policy: {},
        backend: 'test',
        cache: join(root, 'cache'),
        home: join(root, 'home'),
        run: ({ candidate, argv }) => {
            if (argv[0] === 'node_modules/nx/dist/bin/nx.js') {
                assert.equal(argv.at(-1), 'demo');
                writeFileSync(
                    join(candidate, 'apps/demo/material.txt'),
                    'configured\n'
                );
            }
            return { status: 0, stdout: '', stderr: '' };
        },
    });
    assert.deepEqual(result.changes.map(({ path }) => path).sort(), [
        'apps/demo/.cmz/libraries.json',
        'apps/demo/material.txt',
    ]);
    const manifest = JSON.parse(
        await readFile(join(root, 'candidate/apps/demo/.cmz/libraries.json'))
    );
    assert.deepEqual(manifest.libraries, ['angular-material']);
});

// Mesuré le 2026-09-05 : `@angular/material:ng-add` réécrit le package.json
// racine et lui retire son saut de ligne final — rien de sémantique, mais
// assez pour bloquer add-library à l'étape 5/8. Tolérer l'écriture en bloc
// aurait laissé passer un vrai changement de dépendance après la résolution
// contrôlée ; on n'accepte donc que l'équivalence sémantique, et on restaure
// l'octet exact d'origine.
test('une réécriture cosmétique du package.json est restaurée à l’octet près', async (t) => {
    const root = await fixture(t);
    const original = '{\n  "name": "candidat",\n  "dependencies": {}\n}\n';
    await put(root, 'candidate/package.json', original);
    const result = executeLibraryRecipe({
        repository: join(root, 'repo'),
        candidate: { workspace: join(root, 'candidate') },
        recipe,
        track: { packages: { material: '1.0.0' } },
        app: 'demo',
        policy: {},
        backend: 'test',
        cache: join(root, 'cache'),
        home: join(root, 'home'),
        run: ({ candidate, argv }) => {
            if (argv[0] === 'node_modules/nx/dist/bin/nx.js') {
                writeFileSync(
                    join(candidate, 'package.json'),
                    '{"name":"candidat","dependencies":{}}'
                );
            }
            return { status: 0, stdout: '', stderr: '' };
        },
    });
    assert.deepEqual(
        result.changes.map(({ path }) => path),
        ['apps/demo/.cmz/libraries.json']
    );
    assert.equal(
        await readFile(join(root, 'candidate/package.json'), 'utf8'),
        original
    );
});

test('refuse une recette qui touche réellement aux dépendances arrêtées', async (t) => {
    const root = await fixture(t);
    await put(
        root,
        'candidate/package.json',
        '{\n  "dependencies": { "@angular/material": "catalog:" }\n}\n'
    );
    assert.throws(
        () =>
            executeLibraryRecipe({
                repository: join(root, 'repo'),
                candidate: { workspace: join(root, 'candidate') },
                recipe,
                track: { packages: {} },
                app: 'demo',
                policy: {},
                backend: 'test',
                cache: join(root, 'cache'),
                home: join(root, 'home'),
                run: ({ candidate }) => {
                    writeFileSync(
                        join(candidate, 'package.json'),
                        '{"dependencies":{"@angular/material":"^22.0.5"}}'
                    );
                    return { status: 0, stdout: '', stderr: '' };
                },
            }),
        /modifié les dépendances arrêtées au temps 4/
    );
});

test('refuse une écriture racine ou une suppression même si la commande réussit', async (t) => {
    const root = await fixture(t);
    assert.throws(
        () =>
            executeLibraryRecipe({
                repository: join(root, 'repo'),
                candidate: { workspace: join(root, 'candidate') },
                recipe,
                track: { packages: {} },
                app: 'demo',
                policy: {},
                backend: 'test',
                cache: join(root, 'cache'),
                home: join(root, 'home'),
                run: ({ candidate }) => {
                    writeFileSync(join(candidate, 'outside'), 'bad');
                    return { status: 0, stdout: '', stderr: '' };
                },
            }),
        /hors périmètre/
    );
});

test('normalise exactement la sortie volatile du schematic et refuse toute dérive', async (t) => {
    const root = await fixture(t);
    await put(
        root,
        'candidate/apps/demo/src/index.html',
        '<head>remote</head>\n'
    );
    const normalizedRecipe = {
        ...recipe,
        install: {
            ...recipe.install,
            normalizations: [
                {
                    kind: 'exact-replacement',
                    file: 'src/index.html',
                    search: 'remote',
                    replacement: 'local',
                    occurrences: 1,
                },
            ],
        },
    };
    executeLibraryRecipe({
        repository: join(root, 'repo'),
        candidate: { workspace: join(root, 'candidate') },
        recipe: normalizedRecipe,
        track: { packages: {} },
        app: 'demo',
        policy: {},
        backend: 'test',
        cache: join(root, 'cache'),
        home: join(root, 'home'),
        run: () => ({ status: 0, stdout: '', stderr: '' }),
    });
    assert.equal(
        await readFile(
            join(root, 'candidate/apps/demo/src/index.html'),
            'utf8'
        ),
        '<head>local</head>\n'
    );

    const second = await fixture(t);
    await put(
        second,
        'candidate/apps/demo/src/index.html',
        '<head>changed</head>\n'
    );
    assert.throws(
        () =>
            executeLibraryRecipe({
                repository: join(second, 'repo'),
                candidate: { workspace: join(second, 'candidate') },
                recipe: normalizedRecipe,
                track: { packages: {} },
                app: 'demo',
                policy: {},
                backend: 'test',
                cache: join(second, 'cache'),
                home: join(second, 'home'),
                run: () => ({ status: 0, stdout: '', stderr: '' }),
            }),
        /normalisation attend 1 occurrence\(s\), 0 trouvée\(s\)/
    );
});

test('canonise toute sortie de recette avec Prettier dans le bac à sable', async (t) => {
    const root = await fixture(t);
    await put(root, 'candidate/apps/demo/src/index.html', '<head></head>\n');
    const invocations = [];
    executeLibraryRecipe({
        repository: join(root, 'repo'),
        candidate: { workspace: join(root, 'candidate') },
        recipe,
        track: { packages: {} },
        app: 'demo',
        policy: {},
        backend: 'test',
        cache: join(root, 'cache'),
        home: join(root, 'home'),
        run: ({ candidate, argv }) => {
            invocations.push(argv);
            if (argv[0] === 'node_modules/nx/dist/bin/nx.js') {
                writeFileSync(
                    join(candidate, 'apps/demo/src/index.html'),
                    '<head>     </head>\n'
                );
            } else if (argv[0] === 'node_modules/prettier/bin/prettier.cjs') {
                writeFileSync(
                    join(candidate, 'apps/demo/src/index.html'),
                    '<head></head>\n'
                );
            }
            return { status: 0, stdout: '', stderr: '' };
        },
    });
    assert.deepEqual(invocations.at(-1), [
        'node_modules/prettier/bin/prettier.cjs',
        '--write',
        '--ignore-unknown',
        'apps/demo/.cmz/libraries.json',
        'apps/demo/src/index.html',
    ]);
    assert.equal(
        await readFile(
            join(root, 'candidate/apps/demo/src/index.html'),
            'utf8'
        ),
        '<head></head>\n'
    );
});

test('ne reformate jamais un fichier applicatif étranger à la recette', async (t) => {
    const root = await fixture(t);
    await put(
        root,
        'candidate/apps/demo/src/unrelated.ts',
        'const   untouched=true\n'
    );
    let formattedPaths;
    executeLibraryRecipe({
        repository: join(root, 'repo'),
        candidate: { workspace: join(root, 'candidate') },
        recipe,
        track: { packages: {} },
        app: 'demo',
        policy: {},
        backend: 'test',
        cache: join(root, 'cache'),
        home: join(root, 'home'),
        run: ({ candidate, argv }) => {
            if (argv[0] === 'node_modules/nx/dist/bin/nx.js') {
                writeFileSync(
                    join(candidate, 'apps/demo/generated.ts'),
                    'export const generated=true\n'
                );
            } else if (argv[0] === 'node_modules/prettier/bin/prettier.cjs') {
                formattedPaths = argv.slice(3);
            }
            return { status: 0, stdout: '', stderr: '' };
        },
    });
    assert.deepEqual(formattedPaths, [
        'apps/demo/.cmz/libraries.json',
        'apps/demo/generated.ts',
    ]);
    assert.equal(
        await readFile(
            join(root, 'candidate/apps/demo/src/unrelated.ts'),
            'utf8'
        ),
        'const   untouched=true\n'
    );
});

test('le manifeste de l’app est écrit avant Prettier, donc canonisé', async (t) => {
    const root = await fixture(t);
    let manifestAtFormatTime;
    const changeSet = executeLibraryRecipe({
        repository: join(root, 'repo'),
        candidate: { workspace: join(root, 'candidate') },
        recipe,
        track: { packages: {} },
        app: 'demo',
        policy: {},
        backend: 'test',
        cache: join(root, 'cache'),
        home: join(root, 'home'),
        run: ({ candidate, argv }) => {
            if (argv[0] === 'node_modules/prettier/bin/prettier.cjs') {
                manifestAtFormatTime = readFileSync(
                    join(candidate, 'apps/demo/.cmz/libraries.json'),
                    'utf8'
                );
            }
            return { status: 0, stdout: '', stderr: '' };
        },
    });
    // Écrit après le formatage, le manifeste serait encore vide ici — et sa
    // sérialisation JSON.stringify partirait telle quelle dans le commit.
    assert.deepEqual(JSON.parse(manifestAtFormatTime).libraries, [
        'angular-material',
    ]);
    // Il doit aussi tomber sous le contrôle de périmètre final, donc figurer
    // dans le change-set validé et non dans un supplément non contrôlé.
    assert.ok(
        changeSet.changes.some(
            (change) => change.path === 'apps/demo/.cmz/libraries.json'
        )
    );
});
