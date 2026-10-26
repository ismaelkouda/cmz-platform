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
import { nxWorkflowErrors } from './nx-migration-plan.mjs';
import {
    assertInstalledQualificationFamily,
    assertQualificationInput,
} from './nx-migration-qualification.mjs';

const workflow = () =>
    parse(
        readFileSync(
            new URL('../.github/workflows/nx-migrations.yml', import.meta.url),
            'utf8'
        )
    );

// Les opérations Git et la préparation des deux modes diffèrent. Les preuves
// Node/Bun, elles, doivent rester la même séquence, même si un nouveau contrôle
// est ajouté hors des étapes de promotion actuelles. Ne pas figer une liste de
// dix commandes : une nouvelle gate doit être ajoutée aux DEUX modes.
function promotionCommands(job) {
    return (job.steps ?? [])
        .flatMap((s) =>
            (s.run ?? '')
                .replace(/\\\r?\n\s*/g, ' ')
                .replace(/\/nx-(?:result|qualification)\//g, '/nx-proof/')
                .split('\n')
        )
        .map((line) => line.trim())
        .filter((line) => {
            if (/^bun (?:run (?!prepare(?:\s|$))|audit(?:\s|$))/.test(line))
                return true;
            if (!/^node\s/.test(line)) return false;
            if (/^node tools\/nx-migration-plan\.mjs\s/.test(line))
                return /^node tools\/nx-migration-plan\.mjs candidates\s/.test(
                    line
                );
            // Contrôles d'entrée/famille propres à la qualification, avant
            // toute promotion ; ils n'existent pas dans la migration.
            return !/^node (?:tools\/nx-migration-qualification\.mjs input|"\$RUNNER_TEMP\/nx-qualification-tools\.mjs" installed)\s/.test(
                line
            );
        });
}

function assertPromotionParity(w) {
    const automatic = promotionCommands(w.jobs.calculate);
    const manual = promotionCommands(w.jobs.qualification);
    assert.ok(automatic.length >= 10, 'la vraie séquence doit être extraite');
    assert.deepEqual(
        manual,
        automatic,
        'dérive des promotions/contrôles entre calculate et qualification'
    );
    // Confronter aussi les scripts partagés entiers : une condition shell ou
    // un nouveau programme ne doit pas échapper à l'extraction Node/Bun.
    const sharedScripts = (job) =>
        job.steps
            .filter((s) =>
                /bun run (?:promote-library-compatibility|bundle:metrics)\b/.test(
                    s.run ?? ''
                )
            )
            .map((s) =>
                s.run.replace(/\/nx-(?:result|qualification)\//g, '/nx-proof/')
            );
    assert.deepEqual(
        sharedScripts(w.jobs.qualification),
        sharedScripts(w.jobs.calculate),
        'dérive du shell des promotions/contrôles'
    );
}

test('qualification : parité permanente des commandes de promotion et de contrôle', () => {
    assertPromotionParity(workflow());
});

test('qualification : toute gate ajoutée à un seul mode est une dérive, même hors des promotions actuelles', () => {
    for (const name of ['calculate', 'qualification']) {
        const changed = workflow();
        changed.jobs[name].steps.push({ run: 'bun run check:engines' });
        assert.throws(() => assertPromotionParity(changed), /dérive/);
    }
    const changed = workflow();
    changed.jobs.calculate.steps.find((s) =>
        s.run?.includes('bun audit --audit-level=high')
    ).run += '\nbun run check:engines\n';
    assert.throws(() => assertPromotionParity(changed), /dérive/);
    changed.jobs.qualification.steps.find((s) =>
        s.run?.includes('bun audit --audit-level=high')
    ).run += '\nbun run check:engines\n';
    assert.doesNotThrow(
        () => assertPromotionParity(changed),
        'une évolution commune reste permise'
    );
    const reordered = workflow();
    const steps = reordered.jobs.qualification.steps;
    const a = steps.findIndex((s) => s.id === 'qualification-material');
    const b = steps.findIndex((s) => s.id === 'qualification-tailwind-react');
    [steps[a], steps[b]] = [steps[b], steps[a]];
    assert.throws(() => assertPromotionParity(reordered), /dérive/);
    const shell = workflow();
    shell.jobs.calculate.steps.find((s) =>
        s.run?.includes('bun audit --audit-level=high')
    ).run += '\nsh tools/future-check.sh\n';
    assert.throws(() => assertPromotionParity(shell), /dérive/);
});

test('qualification : matrice readonly, trois promotions par OS et plafond inchangé', () => {
    const w = workflow();
    const job = w.jobs.qualification;
    assert.ok(job, 'le mode qualification doit être dans B');
    assert.equal(w.on.workflow_dispatch.inputs.mode.default, 'migration');
    assert.deepEqual(job.permissions, { contents: 'read' });
    assert.deepEqual(job.strategy.matrix.os, ['ubuntu-latest', 'macos-14']);
    assert.equal(job['timeout-minutes'], 45);
    const pkg = JSON.parse(
        readFileSync(new URL('../package.json', import.meta.url))
    );
    assert.match(
        pkg.scripts['check:ci-wiring'],
        /node --test .*tools\/nx-migration-qualification\.test\.mjs/
    );
    assert.deepEqual(nxWorkflowErrors(w), []);
});

test('qualification : gardes fermées contre migration, publication et promotions absentes', () => {
    const w = workflow();
    assert.ok(w.jobs.qualification, 'la voie dédiée manque');
    for (const mutate of [
        (m) => {
            m.jobs.rogue = {
                'runs-on': 'ubuntu-latest',
                steps: [{ run: 'bunx nx migrate nx@24.0.1' }],
            };
        },
        (m) => {
            m.jobs.plan.if = undefined;
        },
        (m) => {
            m.jobs.publish.if = m.jobs.publish.if.replace(
                " && inputs.mode != 'qualification'",
                ''
            );
        },
        (m) => {
            m.jobs.followup.if = m.jobs.followup.if.replace(
                " && inputs.mode != 'qualification'",
                ''
            );
        },
        (m) => {
            m.jobs.qualification.permissions.issues = 'write';
        },
        (m) => {
            m.jobs.qualification['timeout-minutes'] = 46;
        },
        (m) => {
            m.jobs.qualification.strategy.matrix.os.pop();
        },
        (m) => {
            m.jobs.qualification.steps.push({
                run: 'bunx nx migrate nx@24.0.1',
            });
        },
        (m) => {
            m.jobs.qualification.steps.push({ run: 'git push origin HEAD' });
        },
        (m) => {
            m.jobs.qualification.steps = m.jobs.qualification.steps.filter(
                (s) => s.id !== 'qualification-material'
            );
        },
        (m) => {
            m.jobs.qualification.steps.find(
                (s) => s.id === 'qualification-tailwind-react'
            ).if = "runner.os == 'Linux'";
        },
        (m) => {
            m.jobs.qualification.steps.find(
                (s) => s.id === 'qualification-input'
            ).run = 'echo input';
        },
        (m) => {
            m.jobs.qualification.steps.find(
                (s) => s.id === 'qualification-checkout'
            ).run = 'git checkout "$SOURCE_SHA"';
        },
        (m) => {
            m.jobs.qualification.steps.find(
                (s) => s.id === 'qualification-prepare'
            ).run = 'echo installed';
        },
        (m) => {
            m.jobs.qualification.steps.find(
                (s) => s.id === 'qualification-bundle'
            ).run = 'echo bundle';
        },
    ]) {
        const bad = structuredClone(w);
        mutate(bad);
        assert.ok(
            nxWorkflowErrors(bad).length > 0,
            'un contre-exemple ne doit pas être accepté'
        );
    }
});

const step = (id) =>
    workflow().jobs.qualification.steps.find((s) => s.id === id).run;
const target = '24.0.1';
const helper = readFileSync(
    new URL('./nx-migration-qualification.mjs', import.meta.url)
);
function fixture(t) {
    const root = mkdtempSync(join(tmpdir(), 'nx-qualification-test-'));
    t.after(() => rmSync(root, { recursive: true, force: true }));
    const source = join(root, 'source');
    const temporary = join(root, 'temp');
    mkdirSync(join(source, 'tools'), { recursive: true });
    mkdirSync(temporary);
    writeFileSync(join(source, 'tools/nx-migration-qualification.mjs'), helper);
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
    git('add', '.');
    git('commit', '-m', 'base');
    const base = git('rev-parse', 'HEAD');
    git('remote', 'add', 'origin', 'https://github.com/test/repo');
    git('update-ref', 'refs/remotes/origin/main', base);
    const run = (id, extra = {}, cwd = source) =>
        spawnSync(
            '/bin/bash',
            ['--noprofile', '--norc', '-e', '-o', 'pipefail', '-c', step(id)],
            {
                cwd,
                encoding: 'utf8',
                timeout: 15000,
                env: {
                    ...process.env,
                    SOURCE_SHA: base,
                    TARGET: target,
                    RUNNER_TEMP: temporary,
                    GITHUB_WORKSPACE: source,
                    GITHUB_SERVER_URL: 'https://github.com',
                    GITHUB_REPOSITORY: 'test/repo',
                    GITHUB_RUN_ID: '123',
                    GITHUB_RUN_ATTEMPT: '1',
                    RUNNER_OS: 'Linux',
                    GITHUB_STEP_SUMMARY: join(temporary, 'summary'),
                    ...extra,
                },
            }
        );
    return { root, source, temporary, git, base, run };
}

test('qualification : SHA court, ref mouvante et cible non exacte sont refusés', () => {
    assert.doesNotThrow(() => assertQualificationInput('a'.repeat(40), target));
    for (const sha of [
        'main',
        'refs/heads/main',
        'a'.repeat(7),
        'a'.repeat(40) + '\n',
        '$(touch /tmp/no)',
    ])
        assert.throws(() => assertQualificationInput(sha, target), /SHA exact/);
    for (const version of ['', 'latest', '^24.0.1', '24.0.1-beta.1', '024.0.1'])
        assert.throws(
            () => assertQualificationInput('a'.repeat(40), version),
            /cible stable exacte/
        );
});

test('qualification : le vrai précontrôle Git refuse SHA étranger et objet absent, accepte un ancêtre du dépôt', (t) => {
    const f = fixture(t);
    let result = f.run('qualification-input');
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(
        readFileSync(join(f.temporary, 'nx-qualification-tools.mjs')),
        helper
    );
    for (const sha of ['main', f.base.slice(0, 8), 'f'.repeat(40)]) {
        result = f.run('qualification-input', { SOURCE_SHA: sha });
        assert.notEqual(result.status, 0, sha);
    }
    writeFileSync(join(f.source, 'local-only'), 'not on a repository branch\n');
    f.git('add', '.');
    f.git('commit', '-m', 'local-only commit');
    const foreign = f.git('rev-parse', 'HEAD');
    result = f.run('qualification-input', { SOURCE_SHA: foreign });
    assert.notEqual(
        result.status,
        0,
        'un objet local non accessible depuis origin ne suffit pas'
    );
    f.git('update-ref', 'refs/remotes/origin/candidate', foreign);
    result = f.run('qualification-input', { SOURCE_SHA: foreign });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(
        f.run('qualification-input').status,
        0,
        'un ancêtre accessible est admissible'
    );
    f.git('remote', 'set-url', 'origin', 'https://github.com/foreign/fork');
    assert.notEqual(
        f.run('qualification-input').status,
        0,
        'origine étrangère'
    );
});

test('qualification : le vrai checkout extrait exactement le SHA accepté, sans migrations.json', (t) => {
    const f = fixture(t);
    let result = f.run('qualification-input');
    assert.equal(result.status, 0, result.stderr);
    result = f.run('qualification-checkout');
    assert.equal(result.status, 0, result.stderr);
    const actual = execFileSync(
        'git',
        [
            '-C',
            join(f.temporary, 'nx-qualified-candidate'),
            'rev-parse',
            'HEAD',
        ],
        { encoding: 'utf8' }
    ).trim();
    assert.equal(actual, f.base);
});

test('qualification : toute la famille déclarée, exposée et présente dans le store Bun reste alignée', (t) => {
    const root = mkdtempSync(join(tmpdir(), 'nx-family-test-'));
    t.after(() => rmSync(root, { recursive: true, force: true }));
    const put = (path, value) => {
        mkdirSync(join(root, path, '..'), { recursive: true });
        writeFileSync(join(root, path), JSON.stringify(value));
    };
    const pkg = {
        devDependencies: { nx: target, '@nx/angular': 'catalog:tooling' },
        workspaces: { catalogs: { tooling: { '@nx/angular': target } } },
    };
    put('package.json', pkg);
    put('node_modules/nx/package.json', { version: target });
    put('node_modules/@nx/angular/package.json', { version: target });
    assert.doesNotThrow(() => assertInstalledQualificationFamily(root, target));
    put('node_modules/@nx/angular/package.json', { version: '23.3.0' });
    assert.throws(
        () => assertInstalledQualificationFamily(root, target),
        /installation Nx divergente/
    );
    put('node_modules/@nx/angular/package.json', { version: target });
    put('node_modules/@nx/js/package.json', { version: '23.3.0' });
    assert.throws(
        () => assertInstalledQualificationFamily(root, target),
        /installation Nx divergente/
    );
    put('node_modules/@nx/js/package.json', { version: target });
    const store =
        'node_modules/.bun/@nx+js@23.3.0/node_modules/@nx/js/package.json';
    put(store, { version: '23.3.0' });
    assert.throws(
        () => assertInstalledQualificationFamily(root, target),
        /store Bun Nx divergent/
    );
    put(store, { version: target });
    assert.doesNotThrow(() => assertInstalledQualificationFamily(root, target));
    pkg.devDependencies.nx = '^24.0.1';
    put('package.json', pkg);
    assert.throws(
        () => assertInstalledQualificationFamily(root, target),
        /manifeste Nx divergent/
    );
    pkg.devDependencies.nx = target;
    pkg.workspaces.catalogs.tooling['@nx/angular'] = '23.3.0';
    put('package.json', pkg);
    assert.throws(
        () => assertInstalledQualificationFamily(root, target),
        /manifeste Nx divergent/
    );
    pkg.workspaces.catalogs.tooling['@nx/angular'] = target;
    put('package.json', pkg);
    rmSync(join(root, 'node_modules/@nx/angular'), { recursive: true });
    assert.throws(
        () => assertInstalledQualificationFamily(root, target),
        /ENOENT/
    );
});

test('qualification : bundle réel, base exacte, digest, et refus de tout chemin même retiré ensuite', (t) => {
    const f = fixture(t);
    const dir = join(f.temporary, 'nx-qualification');
    mkdirSync(dir);
    f.git('switch', '-c', `qualification/nx-${target}`);
    const path = 'conventions/libraries/angular/angular-material.compat.json';
    mkdirSync(join(f.source, path, '..'), { recursive: true });
    writeFileSync(join(f.source, path), '{"fixture":"not a real promotion"}\n');
    f.git('add', '.');
    f.git('commit', '-m', 'unit fixture for bundle export');
    const head = f.git('rev-parse', 'HEAD');
    let result = f.run('qualification-bundle');
    assert.equal(result.status, 0, result.stderr);
    assert.equal(
        readFileSync(join(dir, 'base-sha.txt'), 'utf8'),
        `${f.base}\n`
    );
    assert.equal(readFileSync(join(dir, 'head-sha.txt'), 'utf8'), `${head}\n`);
    assert.equal(
        readFileSync(join(dir, 'identity.txt'), 'utf8'),
        `test/repo\n${f.base}\n123\n1\n${target}\nLinux\n`
    );
    const bundle = join(dir, 'candidate.bundle');
    const digest = createHash('sha256')
        .update(readFileSync(bundle))
        .digest('hex');
    assert.equal(
        readFileSync(join(dir, 'candidate.bundle.sha256'), 'utf8'),
        `${digest}  candidate.bundle\n`
    );
    assert.equal(
        f.git('bundle', 'list-heads', bundle),
        `${head} refs/heads/qualification/nx-${target}`
    );
    result = f.run('qualification-bundle', { SOURCE_SHA: 'f'.repeat(40) });
    assert.notEqual(result.status, 0, 'mauvaise base');
    writeFileSync(join(f.source, 'forbidden.txt'), 'must be rejected\n');
    f.git('add', '.');
    f.git('commit', '-m', 'forbidden intermediate change');
    f.git('rm', 'forbidden.txt');
    f.git('commit', '-m', 'hide from final diff');
    result = f.run('qualification-bundle');
    assert.notEqual(result.status, 0);
    assert.match(result.stdout, /hors périmètre/);
});
