// Reprise explicite d'une publication interrompue (ADR-0103) : verrou,
// frontière du passe-droit `recoveringApp` et commande
// recover:application-publication.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cp, readdir, readFile, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import test from 'node:test';

import { planExternalApplicationShell } from './core/application-workspace.mjs';
import {
    planApplicationPublication,
    recoverApplicationPublication,
} from './core/application-publication.mjs';
import { pathExists } from './core/external-application-paths.mjs';
import { withGenerationLock } from './core/generation-transaction.mjs';
import {
    snapshotTree,
    TOOLS_ROOT,
} from './test-support/external-application-fixture.mjs';
import {
    interruptAfterSwap,
    NOTICE,
    publication,
    sessionApp,
} from './test-support/external-publication-fixture.mjs';

const CLI = join(TOOLS_ROOT, 'tools/recover-application-publication.mjs');

function recoverCli(args) {
    return spawnSync(process.execPath, [CLI, ...args], {
        cwd: TOOLS_ROOT,
        encoding: 'utf8',
        timeout: 120_000,
    });
}

test('X2 préparatoire : la reprise explicite prend le verrou de l’application (V-MC)', async (t) => {
    const product = await sessionApp(t, 'observatory');
    const options = publication(product, { [NOTICE]: 'export {};\n' });
    const before = await snapshotTree(product.root, []);
    await withGenerationLock(product.app, async () => {
        await assert.rejects(
            recoverApplicationPublication(options),
            /another generation owns/
        );
    });
    assert.deepEqual(await recoverApplicationPublication(options), {
        recovered: false,
    });
    assert.deepEqual(await snapshotTree(product.root, []), before);
});

// Fable I-1 (revue du suivi X1) : l'exception de reprise est un second
// paramètre de fonctions exportées. Seuls le planificateur d'espace, la
// vérification de la racine qu'il délègue et la publication la portent.
test('X2 préparatoire : `recoveringApp` n’apparaît que dans les modules autorisés', async () => {
    const allowed = new Set([
        'tools/generator-platform/core/application-workspace.mjs',
        'tools/generator-platform/core/application-workspace-root.mjs',
        'tools/generator-platform/core/application-publication.mjs',
        relative(TOOLS_ROOT, new URL(import.meta.url).pathname),
    ]);
    const skipped = new Set(['node_modules', '.stack-test-runtime']);
    const found = [];
    async function visit(directory) {
        for (const entry of await readdir(directory, { withFileTypes: true })) {
            if (skipped.has(entry.name)) continue;
            const path = join(directory, entry.name);
            if (entry.isDirectory()) await visit(path);
            else if (
                entry.isFile() &&
                entry.name.endsWith('.mjs') &&
                (await readFile(path, 'utf8')).includes('recoveringApp')
            )
                found.push(relative(TOOLS_ROOT, path));
        }
    }
    await visit(join(TOOLS_ROOT, 'tools'));
    assert.ok(found.length >= 3, 'Oracle inopérant');
    assert.deepEqual(
        found.filter((path) => !allowed.has(path)),
        [],
        'Passe-droit de reprise utilisé hors des modules autorisés'
    );
});

test('X2 préparatoire : un candidat complet est repris sans plan (M-7)', async (t) => {
    const product = await sessionApp(t, 'equipment-hire');
    const before = await snapshotTree(product.root, []);
    const candidate = join(
        product.root,
        'apps',
        `.${product.shell.appName}.publication-candidate-${'e'.repeat(64)}`
    );
    await cp(product.app, candidate, { recursive: true });
    await assert.rejects(
        planExternalApplicationShell({ ...product.shell, appName: 'other' }),
        /interrupted publication pending/
    );
    assert.deepEqual(await recoverApplicationPublication(product.base), {
        recovered: true,
    });
    assert.equal(await pathExists(candidate), false);
    assert.deepEqual(await snapshotTree(product.root, []), before);
});

test('X2 préparatoire : recover:application-publication reprend, refuse l’ambigu et n’invente rien', async (t) => {
    const product = await sessionApp(t, 'observatory');
    const options = publication(product, { [NOTICE]: 'export {};\n' });
    const args = [
        '--target-root',
        product.root,
        '--app',
        product.shell.appName,
    ];
    const before = await snapshotTree(product.root, []);
    let result = recoverCli(args);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(JSON.parse(result.stdout).status, 'nothing-to-recover');
    // Interruption après échange : la commande rend l'état relu.
    const plan = await interruptAfterSwap(product, options);
    result = recoverCli(args);
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(JSON.parse(result.stdout), {
        schema_version: '1.0.0',
        app_name: product.shell.appName,
        status: 'recovered',
    });
    assert.deepEqual(await snapshotTree(product.root, []), before);
    await planApplicationPublication(options);
    // État altéré : refus, rien n'est déplacé, la marche à suivre est donnée.
    await cp(product.app, plan.previous, { recursive: true });
    await writeFile(join(product.app, product.page), 'modifié à la main\n');
    const altered = await snapshotTree(product.root, []);
    result = recoverCli(args);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /ambiguous interrupted publication/);
    assert.match(result.stderr, /Ownership et reprise/);
    assert.doesNotMatch(result.stderr, /\/Users\/|\/private\//);
    assert.deepEqual(await snapshotTree(product.root, []), altered);
    // Usage fermé : options requises, inconnues ou répétées refusées.
    for (const [argv, pattern] of [
        [
            ['--app', product.shell.appName],
            /--target-root et --app sont requis/,
        ],
        [[...args, '--force', 'x'], /Argument inconnu : --force/],
        [[...args, '--app', 'x'], /ne peut pas être répétée/],
        [['--target-root', 'relatif', '--app', 'x'], /canonical absolute/],
    ]) {
        result = recoverCli(argv);
        assert.equal(result.status, 1);
        assert.match(result.stderr, pattern);
    }
});
