import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
    mkdirSync,
    mkdtempSync,
    readFileSync,
    rmSync,
    writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { parse } from 'yaml';
import {
    assertMigrateHelp,
    assertMigrationComplete,
    candidateMatrix,
    migrationPlan,
    parseSelectors,
    workflowSelectors,
    delegatedIgnorePolicy,
} from './nx-migration-plan.mjs';
import { ignoredVersionPolicyErrors } from './check-dependabot-policy.mjs';

const selectors = ['nx', '@nx/*'];
const pkg = {
    devDependencies: { nx: '23.3.0', '@nx/angular': 'catalog:tooling' },
    workspaces: { catalogs: { tooling: { '@nx/angular': '23.3.0' } } },
};
const metadata = {
    versions: Object.fromEntries(
        ['23.3.0', '23.4.0', '24.0.0', '24.1.0', '25.0.0', '24.2.0-beta.1'].map(
            (v) => [v, {}]
        )
    ),
};

test('la cible stable avance au maximum d’une majeure et les catalogues restent natifs', () => {
    const before = JSON.stringify(pkg);
    assert.deepEqual(migrationPlan(pkg, metadata, selectors), {
        current: '23.3.0',
        target: '24.1.0',
        packages: ['@nx/angular', 'nx'],
    });
    assert.equal(
        migrationPlan(pkg, metadata, selectors, '24.0.0').target,
        '24.0.0'
    );
    assert.equal(migrationPlan(pkg, { versions: {} }, selectors).target, '');
    assert.equal(
        JSON.stringify(pkg),
        before,
        'ne pas éditer les catalogues à la place de Nx'
    );
    const deprecated = structuredClone(metadata);
    deprecated.versions['24.1.0'].deprecated = 'retiré';
    assert.equal(migrationPlan(pkg, deprecated, selectors).target, '24.0.0');
});

test('refuse cible rétrograde, bêta, absente ou deux majeures plus loin', () => {
    for (const target of [
        '23.3.0',
        '24.2.0-beta.1',
        '25.0.0',
        '24.9.9',
        '24.0.0;echo bad',
    ]) {
        assert.throws(
            () => migrationPlan(pkg, metadata, selectors, target),
            /cible/
        );
    }
    const split = structuredClone(pkg);
    split.workspaces.catalogs.tooling['@nx/angular'] = '23.2.0';
    assert.throws(
        () => migrationPlan(split, metadata, selectors),
        /désalignée/
    );
    split.devDependencies.nx = '^23.3.0';
    assert.throws(() => migrationPlan(split, metadata, selectors), /exacte/);
});

test('refuse sélecteurs larges, doubles, absents ou sans paquet effectivement calculé', () => {
    assert.deepEqual(parseSelectors(JSON.stringify(selectors)), selectors);
    for (const value of [
        '[]',
        '["*"]',
        '["nx","nx"]',
        '["nx","../outside"]',
        '["@nx/*"]',
    ]) {
        assert.throws(() => parseSelectors(value));
    }
    assert.throws(
        () => migrationPlan(pkg, metadata, [...selectors, '@absent/*']),
        /sans paquet/
    );
});

test('exit0 de Nx ne prouve pas les instructions différées appliquées', () => {
    assert.doesNotThrow(() =>
        assertMigrationComplete(
            " NX Successfully finished running migrations from 'migrations.json'. This workspace is up to date!"
        )
    );
    assert.doesNotThrow(() =>
        assertMigrationComplete(
            " NX No changes were made from running 'migrations.json'. This workspace is up to date!"
        )
    );
    for (const log of [
        '',
        'Successfully finished running migrations',
        'No migrations were applied — every entry is a prompt-only migration.',
        'This workspace is up to date!\nSome migrations have additional information, see below.',
        'This workspace is up to date!\nNext steps for the AI agent driving this run',
        'This workspace is up to date!\nWorking-tree state retained',
    ]) {
        assert.throws(
            () => assertMigrationComplete(log),
            /instructions Nx restantes/
        );
    }
});

test('chaque CLI cible doit exposer les quatre options réellement utilisées', () => {
    const flags = [
        '--skipInstall',
        '--runMigrations',
        '--include',
        '--agentic=false',
    ];
    assert.doesNotThrow(() => assertMigrateHelp(flags.join('\n')));
    for (const missing of flags)
        assert.throws(
            () =>
                assertMigrateHelp(
                    flags.filter((v) => v !== missing).join('\n')
                ),
            /option absente/
        );
});

test('préparer une piste ne fabrique aucune attestation et préserve les autres contraintes', () => {
    const matrix = JSON.parse(
        readFileSync(
            new URL(
                '../conventions/libraries/angular/angular-material.compat.json',
                import.meta.url
            )
        )
    );
    const before = structuredClone(matrix);
    const result = candidateMatrix(matrix, '24.0.0');
    assert.equal(result.tracks[0].status, 'candidate');
    assert.equal(result.tracks[0].verification, null);
    assert.equal(result.tracks[0].requirements.nx, '>=24.0.0 <25');
    const expected = structuredClone(before);
    expected.tracks[0].status = 'candidate';
    expected.tracks[0].verification = null;
    expected.tracks[0].requirements.nx = '>=24.0.0 <25';
    assert.deepEqual(result, expected);
    assert.deepEqual(matrix, before);
    assert.throws(() => candidateMatrix({ tracks: [] }, '24.0.0'), /ambiguë/);
});

const workflow = () =>
    parse(
        readFileSync(
            new URL('../.github/workflows/nx-migrations.yml', import.meta.url),
            'utf8'
        )
    );
test('la délégation est fermée et la justification TypeScript par les pairs reste intacte', () => {
    const ts = { 'dependency-name': 'typescript', versions: ['7.x'] };
    const config = {
        updates: [
            {
                'package-ecosystem': 'bun',
                directory: '/',
                ignore: [
                    ts,
                    ...selectors.map((s) => ({ 'dependency-name': s })),
                ],
            },
        ],
    };
    const lock = {
        packages: {
            consumer: [
                'consumer@1.0.0',
                '',
                { peerDependencies: { typescript: '>=5 <7' } },
            ],
        },
    };
    const result = delegatedIgnorePolicy(config, pkg, workflow());
    assert.ok(
        ignoredVersionPolicyErrors(config, lock).length >= 2,
        'témoin rouge sans délégation'
    );
    assert.deepEqual(result.errors, []);
    assert.deepEqual(result.config.updates[0].ignore, [ts]);
    assert.equal(
        config.updates[0].ignore.length,
        3,
        'ne pas modifier la configuration source'
    );
    assert.deepEqual(ignoredVersionPolicyErrors(result.config, lock), []);
    const compatible = structuredClone(lock);
    compatible.packages.consumer[2].peerDependencies.typescript = '>=5 <8';
    assert.match(
        ignoredVersionPolicyErrors(result.config, compatible).join('\n'),
        /sans justification/
    );
    for (const change of [
        (c) => {
            c.updates[0].ignore.push({ 'dependency-name': '@other/*' });
        },
        (c) => {
            c.updates[0].ignore.pop();
        },
        (c) => {
            c.updates[0].ignore[1].versions = ['*'];
        },
    ]) {
        const invalid = structuredClone(config);
        change(invalid);
        const candidate = delegatedIgnorePolicy(invalid, pkg, workflow());
        assert.ok(
            [
                ...candidate.errors,
                ...ignoredVersionPolicyErrors(candidate.config, lock),
            ].length > 0
        );
    }
    const disabled = workflow();
    disabled.jobs.calculate.if = false;
    assert.ok(delegatedIgnorePolicy(config, pkg, disabled).errors.length > 0);
    assert.ok(delegatedIgnorePolicy(config, pkg, undefined).errors.length > 0);
});
test('la délégation exige une génération réelle liée à la déclaration opérationnelle', () => {
    assert.deepEqual(workflowSelectors(workflow()), selectors);
    for (const mutate of [
        (w) => {
            delete w.env.NX_MIGRATION_SELECTORS;
        },
        (w) => {
            delete w.jobs.calculate;
        },
        (w) => {
            w.jobs.calculate.if = false;
        },
        (w) => {
            w.jobs.plan.steps.find((s) => s.id === 'plan').if = false;
        },
        (w) => {
            w.jobs.plan.steps.find((s) => s.id === 'plan').run =
                'echo "déclaration seule"';
        },
        (w) => {
            w.jobs.plan.steps.find((s) => s.id === 'plan').run =
                'node tools/nx-migration-plan.mjs plan --selectors "autre"';
        },
        (w) => {
            w.jobs.calculate.steps.find((s) => s.id === 'generate').run =
                'echo "nx migrate"';
        },
        (w) => {
            w.jobs.calculate.env.NX_MIGRATE_CLI_VERSION = 'latest';
        },
    ]) {
        const candidate = workflow();
        mutate(candidate);
        assert.throws(() => workflowSelectors(candidate));
    }
});

// Exerce le VRAI shell de vérification avec de vrais commits et un git bundle.
// Aucun réseau ni push : le remote n'est que confronté comme une chaîne.
test('la vérification native du bundle refuse corruption, autre base et chemin interdit même ensuite retiré', (t) => {
    const root = mkdtempSync(join(tmpdir(), 'nx-bundle-test-'));
    t.after(() => rmSync(root, { recursive: true, force: true }));
    const source = join(root, 'source');
    mkdirSync(source);
    const git = (...args) =>
        execFileSync('git', ['-C', source, ...args], {
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'pipe'],
        }).trim();
    git('init', '-b', 'main');
    git('config', 'user.name', 'github-actions[bot]');
    git(
        'config',
        'user.email',
        '41898282+github-actions[bot]@users.noreply.github.com'
    );
    writeFileSync(join(source, 'package.json'), '{}\n');
    git('add', '.');
    git('commit', '-m', 'base');
    const base = git('rev-parse', 'HEAD');
    git('switch', '-c', 'automation/nx-24.0.0');
    writeFileSync(join(source, 'package.json'), '{"name":"candidate"}\n');
    git('add', '.');
    git('commit', '-m', 'migration');
    const goodHead = git('rev-parse', 'HEAD');
    const script = workflow().jobs.publish.steps.find(
        (s) => s.id === 'verify'
    ).run;
    const verify = (name, head, extraEnv = {}) => {
        const clone = join(root, name);
        const temporary = join(root, `${name}-temp`);
        const artifact = join(temporary, 'nx-publish');
        mkdirSync(artifact, { recursive: true });
        execFileSync('git', [
            'clone',
            '--quiet',
            '--no-hardlinks',
            source,
            clone,
        ]);
        execFileSync('git', ['-C', clone, 'checkout', '--quiet', base]);
        execFileSync('git', [
            '-C',
            clone,
            'remote',
            'set-url',
            'origin',
            'https://github.com/test/repo',
        ]);
        const bundle = join(artifact, 'candidate.bundle');
        git(
            'bundle',
            'create',
            bundle,
            `${base}..refs/heads/automation/nx-24.0.0`
        );
        const digest = createHash('sha256')
            .update(readFileSync(bundle))
            .digest('hex');
        writeFileSync(
            join(artifact, 'identity.txt'),
            `test/repo\n${base}\n123\n1\n24.0.0\nLinux\n`
        );
        writeFileSync(join(artifact, 'head-sha.txt'), `${head}\n`);
        return spawnSync('/bin/bash', ['-e', '-o', 'pipefail', '-c', script], {
            cwd: clone,
            encoding: 'utf8',
            env: {
                ...process.env,
                GITHUB_SERVER_URL: 'https://github.com',
                GITHUB_REPOSITORY: 'test/repo',
                SOURCE_SHA: base,
                EXPECTED_HEAD: head,
                TARGET: '24.0.0',
                GITHUB_RUN_ID: '123',
                GITHUB_RUN_ATTEMPT: '1',
                RUNNER_TEMP: temporary,
                EXPECTED_BUNDLE_SHA256: digest,
                ...extraEnv,
            },
        });
    };
    let result = verify('good', goodHead);
    assert.equal(result.status, 0, result.stderr + result.stdout);
    result = verify('bad-hash', goodHead, {
        EXPECTED_BUNDLE_SHA256: '0'.repeat(64),
    });
    assert.notEqual(result.status, 0);
    result = verify('bad-base', goodHead, { SOURCE_SHA: '1'.repeat(40) });
    assert.notEqual(result.status, 0);
    mkdirSync(join(source, '.github'));
    writeFileSync(join(source, '.github/forbidden'), 'outside\n');
    git('add', '.');
    git('commit', '-m', 'hors périmètre');
    git('rm', '.github/forbidden');
    git('commit', '-m', 'retrait masquant le diff final');
    result = verify('bad-path', git('rev-parse', 'HEAD'));
    assert.notEqual(result.status, 0);
    assert.match(result.stdout, /hors périmètre/);
});
