import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
    mkdirSync,
    mkdtempSync,
    readFileSync,
    rmSync,
    symlinkSync,
    writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { parse } from 'yaml';
import {
    aggregateMigrationResults,
    collectMigrationResult,
    migrationOutcome,
    recordMigrationOutcome,
    assertMigrateHelp,
    nxWorkflowErrors,
    assertMigrationComplete,
    candidateMatrix,
    migrationPlan,
    parseSelectors,
    workflowSelectors,
    delegatedIgnorePolicy,
} from './nx-migration-plan.mjs';
import { ignoredVersionPolicyErrors } from './check-dependabot-policy.mjs';
import { parseJsonc } from './check-library-setup-deps.mjs';

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
test('la configuration réelle délègue Nx au workflow opérationnel', () => {
    const read = (path) =>
        readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
    const config = parse(read('.github/dependabot.yml'));
    const realPackage = JSON.parse(read('package.json'));
    const lock = parseJsonc(read('bun.lock'));
    const operational = workflow();
    const expected = workflowSelectors(operational);
    const root = config.updates.find(
        (update) =>
            update['package-ecosystem'] === 'bun' && update.directory === '/'
    );
    assert.deepEqual(
        root.ignore.filter((entry) =>
            expected.includes(entry['dependency-name'])
        ),
        expected.map((name) => ({ 'dependency-name': name }))
    );
    const result = delegatedIgnorePolicy(config, realPackage, operational);
    assert.deepEqual(result.errors, []);
    assert.deepEqual(ignoredVersionPolicyErrors(result.config, lock), []);
});

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

test('les captures Nx conservent stderr avant tee, y compris après ajout d’un lecteur', () => {
    const original = workflow();
    assert.deepEqual(nxWorkflowErrors(original), []);
    let count = 0;
    for (const [jobName, job] of Object.entries(original.jobs)) {
        for (const [index, step] of (job.steps ?? []).entries()) {
            for (const line of (step.run ?? '').split('\n')) {
                if (!/^\s*(?:if\s+)?bunx nx\b.*\|\s*tee\s/.test(line)) continue;
                const mutant = structuredClone(original);
                mutant.jobs[jobName].steps[index].run = step.run.replace(
                    line,
                    line.replace('2>&1 ', '')
                );
                assert.ok(
                    nxWorkflowErrors(mutant).some((e) =>
                        e.includes('capture Nx incomplète')
                    )
                );
                count++;
            }
        }
    }
    assert.ok(count > 0, 'le test doit exercer les vraies captures du YAML');
    original.jobs.calculate.steps.push({
        run: 'bunx nx report | tee "$RUNNER_TEMP/nx-result/report.txt"\nnode tools/nx-migration-plan.mjs help "$RUNNER_TEMP/nx-result/report.txt"',
    });
    assert.ok(
        nxWorkflowErrors(original).some((e) =>
            e.includes('capture Nx incomplète')
        )
    );
});

test('la vraie commande YAML capture l’aide du Nx installé dans le fichier analysé', (t) => {
    const root = mkdtempSync(join(tmpdir(), 'nx-help-test-'));
    t.after(() => rmSync(root, { recursive: true, force: true }));
    mkdirSync(join(root, 'nx-result'));
    const command = workflow()
        .jobs.calculate.steps.find((s) => s.id === 'generate')
        .run.split('\n')
        .find((line) => /^bunx nx migrate --help\b/.test(line));
    assert.ok(command);
    const result = spawnSync(
        '/bin/bash',
        ['--noprofile', '--norc', '-e', '-o', 'pipefail', '-c', command],
        {
            cwd: new URL('..', import.meta.url),
            env: { ...process.env, RUNNER_TEMP: root },
            encoding: 'utf8',
            timeout: 15000,
        }
    );
    assert.equal(result.status, 0, result.stderr);
    assertMigrateHelp(readFileSync(join(root, 'nx-result/help.txt'), 'utf8'));
});

const promptPaths = [
    'tools/ai-migrations/@nx/vite/24.0.1/migrate-config-helpers.md',
    'tools/ai-migrations/@nx/eslint/24.0.1/finish-inferred-conversion.md',
];
const originalPlan = {
    migrations: [
        ...Array.from({ length: 12 }, (_, i) => ({
            name: `applied-${i}`,
            implementation: './generator',
            package: 'nx',
        })),
        ...promptPaths.map((prompt, i) => ({
            name: `pending-${i}`,
            version: '24.0.0-beta.3',
            package: i ? '@nx/eslint' : '@nx/vite',
            prompt,
            implementation: './generator',
            factory: './legacy',
        })),
    ],
};
const pendingLog = (os = 'linux') =>
    readFileSync(
        new URL(
            `./test-support/nx-migration-${os}-pending.txt`,
            import.meta.url
        ),
        'utf8'
    );
const completeLog =
    "NX Successfully finished running migrations from 'migrations.json'. This workspace is up to date!";
const resultEnv = {
    GITHUB_REPOSITORY: 'test/repo',
    SOURCE_SHA: 'a'.repeat(40),
    GITHUB_RUN_ID: '123',
    GITHUB_RUN_ATTEMPT: '1',
    TARGET: '24.0.1',
};
function outcomeFixture(t) {
    const root = mkdtempSync(join(tmpdir(), 'nx-outcome-test-'));
    t.after(() => rmSync(root, { recursive: true, force: true }));
    const candidate = join(root, 'nx-candidate');
    const out = join(root, 'nx-result');
    mkdirSync(candidate);
    mkdirSync(out);
    writeFileSync(
        join(candidate, 'migrations.json'),
        JSON.stringify(originalPlan)
    );
    writeFileSync(
        join(out, 'migrations.generated.json'),
        JSON.stringify(originalPlan)
    );
    writeFileSync(join(out, 'run-migrations.txt'), pendingLog());
    for (const path of promptPaths) {
        mkdirSync(join(candidate, path, '..'), { recursive: true });
        writeFileSync(
            join(candidate, path),
            `# Instruction native — ${path}\n`
        );
    }
    return { root, candidate, out };
}

test('les deux sorties natives donnent seulement les phases prompt restantes, dans leur ordre', () => {
    for (const os of ['linux', 'macos']) {
        const result = migrationOutcome(pendingLog(os), 0, originalPlan);
        assert.equal(result.state, 'action-required');
        assert.equal(result.pending.length, 2);
        assert.deepEqual(
            result.pending.map((m) => m.prompt),
            os === 'linux' ? promptPaths : [...promptPaths].reverse()
        );
        assert.ok(result.pending.every((m) => !m.implementation && !m.factory));
    }
    assert.deepEqual(migrationOutcome(completeLog, 0, originalPlan), {
        state: 'ready',
        pending: [],
    });
    for (const [log, code, plan] of [
        [pendingLog(), 1, originalPlan],
        [
            pendingLog().replace(
                'Successfully finished running migrations',
                'Incomplete run'
            ),
            0,
            originalPlan,
        ],
        [
            pendingLog().replace(
                '2 prompt migrations skipped',
                '3 prompt migrations skipped'
            ),
            0,
            originalPlan,
        ],
        [
            pendingLog() +
                '\n- Another instruction not represented in the plan\n',
            0,
            originalPlan,
        ],
        [pendingLog(), 0, { migrations: originalPlan.migrations.slice(0, 12) }],
        ['', 0, originalPlan],
        ['This workspace is up to date!', 0, originalPlan],
    ])
        assert.throws(() => migrationOutcome(log, code, plan));
});

test('la vraie collecte YAML conserve deux restes, les octets des prompts et les fichiers nouveaux', (t) => {
    const { root, candidate, out } = outcomeFixture(t);
    const git = (...args) =>
        execFileSync('git', ['-C', candidate, ...args], { stdio: 'pipe' });
    git('init', '-b', 'main');
    git('config', 'user.name', 'test');
    git('config', 'user.email', 'test@example.invalid');
    // Le helper est celui du dépôt ; les migrations/prompts restent les nouvelles pièces.
    mkdirSync(join(candidate, 'tools'), { recursive: true });
    for (const file of [
        'nx-migration-plan.mjs',
        'check-workflow-privileges.mjs',
        'runtime-version-workflow.mjs',
    ])
        writeFileSync(
            join(candidate, 'tools', file),
            readFileSync(new URL(`./${file}`, import.meta.url))
        );
    symlinkSync(
        fileURLToPath(new URL('../node_modules', import.meta.url)),
        join(candidate, 'node_modules')
    );
    writeFileSync(join(candidate, '.gitignore'), 'node_modules\n');
    writeFileSync(join(candidate, 'README.md'), 'base\n');
    git('add', 'README.md', '.gitignore', 'tools');
    git('commit', '-m', 'baseline');
    writeFileSync(
        join(candidate, 'new-source.ts'),
        'export const migrated = true;\n'
    );
    assert.equal(recordMigrationOutcome(candidate, out, 0), 'action-required');
    const collect = workflow().jobs.calculate.steps.find(
        (s) =>
            s.id === 'collect' || s.name?.startsWith('Préserver le diagnostic')
    );
    const run = spawnSync(
        '/bin/bash',
        ['-e', '-o', 'pipefail', '-c', collect.run],
        {
            cwd: candidate,
            encoding: 'utf8',
            env: {
                ...process.env,
                ...resultEnv,
                RUNNER_TEMP: root,
                JOB_STATUS: 'success',
                MIGRATION_SYSTEM: 'ubuntu-latest',
            },
        }
    );
    assert.equal(run.status, 0, run.stderr);
    const remaining = JSON.parse(
        readFileSync(join(out, 'migrations.remaining.json'))
    );
    assert.equal(
        remaining.migrations.length,
        2,
        'le plan original de14 ne doit pas remplacer les restes'
    );
    assert.ok(
        remaining.migrations.every((m) => !m.implementation && !m.factory)
    );
    assert.match(
        readFileSync(join(out, 'partial.diff'), 'utf8'),
        /new-source\.ts/
    );
    for (const path of promptPaths)
        assert.deepEqual(
            readFileSync(join(out, path)),
            readFileSync(join(candidate, path))
        );
    assert.equal(
        JSON.parse(readFileSync(join(out, 'result.json'))).state,
        'action-required'
    );
    assert.equal(
        JSON.parse(readFileSync(join(candidate, 'migrations.json'))).migrations
            .length,
        14
    );
    assert.equal(
        git('log', '--format=%s').toString().trim(),
        'baseline',
        'aucun commit du candidat incomplet'
    );
});

test('agrégation : deux identités exactes, pièces intactes et aucune attente promue en ready', (t) => {
    const { root, candidate } = outcomeFixture(t);
    const systems = ['ubuntu-latest', 'macos-14'];
    const artifacts = join(root, 'artifacts');
    mkdirSync(artifacts);
    const results = systems.map((system) => {
        const out = join(artifacts, `nx-migration-${system}-123-1`);
        mkdirSync(out);
        writeFileSync(
            join(out, 'migrations.generated.json'),
            JSON.stringify(originalPlan)
        );
        writeFileSync(
            join(out, 'run-migrations.txt'),
            pendingLog(system.startsWith('macos') ? 'macos' : 'linux')
        );
        writeFileSync(join(out, 'partial.diff'), 'unit diff\n');
        recordMigrationOutcome(candidate, out, 0);
        collectMigrationResult(out, 'success', {
            ...resultEnv,
            MIGRATION_SYSTEM: system,
        });
        return out;
    });
    const aggregate = () =>
        aggregateMigrationResults(artifacts, systems, resultEnv);
    assert.equal(aggregate(), 'action-required');
    // Un ready unitaire simule un calcul complet ; le vrai bundle reste couvert par le test natif précédent.
    writeFileSync(join(results[0], 'run-migrations.txt'), completeLog);
    recordMigrationOutcome(candidate, results[0], 0);
    for (const path of [
        'candidate.bundle',
        'head-sha.txt',
        'identity.txt',
        'material.txt',
        'tailwind-angular.txt',
        'tailwind-react.txt',
    ])
        writeFileSync(
            join(results[0], path),
            'unit fixture, not runtime proof\n'
        );
    collectMigrationResult(results[0], 'success', {
        ...resultEnv,
        MIGRATION_SYSTEM: systems[0],
    });
    assert.equal(
        aggregate(),
        'action-required',
        'un système prêt ne couvre pas l’autre'
    );
    const path = join(results[1], 'result.json');
    const good = readFileSync(path);
    for (const property of ['head', 'run', 'attempt', 'system', 'target']) {
        const bad = JSON.parse(good);
        bad[property] = 'other';
        writeFileSync(path, JSON.stringify(bad));
        assert.throws(aggregate, /identité/);
        writeFileSync(path, good);
    }
    const prompt = join(results[1], promptPaths[0]);
    const bytes = readFileSync(prompt);
    writeFileSync(prompt, 'tampered');
    assert.throws(aggregate, /pièce incohérente/);
    writeFileSync(prompt, bytes);
    const planPath = join(results[1], 'migrations.remaining.json');
    const planBytes = readFileSync(planPath);
    writeFileSync(planPath, JSON.stringify(originalPlan));
    assert.throws(aggregate, /plan restant/);
    writeFileSync(planPath, planBytes);
    rmSync(prompt);
    assert.throws(aggregate);
    writeFileSync(prompt, bytes);
    assert.throws(
        () =>
            aggregateMigrationResults(
                artifacts,
                systems.slice(0, 1),
                resultEnv
            ),
        /supplémentaires/
    );
    collectMigrationResult(results[1], 'failure', {
        ...resultEnv,
        MIGRATION_SYSTEM: systems[1],
    });
    assert.throws(aggregate, /état/);
    writeFileSync(join(results[1], 'run-migrations.txt'), completeLog);
    recordMigrationOutcome(candidate, results[1], 0);
    for (const path of [
        'candidate.bundle',
        'head-sha.txt',
        'identity.txt',
        'material.txt',
        'tailwind-angular.txt',
        'tailwind-react.txt',
    ])
        writeFileSync(
            join(results[1], path),
            'unit fixture, not runtime proof\n'
        );
    collectMigrationResult(results[1], 'success', {
        ...resultEnv,
        MIGRATION_SYSTEM: systems[1],
    });
    assert.equal(
        aggregate(),
        'ready',
        'deux calculs complets restent admissibles'
    );
    rmSync(results[1], { recursive: true });
    assert.throws(aggregate, /manquants/);
});

test('un prompt manquant ou lié ne devient pas action-required avec une collecte incomplète', (t) => {
    const { candidate, out } = outcomeFixture(t);
    const path = join(candidate, promptPaths[0]);
    rmSync(path);
    assert.throws(() => recordMigrationOutcome(candidate, out, 0));
    symlinkSync(join(candidate, promptPaths[1]), path);
    assert.throws(() => recordMigrationOutcome(candidate, out, 0), /liée/);
});
