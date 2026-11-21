import assert from 'node:assert/strict';
import test from 'node:test';
import { execFileSync, spawnSync } from 'node:child_process';
import {
    chmodSync,
    copyFileSync,
    existsSync,
    mkdirSync,
    mkdtempSync,
    readFileSync,
    realpathSync,
    rmSync,
    symlinkSync,
    writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { delimiter, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fixtureGit, initFixtureRepo } from './test-support/fixture-git.mjs';
import { STEPS, applicable } from './bundle-metrics-upstream.mjs';
import {
    BOT,
    MESSAGE,
    PATHS,
    documents,
    hash,
} from './bundle-metrics-proposal.mjs';

const repository = { id: 101, full_name: 'fixture/repo' };
const prefix = 'repos/' + repository.full_name;
const jobsPath = (attempt) =>
    `${prefix}/actions/runs/11/attempts/${attempt}/jobs?per_page=100`;
const artifactsPath = `${prefix}/actions/runs/11/artifacts?per_page=100`;
const zipPath = `${prefix}/actions/artifacts/41/zip`;
const logPath = `${prefix}/actions/jobs/31/logs`;
const CI = '.github/workflows/ci.yml',
    PROJECT = 'apps/backoffice-angular/project.json',
    BROWSER = 'dist/apps/backoffice-angular/browser',
    image = ['ubuntu-24.04', '20261025.353.1'];
const LOG = `Current runner version: '2.338.0'\n##[group]Runner Image\nImage: ${image[0]}\nVersion: ${image[1]}\n##[endgroup]\nPrepare workflow directory\n`;
const ZIP = `import sys, zipfile
with zipfile.ZipFile(sys.argv[1], 'w') as z:
    for name in ('proposal.json', 'proposal.bundle'):
        z.write(sys.argv[2] + '/' + name, name)
`;
const providerReads = [
    prefix,
    `${prefix}/actions/runs/11`,
    `${prefix}/pulls/5`,
    `${prefix}/commits/main`,
    `${prefix}/actions/workflows/21`,
    jobsPath(2),
];

// Shapes read on real attempts through the GitHub API: G = 44540068435/1
// (guards red, Oracle skipped without steps), F = 44559780813/1 (freshness
// green, producer skipped), applicable = 42564562733/1 (proposal uploaded).
function upstreamJobs(kind) {
    const steps = {
        applicable: ['success', 'failure', 'success', 'success'],
        F: ['success', 'success', 'skipped', 'skipped'],
        producer: ['success', 'failure', 'failure', 'skipped'],
    }[kind];
    const oracle = {
        id: 31,
        name: 'Oracle — lint + build + ngc + test',
        status: 'completed',
        conclusion: { G: 'skipped', F: 'success' }[kind] ?? 'failure',
        steps: (steps ?? []).map((conclusion, n) => ({
            name: STEPS[n],
            status: 'completed',
            conclusion,
        })),
    };
    const guards = {
        name: 'Garde-fous socle',
        status: 'completed',
        conclusion: kind === 'G' ? 'failure' : 'success',
    };
    return { total_count: 2, jobs: [oracle, guards] };
}

function repositoryEnv(t) {
    const saved = process.env.GITHUB_REPOSITORY;
    process.env.GITHUB_REPOSITORY = repository.full_name;
    t.after(() => {
        if (saved === undefined) delete process.env.GITHUB_REPOSITORY;
        else process.env.GITHUB_REPOSITORY = saved;
    });
}

// The tool and its relative import closure, read from the sources.
function closure(name, seen = new Set()) {
    if (seen.has(name)) return seen;
    seen.add(name);
    const text = readFileSync(new URL(name, import.meta.url), 'utf8');
    for (const [, next] of text.matchAll(/\bfrom '\.\/([^']+)'/g))
        closure(next, seen);
    return seen;
}

const FAKE_GH = `const { appendFileSync, readFileSync } = require('node:fs');
const args = process.argv.slice(2);
appendFileSync(process.env.B309_FAKE_GH_LOG, JSON.stringify(args) + '\\n');
const answers = JSON.parse(readFileSync(process.env.B309_FAKE_GH_ANSWERS, 'utf8'));
if (args.length !== 3 || args[0] !== 'api' || args[1] !== '--allow-escape-sequences' || !Object.hasOwn(answers, args[2])) process.exit(1);
process.stdout.write(Buffer.from(answers[args[2]], 'base64'));
`;
const encode = (v) =>
    Buffer.from(
        typeof v === 'string' || Buffer.isBuffer(v) ? v : JSON.stringify(v)
    ).toString('base64');
function put(root, path, text) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), text);
}

// Real CLI over a disposable Dependabot repository; `gh` is a recorded fake.
// With a proposal, a separate producer clone commits it as the bot, so the
// trusted checkout only gets the commit through prepare() and its bundle.
function harness(t, withProposal = false) {
    // Real path: the entry point compares argv[1] with import.meta.url.
    const parent = realpathSync(
        mkdtempSync(join(tmpdir(), 'cmz-bundle-upstream-'))
    );
    t.after(() => rmSync(parent, { recursive: true, force: true }));
    const root = join(parent, 'trusted'),
        remote = join(parent, 'remote.git'),
        bin = join(parent, 'bin'),
        temp = join(parent, 'temp');
    for (const dir of [join(root, 'tools'), bin, temp])
        mkdirSync(dir, { recursive: true });
    initFixtureRepo(root);
    fixtureGit(parent, ['init', '--bare', '--quiet', remote]);
    fixtureGit(remote, ['config', 'gc.autoDetach', 'false']);
    fixtureGit(remote, ['config', 'maintenance.autoDetach', 'false']);
    const git = (...args) => fixtureGit(root, args);
    const manifest = (ol) =>
        writeFileSync(
            join(root, 'package.json'),
            JSON.stringify({ name: 'fixture', dependencies: { ol } }) + '\n'
        );
    manifest('^10.11.0');
    writeFileSync(join(root, 'bun.lock'), 'fixture lock\n');
    put(root, CI, 'name: CI\n');
    const budgets = [
        { type: 'initial', maximumWarning: '900kb', maximumError: '1mb' },
    ];
    put(
        root,
        PROJECT,
        JSON.stringify({
            targets: { build: { configurations: { production: { budgets } } } },
        })
    );
    put(
        root,
        BROWSER + '/index.html',
        '<script type="module" src="main.js"></script>'
    );
    copyFileSync(
        new URL('record-bundle-metrics.mjs', import.meta.url),
        join(root, 'tools', 'record-bundle-metrics.mjs')
    );
    // Metrics come from the real recorder; the documents quote its 1 kB.
    const measure = (size) => {
        put(root, BROWSER + '/main.js', 'x'.repeat(size));
        execFileSync(process.execPath, ['tools/record-bundle-metrics.mjs'], {
            cwd: root,
            env: { ...process.env, BUNDLE_METRICS_DATE: '2026-10-29' },
        });
        return readFileSync(join(root, PATHS[0]), 'utf8');
    };
    const baseline = measure(1000);
    put(root, PATHS[1], 'Bundle initial prod **1 kB**.\n');
    put(
        root,
        PATHS[2],
        '**1 kB** ([`bundle-metrics.json`](./apps/backoffice-angular/bundle-metrics.json), 2026-10-29)\n'
    );
    put(
        root,
        PATHS[3],
        '- **Bundle initial (production, raw)** : **1 kB** — source [`bundle-metrics.json`](../../apps/backoffice-angular/bundle-metrics.json) (mesuré 2026-10-29 via `bun run bundle:record` après build).\n'
    );
    git('add', '--', 'package.json', 'bun.lock', CI, PROJECT, ...PATHS);
    git('commit', '-qm', 'test: baseline');
    git('branch', '-M', 'main');
    const base = git('rev-parse', 'HEAD'),
        branch = 'dependabot/bun/ol';
    git('remote', 'add', 'origin', remote);
    git('push', '-q', 'origin', 'main');
    git('switch', '-qc', branch);
    manifest('^10.12.0');
    git('commit', '-qam', 'test: dependency update');
    git('push', '-q', 'origin', branch);
    const head = git('rev-parse', 'HEAD');
    for (const name of closure('bundle-metrics-proposal.mjs'))
        copyFileSync(new URL(name, import.meta.url), join(root, 'tools', name));
    symlinkSync(
        fileURLToPath(new URL('../node_modules', import.meta.url)),
        join(root, 'node_modules')
    );
    const fake = join(parent, 'fake-gh.cjs');
    writeFileSync(fake, FAKE_GH);
    writeFileSync(
        join(bin, 'gh'),
        '#!/bin/sh\nexec "$B309_FAKE_NODE" "$B309_FAKE_GH" "$@"\n'
    );
    chmodSync(join(bin, 'gh'), 0o755);
    const actor = { id: 17, login: 'dependabot[bot]', type: 'Bot' };
    const pr = {
        number: 5,
        state: 'open',
        merged: false,
        mergeable: true,
        merge_commit_sha: head,
        user: actor,
        base: { ref: 'main', sha: base, repo: repository },
        head: { sha: head, ref: branch, repo: repository },
    };
    const run = {
        id: 11,
        name: 'CI',
        path: '.github/workflows/ci.yml',
        event: 'pull_request',
        workflow_id: 21,
        run_attempt: 2,
        status: 'completed',
        repository,
        head_repository: repository,
        head_branch: branch,
        head_sha: head,
        actor,
        triggering_actor: { id: 19, login: 'maintainer' },
        pull_requests: [{ number: 5 }],
    };
    let extra = {},
        post;
    if (withProposal) {
        const producer = join(parent, 'producer'),
            staged = join(parent, 'artifact'),
            zip = join(parent, 'artifact.zip');
        fixtureGit(parent, [
            'clone',
            '-q',
            '--branch',
            branch,
            remote,
            producer,
        ]);
        const before = Object.fromEntries(
            PATHS.map((p) => [p, readFileSync(join(producer, p), 'utf8')])
        );
        const next = measure(2000);
        put(root, PATHS[0], baseline); // the trusted checkout stays at H

        const after = {
            ...documents(before, JSON.parse(baseline), JSON.parse(next)),
            [PATHS[0]]: next,
        };
        for (const path of PATHS) put(producer, path, after[path]);
        fixtureGit(producer, ['add', '--', ...PATHS]);
        execFileSync('git', ['-C', producer, 'commit', '-qm', MESSAGE], {
            env: {
                ...process.env,
                GIT_AUTHOR_NAME: BOT[0],
                GIT_AUTHOR_EMAIL: BOT[1],
                GIT_COMMITTER_NAME: BOT[0],
                GIT_COMMITTER_EMAIL: BOT[1],
            },
        });
        post = fixtureGit(producer, ['rev-parse', 'HEAD']);
        fixtureGit(producer, [
            'update-ref',
            'refs/heads/bundle-proposal',
            post,
        ]);
        mkdirSync(staged);
        const bundle = join(staged, 'proposal.bundle');
        fixtureGit(producer, [
            'bundle',
            'create',
            '-q',
            bundle,
            head + '..refs/heads/bundle-proposal',
        ]);
        const bytes = readFileSync(bundle);
        const proposal = {
            schema: 1,
            identity: {
                repo: repository,
                pr: {
                    number: 5,
                    author: actor,
                    head_repo: repository,
                    head_ref: branch,
                    head_sha: head,
                    base_ref: 'main',
                    base_sha: base,
                },
                workflow: {
                    id: 21,
                    path: CI,
                    blob: git('rev-parse', `${base}:${CI}`),
                    run_id: 11,
                    run_attempt: 2,
                    event: 'pull_request',
                    execution_sha: head,
                    actor: { id: actor.id, login: actor.login },
                    triggering_actor: run.triggering_actor,
                },
            },
            producer: {
                job_id: 31,
                runner_image: image[0],
                runner_image_version: image[1],
                build_step: STEPS[0],
                freshness_step: STEPS[1],
                projection_step: STEPS[2],
            },
            commit: {
                parent_sha: head,
                head_sha: post,
                tree_sha: fixtureGit(producer, ['rev-parse', 'HEAD^{tree}']),
            },
            transport: {
                bundle_bytes: bytes.length,
                bundle_sha256: hash(bytes),
            },
            files: PATHS.map((path) => ({
                path,
                bytes: Buffer.byteLength(after[path]),
                sha256: hash(after[path]),
            })),
        };
        put(staged, 'proposal.json', JSON.stringify(proposal, null, 2) + '\n');
        execFileSync('python3', ['-I', '-c', ZIP, zip, staged]);
        const archive = readFileSync(zip);
        const artifact = {
            id: 41,
            name: 'bundle-metrics-11-2',
            expired: false,
            size_in_bytes: archive.length,
            digest: 'sha256:' + hash(archive),
            workflow_run: {
                id: 11,
                repository_id: repository.id,
                head_repository_id: repository.id,
                head_sha: head,
                head_branch: branch,
            },
        };
        extra = {
            [artifactsPath]: { total_count: 1, artifacts: [artifact] },
            [zipPath]: archive,
            [logPath]: LOG,
        };
        // The trusted checkout can only get the proposal through prepare().
        assert.notEqual(
            spawnSync('git', ['-C', root, 'cat-file', '-e', post]).status,
            0
        );
    }
    const event = join(parent, 'event.json');
    writeFileSync(
        event,
        JSON.stringify({
            workflow_run: {
                id: 11,
                name: 'CI',
                event: 'pull_request',
                status: 'completed',
                conclusion: 'failure',
                run_attempt: 2,
                head_sha: head,
            },
        })
    );
    let trial = 0;
    const cli = (mode, jobs) => {
        trial++;
        const log = join(parent, `gh-${trial}.log`),
            answers = join(parent, `answers-${trial}.json`),
            output = join(parent, `output-${trial}`);
        const recorded = {
            [providerReads[0]]: repository,
            [providerReads[1]]: run,
            [providerReads[2]]: pr,
            [providerReads[3]]: { sha: base },
            [providerReads[4]]: {
                path: '.github/workflows/ci.yml',
                state: 'active',
            },
            [jobsPath(2)]: jobs,
            [artifactsPath]: { total_count: 0, artifacts: [] },
            ...extra,
        };
        writeFileSync(
            answers,
            JSON.stringify(
                Object.fromEntries(
                    Object.entries(recorded).map(([k, v]) => [k, encode(v)])
                )
            )
        );
        writeFileSync(log, '');
        writeFileSync(output, '');
        rmSync(join(root, '.git', 'FETCH_HEAD'), { force: true });
        const result = spawnSync(
            process.execPath,
            [join(root, 'tools', 'bundle-metrics-proposal.mjs'), mode],
            {
                cwd: root,
                encoding: 'utf8',
                env: {
                    ...process.env,
                    PATH: bin + delimiter + process.env.PATH,
                    GITHUB_EVENT_NAME: 'workflow_run',
                    GITHUB_EVENT_PATH: event,
                    GITHUB_SHA: base,
                    GITHUB_REPOSITORY: repository.full_name,
                    GITHUB_REPOSITORY_ID: String(repository.id),
                    GITHUB_OUTPUT: output,
                    RUNNER_TEMP: temp,
                    B309_FAKE_NODE: process.execPath,
                    B309_FAKE_GH: fake,
                    B309_FAKE_GH_LOG: log,
                    B309_FAKE_GH_ANSWERS: answers,
                },
            }
        );
        return {
            status: result.status,
            stdout: result.stdout,
            stderr: result.stderr,
            gh: readFileSync(log, 'utf8')
                .split('\n')
                .filter(Boolean)
                .map((line) => JSON.parse(line).at(-1)),
            output: readFileSync(output, 'utf8'),
            fetched: existsSync(join(root, '.git', 'FETCH_HEAD')),
            imported: spawnSync(
                'git',
                [
                    '-C',
                    root,
                    'rev-parse',
                    '-q',
                    '--verify',
                    'refs/cmz/bundle-proposal',
                ],
                { encoding: 'utf8' }
            ).stdout.trim(),
        };
    };
    return Object.assign(cli, { post });
}

test('B309 non applicable : preuve positive lue sur l’essai déclencheur, toute ambiguïté refusée', (t) => {
    repositoryEnv(t);
    const answers = new Map(),
        calls = [];
    const client = {
        json(path) {
            calls.push(path);
            assert.ok(answers.has(path), 'unexpected read ' + path);
            return structuredClone(answers.get(path));
        },
    };
    const decide = (jobs, source = { id: 11, run_attempt: 2 }) => {
        answers.set(jobsPath(2), jobs);
        return applicable(client, source);
    };
    assert.equal(decide(upstreamJobs('G')), false);
    assert.equal(decide(upstreamJobs('F')), false);
    assert.equal(decide(upstreamJobs('producer')), true);
    assert.equal(decide(upstreamJobs('applicable')), true);
    assert.deepEqual(calls, Array(4).fill(jobsPath(2)));
    // The attempt named by the event is read, never another one.
    answers.set(jobsPath(1), upstreamJobs('F'));
    assert.equal(applicable(client, { id: 11, run_attempt: 1 }), false);
    assert.equal(applicable(client, { id: 11, run_attempt: 2 }), true);
    assert.deepEqual(calls.slice(4), [jobsPath(1), jobsPath(2)]);
    // Each base alone is not applicable: without its guard, the shape would
    // silently answer « not applicable ».
    const produced = upstreamJobs('applicable').jobs[0];
    const refused = {
        'listage partiel': [
            'G',
            (j) => {
                j.total_count = 3;
            },
        ],
        'aucun job Oracle': [
            'G',
            (j) => {
                j.jobs.shift();
                j.total_count = 1;
            },
        ],
        'deux jobs Oracle': [
            'G',
            (j) => {
                j.total_count = j.jobs.push(produced);
            },
        ],
        'Oracle non terminé': [
            'F',
            (j) => {
                j.jobs[0].status = 'in_progress';
            },
        ],
        'Oracle sauté avec des étapes': [
            'G',
            (j) => {
                j.jobs[0].steps = produced.steps;
            },
        ],
        'étape productrice absente': [
            'F',
            (j) => {
                j.jobs[0].steps.splice(2, 1);
            },
        ],
        'étape productrice dupliquée': [
            'F',
            (j) => {
                j.jobs[0].steps.push(produced.steps[2]);
            },
        ],
        'étape productrice non terminée': [
            'F',
            (j) => {
                j.jobs[0].steps[2].status = 'pending';
            },
        ],
    };
    for (const [label, [kind, mutate]] of Object.entries(refused)) {
        const jobs = upstreamJobs(kind);
        assert.equal(decide(structuredClone(jobs)), false, label);
        mutate(jobs);
        assert.throws(() => decide(jobs), /B309_REFUSED/, label);
    }
    for (const source of [
        { id: 11, run_attempt: '2' },
        { id: '11', run_attempt: 2 },
    ])
        assert.throws(
            () => decide(upstreamJobs('F'), source),
            /B309_REFUSED/,
            'source invalide ' + JSON.stringify(source)
        );
});

test('B309 non applicable : CLI prepare sort en 0 sans effet quand l’Oracle ou le producteur est sauté', (t) => {
    const cli = harness(t);
    for (const kind of ['G', 'F']) {
        const r = cli('prepare', upstreamJobs(kind));
        assert.equal(r.status, 0, kind + ' ' + r.stderr);
        assert.equal(r.stdout, 'B309_NOT_APPLICABLE run=11 attempt=2\n');
        assert.equal(r.stderr, '');
        assert.equal(r.output, '', kind + ' wrote a job output');
        assert.deepEqual(r.gh, [jobsPath(2)]);
        assert.equal(r.fetched, false);
    }
});

test('B309 non applicable : CLI prepare refuse quand le producteur a tourné sans artefact', (t) => {
    const r = harness(t)('prepare', upstreamJobs('applicable'));
    assert.equal(r.status, 1, r.stderr);
    assert.equal(r.stdout, '');
    assert.match(r.stderr, /B309_REFUSED/);
    assert.equal(r.output, '');
    assert.deepEqual(r.gh, [jobsPath(2), ...providerReads, artifactsPath]);
    assert.equal(r.fetched, true);
});

test('B309 non applicable : CLI prepare refuse quand le producteur a échoué', (t) => {
    const r = harness(t)('prepare', upstreamJobs('producer'));
    assert.equal(r.status, 1, r.stderr);
    assert.equal(r.stdout, '');
    assert.match(r.stderr, /B309_REFUSED/);
    assert.equal(r.output, '');
    assert.deepEqual(r.gh, [jobsPath(2), ...providerReads]);
    assert.equal(r.fetched, false);
});

test('B309 non applicable : CLI publish ne répond jamais « non applicable »', (t) => {
    const cli = harness(t);
    for (const kind of ['G', 'F']) {
        const r = cli('publish', upstreamJobs(kind));
        assert.equal(r.status, 1, kind + ' ' + r.stderr);
        assert.equal(r.stdout, '');
        assert.match(r.stderr, /B309_REFUSED/);
        assert.equal(r.output, '');
        assert.deepEqual(r.gh, providerReads);
        assert.equal(r.fetched, false);
    }
});

test('B309 applicable : CLI prepare réussit, prepare() réel puis active=true', (t) => {
    const cli = harness(t, true);
    const r = cli('prepare', upstreamJobs('applicable'));
    assert.equal(r.status, 0, r.stderr);
    assert.equal(r.stdout, '');
    assert.doesNotMatch(r.stderr, /B309_/);
    assert.equal(r.output, 'active=true\n');
    assert.deepEqual(r.gh, [
        jobsPath(2),
        ...providerReads,
        artifactsPath,
        zipPath,
        logPath,
    ]);
    assert.equal(r.fetched, true);
    // validate() imported the bundle: the strict chain ran to its end.
    assert.equal(r.imported, cli.post);
});

test('B309 non applicable : une conclusion autre que skipped ne prouve rien, la chaîne stricte reste', (t) => {
    repositoryEnv(t);
    const decide = (jobs) =>
        applicable(
            { json: (path) => (assert.equal(path, jobsPath(2)), jobs) },
            { id: 11, run_attempt: 2 }
        );
    const shape = (oracle, producer) => {
        const jobs = upstreamJobs('producer');
        jobs.jobs[0].conclusion = oracle;
        jobs.jobs[0].steps[2].conclusion = producer;
        return jobs;
    };
    for (const producer of ['cancelled', 'neutral', 'timed_out', null])
        assert.equal(
            decide(shape('failure', producer)),
            true,
            'producteur ' + producer
        );
    // Only `skipped` stands for « no proposal »; the producer's own `if` holds
    // `!cancelled()` (ci.yml), so its `skipped` remains the proof.
    for (const oracle of ['cancelled', 'failure', 'success', 'timed_out']) {
        const empty = shape(oracle, 'cancelled');
        empty.jobs[0].steps = [];
        assert.throws(
            () => decide(empty),
            /B309_REFUSED/,
            `Oracle ${oracle} sans étapes`
        );
        assert.equal(
            decide(shape(oracle, 'cancelled')),
            true,
            `Oracle ${oracle}, producteur cancelled`
        );
        assert.equal(
            decide(shape(oracle, 'skipped')),
            false,
            `Oracle ${oracle}, producteur skipped`
        );
    }
    const cli = harness(t);
    for (const oracle of ['failure', 'cancelled']) {
        const r = cli('prepare', shape(oracle, 'cancelled'));
        assert.equal(r.status, 1, oracle + ' ' + r.stderr);
        assert.equal(r.stdout, '');
        assert.match(r.stderr, /B309_REFUSED/);
        assert.equal(r.output, '');
        assert.deepEqual(r.gh, [jobsPath(2), ...providerReads]);
    }
});
