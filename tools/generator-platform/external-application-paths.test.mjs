import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { cp, mkdir, readFile, symlink, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';

import {
    assertSourceWeight,
    externalApplicationContext,
    pathExists,
    readProductFile,
    safeRelativePath,
    stageGeneratedTree,
} from './core/external-application-paths.mjs';
import { withGenerationLock } from './core/generation-transaction.mjs';
import {
    fixtureParent,
    prepareFixture,
    snapshotTree,
    TOOLS_ROOT,
} from './test-support/external-application-fixture.mjs';

test('T2 : pas de racine, ancêtre ou descendant de l’atelier', async () => {
    for (const targetRoot of [
        TOOLS_ROOT,
        dirname(TOOLS_ROOT),
        join(TOOLS_ROOT, 'apps/new-product'),
    ])
        await assert.rejects(
            externalApplicationContext({
                workspaceRoot: TOOLS_ROOT,
                targetRoot,
            }),
            /overlaps the active workshop/
        );
    for (const targetRoot of ['relative', '/', resolve(TOOLS_ROOT) + '/..'])
        await assert.rejects(
            externalApplicationContext({
                workspaceRoot: TOOLS_ROOT,
                targetRoot,
            }),
            /canonical absolute target-root required/
        );
});

test('m2 : même un marqueur portable valide ne peut posséder la racine des outils', async (t) => {
    const fixture = await prepareFixture(t);
    await mkdir(join(fixture.root, '.git'));
    const before = await snapshotTree(fixture.root, []);
    for (const targetRoot of [
        fixture.root,
        dirname(fixture.root),
        join(fixture.root, 'apps'),
    ]) {
        await assert.rejects(
            externalApplicationContext({
                workspaceRoot: fixture.root,
                targetRoot,
            }),
            /target overlaps the active workshop/
        );
    }
    assert.deepEqual(await snapshotTree(fixture.root, []), before);
});

test('T2 : autre dépôt existant et liens, y compris lien pendant', async (t) => {
    const parent = await fixtureParent(t);
    await mkdir(join(parent, 'foreign-repository/.git'), { recursive: true });
    await mkdir(join(parent, 'plain'));
    await symlink(join(parent, 'plain'), join(parent, 'linked'));
    await symlink(join(parent, 'absent'), join(parent, 'dangling'));
    const before = await snapshotTree(parent);
    for (const targetRoot of [
        join(parent, 'foreign-repository/product'),
        join(parent, 'linked/product'),
        join(parent, 'dangling'),
    ])
        await assert.rejects(
            externalApplicationContext({
                workspaceRoot: TOOLS_ROOT,
                targetRoot,
            })
        );
    assert.deepEqual(await snapshotTree(parent), before);
});

test('T2 : une racine produit possédée reste utilisable après son initialisation Git', async (t) => {
    const fixture = await prepareFixture(t);
    await mkdir(join(fixture.root, '.git'));
    const context = await externalApplicationContext({
        workspaceRoot: TOOLS_ROOT,
        targetRoot: fixture.root,
    });
    assert.equal(context.productRoot, fixture.root);
});

test('T3 : chemins d’artefacts refusés avant mkdir ; aucun voisin modifié', async (t) => {
    const parent = await fixtureParent(t);
    await writeFile(join(parent, 'witness'), 'témoin\n');
    const before = await snapshotTree(parent);
    for (const path of [
        '../witness',
        '/absolute',
        'nested/../../witness',
        './file',
        'a//b',
    ]) {
        assert.throws(() => safeRelativePath(path));
        await assert.rejects(
            stageGeneratedTree(join(parent, 'candidate'), { [path]: 'attaque' })
        );
    }
    assert.deepEqual(await snapshotTree(parent), before);
});

test('T3 : un lien dans le candidat ne devient jamais un fichier de sortie', async (t) => {
    const parent = await fixtureParent(t);
    const candidate = join(parent, 'candidate');
    await mkdir(candidate);
    await writeFile(join(parent, 'witness'), 'intact\n');
    await symlink(join(parent, 'witness'), join(candidate, 'file'));
    await assert.rejects(
        stageGeneratedTree(candidate, { file: 'remplacement' })
    );
    await assert.rejects(readProductFile(candidate, 'file'));
    assert.equal(await readFile(join(parent, 'witness'), 'utf8'), 'intact\n');
});

test('T8 : verrou réel exclusif par destination, destinations indépendantes', async (t) => {
    const parent = await fixtureParent(t);
    const a = join(parent, 'a');
    const b = join(parent, 'b');
    let entered;
    const started = new Promise((done) => {
        entered = done;
    });
    let release;
    const barrier = new Promise((done) => {
        release = done;
    });
    const first = withGenerationLock(a, async () => {
        entered();
        await barrier;
    });
    await started;
    try {
        await assert.rejects(
            withGenerationLock(a, async () => assert.fail('Deux propriétaires'))
        );
        let independent = false;
        await withGenerationLock(b, async () => {
            independent = true;
        });
        assert.equal(independent, true);
    } finally {
        release();
        await first;
    }
    assert.equal(await pathExists(join(parent, '.a.generation-lock')), false);
});

test('T14 : un fichier source non indexé à 801 lignes échoue', async (t) => {
    const parent = await fixtureParent(t);
    await writeFile(join(parent, 'untracked.mjs'), 'export {};\n'.repeat(801));
    await assert.rejects(assertSourceWeight(parent), /source weight/);
    await writeFile(join(parent, 'untracked.mjs'), 'export {};\n');
    await assertSourceWeight(parent);
});

test('EXT01 v4 T-1 : une cible contenant une copie de travail enregistrée est refusée', async (t) => {
    const parent = await fixtureParent(t);
    const toolsRoot = join(parent, 'tools-parent/workshop');
    const targetRoot = join(parent, 'target-contains-worktree');
    const worktree = join(targetRoot, 'registered-worktree');
    const hooks = join(parent, 'empty-hooks');
    await mkdir(toolsRoot, { recursive: true });
    await mkdir(hooks);
    // Copy metadata first: worktree add can only register in this fixture.
    await cp(join(TOOLS_ROOT, '.git'), join(toolsRoot, '.git'), {
        recursive: true,
    });
    const git = (args) =>
        execFileSync(
            'git',
            [
                '--no-optional-locks',
                '-C',
                toolsRoot,
                '-c',
                'core.hooksPath=' + hooks,
                ...args,
            ],
            {
                encoding: 'utf8',
                stdio: ['ignore', 'pipe', 'pipe'],
                env: {
                    HOME: parent,
                    PATH: '/usr/bin:/bin',
                    GIT_CONFIG_NOSYSTEM: '1',
                    GIT_CONFIG_GLOBAL: '/dev/null',
                },
            }
        );
    git(['worktree', 'add', '--detach', '--no-checkout', worktree, 'HEAD']);
    assert.ok(
        git(['worktree', 'list', '--porcelain']).includes(
            'worktree ' + worktree + '\n'
        )
    );
    assert.equal(worktree.startsWith(dirname(toolsRoot) + '/'), false);
    const before = await snapshotTree(parent);
    await assert.rejects(
        externalApplicationContext({ workspaceRoot: toolsRoot, targetRoot }),
        /target overlaps a repository or worktree/
    );
    assert.deepEqual(await snapshotTree(parent), before);
});
