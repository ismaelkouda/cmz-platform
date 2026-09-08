#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import {
    chmodSync,
    existsSync,
    lstatSync,
    mkdtempSync,
    readFileSync,
    realpathSync,
    rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SOURCE = realpathSync(fileURLToPath(new URL('../..', import.meta.url)));
const APP = 'library-composition-proof';
const DESIGN = 'designs/application-conception-proof.application-design.json';
const EXPERIENCE = 'visitor-web';
const COMMAND_TIMEOUT_MS = 20 * 60_000;
const MAX_BUFFER = 32 * 1024 * 1024;

function fail(message) {
    throw new Error(`create-app → add-library integration: ${message}`);
}

function run(command, args, cwd, options = {}) {
    return execFileSync(command, args, {
        cwd,
        encoding: 'utf8',
        maxBuffer: MAX_BUFFER,
        timeout: COMMAND_TIMEOUT_MS,
        ...options,
    });
}

function git(repository, args, options = {}) {
    return run('git', ['-C', repository, ...args], repository, options).trim();
}

function assertClean(repository, label) {
    const status = git(repository, [
        'status',
        '--porcelain=v1',
        '--untracked-files=all',
    ]);
    if (status) fail(`${label} n'est pas propre :\n${status}`);
}

function runNode(repository, script, args, { json = false } = {}) {
    const output = run(process.execPath, [script, ...args], repository, {
        stdio: json ? ['ignore', 'pipe', 'inherit'] : 'inherit',
    });
    if (!json) return undefined;
    try {
        return JSON.parse(output);
    } catch (error) {
        fail(`${script} n'a pas produit un JSON strict : ${error.message}`);
    }
}

function changedPaths(repository, commit) {
    const output = git(repository, [
        'diff-tree',
        '--no-commit-id',
        '--name-only',
        '-r',
        commit,
    ]);
    return output ? output.split('\n').sort() : [];
}

function assertInitialCommitOwnsOnlyApp(repository, commit) {
    const paths = changedPaths(repository, commit);
    if (
        paths.length === 0 ||
        paths.some((path) => !path.startsWith(`apps/${APP}/`))
    ) {
        fail(
            `le commit create-app sort de apps/${APP}/ : ${paths.join(', ') || '(vide)'}`
        );
    }
}

function assertLibraryResult(repository, result, library) {
    if (
        result?.published !== true ||
        result?.dependencySynchronization?.synchronized !== true ||
        result?.plan?.app !== APP ||
        result?.plan?.library !== library ||
        !/^library-plan:[a-f0-9]{64}$/.test(result.plan.plan_id ?? '') ||
        !/^changes:[a-f0-9]{64}$/.test(result.changeSet?.change_set_id ?? '')
    ) {
        fail(`résultat de publication invalide pour ${library}`);
    }
    const packageName =
        library === 'angular-material' ? '@angular/material' : 'tailwindcss';
    const installed = JSON.parse(
        readFileSync(
            join(
                repository,
                'node_modules',
                ...packageName.split('/'),
                'package.json'
            ),
            'utf8'
        )
    );
    if (installed.name !== packageName) {
        fail(`${packageName} absent du node_modules publié`);
    }
}

function assertFinalState(repository, baseCommit) {
    assertClean(repository, 'dépôt final');
    const commits = git(repository, [
        'log',
        '--format=%s',
        '--reverse',
        `${baseCommit}..HEAD`,
    ]).split('\n');
    const expected = [
        `chore(${APP}): create generated shell`,
        `chore(${APP}): add angular-material`,
        `chore(${APP}): add tailwind`,
    ];
    if (JSON.stringify(commits) !== JSON.stringify(expected)) {
        fail(
            `historique inattendu : ${JSON.stringify(commits)} (attendu ${JSON.stringify(expected)})`
        );
    }

    const manifest = JSON.parse(
        readFileSync(
            join(repository, 'apps', APP, '.cmz', 'libraries.json'),
            'utf8'
        )
    );
    const libraries = [...manifest.libraries].sort();
    const expectedLibraries = ['angular-material', 'tailwind', 'transloco'];
    if (
        manifest.kind !== 'app-library-manifest' ||
        manifest.platform !== 'angular' ||
        JSON.stringify(libraries) !== JSON.stringify(expectedLibraries)
    ) {
        fail(`manifeste final invalide : ${JSON.stringify(manifest)}`);
    }

    runNode(repository, 'tools/check-library-setup.mjs', []);
    assertClean(repository, 'dépôt après la gate finale');
}

function main() {
    assertClean(SOURCE, 'dépôt source');
    const temporaryRoot = mkdtempSync(
        join(realpathSync(tmpdir()), 'cmz-create-app-library-')
    );
    chmodSync(temporaryRoot, 0o700);
    const repository = join(temporaryRoot, 'repository');
    try {
        console.error('[1/7] clone Git local indépendant');
        run(
            'git',
            ['clone', '--quiet', '--no-hardlinks', SOURCE, repository],
            temporaryRoot,
            { stdio: 'inherit' }
        );
        const baseCommit = git(repository, ['rev-parse', 'HEAD']);
        if (baseCommit !== git(SOURCE, ['rev-parse', 'HEAD'])) {
            fail('le clone local ne pointe pas sur le HEAD source');
        }
        git(repository, ['config', 'user.name', 'CMZ Integration Proof']);
        git(repository, ['config', 'user.email', 'cmz-proof@example.invalid']);
        assertClean(repository, 'clone initial');

        console.error('[2/7] dépendances propres du clone');
        run(
            'bun',
            [
                'install',
                '--frozen-lockfile',
                '--ignore-scripts',
                '--backend=copyfile',
                '--registry=https://registry.npmjs.org',
            ],
            repository,
            { stdio: 'inherit' }
        );
        const dependencyStats = lstatSync(join(repository, 'node_modules'));
        if (
            dependencyStats.isSymbolicLink() ||
            !dependencyStats.isDirectory()
        ) {
            fail('node_modules du clone doit être un dossier réel et isolé');
        }
        assertClean(repository, 'clone après installation gelée');

        console.error('[3/7] create-app : plan déterministe');
        const shellPlan = runNode(
            repository,
            'tools/create-app.mjs',
            [
                '--design',
                DESIGN,
                '--experience',
                EXPERIENCE,
                '--app',
                APP,
                '--dry-run',
            ],
            { json: true }
        );
        if (!/^[a-f0-9]{64}$/.test(shellPlan?.plan_id ?? '')) {
            fail('create-app n’a pas produit de plan_id SHA-256');
        }

        console.error('[4/7] create-app : publication et commit automatique');
        runNode(repository, 'tools/create-app.mjs', [
            '--design',
            DESIGN,
            '--experience',
            EXPERIENCE,
            '--app',
            APP,
            '--apply',
            shellPlan.plan_id,
        ]);
        git(repository, ['add', '--', `apps/${APP}`]);
        git(repository, [
            'commit',
            '--quiet',
            '-m',
            `chore(${APP}): create generated shell`,
        ]);
        const shellCommit = git(repository, ['rev-parse', 'HEAD']);
        assertInitialCommitOwnsOnlyApp(repository, shellCommit);
        assertClean(repository, 'dépôt après create-app');

        console.error('[5/7] add-library : Angular Material');
        const material = runNode(
            repository,
            'tools/add-library.mjs',
            ['--app', APP, '--library', 'angular-material'],
            { json: true }
        );
        assertLibraryResult(repository, material, 'angular-material');

        console.error('[6/7] add-library : Tailwind + coexistence navigateur');
        const tailwind = runNode(
            repository,
            'tools/add-library.mjs',
            ['--app', APP, '--library', 'tailwind'],
            { json: true }
        );
        assertLibraryResult(repository, tailwind, 'tailwind');

        console.error('[7/7] état publié, gate et historique');
        assertFinalState(repository, baseCommit);
        const gitDirectory = git(repository, [
            'rev-parse',
            '--absolute-git-dir',
        ]);
        const transactionRefs = git(repository, [
            'for-each-ref',
            '--format=%(refname)',
            'refs/cmz/library-transactions/',
        ]);
        if (
            existsSync(join(repository, `apps/.${APP}.generation-lock`)) ||
            existsSync(join(gitDirectory, 'cmz-library.lock')) ||
            existsSync(join(gitDirectory, 'cmz-library-transaction.json')) ||
            transactionRefs
        ) {
            fail('résidu transactionnel dans le dépôt final');
        }
        console.log(
            '✅ create-app plan/apply → Angular Material → Tailwind : zéro édition manuelle, publications et oracles réels.'
        );
    } finally {
        rmSync(temporaryRoot, { recursive: true, force: true });
    }
}

try {
    main();
} catch (error) {
    console.error(`❌ ${error.message}`);
    process.exitCode = 1;
}
