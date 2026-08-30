import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
    appendFile,
    chmod,
    copyFile,
    mkdir,
    mkdtemp,
    readFile,
    rm,
    symlink,
    writeFile,
} from 'node:fs/promises';
import { hostname, tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

import { publishTombstone } from './orphan-tombstone-update.mjs';

const REPO_ROOT = fileURLToPath(new URL('..', import.meta.url));
const MODULE = 'obsolete-feature';

test('le publisher refuse lui-même tout chemin de tombstone hors workspace', async (t) => {
    const root = await mkdtemp(join(tmpdir(), 'cmz-tombstone-boundary-'));
    t.after(() => rm(root, { recursive: true, force: true }));
    assert.throws(
        () =>
            publishTombstone({
                root,
                relativePath: '../escape.json',
                tombstone: { version: 1, module: MODULE, references: [] },
            }),
        /hors workspace/
    );
});

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
    await copyFile(
        join(REPO_ROOT, 'tools', 'orphan-tombstone-update.mjs'),
        join(root, 'tools', 'orphan-tombstone-update.mjs')
    );
    await copyFile(
        join(REPO_ROOT, 'tools', 'orphan-occurrence.mjs'),
        join(root, 'tools', 'orphan-occurrence.mjs')
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
    assert.match(result.stdout, /0 tombstone\(s\) canonique\(s\)/);
});

test('ne confond jamais un module avec un scope voisin plus long', async (t) => {
    const root = await createWorkspace(t);
    const neighbor = `${MODULE}-home`;
    await write(
        join(root, 'libs', neighbor, 'domain', 'project.json'),
        `${JSON.stringify({
            name: `@cmz/${neighbor}-domain`,
            tags: [`scope:${neighbor}`, 'type:domain'],
        })}\n`
    );
    await write(
        join(root, 'libs', neighbor, 'domain', 'src', 'index.ts'),
        `export const obsoleteFeatureHome = '@cmz/${neighbor}-domain';\n`
    );

    const neighborOnly = runCheck(root);
    assert.equal(
        neighborOnly.status,
        0,
        neighborOnly.stderr || neighborOnly.stdout
    );

    await rm(join(root, 'libs', neighbor), { recursive: true });
    await write(
        join(
            root,
            'docs',
            'architecture',
            'removed-modules',
            `${neighbor}.json`
        ),
        `${JSON.stringify({
            version: 1,
            module: neighbor,
            createdAt: new Date(0).toISOString(),
            references: [],
        })}\n`
    );
    const retiredNeighborOnly = runCheck(root);
    assert.equal(
        retiredNeighborOnly.status,
        0,
        retiredNeighborOnly.stderr || retiredNeighborOnly.stdout
    );

    await write(
        join(root, 'libs', neighbor, 'domain', 'src', 'consumer.ts'),
        `import '@cmz/${MODULE}-domain';\n`
    );
    const realConsumer = runCheck(root);
    assert.equal(realConsumer.status, 1);
    assert.match(realConsumer.stderr, /consumer\.ts:1/);
});

test('valide puis sort les autres tombstones du corpus lexical', async (t) => {
    const root = await createWorkspace(t);
    const tombstone = 'docs/architecture/removed-modules/another-module.json';
    await write(
        join(root, tombstone),
        `${JSON.stringify(
            {
                version: 1,
                module: 'another-module',
                createdAt: new Date(0).toISOString(),
                references: [
                    {
                        file: `libs/${MODULE}/domain/project.json`,
                        location: 'path',
                        pattern: 'separator',
                        match: MODULE,
                        logicalLineSha256: 'a'.repeat(64),
                        contextSha256: 'b'.repeat(64),
                        occurrence: 0,
                        contextOccurrence: 0,
                        lineHint: null,
                        columnHint: 1,
                        category: 'historical',
                        reason: 'preuve historique',
                    },
                ],
            },
            null,
            2
        )}\n`
    );

    const result = runCheck(root);
    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.match(result.stdout, /1 tombstone\(s\) canonique\(s\)/);
});

test('classifie occurrence par occurrence l’unique définition source propriétaire', async (t) => {
    const root = await createWorkspace(t);
    const definition = `tools/generator-platform/sources/${MODULE}.definition.json`;
    await write(
        join(root, definition),
        `${JSON.stringify({ feature: { id: MODULE }, description: MODULE })}\n`
    );
    await write(
        join(root, 'definition-consumer.test.mjs'),
        `const source = 'sources/${MODULE}.definition.json';\n`
    );
    const tombstone = `docs/architecture/removed-modules/${MODULE}.json`;
    const created = runCheck(root, [
        '--create-tombstone',
        tombstone,
        '--retain-source-definition',
    ]);
    assert.equal(created.status, 0, created.stderr || created.stdout);
    const document = JSON.parse(await readFile(join(root, tombstone), 'utf8'));
    assert.equal(document.references.length, 4);
    assert.ok(
        document.references
            .filter((reference) => reference.file === definition)
            .every((reference) => reference.category === 'historical')
    );
    assert.equal(
        document.references.find(
            (reference) => reference.file === 'definition-consumer.test.mjs'
        )?.category,
        'active'
    );

    await write(join(root, 'consumer.ts'), `import '${MODULE}';\n`);
    const checked = runCheck(root, ['--tombstone', tombstone]);
    assert.equal(checked.status, 1);
    assert.match(checked.stderr, /consumer\.ts:1/);
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

test('actualise seulement les occurrences nouvelles explicitement classifiées', async (t) => {
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
    const createdAt = JSON.parse(
        await readFile(join(root, tombstone), 'utf8')
    ).createdAt;
    await write(history, `contexte modifié\n${MODULE} retiré.\naprès\n`);

    const refused = runCheck(root, ['--update-tombstone', tombstone]);
    assert.equal(refused.status, 1);
    assert.match(refused.stderr, /1 occurrence\(s\) nouvelle\(s\)/);

    const updated = runCheck(root, [
        '--update-tombstone',
        tombstone,
        '--historical-reference',
        exactReference(root, 'docs/history.md', 2, 'contexte revu'),
    ]);
    assert.equal(updated.status, 0, updated.stderr || updated.stdout);
    const document = JSON.parse(await readFile(join(root, tombstone), 'utf8'));
    assert.equal(document.createdAt, createdAt);
    assert.equal(document.references.length, 1);
    assert.equal(document.references[0].reason, 'contexte revu');
});

test('sérialise les actualisations et récupère un verrou local mort', async (t) => {
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
    const specification = exactReference(
        root,
        'docs/history.md',
        2,
        'contexte revu'
    );
    const lock = join(
        root,
        'docs/architecture/removed-modules/.tombstone-update.lock'
    );
    await write(
        lock,
        `${JSON.stringify({ pid: process.pid, hostname: hostname() })}\n`
    );

    const refused = runCheck(root, [
        '--update-tombstone',
        tombstone,
        '--historical-reference',
        specification,
    ]);
    assert.equal(refused.status, 1);
    assert.match(refused.stderr, /actualisation de tombstone déjà en cours/i);

    await write(
        lock,
        `${JSON.stringify({ pid: 99_999_999, hostname: hostname() })}\n`
    );
    const recovered = runCheck(root, [
        '--update-tombstone',
        tombstone,
        '--historical-reference',
        specification,
    ]);
    assert.equal(recovered.status, 0, recovered.stderr || recovered.stdout);
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

test('refuse d’écraser un tombstone qui est un lien symbolique cassé', async (t) => {
    const root = await createWorkspace(t);
    const tombstone = `docs/architecture/removed-modules/${MODULE}.json`;
    await mkdir(dirname(join(root, tombstone)), { recursive: true });
    await symlink(join(root, 'cible-absente'), join(root, tombstone), 'file');

    const result = runCheck(root, ['--create-tombstone', tombstone]);

    assert.equal(result.status, 1);
    assert.match(result.stderr, /Refus d'écraser le tombstone existant/);
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
