import './runtime-version-publication.test.mjs';
import assert from 'node:assert/strict';
import test from 'node:test';
import {
    readFileSync,
    writeFileSync,
    readdirSync,
    mkdtempSync,
    mkdirSync,
    rmSync,
    existsSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { parse } from 'yaml';
import {
    versions,
    sourceErrors,
    nodeCompatible,
    alignmentPlan,
    identityOf,
    checkPlan,
    verifyState,
    repositoryRuntimeErrors,
    SOURCE_PATHS,
} from './runtime-version-policy.mjs';
import {
    runtimeWorkflowErrors,
    runtimeAssertion,
    alignmentWorkflow,
    productionImageSteps,
} from './runtime-version-workflow.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const files = () =>
    Object.fromEntries(
        SOURCE_PATHS.map((p) => [p, readFileSync(join(ROOT, p), 'utf8')])
    );
const workflows = () =>
    readdirSync(join(ROOT, '.github/workflows'))
        .filter((p) => /\.ya?ml$/.test(p))
        .map((file) => ({
            file,
            workflow: parse(
                readFileSync(join(ROOT, '.github/workflows', file), 'utf8')
            ),
        }));
const repo = 'fixture/repo',
    main = 'a'.repeat(40),
    head = 'b'.repeat(40);
function pr(base = main, candidate = head) {
    return {
        number: 1,
        state: 'open',
        user: { login: 'dependabot[bot]' },
        base: { sha: base, ref: 'main', repo: { full_name: repo } },
        head: {
            sha: candidate,
            ref: 'dependabot/docker/runtime-next',
            repo: { full_name: repo },
        },
    };
}
const identity = () => identityOf(pr(), repo, main);
function bump(base, runtime, side, target) {
    const next = { ...base };
    const v = versions(base);
    if (side === 'image') {
        const before =
            runtime === 'bun'
                ? 'oven/bun:' + v.bunImage + '-debian'
                : 'node:' + v.nodeImage + '-bookworm-slim';
        next.Dockerfile = next.Dockerfile.replace(
            before,
            (runtime === 'bun' ? 'oven/bun:' : 'node:') +
                target +
                (runtime === 'bun' ? '-debian' : '-bookworm-slim')
        );
    } else if (runtime === 'node') next['.nvmrc'] = target + '\n';
    else
        next['package.json'] = next['package.json'].replace(
            '"packageManager": "bun@' + v.bunSource + '"',
            '"packageManager": "bun@' + target + '"'
        );
    return next;
}
const diffPaths = (a, b) => SOURCE_PATHS.filter((p) => a[p] !== b[p]).sort();

test('runtime: sources, toutes les assertions, Oracle et workflow réels conformes', () => {
    assert.deepEqual(repositoryRuntimeErrors(ROOT), []);
    assert.deepEqual(sourceErrors(files()), []);
    for (const path of [
        'tools/check-ci-wiring.mjs',
        'tools/check-workflow-privileges.mjs',
    ]) {
        const source = readFileSync(join(ROOT, path), 'utf8');
        assert.match(source, /repositoryRuntimeErrors\(ROOT\)/);
        assert.match(source, /import\('\.\/runtime-version-policy\.mjs'\)/);
    }
    for (const path of [
        'tools/check-ci-wiring.test.mjs',
        'tools/check-workflow-privileges.test.mjs',
    ])
        assert.match(
            readFileSync(join(ROOT, path), 'utf8'),
            /import '\.\/runtime-version-policy\.test\.mjs'/
        );
});

test('runtime: chaque divergence de sources est rouge, restauration verte', () => {
    const original = files();
    for (const runtime of ['bun', 'node']) {
        for (const side of ['source', 'image']) {
            const bad = bump(
                original,
                runtime,
                side,
                runtime === 'bun' ? '1.4.4' : '24.15.0'
            );
            assert.ok(sourceErrors(bad).length, runtime + '/' + side);
        }
    }
    for (const invalid of [
        'latest',
        'lts',
        'v22.22.3',
        '22.x',
        '22.22.3+sha.abc',
        '22.22.3-alpha',
        '022.22.3',
        '',
        '22.22.3\n\n',
    ]) {
        assert.ok(
            sourceErrors({ ...original, '.nvmrc': invalid }).length,
            invalid
        );
    }
    for (const invalid of [
        'bun@latest',
        'bun@1.3',
        'bun@1.3.14+sha.abc',
        'bun@v1.3.14',
        'bun@1.3.14-alpha',
        'npm@1.3.14',
        '',
    ]) {
        const bad = {
            ...original,
            'package.json': original['package.json'].replace(
                '"packageManager": "bun@1.3.14"',
                '"packageManager": "' + invalid + '"'
            ),
        };
        assert.ok(sourceErrors(bad).length, invalid);
    }
    for (const mutate of [
        (s) => s + '\nFROM node:22.22.3-bookworm-slim AS another\n',
        (s) => s.replace('FROM oven/bun:', 'FROM oven/bun@sha256:'),
        (s) => s.replace('FROM node:22.22.3-bookworm-slim AS build', ''),
    ])
        assert.ok(
            sourceErrors({
                ...original,
                Dockerfile: mutate(original.Dockerfile),
            }).length
        );
    assert.deepEqual(sourceErrors(original), []);
});

test('runtime: assertions Docker actives, neutralisation refusée puis restauration verte', (t) => {
    const root = temporary(t);
    mkdirSync(join(root, '.github/workflows'), { recursive: true });
    for (const { file } of workflows())
        writeFileSync(
            join(root, '.github/workflows', file),
            readFileSync(join(ROOT, '.github/workflows', file))
        );
    const original = files();
    for (const path of SOURCE_PATHS)
        writeFileSync(join(root, path), original[path]);
    assert.deepEqual(repositoryRuntimeErrors(root), []);
    for (const mutate of [
        (s) =>
            s.replace(
                'RUN test "$(node --version)"',
                '# RUN test "$(node --version)"'
            ),
        (s) =>
            s.replace(
                'packageManager.slice(4)\')"',
                'packageManager.slice(4)\')" || true'
            ),
        (s) =>
            s.replace(
                'RUN bun install --frozen-lockfile',
                'RUN bun install --frozen-lockfile || true'
            ),
    ]) {
        const bad = mutate(original.Dockerfile);
        assert.notEqual(bad, original.Dockerfile);
        writeFileSync(join(root, 'Dockerfile'), bad);
        assert.ok(
            repositoryRuntimeErrors(root).length,
            'assertion Docker neutralisée acceptée'
        );
    }
    writeFileSync(join(root, 'Dockerfile'), original.Dockerfile);
    assert.deepEqual(repositoryRuntimeErrors(root), []);
});

test('runtime: engines.node exacts de main, y compris limites et données invalides', () => {
    const range = versions(files()).nodeRange;
    for (const v of ['22.22.2', '23.0.0', '24.14.99', '25.0.0'])
        assert.equal(nodeCompatible(v, range), false, v);
    for (const v of ['22.22.3', '24.15.0', '26.0.0'])
        assert.equal(nodeCompatible(v, range), true, v);
    for (const range of [undefined, null, '', 'not-a-range'])
        assert.equal(nodeCompatible('26.0.0', range), false);
});

test('runtime: chaque paire source/CI/Docker refuse un pin et une assertion neutralisée', () => {
    const good = workflows();
    const mutations = [
        (w, s) => {
            s.with['node-version'] = '26.0.0';
        },
        (w, s) => {
            s.with['node-version-file'] = 'other';
        },
        (w, s) => {
            s['continue-on-error'] = true;
        },
        (w, s, job, i) => {
            job.steps.splice(i + 1, 1);
        },
        (w, s, job, i) => {
            job.steps[i + 1].run = 'echo accepted';
        },
        (w, s, job, i) => {
            job.steps[i + 1].if = 'false';
        },
        (w, s, job, i) => {
            job.steps[i + 1]['continue-on-error'] = true;
        },
        (w) => {
            w.env = { NODE_VERSION: '24.15.0' };
        },
    ];
    for (const runtime of ['node', 'bun'])
        for (const mutate of mutations) {
            const bad = structuredClone(good);
            const w = bad.find((e) => e.file === 'ci.yml').workflow;
            const job = w.jobs.guardrails;
            const index = job.steps.findIndex((s) =>
                s.uses?.startsWith(
                    runtime === 'node'
                        ? 'actions/setup-node@'
                        : 'oven-sh/setup-bun@'
                )
            );
            mutate(w, job.steps[index], job, index);
            assert.ok(
                runtimeWorkflowErrors(bad).length,
                runtime + ': mutant accepté'
            );
        }
    const noDocker = structuredClone(good);
    noDocker.find((e) => e.file === 'ci.yml').workflow.jobs.oracle.steps.pop();
    assert.ok(runtimeWorkflowErrors(noDocker).length);
    for (const change of [
        (w) => {
            w.on.pull_request.paths = ['Dockerfile'];
        },
        (w) => {
            w.jobs.oracle.if = false;
        },
        (w) => {
            w.jobs.oracle['continue-on-error'] = true;
        },
        (w) => {
            w.jobs.oracle['timeout-minutes'] = 46;
        },
        (w) => {
            w.jobs.oracle.permissions.contents = 'write';
        },
        (w) => {
            w.jobs.oracle.steps.push({ run: 'docker image push arbitrary' });
        },
        (w) => {
            w.jobs.oracle.steps.find(
                (s) => s.id === 'production-image-build'
            ).env = { TOKEN: 'secret' };
        },
    ]) {
        const bad = structuredClone(good);
        change(bad.find((e) => e.file === 'ci.yml').workflow);
        assert.ok(runtimeWorkflowErrors(bad).length);
    }
    assert.deepEqual(runtimeWorkflowErrors(good), []);
});

test('runtime: contrat privilégié fermé, sérialisation, chemin no-op et artefact du même run', () => {
    const good = workflows();
    for (const mutate of [
        (w) => {
            w.concurrency['cancel-in-progress'] = true;
        },
        (w) => {
            delete w.concurrency;
        },
        (w) => {
            w.on.pull_request = null;
        },
        (w) => {
            w.jobs.publish.if = true;
        },
        (w) => {
            w.jobs.publish.permissions['pull-requests'] = 'write';
        },
        (w) => {
            w.jobs.prepare.permissions.contents = 'write';
        },
        (w) => {
            w.jobs.prepare.steps[1].if = undefined;
        },
        (w) => {
            w.jobs.prepare.steps[0].run += '\ngit checkout untrusted';
        },
        (w) => {
            w.jobs.publish.steps.at(-1).run += '\ngh pr ready 1';
        },
        (w) => {
            w.jobs.publish.steps.at(-1).run += '\ngit push --force';
        },
        (w) => {
            w.jobs.publish.steps.find((s) =>
                s.uses?.startsWith('actions/download-artifact@')
            ).with['run-id'] = '123';
        },
    ]) {
        const bad = structuredClone(good);
        mutate(
            bad.find((e) => e.file === 'runtime-version-alignment.yml').workflow
        );
        assert.ok(runtimeWorkflowErrors(bad).length);
    }
    assert.deepEqual(alignmentWorkflow().jobs.publish.permissions, {
        contents: 'write',
        actions: 'write',
        'pull-requests': 'read',
    });
    assert.deepEqual(runtimeWorkflowErrors(good), []);
});

test('runtime: les deux sens des deux réparations, octets hors paire et idempotence', () => {
    const base = files();
    for (const runtime of ['bun', 'node'])
        for (const side of ['image', 'source']) {
            const target = runtime === 'bun' ? '1.4.4' : '24.15.0';
            const candidate = bump(base, runtime, side, target);
            assert.ok(sourceErrors(candidate).length);
            const plan = alignmentPlan(
                base,
                candidate,
                identity(),
                diffPaths(base, candidate)
            );
            assert.deepEqual(sourceErrors(plan.postFiles), []);
            const expected = bump(
                bump(base, runtime, side, target),
                runtime,
                side === 'image' ? 'source' : 'image',
                target
            );
            assert.deepEqual(plan.postFiles, expected);
            assert.equal(
                plan.editPath,
                side === 'source'
                    ? 'Dockerfile'
                    : runtime === 'bun'
                      ? 'package.json'
                      : '.nvmrc'
            );
            assert.equal(diffPaths(candidate, plan.postFiles).length, 1);
            assert.deepEqual(checkPlan(plan, base, repo, main), plan);
            assert.equal(
                alignmentPlan(
                    base,
                    plan.postFiles,
                    identity(),
                    diffPaths(base, plan.postFiles)
                ),
                null,
                'aucun replay après alignement'
            );
        }
    assert.equal(alignmentPlan(base, base, identity(), []), null);
});

test('runtime: données supplémentaires, moteurs hors plage et races refusés avant toute écriture', () => {
    const base = files(),
        candidate = bump(base, 'bun', 'image', '1.4.4');
    const make = (c) => alignmentPlan(base, c, identity(), diffPaths(base, c));
    for (const bad of [
        {
            ...candidate,
            'package.json': candidate['package.json'].replace(
                '"scripts": {',
                '"scripts": {"untrusted": "execute",'
            ),
        },
        bump(candidate, 'node', 'image', '24.15.0'),
        bump(base, 'node', 'image', '25.0.0'),
        { ...candidate, '.nvmrc': '26.0.0\n' },
    ])
        assert.throws(() => make(bad));
    for (const edit of [
        (p) => {
            p.user.login = 'human';
        },
        (p) => {
            p.head.repo.full_name = 'fork/repo';
        },
        (p) => {
            p.base.sha = 'c'.repeat(40);
        },
        (p) => {
            p.head.ref = 'dependabot/../../escape';
        },
        (p) => {
            p.state = 'closed';
        },
    ]) {
        const raw = pr();
        edit(raw);
        assert.throws(() => identityOf(raw, repo, main));
    }
    const plan = make(candidate);
    for (const mutate of [
        (p) => {
            p.editPath = 'bun.lock';
        },
        (p) => {
            p.target = '1.4.5';
        },
        (p) => {
            p.postFiles['.nvmrc'] = '26.0.0\n';
        },
        (p) => {
            p.changedPaths.push('bun.lock');
        },
    ]) {
        const bad = structuredClone(plan);
        mutate(bad);
        assert.throws(() => checkPlan(bad, base, repo, main));
    }
    assert.throws(() =>
        verifyState(plan, pr(main, 'c'.repeat(40)), main, repo, main)
    );
    assert.throws(() => verifyState(plan, pr(), 'c'.repeat(40), repo, main));
    assert.doesNotThrow(() => verifyState(plan, pr(), main, repo, main));
});

const shellEnv = (input = process.env) => {
    const env = Object.fromEntries(
        Object.entries(input).filter(([key]) => !key.startsWith('GIT_'))
    );
    return {
        ...env,
        PATH: dirname(process.execPath) + ':/usr/bin:/bin:/usr/sbin:/sbin',
        GIT_CONFIG_GLOBAL: '/dev/null',
        GIT_CONFIG_NOSYSTEM: '1',
        GIT_TERMINAL_PROMPT: '0',
        GIT_ALLOW_PROTOCOL: 'file',
    };
};
function temporary(t) {
    const root = mkdtempSync(join(tmpdir(), 'runtime-policy-'));
    t.after(() => rmSync(root, { recursive: true, force: true }));
    return root;
}
function executable(path, source) {
    writeFileSync(path, '#!' + process.execPath + '\n' + source, {
        mode: 0o755,
    });
}

test('runtime: assertions exécutées, binaire incorrect rouge puis version correcte verte', (t) => {
    const root = temporary(t),
        bin = join(root, 'bin');
    mkdirSync(bin);
    writeFileSync(join(root, '.nvmrc'), '22.22.3\n');
    writeFileSync(
        join(root, 'package.json'),
        '{"packageManager":"bun@1.3.14"}\n'
    );
    for (const runtime of ['node', 'bun']) {
        const binary = join(bin, runtime);
        const expected = runtime === 'node' ? 'v22.22.3' : '1.3.14';
        const run = () =>
            spawnSync(
                '/bin/bash',
                ['-e', '-o', 'pipefail', '-c', runtimeAssertion(runtime).run],
                {
                    cwd: root,
                    env: { ...shellEnv(), PATH: bin + ':' + shellEnv().PATH },
                    encoding: 'utf8',
                }
            );
        // Le faux node ne remplace que --version ; la lecture JSON reste native.
        const script = (v) =>
            'const {execFileSync}=require("node:child_process");\n' +
            'if(process.argv[2]==="--version")console.log(' +
            JSON.stringify(v) +
            ');else process.stdout.write(execFileSync(' +
            JSON.stringify(process.execPath) +
            ',process.argv.slice(2)));';
        executable(binary, script('0.0.0'));
        assert.notEqual(
            run().status,
            0,
            runtime + ' incorrect doit être refusé'
        );
        executable(binary, script(expected));
        assert.equal(run().status, 0, runtime + ' exact doit être accepté');
    }
});

test('runtime: chemin rien-à-faire natif sans checkout, setup ou installation', (t) => {
    const root = temporary(t),
        bin = join(root, 'bin');
    mkdirSync(bin);
    executable(
        join(bin, 'gh'),
        'if(!process.argv.includes("api"))process.exit(99);'
    );
    const output = join(root, 'output');
    writeFileSync(output, '');
    const script = alignmentWorkflow().jobs.prepare.steps[0].run;
    const result = spawnSync(
        '/bin/bash',
        ['-e', '-o', 'pipefail', '-c', script],
        {
            cwd: root,
            env: {
                ...shellEnv(),
                PATH: bin + ':' + shellEnv().PATH,
                RUNNER_TEMP: root,
                GITHUB_OUTPUT: output,
                GITHUB_REPOSITORY: repo,
            },
            encoding: 'utf8',
        }
    );
    assert.equal(result.status, 0, result.stderr);
    assert.equal(readFileSync(output, 'utf8'), 'active=false\n');
    assert.match(result.stdout, /nothing to do; no checkout or installation/);
    assert.equal(existsSync(join(root, 'runtime-alignment/plan.json')), false);
});

test('runtime: smoke permanent, transport simulé explicite (pas de Docker local)', (t) => {
    const root = temporary(t),
        bin = join(root, 'bin');
    mkdirSync(bin);
    const html = '<!doctype html><app-root></app-root>';
    const cfg = readFileSync(join(ROOT, 'deploy/env.template.js.in'), 'utf8')
        .replaceAll('$' + '{CMZ_AUTHENTICATION_URL}', '/api/auth/')
        .replaceAll('$' + '{CMZ_REPORT_URL}', '/api/report/')
        .replaceAll('$' + '{CMZ_SETTING_URL}', '/api/settings/')
        .replaceAll('$' + '{CMZ_FILE_URL}', '/api/file/')
        .replaceAll('$' + '{CMZ_ENVIRONMENT_DEPLOYMENT}', 'PROD')
        .replaceAll('$' + '{CMZ_ENABLE_DEBUG}', 'false')
        .replaceAll('$' + '{CMZ_TRUSTED_FRAME_ORIGINS_JSON}', '[]');
    executable(
        join(bin, 'docker'),
        [
            'const fs=require("node:fs"), a=process.argv.slice(2);',
            'fs.appendFileSync(process.env.FAKE_LOG,JSON.stringify(a)+"\\n");',
            'if(a[0]==="run")console.log("fixture-container");',
            'else if(a[0]==="port")console.log(process.env.FAKE_MODE==="public"?"0.0.0.0:8080":"127.0.0.1:18080");',
            'else if(a[0]==="inspect"&&a[1]==="--format")console.log(process.env.FAKE_MODE==="exited"?"false":"true");',
            'else if(a[0]==="logs")console.log("/etc/cmz/no-such-template missing");',
        ].join('\n')
    );
    executable(
        join(bin, 'curl'),
        [
            'const fs=require("node:fs"),a=process.argv.slice(2);',
            'const output=a[a.indexOf("--output")+1],env=a.at(-1).endsWith("/env.js");',
            'let body=env?' +
                JSON.stringify(cfg) +
                ':' +
                JSON.stringify(html) +
                ';',
            'if(env&&process.env.FAKE_MODE==="html")body=' +
                JSON.stringify(html) +
                ';',
            'if(env&&process.env.FAKE_MODE==="placeholder")body+="\\n$UNSUBSTITUTED";',
            'fs.writeFileSync(output,body);process.stdout.write("200");',
        ].join('\n')
    );
    const run = (mode) =>
        spawnSync(
            '/bin/bash',
            [
                join(ROOT, 'tools/smoke-production-image.sh'),
                'sha256:' + 'a'.repeat(64),
            ],
            {
                cwd: root,
                encoding: 'utf8',
                env: {
                    ...shellEnv(),
                    PATH: bin + ':' + shellEnv().PATH,
                    FAKE_LOG: join(root, 'docker.log'),
                    FAKE_MODE: mode,
                },
            }
        );
    for (const mode of ['exited', 'public', 'html', 'placeholder']) {
        const result = run(mode);
        assert.notEqual(
            result.status,
            0,
            mode + ': ' + result.stdout + result.stderr
        );
    }
    const green = run('normal');
    assert.equal(green.status, 0, green.stderr);
    assert.match(green.stdout, /PRODUCTION_IMAGE_HTTP=PASS/);
    const calls = readFileSync(join(root, 'docker.log'), 'utf8')
        .trim()
        .split('\n')
        .map(JSON.parse);
    assert.ok(
        calls
            .filter((a) => a[0] === 'run')
            .every(
                (a) =>
                    a.includes('127.0.0.1::8080') && a.includes('--pull=never')
            )
    );
    assert.ok(calls.some((a) => a[0] === 'rm' && a[2] === 'fixture-container'));
});

test('runtime: contre-build natif borné avec daemon simulé, seule erreur 91 après marqueur acceptée', (t) => {
    const root = temporary(t),
        bin = join(root, 'bin');
    mkdirSync(bin);
    executable(
        join(bin, 'timeout'),
        [
            'const {spawnSync}=require("node:child_process");',
            'const r=spawnSync(process.argv[3],process.argv.slice(4),{stdio:"inherit",env:process.env});',
            'process.exit(r.status??99);',
        ].join('\n')
    );
    executable(
        join(bin, 'docker'),
        [
            'if(process.env.FAKE_FAILURE==="network"){console.error("registry unavailable");process.exit(1);}',
            'if(process.env.FAKE_FAILURE==="timeout"){console.error("#12 0.100 CMZ_DOCKER_BUILD_NEGATIVE\\ndid not complete successfully: exit code: 91");process.exit(124);}',
            'if(process.env.FAKE_FAILURE==="success"){console.error("#12 0.100 CMZ_DOCKER_BUILD_NEGATIVE\\ndid not complete successfully: exit code: 91");process.exit(0);}',
            'console.error("#12 0.100 CMZ_DOCKER_BUILD_NEGATIVE");',
            'console.error("did not complete successfully: exit code: 91");process.exit(1);',
        ].join('\n')
    );
    const run = (failure) =>
        spawnSync(
            '/bin/bash',
            [
                '-e',
                '-o',
                'pipefail',
                '-c',
                productionImageSteps().find(
                    (s) => s.id === 'production-image-build-negative'
                ).run,
            ],
            {
                cwd: ROOT,
                encoding: 'utf8',
                env: {
                    ...shellEnv(),
                    RUNNER_TEMP: root,
                    PATH: bin + ':' + shellEnv().PATH,
                    FAKE_FAILURE: failure,
                },
            }
        );
    for (const failure of ['network', 'timeout', 'success'])
        assert.notEqual(
            run(failure).status,
            0,
            failure + ' ne prouve pas le contre-build'
        );
    const accepted = run('probe');
    assert.equal(accepted.status, 0, accepted.stdout + accepted.stderr);
    assert.match(accepted.stdout, /PRODUCTION_BUILD_NEGATIVE=PASS/);
});
