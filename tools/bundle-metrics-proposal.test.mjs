import assert from 'node:assert/strict';
import test from 'node:test';
import { execFileSync, spawnSync } from 'node:child_process';
import {
    mkdtempSync,
    mkdirSync,
    writeFileSync,
    readFileSync,
    rmSync,
    cpSync,
    existsSync,
} from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fixtureGit, initFixtureRepo } from './test-support/fixture-git.mjs';
import {
    BOT,
    MESSAGE,
    PATHS,
    STEPS,
    hash,
    keys,
    parseData,
    metrics,
    documents,
    io,
    commitData,
    scope,
    provider,
    proposalShape,
    validate,
    extract,
    publish,
    produce,
} from './bundle-metrics-proposal.mjs';

const repository = { id: 101, full_name: 'fixture/repo' };
const actor = { id: 17, login: 'dependabot[bot]', type: 'Bot' };
const image = ['ubuntu-24.04', '20261025.353.1'];
const section = `##[group]Runner Image\nImage: ${image[0]}\nVersion: ${image[1]}\nIncluded Software: https://github.com/actions/runner-images/blob/ubuntu24/20261025.353/images/ubuntu/Ubuntu2404-Readme.md\nImage Release: https://github.com/actions/runner-images/releases/tag/ubuntu24%2F20261025.353\n##[endgroup]\n`;
const header = [
    "Current runner version: '2.338.0'",
    '##[group]Runner Image Provisioner\nHosted Compute Agent\nVersion: 20261021.618\n##[endgroup]',
    section.trimEnd(),
    'Prepare workflow directory\n##[group]Run echo later\n',
].join('\n');
const prefix = '2026-10-30T02:01:06.4061295Z \u001b[32m';
const nativeLog = (log) =>
    '\uFEFF' + log.replace(/^/gm, prefix).replace(/\n/g, '\r\n');
const command = (root, args, env = {}) =>
    execFileSync('git', ['-C', root, ...args], {
        encoding: 'utf8',
        env: { ...process.env, ...env },
    }).trimEnd();
function directory(t) {
    const root = mkdtempSync(join(tmpdir(), 'cmz-bundle-proposal-'));
    t.after(() => rmSync(root, { recursive: true, force: true }));
    return root;
}
function write(root, path, value) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(
        join(root, path),
        typeof value === 'string'
            ? value
            : JSON.stringify(value, null, 2) + '\n'
    );
}
function environment(values, action) {
    const saved = new Map(
        Object.keys(values).map((key) => [key, process.env[key]])
    );
    try {
        Object.assign(process.env, values);
        return action();
    } finally {
        for (const [key, value] of saved)
            if (value === undefined) delete process.env[key];
            else process.env[key] = value;
    }
}
function fixture(t) {
    const parent = directory(t),
        root = join(parent, 'trusted'),
        remote = join(parent, 'remote.git'),
        temp = join(parent, 'temp');
    mkdirSync(root);
    mkdirSync(temp);
    initFixtureRepo(root);
    command(parent, ['init', '--bare', '--quiet', remote]);
    fixtureGit(remote, ['config', 'gc.autoDetach', 'false']);
    fixtureGit(remote, ['config', 'maintenance.autoDetach', 'false']);
    const git = (...args) => fixtureGit(root, args);
    write(root, '.gitignore', 'dist/\n');
    write(root, 'package.json', {
        name: 'fixture',
        dependencies: { ol: '^10.11.0' },
        scripts: { build: 'unchanged' },
    });
    write(root, 'bun.lock', 'fixture lock\n');
    write(root, 'apps/backoffice-angular/project.json', {
        targets: {
            build: {
                configurations: {
                    production: {
                        budgets: [
                            {
                                type: 'initial',
                                maximumWarning: '900kb',
                                maximumError: '1mb',
                            },
                        ],
                    },
                },
            },
        },
    });
    write(
        root,
        'dist/apps/backoffice-angular/browser/index.html',
        '<script type="module" src="main.js"></script>'
    );
    write(
        root,
        'dist/apps/backoffice-angular/browser/main.js',
        'x'.repeat(1000)
    );
    for (const name of [
        'record-bundle-metrics.mjs',
        'check-bundle-metrics-freshness.mjs',
    ]) {
        mkdirSync(join(root, 'tools'), { recursive: true });
        cpSync(new URL(name, import.meta.url), join(root, 'tools', name));
    }
    execFileSync(process.execPath, ['tools/record-bundle-metrics.mjs'], {
        cwd: root,
        env: { ...process.env, BUNDLE_METRICS_DATE: '2026-10-29' },
    });
    write(
        root,
        'README.md',
        '<!-- BEGIN:GENERATED:monorepo-status -->\nBundle initial prod **1 kB**.\n<!-- END:GENERATED:monorepo-status -->\n'
    );
    write(
        root,
        'LLM_CONTEXT.md',
        '<!-- BEGIN:GENERATED:monorepo-status -->\n**1 kB** ([`bundle-metrics.json`](./apps/backoffice-angular/bundle-metrics.json), 2026-10-29)\n<!-- END:GENERATED:monorepo-status -->\n'
    );
    write(
        root,
        PATHS[3],
        '<!-- BEGIN:GENERATED:bundle-metrics -->\n- **Bundle initial (production, raw)** : **1 kB** — source [`bundle-metrics.json`](../../apps/backoffice-angular/bundle-metrics.json) (mesuré 2026-10-29 via `bun run bundle:record` après build).\n<!-- END:GENERATED:bundle-metrics -->\n'
    );
    write(root, 'STATUS.md', 'État le 2026-10-26.\n');
    for (const path of ['docs/README.md', 'docs/adr/README.md'])
        write(root, path, 'unchanged\n');
    const ci = readFileSync(
        new URL('../.github/workflows/ci.yml', import.meta.url)
    );
    write(root, '.github/workflows/ci.yml', ci.toString('utf8'));
    git('add', '.');
    git('commit', '-qm', 'test: baseline');
    git('branch', '-M', 'main');
    const base = git('rev-parse', 'HEAD');
    git('remote', 'add', 'origin', remote);
    git('push', '-q', 'origin', 'main');
    const branch = 'dependabot/bun/ol';
    git('switch', '-qc', branch);
    const pkg = JSON.parse(readFileSync(join(root, 'package.json')));
    pkg.dependencies.ol = '^10.12.0';
    write(root, 'package.json', pkg);
    git('add', 'package.json');
    git('commit', '-qm', 'test: dependency update');
    git('push', '-q', 'origin', branch);
    const head = git('rev-parse', 'HEAD');
    const original = JSON.parse(readFileSync(join(root, PATHS[0])));
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
    const job = {
        id: 31,
        name: 'Oracle — lint + build + ngc + test',
        steps: STEPS.map((name, n) => ({
            name,
            status: 'completed',
            conclusion: n === 1 ? 'failure' : 'success',
        })),
    };
    const jobs = {
        total_count: 2,
        jobs: [job, { name: 'Garde-fous socle', conclusion: 'success' }],
    };
    const env = {
        GITHUB_REPOSITORY: repository.full_name,
        GITHUB_REPOSITORY_ID: '101',
        RUNNER_TEMP: temp,
        GITHUB_EVENT_NAME: 'pull_request',
        GITHUB_RUN_ID: '11',
        GITHUB_RUN_ATTEMPT: '2',
        GITHUB_EVENT_PATH: join(parent, 'event.json'),
    };
    writeFileSync(env.GITHUB_EVENT_PATH, JSON.stringify({ pull_request: pr }));
    const state = { identity: null, run, job, executionSha: head };
    const native = io(root),
        calls = [],
        counts = { push: 0, dispatch: 0, observed: 0 };
    let mode = 'normal',
        log = nativeLog(header);
    const client = {
        ...native,
        git(...args) {
            calls.push(['git', ...args]);
            if (args[0] === 'push') counts.push++;
            return native.git(...args);
        },
        command(tool, args, options) {
            calls.push([tool, ...args]);
            if (tool === 'gh') {
                if (args[0] === 'auth') {
                    assert.deepEqual(args, ['auth', 'setup-git']);
                    return '';
                }
                assert.deepEqual(args, [
                    'workflow',
                    'run',
                    'ci.yml',
                    '--repo',
                    repository.full_name,
                    '--ref',
                    pr.head.ref,
                ]);
                counts.dispatch++;
                if (mode === 'dispatch-error')
                    throw Error('fixture dispatch refused');
                return '';
            }
            assert.equal(tool, 'git');
            return native.command(tool, args, options);
        },
        api: io(root, (tool, args, options) => {
            assert.equal(tool, 'gh');
            assert.deepEqual(args, [
                'api',
                '--allow-escape-sequences',
                'repos/fixture/repo/actions/jobs/31/logs',
            ]);
            assert.deepEqual(options, {
                cwd: root,
                encoding: 'utf8',
                timeout: 30000,
                maxBuffer: 9 * 1024 * 1024 + 1,
                stdio: 'pipe',
            });
            return log;
        }).api,
        json(path) {
            const prefix = 'repos/fixture/repo';
            if (path === prefix) return repository;
            if (path === prefix + '/actions/runs/11')
                return structuredClone(run);
            if (path === prefix + '/commits/main')
                return {
                    sha:
                        counts.push && mode === 'main-race'
                            ? 'c'.repeat(40)
                            : base,
                };
            if (path === prefix + '/actions/workflows/21')
                return { path: '.github/workflows/ci.yml', state: 'active' };
            if (
                path ===
                prefix + '/actions/runs/11/attempts/2/jobs?per_page=100'
            )
                return structuredClone(jobs);
            assert.equal(path, prefix + '/pulls/5');
            const result = structuredClone(pr);
            if (mode === 'head-race' && !counts.push)
                result.head.sha = 'c'.repeat(40);
            if (counts.push) {
                counts.observed++;
                if (mode === 'read-error')
                    throw Error('fixture API unavailable');
                result.head.sha =
                    mode === 'stale' ||
                    (mode === 'delayed' && counts.observed < 3)
                        ? head
                        : post;
                if (mode === 'foreign') result.head.sha = 'd'.repeat(40);
                if (mode === 'closed') result.state = 'closed';
                if (mode === 'branch-race')
                    fixtureGit(remote, [
                        'update-ref',
                        'refs/heads/' + branch,
                        head,
                    ]);
            }
            return result;
        },
    };
    state.identity = environment(
        env,
        () => provider(client, 11, base).identity
    );
    let post;
    const makePost = () => {
        write(
            root,
            'dist/apps/backoffice-angular/browser/main.js',
            'x'.repeat(2000)
        );
        const red = spawnSync(
            process.execPath,
            ['tools/check-bundle-metrics-freshness.mjs'],
            { cwd: root, encoding: 'utf8' }
        );
        assert.equal(red.status, 1);
        assert.match(red.stderr, /bundle-metrics.json périmé/);
        const next = JSON.parse(readFileSync(join(root, PATHS[0])));
        const before = Object.fromEntries(
            PATHS.map((p) => [p, native.blob(head, p).toString('utf8')])
        );
        const expected = documents(before, original, next);
        for (const path of PATHS.slice(1)) write(root, path, expected[path]);
        git('add', ...PATHS);
        command(root, ['commit', '-qm', MESSAGE], {
            GIT_AUTHOR_NAME: BOT[0],
            GIT_AUTHOR_EMAIL: BOT[1],
            GIT_COMMITTER_NAME: BOT[0],
            GIT_COMMITTER_EMAIL: BOT[1],
        });
        post = git('rev-parse', 'HEAD');
        git('update-ref', 'refs/heads/bundle-proposal', post);
        mkdirSync(join(temp, 'bundle-metrics-proposal'));
        const bundle = join(temp, 'bundle-metrics-proposal/proposal.bundle');
        git('bundle', 'create', bundle, head + '..refs/heads/bundle-proposal');
        const bytes = readFileSync(bundle);
        const p = {
            schema: 1,
            identity: {
                ...state.identity,
                workflow: {
                    id: 21,
                    path: run.path,
                    blob: git('rev-parse', base + ':' + run.path),
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
                tree_sha: git('rev-parse', post + '^{tree}'),
            },
            transport: {
                bundle_bytes: bytes.length,
                bundle_sha256: hash(bytes),
            },
            files: commitData(native, head, post),
        };
        git('switch', '--detach', base);
        return p;
    };
    return {
        root,
        remote,
        temp,
        git,
        base,
        head,
        original,
        pr,
        run,
        job,
        jobs,
        env,
        client,
        state,
        counts,
        calls,
        makePost,
        mode(value) {
            mode = value;
        },
        log(value) {
            log = value;
        },
        remoteHead() {
            return fixtureGit(remote, ['rev-parse', 'refs/heads/' + branch]);
        },
    };
}

test('B309 : vraie fraîcheur rouge réécrit le fichier ; produce compare exclusivement au blob H', (t) => {
    const f = fixture(t);
    write(
        f.root,
        'dist/apps/backoffice-angular/browser/main.js',
        'x'.repeat(2000)
    );
    const first = spawnSync(
        process.execPath,
        ['tools/check-bundle-metrics-freshness.mjs'],
        { cwd: f.root, encoding: 'utf8' }
    );
    assert.equal(first.status, 1);
    assert.match(first.stderr, /périmé/);
    const changed = JSON.parse(readFileSync(join(f.root, PATHS[0])));
    assert.equal(changed.initial_raw_bytes, 2000);
    assert.equal(
        JSON.parse(f.client.blob(f.head, PATHS[0])).initial_raw_bytes,
        1000
    );
    metrics(
        f.original,
        changed,
        JSON.parse(
            f.client.blob(f.head, 'apps/backoffice-angular/project.json')
        )
    );
    assert.throws(() =>
        metrics(
            changed,
            changed,
            JSON.parse(
                f.client.blob(f.head, 'apps/backoffice-angular/project.json')
            )
        )
    );
    let reached = false;
    const client = {
        ...f.client,
        command(tool, args, options) {
            if (tool === 'bun') {
                assert.deepEqual(args, [
                    'run',
                    'check:bundle-metrics-freshness',
                ]);
                reached = true;
                throw Error('PROJECTION_REACHED_FROM_COMMITTED_H');
            }
            return f.client.command(tool, args, options);
        },
    };
    assert.throws(
        () => environment(f.env, () => produce(client)),
        /PROJECTION_REACHED_FROM_COMMITTED_H/
    );
    assert.equal(reached, true);
    assert.equal(f.counts.push, 0);
    const green = spawnSync(
        process.execPath,
        ['tools/check-bundle-metrics-freshness.mjs'],
        { cwd: f.root, encoding: 'utf8' }
    );
    assert.equal(green.status, 0, green.stderr);
    // These are real recorder/checker executions over fixture assets, not an Angular build.
});

test('B309 : clés propres, syntaxe, doublons et bornes JSON fermés', () => {
    for (const name of Object.getOwnPropertyNames(Object.prototype)) {
        const value = JSON.parse(
            '{"known":1,' + JSON.stringify(name) + ':"PUBLIC_CANARY"}'
        );
        assert.throws(() => keys(value, 'known'));
    }
    assert.throws(() => keys(Object.create({ inherited: true }), []));
    assert.throws(() => parseData(Buffer.from('{"a":1,"a":2}')));
    assert.throws(() => parseData(Buffer.from('['.repeat(9) + ']'.repeat(9))));
    assert.throws(() => parseData(Buffer.alloc(32769, 32)));
    assert.throws(() => parseData(Buffer.from([0xff])));
    assert.deepEqual(parseData(Buffer.from('{"name":"toString"}')), {
        name: 'toString',
    });
});

test('B309 : métriques et documents stricts, budget et constantes non réparables', (t) => {
    const f = fixture(t),
        p = f.makePost();
    const next = JSON.parse(f.client.blob(p.commit.head_sha, PATHS[0]));
    const project = JSON.parse(
        f.client.blob(f.head, 'apps/backoffice-angular/project.json')
    );
    for (const mutate of [
        (m) => {
            m.command = 'echo injected';
        },
        (m) => {
            m.measured_at = '2026-10-30';
        },
        (m) => {
            m.budget_initial_error = '2mb';
        },
        (m) => {
            m.initial_raw_kb++;
        },
        (m) => {
            m.initial_files.push(m.initial_files[0]);
        },
        (m) => {
            m.initial_files[0].file = '../escape.js';
        },
        (m) => {
            m.initial_raw_bytes = m.initial_files[0].bytes = 1000001;
            m.initial_raw_kb = 1000;
        },
        (m) => {
            m.exceljs_lazy_raw_bytes = 1;
        },
        (m) => {
            m.toString = 'PUBLIC_CANARY';
        },
    ]) {
        const bad = structuredClone(next);
        mutate(bad);
        assert.throws(() => metrics(f.original, bad, project));
    }
    const before = Object.fromEntries(
        PATHS.map((path) => [
            path,
            f.client.blob(f.head, path).toString('utf8'),
        ])
    );
    const expected = documents(before, f.original, next);
    assert.equal(
        expected['README.md'],
        before['README.md'].replace('**1 kB**', '**2 kB**')
    );
    assert.throws(() =>
        documents(
            { ...before, 'README.md': 'wrong template' },
            f.original,
            next
        )
    );
    const post = p.commit.head_sha;
    f.git('switch', '--detach', post);
    write(f.root, 'README.md', expected['README.md'] + '\nUNREVIEWED\n');
    f.git('add', 'README.md');
    f.git('commit', '-qm', 'test: extra commit');
    assert.throws(() =>
        commitData(f.client, f.head, f.git('rev-parse', 'HEAD'))
    );
    // A single, correctly attributed commit must still reject doc bytes outside the closed substitution.
    const proposed = Object.fromEntries(
        PATHS.map((path) => [path, f.client.blob(post, path).toString('utf8')])
    );
    f.git('switch', '--detach', f.head);
    for (const path of PATHS)
        write(
            f.root,
            path,
            proposed[path] + (path === 'README.md' ? '\nUNREVIEWED\n' : '')
        );
    f.git('add', ...PATHS);
    command(f.root, ['commit', '-qm', MESSAGE], {
        GIT_AUTHOR_NAME: BOT[0],
        GIT_AUTHOR_EMAIL: BOT[1],
        GIT_COMMITTER_NAME: BOT[0],
        GIT_COMMITTER_EMAIL: BOT[1],
    });
    const forged = f.git('rev-parse', 'HEAD');
    assert.equal(f.git('rev-parse', forged + '^'), f.head);
    assert.throws(() => commitData(f.client, f.head, forged));
});

test('B309 : provenance exacte et étapes réelles, le run global rouge ne suffit pas', (t) => {
    const f = fixture(t),
        p = f.makePost();
    const check = (p) =>
        environment(f.env, () => validate(f.client, p, f.state, f.base));
    check(p);
    for (const [path, value] of [
        ['identity.repo.id', 102],
        ['identity.pr.author.login', 'human'],
        ['identity.pr.head_repo.full_name', 'fork/repo'],
        ['identity.pr.base_sha', 'c'.repeat(40)],
        ['identity.workflow.run_id', 12],
        ['identity.workflow.run_attempt', 1],
        ['identity.workflow.execution_sha', f.base],
        ['identity.workflow.blob', 'c'.repeat(40)],
        ['producer.job_id', 32],
        ['producer.runner_image', 'macos-14'],
        ['producer.runner_image', 'ubuntu-24'],
        ...['20261025.99', '20', '20261025', '20261021.618'].map((v) => [
            'producer.runner_image_version',
            v,
        ]),
        ['transport.bundle_sha256', '0'.repeat(64)],
        ['commit.parent_sha', f.base],
        ['files.0.sha256', '0'.repeat(64)],
    ]) {
        const bad = structuredClone(p),
            parts = path.split('.');
        parts.slice(0, -1).reduce((x, key) => x[key], bad)[parts.at(-1)] =
            value;
        assert.throws(() => check(bad));
    }
    const imageLine = 'Image: ' + image[0],
        versionLine = 'Version: ' + image[1],
        boundary = 'Prepare workflow directory';
    for (const bad of [
        header.replace(versionLine, 'Version: 20') + versionLine + '\n',
        header.replace(section, '') + section,
        header.replace(boundary, section + boundary),
        header.replace(versionLine, versionLine + '\n' + versionLine),
        header.replace(imageLine, imageLine + '\n' + imageLine),
        header.replace(boundary, 'late echo'),
        'echo\n' + header,
    ]) {
        f.log(nativeLog(bad));
        assert.throws(() => check(p));
    }
    f.log(nativeLog(header));
    for (const name of Object.getOwnPropertyNames(Object.prototype)) {
        const bad = structuredClone(p);
        Object.defineProperty(bad.producer, name, {
            value: 'CANARY',
            enumerable: true,
        });
        assert.throws(() => proposalShape(bad));
    }
    for (let n = 0; n < STEPS.length; n++) {
        const old = f.job.steps[n].conclusion;
        f.job.steps[n].conclusion = n === 1 ? 'success' : 'skipped';
        assert.throws(() =>
            environment(f.env, () => provider(f.client, 11, f.base))
        );
        f.job.steps[n].conclusion = old;
    }
    f.run.path += '@refs/pull/5/merge';
    environment(f.env, () => provider(f.client, 11, f.base));
    f.run.path = '.github/workflows/ci.yml@refs/pull/99/merge';
    assert.throws(() =>
        environment(f.env, () => provider(f.client, 11, f.base))
    );
    f.run.path = '.github/workflows/ci.yml';
    f.run.run_attempt = 3;
    assert.throws(() =>
        environment(f.env, () => provider(f.client, 11, f.base))
    );
});

test('B309 : toute source hors package/lock ou métadonnée de manifeste altérée est refusée', (t) => {
    const f = fixture(t);
    scope(f.client, f.base, f.head);
    for (const path of [
        '.github/workflows/ci.yml',
        'tools/record-bundle-metrics.mjs',
        'apps/backoffice-angular/project.json',
        'tools/generate-status.mjs',
        '.husky/pre-commit',
    ]) {
        f.git('switch', '--detach', f.head);
        write(f.root, path, 'changed\n');
        f.git('add', path);
        f.git('commit', '-qm', 'test: forbidden source');
        assert.throws(() =>
            scope(f.client, f.base, f.git('rev-parse', 'HEAD'))
        );
    }
    f.git('switch', '--detach', f.head);
    const pkg = JSON.parse(f.client.blob(f.head, 'package.json'));
    pkg.scripts.build = 'malicious';
    write(f.root, 'package.json', pkg);
    f.git('add', 'package.json');
    f.git('commit', '-qm', 'test: script changed');
    assert.throws(() => scope(f.client, f.base, f.git('rev-parse', 'HEAD')));
});

test('B309 : publication réelle Git unique, attente API bornée et dispatch distinct', (t) => {
    for (const mode of [
        'normal',
        'delayed',
        'stale',
        'foreign',
        'closed',
        'read-error',
        'branch-race',
        'main-race',
        'dispatch-error',
        'head-race',
    ]) {
        const f = fixture(t),
            p = f.makePost();
        f.mode(mode);
        let waits = 0;
        const action = () =>
            environment(f.env, () =>
                publish(f.client, { p, main: f.base }, () => {
                    waits++;
                })
            );
        if (mode === 'normal' || mode === 'delayed') {
            action();
            assert.equal(f.counts.dispatch, 1);
        } else {
            assert.throws(action);
            assert.equal(f.counts.dispatch, mode === 'dispatch-error' ? 1 : 0);
        }
        assert.equal(f.counts.push, mode === 'head-race' ? 0 : 1);
        assert.equal(waits, mode === 'delayed' ? 2 : mode === 'stale' ? 4 : 0);
        assert.equal(
            f.remoteHead(),
            mode === 'head-race' || mode === 'branch-race'
                ? f.head
                : p.commit.head_sha
        );
        assert.ok(f.calls.every(([tool]) => tool !== 'bun' && tool !== 'node'));
        assert.ok(
            !f.calls.some(
                ([, ...args]) =>
                    args.includes('commit') ||
                    args.includes('checkout') ||
                    args.includes('switch')
            )
        );
    }
});

test('B309 : ZIP hostile borné avant extraction et digest fournisseur obligatoire', (t) => {
    for (const mode of [
        'valid',
        'digest',
        'absent',
        'extra',
        'traversal',
        'symlink',
        'duplicate',
        'oversize',
        'compression',
    ]) {
        const temp = directory(t),
            archive = join(temp, 'input.zip');
        const python = `import zipfile,sys\np=sys.argv[1]; mode=sys.argv[2]\nwith zipfile.ZipFile(p,'w',compression=zipfile.ZIP_DEFLATED if mode=='compression' else zipfile.ZIP_STORED) as z:\n a=zipfile.ZipInfo('proposal.json'); a.external_attr=(0o120777 if mode=='symlink' else 0o100644)<<16\n z.writestr(a,b' '*32769 if mode=='oversize' else b'{}')\n z.writestr('proposal.bundle',b'x'*1000000 if mode=='compression' else b'fixture')\n if mode in ['extra','traversal','duplicate']: z.writestr('../escape' if mode=='traversal' else 'proposal.json' if mode=='duplicate' else 'extra',b'x')\n`;
        execFileSync('python3', ['-I', '-c', python, archive, mode]);
        const bytes = readFileSync(archive),
            client = io(temp);
        client.api = () => bytes;
        const artifact = {
            id: 41,
            name: 'bundle-metrics-11-2',
            expired: false,
            size_in_bytes: bytes.length,
            digest:
                mode === 'absent'
                    ? undefined
                    : 'sha256:' +
                      (mode === 'digest' ? '0'.repeat(64) : hash(bytes)),
        };
        const action = () =>
            environment(
                { RUNNER_TEMP: temp, GITHUB_REPOSITORY: repository.full_name },
                () => extract(client, artifact, 11, 2)
            );
        if (mode === 'valid') assert.deepEqual(action(), {});
        else {
            assert.throws(action);
            assert.equal(
                existsSync(join(temp, 'bundle-metrics-proposal')),
                false
            );
        }
        assert.equal(existsSync(join(dirname(temp), 'escape')), false);
    }
});
