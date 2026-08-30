import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
    appendFile,
    chmod,
    copyFile,
    mkdir,
    mkdtemp,
    rm,
    symlink,
    writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const REPO_ROOT = fileURLToPath(new URL('..', import.meta.url));
const MODULE = 'obsolete-feature';

async function write(path, content) {
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, content);
}

function git(root, ...args) {
    return spawnSync('git', args, { cwd: root, encoding: 'utf8' });
}

async function createWorkspace(t, { initializeGit = true } = {}) {
    const root = await mkdtemp(join(tmpdir(), 'cmz-no-orphans-'));
    t.after(() => rm(root, { recursive: true, force: true }));
    await mkdir(join(root, 'tools'), { recursive: true });
    await copyFile(
        join(REPO_ROOT, 'tools', 'check-no-orphan-references.mjs'),
        join(root, 'tools', 'check-no-orphan-references.mjs')
    );
    if (initializeGit) {
        const initialized = git(root, 'init', '--quiet');
        assert.equal(initialized.status, 0, initialized.stderr);
        await write(join(root, '.gitignore'), '/ignored/\n');
    }
    return root;
}

function runCheck(root, args = [], env = {}) {
    return spawnSync(
        process.execPath,
        [
            join(root, 'tools', 'check-no-orphan-references.mjs'),
            '--module',
            MODULE,
            ...args,
        ],
        { cwd: root, encoding: 'utf8', env: { ...process.env, ...env } }
    );
}

function exactReference(root, file, line, reason) {
    const result = runCheck(root);
    const escapedFile = file.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = result.stderr.match(
        new RegExp(
            `NON APPROUVÉE ${escapedFile}:${line}:\\d+[\\s\\S]*?` +
                `occurrence-sha256: ([a-f0-9]{64})`
        )
    );
    assert.ok(match, `Occurrence exacte introuvable pour ${file}:${line}`);
    return `${file}::${match[1]}::${reason}`;
}

test('scanne les fichiers sans extension et les chemins Git', async (t) => {
    const root = await createWorkspace(t);
    await write(join(root, 'config'), `endpoint=${MODULE}\n`);
    await write(
        join(root, 'docs', `${MODULE}-archive`, 'clean.txt'),
        'contenu sans référence\n'
    );

    const result = runCheck(root);

    assert.equal(result.status, 1);
    assert.match(result.stderr, /config:1/);
    assert.match(result.stderr, /\[path\/separator\]/);
    assert.match(result.stderr, new RegExp(`${MODULE}-archive`));
});

test('scanne corpus au lieu de l’exclure par nom de dossier', async (t) => {
    const root = await createWorkspace(t);
    await write(
        join(root, 'tools', 'corpus', 'pair.custom'),
        `legacy_module=${MODULE}\n`
    );

    const result = runCheck(root);

    assert.equal(result.status, 1);
    assert.match(result.stderr, /tools\/corpus\/pair\.custom:1/);
});

test('détecte les formes snake_case, camelCase et PascalCase dérivées', async (t) => {
    const root = await createWorkspace(t);
    await write(
        join(root, 'identifiers.ts'),
        [
            'const obsolete_feature = true;',
            'const obsoleteFeatureAdapter = true;',
            'class ExecuteObsoleteFeature {}',
        ].join('\n')
    );

    const result = runCheck(root);

    assert.equal(result.status, 1);
    assert.match(result.stderr, /identifiers\.ts:1/);
    assert.match(result.stderr, /identifiers\.ts:2/);
    assert.match(result.stderr, /identifiers\.ts:3/);
});

test('scanne les octets binaires et UTF-16 sans dépendre de l’extension', async (t) => {
    const root = await createWorkspace(t);
    await write(
        join(root, 'assets', 'payload.bin'),
        Buffer.concat([Buffer.from([1, 2, 0, 3]), Buffer.from(MODULE)])
    );
    await write(
        join(root, 'assets', 'payload.dat'),
        Buffer.from(`prefix ${MODULE} suffix`, 'utf16le')
    );

    const result = runCheck(root);

    assert.equal(result.status, 1);
    assert.match(result.stderr, /assets\/payload\.bin:1/);
    assert.match(result.stderr, /assets\/payload\.dat:1/);
});

test('neutralise les caractères de contrôle dans les diagnostics', async (t) => {
    const root = await createWorkspace(t);
    await write(join(root, 'payload.txt'), `\u001b${MODULE}\u0007\n`);

    const result = runCheck(root);

    assert.equal(result.status, 1);
    assert.match(result.stderr, /\[content\/separator\] obsolete-feature/);
    assert.equal(result.stderr.includes('\u001b'), false);
});

test('inspecte la cible d’un lien sans jamais le suivre', async (t) => {
    const root = await createWorkspace(t);
    await symlink(`../outside-${MODULE}`, join(root, 'docs-link'), 'file');

    const result = runCheck(root);

    assert.equal(result.status, 1);
    assert.match(result.stderr, /docs-link:1/);
    assert.match(result.stderr, /\[symlink-target\/separator\]/);
});

test('classe explicitement les suppressions Git comme absentes du résultat', async (t) => {
    const root = await createWorkspace(t);
    const trackedPath = join(root, 'tracked.txt');
    await write(trackedPath, 'présent au moment du git add\n');
    const added = git(root, 'add', 'tracked.txt');
    assert.equal(added.status, 0, added.stderr);
    await rm(trackedPath);

    const result = runCheck(root);

    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.match(result.stdout, /1 suppressions Git prouvées absentes/);
});

test('échoue si une entrée de l’inventaire devient inaccessible', async (t) => {
    const root = await createWorkspace(t);
    const binDir = join(root, 'fake-bin');
    const fakeGit = join(binDir, 'git');
    await write(
        fakeGit,
        [
            '#!/bin/sh',
            'if [ "$1 $2" = "rev-parse --show-toplevel" ]; then',
            '  printf "%s\\n" "$PWD"',
            'elif [ "$1 $2" = "ls-files --cached" ]; then',
            "  printf 'missing.txt\\0'",
            'fi',
        ].join('\n')
    );
    await chmod(fakeGit, 0o755);

    const result = runCheck(root, [], {
        PATH: `${binDir}:${process.env.PATH || ''}`,
    });

    assert.equal(result.status, 1);
    assert.match(result.stderr, /Entrée Git inaccessible missing\.txt/);
    assert.match(result.stderr, /ENOENT/);
});

test('exclut uniquement les entrées ignorées par Git et publie ce périmètre', async (t) => {
    const root = await createWorkspace(t);
    await write(join(root, 'ignored', 'secret.txt'), MODULE);
    await write(join(root, 'safe.txt'), 'aucune référence active\n');

    const result = runCheck(root);

    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.match(result.stdout, /sans filtre d'extension/);
    assert.match(result.stdout, /1 entrées ignorées par Git hors preuve/);
    assert.match(result.stdout, /0 exclusion interne/);
});

test('interdit explicitement les anciennes allowlists de fichier entier', async (t) => {
    const root = await createWorkspace(t);
    await write(
        join(root, 'ignored', 'history.md'),
        `${MODULE} a été retiré.\n`
    );

    const result = runCheck(root, ['--allow', 'ignored/history.md']);

    assert.equal(result.status, 1);
    assert.match(result.stderr, /--allow est interdit/);
});

test('refuse une classification chemin::raison sans identité d’occurrence', async (t) => {
    const root = await createWorkspace(t);
    await write(join(root, 'docs', 'history.md'), `${MODULE} retiré.\n`);

    const result = runCheck(root, [
        '--create-tombstone',
        `docs/architecture/removed-modules/${MODULE}.json`,
        '--historical-reference',
        'docs/history.md::raison de fichier interdite',
    ]);

    assert.equal(result.status, 1);
    assert.match(result.stderr, /chemin::occurrence-sha256::raison/);
});

test('une raison ne peut jamais blanchir deux occurrences préexistantes du même fichier', async (t) => {
    const root = await createWorkspace(t);
    const history = join(root, 'docs', 'history.md');
    const tombstone = `docs/architecture/removed-modules/${MODULE}.json`;
    await write(
        history,
        `${MODULE} retiré après le POC.\n${MODULE} référence active non liée.\n`
    );

    const result = runCheck(root, [
        '--create-tombstone',
        tombstone,
        '--historical-reference',
        exactReference(root, 'docs/history.md', 1, 'mention historique revue'),
    ]);

    assert.equal(result.status, 1);
    assert.match(result.stderr, /1 occurrence\(s\) non classifiée\(s\)/);
    assert.match(result.stderr, /docs\/history\.md:2/);
});

test('un tombstone exempte une occurrence exacte, jamais les suivantes du même fichier', async (t) => {
    const root = await createWorkspace(t);
    const history = join(root, 'docs', 'history.md');
    const tombstone = `docs/architecture/removed-modules/${MODULE}.json`;
    await write(history, `${MODULE} retiré après le POC.\n\n`);

    const created = runCheck(root, [
        '--create-tombstone',
        tombstone,
        '--historical-reference',
        exactReference(root, 'docs/history.md', 1, 'mention historique revue'),
    ]);
    assert.equal(created.status, 0, created.stderr || created.stdout);
    assert.match(created.stdout, /1 occurrences exactes/);

    await appendFile(history, `${MODULE} référence active non liée.\n`);
    const checked = runCheck(root, ['--tombstone', tombstone]);

    assert.equal(checked.status, 1);
    assert.match(checked.stderr, /1 occurrence\(s\) non approuvée\(s\)/);
    assert.match(checked.stderr, /docs\/history\.md:3/);
});

test('un changement de contexte invalide l’occurrence et rend le tombstone périmé', async (t) => {
    const root = await createWorkspace(t);
    const history = join(root, 'docs', 'history.md');
    const tombstone = `docs/architecture/removed-modules/${MODULE}.json`;
    await write(history, `avant\n${MODULE} retiré.\naprès\n`);
    const created = runCheck(root, [
        '--create-tombstone',
        tombstone,
        '--historical-reference',
        exactReference(root, 'docs/history.md', 2, 'historique revu'),
    ]);
    assert.equal(created.status, 0, created.stderr || created.stdout);

    await write(history, `contexte modifié\n${MODULE} retiré.\naprès\n`);
    const checked = runCheck(root, ['--tombstone', tombstone]);

    assert.equal(checked.status, 1);
    assert.match(
        checked.stderr,
        /1 occurrence\(s\) non approuvée\(s\) et 1 tombstone\(s\) périmé\(s\)/
    );
});

test('refuse un tombstone canonique qui est un lien symbolique hors workspace', async (t) => {
    const root = await createWorkspace(t);
    const externalRoot = await mkdtemp(
        join(tmpdir(), 'cmz-tombstone-external-')
    );
    t.after(() => rm(externalRoot, { recursive: true, force: true }));
    const external = join(externalRoot, 'proof.json');
    await write(
        external,
        `${JSON.stringify({
            version: 1,
            module: MODULE,
            createdAt: '2026-08-29T00:00:00.000Z',
            references: [],
        })}\n`
    );
    const tombstone = `docs/architecture/removed-modules/${MODULE}.json`;
    await mkdir(dirname(join(root, tombstone)), { recursive: true });
    await symlink(external, join(root, tombstone), 'file');

    const result = runCheck(root, ['--tombstone', tombstone]);

    assert.equal(result.status, 1);
    assert.match(result.stderr, /fichier régulier/);
});

test('refuse de créer un tombstone à travers un dossier symbolique', async (t) => {
    const root = await createWorkspace(t);
    const externalRoot = await mkdtemp(join(tmpdir(), 'cmz-tombstone-parent-'));
    t.after(() => rm(externalRoot, { recursive: true, force: true }));
    await mkdir(join(root, 'docs', 'architecture'), { recursive: true });
    await symlink(
        externalRoot,
        join(root, 'docs', 'architecture', 'removed-modules'),
        'dir'
    );

    const result = runCheck(root, [
        '--create-tombstone',
        `docs/architecture/removed-modules/${MODULE}.json`,
    ]);

    assert.equal(result.status, 1);
    assert.match(result.stderr, /Parent de tombstone non régulier/);
});

test('échoue si Git ne peut pas établir le périmètre canonique', async (t) => {
    const root = await createWorkspace(t, { initializeGit: false });

    const result = runCheck(root);

    assert.equal(result.status, 1);
    assert.match(
        result.stderr,
        /Impossible d'établir l'inventaire Git canonique/
    );
});
