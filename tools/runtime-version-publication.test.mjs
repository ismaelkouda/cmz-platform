import assert from 'node:assert/strict';
import test from 'node:test';
import {
    readFileSync,
    writeFileSync,
    mkdirSync,
    mkdtempSync,
    rmSync,
    symlinkSync,
    existsSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync, execFileSync } from 'node:child_process';
import {
    versions,
    alignmentPlan,
    identityOf,
    SOURCE_PATHS,
} from './runtime-version-policy.mjs';
import { alignmentWorkflow } from './runtime-version-workflow.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const files = () =>
    Object.fromEntries(
        SOURCE_PATHS.map((p) => [p, readFileSync(join(ROOT, p), 'utf8')])
    );
const repo = 'fixture/repo',
    main = 'a'.repeat(40),
    head = 'b'.repeat(40);
function pr(base = main, candidate = head) {
    return {
        number: 1,
        state: 'open',
        mergeable: true,
        user: { login: 'dependabot[bot]' },
        base: { sha: base, ref: 'main', repo: { full_name: repo } },
        head: {
            sha: candidate,
            ref: 'dependabot/docker/runtime-next',
            repo: { full_name: repo },
        },
    };
}
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

function gitFixture(t, runtime = 'bun', side = 'image') {
    const root = temporary(t),
        trusted = join(root, 'trusted-main'),
        bin = join(root, 'bin');
    mkdirSync(trusted);
    mkdirSync(bin);
    const git = (...args) =>
        execFileSync('git', ['-C', trusted, ...args], {
            env: shellEnv(),
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'pipe'],
        }).trim();
    execFileSync(
        'git',
        ['init', '--quiet', '--bare', join(root, 'remote.git')],
        { env: shellEnv() }
    );
    git('init', '--quiet');
    git('config', 'user.name', 'fixture');
    git('config', 'user.email', 'fixture@example.invalid');
    git('checkout', '-b', 'main');
    const base = files();
    for (const [path, content] of Object.entries(base))
        writeFileSync(join(trusted, path), content);
    git('add', '--', ...SOURCE_PATHS);
    git('commit', '-qm', 'test: baseline');
    const baseSha = git('rev-parse', 'HEAD');
    git('remote', 'add', 'origin', join(root, 'remote.git'));
    git('push', '-q', 'origin', 'main');
    const branch = 'dependabot/docker/runtime-next';
    git('checkout', '-b', branch);
    const candidate = bump(
        base,
        runtime,
        side,
        runtime === 'bun' ? '1.4.4' : '24.15.0'
    );
    for (const [path, content] of Object.entries(candidate))
        writeFileSync(join(trusted, path), content);
    git('add', '--', ...SOURCE_PATHS);
    git('commit', '-qm', 'build(deps): isolated runtime bump');
    const headSha = git('rev-parse', 'HEAD');
    git('push', '-q', 'origin', branch);
    git('checkout', 'main');
    mkdirSync(join(trusted, 'tools'));
    for (const name of [
        'runtime-version-policy.mjs',
        'runtime-version-workflow.mjs',
    ])
        writeFileSync(
            join(trusted, 'tools', name),
            readFileSync(join(ROOT, 'tools', name))
        );
    writeFileSync(join(trusted, 'package.json'), base['package.json']);
    symlinkSync(join(ROOT, 'node_modules'), join(trusted, 'node_modules'));
    const metadata = pr(baseSha, headSha);
    metadata.head.ref = branch;
    const plan = alignmentPlan(
        base,
        candidate,
        identityOf(metadata, repo, baseSha),
        diffPaths(base, candidate)
    );
    mkdirSync(join(root, 'runtime-alignment'));
    writeFileSync(
        join(root, 'runtime-alignment/plan.json'),
        JSON.stringify(plan)
    );
    writeFileSync(join(root, 'metadata.json'), JSON.stringify(metadata));
    executable(
        join(bin, 'gh'),
        [
            'const fs=require("node:fs"),cp=require("node:child_process"),a=process.argv.slice(2);',
            'fs.appendFileSync(process.env.GH_LOG,JSON.stringify(a)+"\\n");',
            'const git=(ref)=>cp.execFileSync("git",["--git-dir",process.env.REMOTE,"rev-parse",ref],{encoding:"utf8"}).trim();',
            'const endpoint=a.find(v=>v.startsWith("repos/"));',
            'if(a[0]==="api"){',
            ' if(endpoint.includes("/pulls?"))console.log("1");',
            ' else if(endpoint.includes("/files?")){',
            '  const p=JSON.parse(fs.readFileSync(process.env.META)),h=git("refs/heads/"+p.head.ref);',
            '  const paths=cp.execFileSync("git",["--git-dir",process.env.REMOTE,"diff","--name-only",p.base.sha,h],{encoding:"utf8"}).trim().split("\\n");',
            '  console.log(JSON.stringify([paths.map(filename=>({filename,patch:cp.execFileSync("git",["--git-dir",process.env.REMOTE,"diff",p.base.sha,h,"--",filename],{encoding:"utf8"})}))]));',
            ' }else if(endpoint.includes("/contents/")){',
            '  const path=endpoint.split("/contents/")[1].split("?ref=")[0],sha=endpoint.split("?ref=")[1];',
            '  console.log(cp.execFileSync("git",["--git-dir",process.env.REMOTE,"show",sha+":"+path]).toString("base64"));',
            ' }else if(endpoint.endsWith("/commits/main")){',
            '  const p=JSON.parse(fs.readFileSync(process.env.META));',
            '  console.log(process.env.FINALIZE_MODE==="main-race" && git("refs/heads/"+p.head.ref)!==process.env.ORIGINAL_HEAD?"f".repeat(40):git("refs/heads/main"));',
            ' }',
            ' else {const p=JSON.parse(fs.readFileSync(process.env.META));p.head.sha=git("refs/heads/"+p.head.ref);',
            '  if(process.env.FINALIZE_MODE && p.head.sha!==process.env.ORIGINAL_HEAD){',
            '   const path=process.env.RUNNER_TEMP+"/observations",n=fs.existsSync(path)?Number(fs.readFileSync(path)):0;fs.writeFileSync(path,String(n+1));',
            '   const mode=process.env.FINALIZE_MODE;',
            '   if(mode==="stale" || (mode==="delayed" && n<2))p.head.sha=process.env.ORIGINAL_HEAD;',
            '   if(mode==="foreign")p.head.sha="f".repeat(40);',
            '   if(mode==="closed")p.state="closed";',
            '   if(mode==="error")process.exit(72);',
            '   if(mode==="branch-race")cp.execFileSync("/usr/bin/git",["--git-dir",process.env.REMOTE,"update-ref","refs/heads/"+p.head.ref,process.env.ORIGINAL_HEAD]);',
            '  }',
            '  if(a.includes("--jq"))console.log(p.head.sha);else console.log(JSON.stringify(p));}',
            '}else if(a[0]==="workflow" && process.env.FINALIZE_MODE==="dispatch-error")process.exit(73);',
            'else if(!(a[0]==="auth"||a[0]==="workflow"))process.exit(99);',
        ].join('\n')
    );
    const env = {
        ...shellEnv(),
        PATH: bin + ':' + shellEnv().PATH,
        RUNNER_TEMP: root,
        GITHUB_STEP_SUMMARY: join(root, 'summary'),
        GITHUB_REPOSITORY: repo,
        RUNTIME_MAIN_SHA: baseSha,
        BRANCH: branch,
        EXPECTED_HEAD: headSha,
        EXPECTED_BASE: baseSha,
        PR_NUMBER: '1',
        CHANGED_PATH: plan.changedPaths[0],
        EDIT_PATH: plan.editPath,
        RUNTIME: plan.runtime,
        TARGET: plan.target,
        META: join(root, 'metadata.json'),
        REMOTE: join(root, 'remote.git'),
        GH_LOG: join(root, 'gh.log'),
    };
    const run = () =>
        spawnSync(
            '/bin/bash',
            [
                '-e',
                '-o',
                'pipefail',
                '-c',
                alignmentWorkflow().jobs.publish.steps.at(-1).run,
            ],
            { cwd: root, env, encoding: 'utf8', timeout: 15000 }
        );
    const remoteHead = () =>
        execFileSync(
            'git',
            ['--git-dir', env.REMOTE, 'rev-parse', 'refs/heads/' + branch],
            { env: shellEnv(), encoding: 'utf8' }
        ).trim();
    return { root, trusted, plan, baseSha, headSha, git, run, remoteHead, env };
}

function event(f, mutate = (value) => value) {
    const payload = {
        workflow_run: {
            name: 'CI',
            status: 'completed',
            event: 'pull_request',
            conclusion: 'failure',
            head_sha: f.headSha,
            head_branch: f.plan.identity.branch,
            head_repository: { full_name: repo },
        },
    };
    mutate(payload.workflow_run);
    f.env.GITHUB_EVENT_NAME = 'workflow_run';
    f.env.GITHUB_EVENT_PATH = join(f.root, 'event.json');
    writeFileSync(f.env.GITHUB_EVENT_PATH, JSON.stringify(payload));
}

function discover(f) {
    const output = join(f.root, 'discover-output');
    writeFileSync(output, '');
    const result = spawnSync(
        '/bin/bash',
        [
            '-e',
            '-o',
            'pipefail',
            '-c',
            alignmentWorkflow().jobs.prepare.steps[0].run,
        ],
        {
            cwd: f.root,
            env: { ...f.env, GITHUB_OUTPUT: output },
            encoding: 'utf8',
            timeout: 15000,
        }
    );
    assert.equal(result.status, 0, result.stdout + result.stderr);
    return readFileSync(output, 'utf8');
}

function propose(f) {
    return spawnSync(
        process.execPath,
        [
            'trusted-main/tools/runtime-version-policy.mjs',
            'propose',
            join(f.root, 'runtime-alignment/input'),
            join(f.root, 'runtime-alignment/plan.json'),
        ],
        {
            cwd: f.root,
            env: f.env,
            encoding: 'utf8',
            timeout: 15000,
        }
    );
}

function advanceMain(f, divergent = false) {
    const current = files();
    const updated = divergent
        ? bump(bump(current, 'bun', 'source', '1.4.0'), 'bun', 'image', '1.4.0')
        : {
              ...current,
              'package.json':
                  JSON.stringify({
                      ...JSON.parse(current['package.json']),
                      description: 'main advances without a runtime change',
                  }) + '\n',
          };
    for (const [path, content] of Object.entries(updated))
        writeFileSync(join(f.trusted, path), content);
    f.git('add', '--', ...SOURCE_PATHS);
    f.git('commit', '-qm', 'test: main advances');
    f.git('push', '-q', 'origin', 'main');
    f.env.RUNTIME_MAIN_SHA = f.git('rev-parse', 'HEAD');
}

test('runtime: événement CI rouge admissible, découverte et publication natives dans les quatre sens', (t) => {
    assert.deepEqual(alignmentWorkflow().on.workflow_run, {
        workflows: ['CI'],
        types: ['completed'],
        branches: ['dependabot/**'],
    });
    for (const runtime of ['node', 'bun'])
        for (const side of ['source', 'image']) {
            const f = gitFixture(t, runtime, side);
            event(f);
            assert.equal(discover(f), 'active=true\n');
            const proposed = propose(f);
            assert.equal(proposed.status, 0, proposed.stdout + proposed.stderr);
            const published = f.run();
            assert.equal(
                published.status,
                0,
                published.stdout + published.stderr
            );
            assert.notEqual(f.remoteHead(), f.headSha);
        }
});

test('runtime: événements non admissibles ou périmés sans checkout ni publication', (t) => {
    for (const mutate of [
        (w) => {
            w.event = 'workflow_dispatch';
        },
        (w) => {
            w.event = 'push';
        },
        (w) => {
            w.name = 'Untrusted workflow';
        },
        (w) => {
            w.status = 'in_progress';
        },
        (w) => {
            w.head_repository.full_name = 'fork/repo';
        },
        (w) => {
            w.head_branch = 'human/branch';
        },
        (w) => {
            w.head_sha = 'f'.repeat(40);
        },
    ]) {
        const f = gitFixture(t);
        event(f, mutate);
        assert.equal(discover(f), 'active=false\n');
        assert.equal(
            existsSync(
                join(f.root, 'runtime-alignment/input/candidate/Dockerfile')
            ),
            false
        );
        assert.equal(f.remoteHead(), f.headSha);
    }
    for (const mutate of [
        (p) => {
            p.user.login = 'human';
        },
        (p) => {
            p.head.repo.full_name = 'fork/repo';
        },
    ]) {
        const f = gitFixture(t);
        event(f);
        const metadata = JSON.parse(readFileSync(f.env.META, 'utf8'));
        mutate(metadata);
        writeFileSync(f.env.META, JSON.stringify(metadata));
        assert.equal(discover(f), 'active=false\n');
        assert.equal(f.remoteHead(), f.headSha);
    }
});

test('runtime: base en retard avec runtime inchangé, preuve Git et publication sans fusion', (t) => {
    const f = gitFixture(t);
    advanceMain(f);
    event(f);
    assert.equal(discover(f), 'active=true\n');
    const result = propose(f);
    assert.equal(result.status, 0, result.stdout + result.stderr);
    const plan = JSON.parse(
        readFileSync(join(f.root, 'runtime-alignment/plan.json'), 'utf8')
    );
    assert.equal(plan.identity.baseSha, f.baseSha);
    assert.equal(plan.identity.mainSha, f.env.RUNTIME_MAIN_SHA);
    const published = f.run();
    assert.equal(published.status, 0, published.stdout + published.stderr);
    const next = f.remoteHead();
    assert.equal(f.git('rev-parse', next + '^'), f.headSha);
    assert.equal(f.git('rev-parse', 'main'), f.env.RUNTIME_MAIN_SHA);
    assert.equal(f.git('diff', '--name-only', f.headSha, next), 'package.json');
});

test('runtime: base divergente, non ancêtre, conflit et fusionnabilité inconnue refusés', (t) => {
    for (const mode of ['runtime', 'ancestor', 'conflict', 'unknown']) {
        const f = gitFixture(t);
        if (mode === 'runtime' || mode === 'ancestor')
            advanceMain(f, mode === 'runtime');
        event(f);
        assert.equal(discover(f), 'active=true\n');
        const path = join(f.root, 'runtime-alignment/input/pr.json');
        const raw = JSON.parse(readFileSync(path, 'utf8'));
        if (mode === 'ancestor') {
            raw.base.sha = f.git(
                'commit-tree',
                f.git('rev-parse', f.baseSha + '^{tree}'),
                '-m',
                'test: same runtime, unrelated history'
            );
        }
        if (mode === 'conflict') raw.mergeable = false;
        if (mode === 'unknown') raw.mergeable = null;
        writeFileSync(path, JSON.stringify(raw));
        const result = propose(f);
        assert.notEqual(result.status, 0, mode + ': accepted');
        assert.match(
            result.stderr,
            mode === 'runtime'
                ? /runtime.*base/
                : mode === 'ancestor'
                  ? /ancêtre/
                  : /fusionnable/
        );
        assert.equal(f.remoteHead(), f.headSha);
        assert.equal(existsSync(join(f.root, 'runtime-candidate')), false);
    }
});

test('runtime: conflit apparu après proposition refusé avant le worktree et le push', (t) => {
    const f = gitFixture(t);
    const metadata = JSON.parse(readFileSync(f.env.META, 'utf8'));
    metadata.mergeable = false;
    writeFileSync(f.env.META, JSON.stringify(metadata));
    const result = f.run();
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /fusionnable/);
    assert.equal(f.remoteHead(), f.headSha);
    assert.equal(existsSync(join(f.root, 'runtime-candidate')), false);
});

test('runtime: publication native sur dépôt Git de fixture, deux runtimes et deux sens', (t) => {
    for (const runtime of ['node', 'bun'])
        for (const side of ['source', 'image']) {
            const f = gitFixture(t, runtime, side);
            const output = join(f.root, 'discover-output');
            writeFileSync(output, '');
            const discovery = spawnSync(
                '/bin/bash',
                [
                    '-e',
                    '-o',
                    'pipefail',
                    '-c',
                    alignmentWorkflow().jobs.prepare.steps[0].run,
                ],
                {
                    cwd: f.root,
                    env: { ...f.env, GITHUB_OUTPUT: output },
                    encoding: 'utf8',
                }
            );
            assert.equal(
                discovery.status,
                0,
                discovery.stdout + discovery.stderr
            );
            assert.equal(readFileSync(output, 'utf8'), 'active=true\n');
            const proposed = spawnSync(
                process.execPath,
                [
                    'trusted-main/tools/runtime-version-policy.mjs',
                    'propose',
                    join(f.root, 'runtime-alignment/input'),
                    join(f.root, 'runtime-alignment/plan.json'),
                ],
                { cwd: f.root, env: f.env, encoding: 'utf8' }
            );
            assert.equal(proposed.status, 0, proposed.stdout + proposed.stderr);
            assert.match(proposed.stdout, /changed=true/);
            const result = f.run();
            assert.equal(result.status, 0, result.stdout + result.stderr);
            const next = f.remoteHead();
            assert.notEqual(next, f.headSha);
            const candidate = join(f.root, 'runtime-candidate');
            const changed = execFileSync(
                'git',
                ['-C', candidate, 'diff', '--name-only', f.headSha, next],
                { encoding: 'utf8' }
            ).trim();
            assert.equal(changed, f.plan.editPath);
            for (const path of SOURCE_PATHS)
                assert.equal(
                    readFileSync(join(candidate, path), 'utf8'),
                    f.plan.postFiles[path]
                );
            assert.match(
                readFileSync(join(f.root, 'gh.log'), 'utf8'),
                /workflow","run","ci.yml/
            );
            assert.match(
                readFileSync(join(f.root, 'summary'), 'utf8'),
                /no longer rebases/
            );
        }
});

test('runtime: course de head et blobs falsifiés refusés avant checkout, aucun push de fixture', (t) => {
    const stale = gitFixture(t);
    stale.git('checkout', stale.plan.identity.branch);
    writeFileSync(join(stale.trusted, 'raced'), 'another actor\n');
    stale.git('add', 'raced');
    stale.git('commit', '-qm', 'test: concurrent actor');
    stale.git('push', '-q', 'origin', stale.plan.identity.branch);
    stale.git('checkout', 'main');
    const before = stale.remoteHead();
    const rejected = stale.run();
    assert.notEqual(rejected.status, 0);
    assert.equal(stale.remoteHead(), before);
    assert.equal(existsSync(join(stale.root, 'runtime-candidate')), false);
    const forged = gitFixture(t);
    const falseInput = bump(files(), 'bun', 'image', '1.4.5');
    const falsePlan = alignmentPlan(files(), falseInput, forged.plan.identity, [
        'Dockerfile',
    ]);
    writeFileSync(
        join(forged.root, 'runtime-alignment/plan.json'),
        JSON.stringify(falsePlan)
    );
    const result = forged.run();
    assert.notEqual(result.status, 0, result.stdout + result.stderr);
    assert.match(result.stderr, /blobs Git différents/);
    assert.equal(forged.remoteHead(), forged.headSha);
    assert.equal(existsSync(join(forged.root, 'runtime-candidate')), false);
});

function finalizationFixture(t, mode) {
    const f = gitFixture(t);
    f.env.FINALIZE_MODE = mode;
    f.env.ORIGINAL_HEAD = f.headSha;
    f.env.NATIVE_GIT_LOG = join(f.root, 'git.log');
    executable(
        join(f.root, 'bin/git'),
        [
            'const fs=require("node:fs"),cp=require("node:child_process"),a=process.argv.slice(2);',
            'fs.appendFileSync(process.env.NATIVE_GIT_LOG,JSON.stringify(a)+"\\n");',
            'const r=cp.spawnSync("/usr/bin/git",a,{stdio:"inherit",env:process.env});process.exit(r.status??99);',
        ].join('\n')
    );
    executable(
        join(f.root, 'bin/sleep'),
        'require("node:fs").appendFileSync(process.env.RUNNER_TEMP+"/sleeps",process.argv[2]+"\\n");'
    );
    const calls = () =>
        readFileSync(f.env.GH_LOG, 'utf8').trim().split('\n').map(JSON.parse);
    const counts = () => {
        const git = readFileSync(f.env.NATIVE_GIT_LOG, 'utf8')
            .trim()
            .split('\n')
            .map(JSON.parse);
        assert.equal(git.filter((a) => a.includes('commit')).length, 1);
        assert.equal(git.filter((a) => a.includes('push')).length, 1);
        return calls().filter((a) => a[0] === 'workflow').length;
    };
    return { ...f, counts };
}

test('runtime: finalisation attend le head publié, sans répéter commit ou push', (t) => {
    const f = finalizationFixture(t, 'delayed');
    const result = f.run();
    assert.equal(result.status, 0, result.stdout + result.stderr);
    assert.equal(f.counts(), 1);
    assert.equal(readFileSync(join(f.root, 'observations'), 'utf8'), '3');
    assert.equal(readFileSync(join(f.root, 'sleeps'), 'utf8'), '2\n2\n');
    assert.match(
        result.stdout,
        /RUNTIME_ALIGNMENT_PR_HEAD attempt=1 observed=/
    );
    assert.match(result.stdout, /RUNTIME_ALIGNMENT_CI_DISPATCH_ACCEPTED/);
});

test('runtime: finalisation bornée refuse le head ancien persistant sans redispatch', (t) => {
    const f = finalizationFixture(t, 'stale');
    const result = f.run();
    assert.notEqual(result.status, 0);
    assert.equal(f.counts(), 0);
    assert.equal(readFileSync(join(f.root, 'observations'), 'utf8'), '5');
    assert.equal(readFileSync(join(f.root, 'sleeps'), 'utf8'), '2\n2\n2\n2\n');
    assert.match(result.stderr, /RUNTIME_ALIGNMENT_HEAD_NOT_VISIBLE/);
    assert.notEqual(f.remoteHead(), f.headSha);
    assert.doesNotMatch(
        readFileSync(join(f.root, 'summary'), 'utf8'),
        /CI dispatched/
    );
});

test('runtime: finalisation refuse head étranger, identité fermée et erreur de lecture', (t) => {
    for (const mode of ['foreign', 'closed', 'error']) {
        const f = finalizationFixture(t, mode);
        const result = f.run();
        assert.notEqual(result.status, 0, mode);
        assert.equal(f.counts(), 0, mode);
        assert.equal(readFileSync(join(f.root, 'observations'), 'utf8'), '1');
        assert.equal(existsSync(join(f.root, 'sleeps')), false);
    }
});

test('runtime: finalisation vérifie le ref Git après la visibilité API', (t) => {
    const f = finalizationFixture(t, 'branch-race');
    const result = f.run();
    assert.notEqual(result.status, 0);
    assert.equal(f.counts(), 0);
    assert.match(result.stderr, /RUNTIME_ALIGNMENT_REMOTE_HEAD_CHANGED/);
});

test('runtime: finalisation refuse main avancé après le push', (t) => {
    const f = finalizationFixture(t, 'main-race');
    const result = f.run();
    assert.notEqual(result.status, 0);
    assert.equal(f.counts(), 0);
    assert.match(result.stderr, /RUNTIME_ALIGNMENT_MAIN_CHANGED/);
    assert.notEqual(f.remoteHead(), f.headSha);
});

test('runtime: finalisation ne répète pas un dispatch refusé et conserve le commit poussé', (t) => {
    const f = finalizationFixture(t, 'dispatch-error');
    const result = f.run();
    assert.notEqual(result.status, 0);
    assert.equal(f.counts(), 1);
    assert.notEqual(f.remoteHead(), f.headSha);
    assert.match(result.stderr, /RUNTIME_ALIGNMENT_CI_DISPATCH_FAILED/);
    assert.doesNotMatch(
        result.stdout,
        /RUNTIME_ALIGNMENT_CI_DISPATCH_ACCEPTED/
    );
});
