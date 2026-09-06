import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import { snapshotFilesystem } from './filesystem-snapshot.mjs';

async function workspace(t) {
    const root = realpathSync(await mkdtemp(join(tmpdir(), 'cmz-snapshot-')));
    t.after(() => rm(root, { recursive: true, force: true }));
    return root;
}

// Régression du 2026-09-05 : l'exclusion ne portait que sur le premier niveau.
// Bun matérialise un node_modules par paquet du workspace, donc `bun install
// --frozen-lockfile` — qui ne doit rien changer — produisait 498 « mutations
// gouvernées » et bloquait add-library à l'étape 4/8. Ce test reproduit la
// forme exacte qui échouait.
test('les node_modules imbriqués de Bun sont exclus comme celui de la racine', async (t) => {
    const root = await workspace(t);
    await mkdir(join(root, 'libs/administrative-boundary/data'), {
        recursive: true,
    });
    await writeFile(
        join(root, 'libs/administrative-boundary/data/index.ts'),
        'export const gouverne = 1;\n'
    );
    await mkdir(join(root, 'node_modules/rxjs'), { recursive: true });
    await writeFile(join(root, 'node_modules/rxjs/index.js'), 'racine');
    await mkdir(
        join(root, 'libs/administrative-boundary/data/node_modules/@cmz'),
        { recursive: true }
    );
    await writeFile(
        join(root, 'libs/administrative-boundary/data/node_modules/@cmz/core'),
        'lien-installation'
    );

    assert.deepEqual(
        snapshotFilesystem(root, {
            excludedDirectories: ['node_modules'],
        }).map(({ path }) => path),
        ['libs/administrative-boundary/data/index.ts']
    );
});

test('sans exclusion, les mêmes chemins sont bien visibles', async (t) => {
    const root = await workspace(t);
    await mkdir(join(root, 'libs/data/node_modules'), { recursive: true });
    await writeFile(join(root, 'libs/data/node_modules/x'), 'x');

    assert.deepEqual(
        snapshotFilesystem(root).map(({ path }) => path),
        ['libs/data/node_modules/x']
    );
});

test('un nom exclu porté par autre chose qu’un répertoire est refusé, à toute profondeur', async (t) => {
    const fileNamed = await workspace(t);
    await mkdir(join(fileNamed, 'libs/data'), { recursive: true });
    await writeFile(join(fileNamed, 'libs/data/node_modules'), 'piège');
    assert.throws(
        () =>
            snapshotFilesystem(fileNamed, {
                excludedDirectories: ['node_modules'],
            }),
        /exclusion libs\/data\/node_modules n'est pas un vrai répertoire/
    );

    const linkNamed = await workspace(t);
    await mkdir(join(linkNamed, 'libs/data'), { recursive: true });
    await symlink(linkNamed, join(linkNamed, 'libs/data/node_modules'));
    assert.throws(
        () =>
            snapshotFilesystem(linkNamed, {
                excludedDirectories: ['node_modules'],
            }),
        /exclusion libs\/data\/node_modules n'est pas un vrai répertoire/
    );
});
