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
            ' }else if(endpoint.endsWith("/commits/main"))console.log(git("refs/heads/main"));',
            ' else {const p=JSON.parse(fs.readFileSync(process.env.META));p.head.sha=git("refs/heads/"+p.head.ref);',
            '  if(a.includes("--jq"))console.log(p.head.sha);else console.log(JSON.stringify(p));}',
            '}else if(!(a[0]==="auth"||a[0]==="workflow"))process.exit(99);',
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
