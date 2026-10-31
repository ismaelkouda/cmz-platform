/** B309: data-only proposal; candidate execution is confined to produce(). */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, lstatSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { stripVTControlCharacters } from 'node:util';
import { parseWithoutDuplicateKeys } from './check-library-setup-deps.mjs';
const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
export const PATHS = [
    'apps/backoffice-angular/bundle-metrics.json',
    'README.md',
    'LLM_CONTEXT.md',
    'docs/architecture/etat-du-socle.md',
];
export const STEPS = [
    'Bundle production — budgets + baseline Linux',
    'Bundle metrics — freshness',
    'Bundle metrics — prepare data-only proposal',
    'Bundle metrics — upload data-only proposal',
];
export const BOT = [
    'github-actions[bot]',
    '41898282+github-actions[bot]@users.noreply.github.com',
];
export const MESSAGE =
    'chore(build): refresh Linux bundle metrics\n\nGenerated-by: bundle-metrics-proposal\n';
const MAX = 9 * 1024 * 1024,
    BUNDLE_MAX = 8 * 1024 * 1024;
const PRODUCER_KEYS =
    'job_id runner_image runner_image_version build_step freshness_step projection_step'.split(
        ' '
    );
const METRIC_KEYS =
    'schema configuration measured_at output_path initial_raw_bytes initial_raw_kb initial_files exceljs_lazy_raw_bytes exceljs_lazy_raw_kb exceljs_lazy_file budget_initial_warning budget_initial_error command'.split(
        ' '
    );
const invariant = (ok) => assert.ok(ok, 'B309_REFUSED');
const bytesOk = (n, cap) =>
    invariant(Number.isSafeInteger(n) && n >= 0 && n <= cap);
const equal = (a, b) => assert.deepEqual(a, b, 'B309_REFUSED');
export const hash = (value) => createHash('sha256').update(value).digest('hex');
const sha = (v) => invariant(typeof v === 'string' && /^[a-f0-9]{40}$/.test(v));
const digest = (v) =>
    invariant(typeof v === 'string' && /^[a-f0-9]{64}$/.test(v));
const id = (v) => invariant(Number.isSafeInteger(v) && v > 0);
export function keys(value, expected) {
    invariant(
        value !== null && typeof value === 'object' && !Array.isArray(value)
    );
    invariant([Object.prototype, null].includes(Object.getPrototypeOf(value)));
    equal(
        Reflect.ownKeys(value).sort(),
        (typeof expected === 'string'
            ? expected.split(' ')
            : [...expected]
        ).sort()
    );
}
export function parseData(bytes, limit = 32768) {
    invariant(bytes.length <= limit);
    const text = bytes.toString('utf8');
    invariant(Buffer.from(text).equals(Buffer.from(bytes)));
    let depth = 0,
        quoted = false,
        escape = false,
        cardinality = 0;
    for (const c of text) {
        if (quoted) {
            if (escape) escape = false;
            else if (c === '\\') escape = true;
            else if (c === '"') quoted = false;
        } else if (c === '"') quoted = true;
        else if (c === '{' || c === '[') invariant(++depth <= 8);
        else if (c === '}' || c === ']') invariant(--depth >= 0);
        else if (c === ',')
            invariant(++cardinality <= (limit === 32768 ? 256 : 4096));
    }
    invariant(depth === 0 && !quoted);
    return parseWithoutDuplicateKeys(text, 'B309');
}
const kb = (n) => Math.round(n / 10) / 100;
function asset(name, ext) {
    invariant(
        typeof name === 'string' &&
            name.length <= 256 &&
            /^[a-zA-Z0-9_./-]+$/.test(name)
    );
    invariant(
        !name.startsWith('/') &&
            name.split('/').every((p) => p && p !== '.' && p !== '..')
    );
    invariant(ext.test(name));
}
export function metrics(base, next, project) {
    keys(base, METRIC_KEYS);
    keys(next, METRIC_KEYS);
    for (const key of [
        'schema',
        'configuration',
        'measured_at',
        'output_path',
        'budget_initial_warning',
        'budget_initial_error',
        'command',
    ])
        equal(next[key], base[key]);
    equal(next.schema, 1);
    equal(next.configuration, 'production');
    equal(next.output_path, 'dist/apps/backoffice-angular/browser');
    equal(next.command, 'bunx nx run backoffice-angular:build:production');
    invariant(/^\d{4}-\d{2}-\d{2}$/.test(next.measured_at));
    const budget = project.targets.build.configurations.production.budgets.find(
        (b) => b.type === 'initial'
    );
    invariant(budget && budget.maximumError);
    equal(next.budget_initial_warning, budget.maximumWarning ?? null);
    equal(next.budget_initial_error, budget.maximumError);
    invariant(
        Array.isArray(next.initial_files) &&
            next.initial_files.length > 0 &&
            next.initial_files.length <= 128
    );
    const names = new Set();
    let sum = 0;
    for (const entry of next.initial_files) {
        keys(entry, 'file bytes');
        asset(entry.file, /\.(?:js|css)$/);
        invariant(!names.has(entry.file));
        names.add(entry.file);
        invariant(Number.isSafeInteger(entry.bytes) && entry.bytes >= 0);
        sum += entry.bytes;
    }
    invariant(sum <= 256 * 1024 * 1024);
    equal(next.initial_raw_bytes, sum);
    equal(next.initial_raw_kb, kb(sum));
    const cap = budget.maximumError.match(/^(\d+(?:\.\d+)?)[ \t]*(b|kb|mb)$/i);
    invariant(cap && !budget.baseline);
    const factor = 1000 ** ['b', 'kb', 'mb'].indexOf(cap[2].toLowerCase());
    invariant(sum <= Number(cap[1]) * factor);
    if (next.exceljs_lazy_file === null) {
        equal(next.exceljs_lazy_raw_bytes, null);
        equal(next.exceljs_lazy_raw_kb, null);
    } else {
        asset(next.exceljs_lazy_file, /\.js$/);
        invariant(!names.has(next.exceljs_lazy_file));
        bytesOk(next.exceljs_lazy_raw_bytes, 256 * 1024 * 1024);
        equal(next.exceljs_lazy_raw_kb, kb(next.exceljs_lazy_raw_bytes));
    }
    invariant(JSON.stringify(next) !== JSON.stringify(base));
}
function replaceOnce(text, before, after) {
    equal(text.split(before).length, 2);
    return text.replace(before, () => after);
}
export function documents(before, base, next) {
    const result = { ...before };
    result['README.md'] = replaceOnce(
        before['README.md'],
        `Bundle initial prod **${base.initial_raw_kb} kB**`,
        `Bundle initial prod **${next.initial_raw_kb} kB**`
    );
    const row = (m) =>
        `**${m.initial_raw_kb} kB** ([\`bundle-metrics.json\`](./apps/backoffice-angular/bundle-metrics.json), ${m.measured_at})`;
    result['LLM_CONTEXT.md'] = replaceOnce(
        before['LLM_CONTEXT.md'],
        row(base),
        row(next)
    );
    const initial = (m) =>
        `- **Bundle initial (production, raw)** : **${m.initial_raw_kb} kB** — source [\`bundle-metrics.json\`](../../apps/backoffice-angular/bundle-metrics.json) (mesuré ${m.measured_at} via \`bun run bundle:record\` après build).`;
    const lazy = (m) =>
        m.exceljs_lazy_raw_kb === null
            ? ''
            : `\n- **ExcelJS (lazy)** : **${m.exceljs_lazy_raw_kb} kB** raw — hors budget initial.`;
    result[PATHS[3]] = replaceOnce(
        before[PATHS[3]],
        initial(base) + lazy(base),
        initial(next) + lazy(next)
    );
    return result;
}
export function io(root = ROOT, execute = execFileSync) {
    const command = (tool, args, options = {}) =>
        execute(tool, args, {
            cwd: root,
            encoding: 'utf8',
            timeout: 30000,
            maxBuffer: MAX + 1,
            ...options,
        });
    const git = (...args) =>
        command('git', [
            '--no-replace-objects',
            '--no-optional-locks',
            '-c',
            'core.fsmonitor=false',
            ...args,
        ]).trimEnd();
    const blob = (ref, path) => {
        sha(ref);
        return command(
            'git',
            ['--no-replace-objects', 'show', `${ref}:${path}`],
            { maxBuffer: 512 * 1024, encoding: null }
        );
    };
    const api = (path, binary = false) =>
        command('gh', ['api', '--allow-escape-sequences', path], {
            encoding: binary ? null : 'utf8',
            stdio: 'pipe',
        });
    const json = (path) => JSON.parse(api(path));
    return { root, command, git, blob, api, json };
}
const rev = (client, ref) => client.git('rev-parse', ref);
const tree = (client, ref) => rev(client, `${ref}^{tree}`);
export function scope(client, base, head) {
    sha(base);
    sha(head);
    client.git('merge-base', '--is-ancestor', base, head);
    equal(client.git('diff', '--summary', base, head), '');
    const names = client
        .git('diff', '--name-status', '--no-renames', base, head)
        .split('\n');
    invariant(
        names.length > 0 &&
            names.every((n) => /^M\t(package\.json|bun\.lock)$/.test(n))
    );
    const original = parseData(client.blob(base, 'package.json'), 512 * 1024);
    const candidate = parseData(client.blob(head, 'package.json'), 512 * 1024);
    const allowed = structuredClone(original);
    const versions = (a, b) => {
        keys(b, Object.keys(a));
        for (const name of Object.keys(a)) {
            invariant(
                typeof a[name] === 'string' &&
                    typeof b[name] === 'string' &&
                    b[name].length <= 256
            );
            if (a[name] !== b[name])
                invariant(name !== 'nx' && !name.startsWith('@nx/'));
            a[name] = b[name];
        }
    };
    for (const field of [
        'dependencies',
        'devDependencies',
        'peerDependencies',
        'optionalDependencies',
    ])
        if (Object.hasOwn(original, field))
            versions(allowed[field], candidate[field]);
    if (original.workspaces?.catalog)
        versions(allowed.workspaces.catalog, candidate.workspaces?.catalog);
    equal(candidate, allowed);
}
export function commitData(client, head, post) {
    sha(head);
    sha(post);
    equal(
        client.git('rev-list', '--parents', `${head}..${post}`),
        `${post} ${head}`
    );
    equal(
        client.git('show', '-s', '--format=%an%n%ae%n%cn%n%ce%n%B', post),
        [...BOT, ...BOT, MESSAGE.trimEnd()].join('\n')
    );
    const changed = client
        .git('diff', '--name-status', '--no-renames', head, post)
        .split('\n');
    invariant(
        changed.includes('M\t' + PATHS[0]) &&
            changed.every(
                (n) => n.startsWith('M\t') && PATHS.includes(n.slice(2))
            )
    );
    const data = {},
        old = {};
    for (const path of PATHS) {
        for (const ref of [head, post])
            invariant(
                client
                    .git('ls-tree', ref, '--', path)
                    .startsWith('100644 blob ')
            );
        old[path] = client.blob(head, path).toString('utf8');
        data[path] = client.blob(post, path).toString('utf8');
    }
    const baseline = parseData(Buffer.from(old[PATHS[0]]), 65536),
        next = parseData(Buffer.from(data[PATHS[0]]), 65536);
    metrics(
        baseline,
        next,
        parseData(
            client.blob(head, 'apps/backoffice-angular/project.json'),
            65536
        )
    );
    const expected = documents(old, baseline, next);
    for (const path of PATHS.slice(1)) equal(data[path], expected[path]);
    return PATHS.map((path) => ({
        path,
        bytes: Buffer.byteLength(data[path]),
        sha256: hash(data[path]),
    }));
}
export function prIdentity(pr, repository, main) {
    invariant(
        pr.state === 'open' &&
            pr.merged === false &&
            pr.mergeable === true &&
            pr.user.login === 'dependabot[bot]' &&
            pr.user.type === 'Bot'
    );
    id(pr.number);
    id(pr.user.id);
    id(repository.id);
    sha(main);
    sha(pr.head.sha);
    equal(pr.base.ref, 'main');
    equal(pr.base.sha, main);
    for (const r of [pr.base.repo, pr.head.repo]) {
        equal(r.id, repository.id);
        equal(r.full_name, repository.full_name);
    }
    invariant(
        /^dependabot\/[a-zA-Z0-9_./-]+$/.test(pr.head.ref) &&
            !pr.head.ref.includes('..') &&
            !pr.head.ref.endsWith('/')
    );
    return {
        number: pr.number,
        author: { id: pr.user.id, login: pr.user.login, type: pr.user.type },
        head_repo: { id: pr.head.repo.id, full_name: pr.head.repo.full_name },
        head_ref: pr.head.ref,
        head_sha: pr.head.sha,
        base_ref: 'main',
        base_sha: main,
    };
}
function jobOf(jobs) {
    equal(jobs.total_count, jobs.jobs.length);
    const matches = jobs.jobs.filter(
        (j) => j.name === 'Oracle — lint + build + ngc + test'
    );
    equal(matches.length, 1);
    return matches[0];
}
function requireStep(job, name, conclusion) {
    const matches = job.steps.filter((s) => s.name === name);
    equal(matches.length, 1);
    equal(matches[0].status, 'completed');
    equal(matches[0].conclusion, conclusion);
}
export function provider(client, runId, main, complete = true) {
    id(runId);
    sha(main);
    const repo = client.json('repos/' + process.env.GITHUB_REPOSITORY);
    equal(repo.full_name, process.env.GITHUB_REPOSITORY);
    equal(String(repo.id), process.env.GITHUB_REPOSITORY_ID);
    const endpoint = `repos/${repo.full_name}`;
    const run = client.json(`${endpoint}/actions/runs/${runId}`);
    equal(run.id, runId);
    equal(run.event, 'pull_request');
    equal(run.name, 'CI');
    const [path, ref, extra] = run.path.split('@');
    equal(path, '.github/workflows/ci.yml');
    equal(extra, undefined);
    id(run.workflow_id);
    id(run.run_attempt);
    sha(run.head_sha);
    equal(run.repository.id, repo.id);
    equal(run.head_repository.id, repo.id);
    equal(run.actor.login, 'dependabot[bot]');
    id(run.actor.id);
    id(run.triggering_actor.id);
    if (complete) equal(run.status, 'completed');
    equal(run.pull_requests.length, 1);
    const pr = client.json(`${endpoint}/pulls/${run.pull_requests[0].number}`);
    const identity = {
        repo: { id: repo.id, full_name: repo.full_name },
        pr: prIdentity(pr, repo, main),
    };
    equal(run.head_branch, pr.head.ref);
    equal(run.head_sha, pr.head.sha);
    if (ref)
        invariant([`refs/pull/${pr.number}/merge`, pr.head.sha].includes(ref));
    run.path = path;
    equal(client.json(`${endpoint}/commits/main`).sha, main);
    const workflow = client.json(
        `${endpoint}/actions/workflows/${run.workflow_id}`
    );
    equal(workflow.path, run.path);
    equal(workflow.state, 'active');
    const jobs = client.json(
        `${endpoint}/actions/runs/${runId}/attempts/${run.run_attempt}/jobs?per_page=100`
    );
    const job = jobOf(jobs);
    if (complete) {
        const guards = jobs.jobs.filter((j) => j.name === 'Garde-fous socle');
        equal(guards.length, 1);
        equal(guards[0].conclusion, 'success');
        for (let n = 0; n < STEPS.length; n++)
            requireStep(job, STEPS[n], n === 1 ? 'failure' : 'success');
    }
    return { identity, run, job, executionSha: pr.merge_commit_sha };
}
export function proposalShape(p) {
    keys(p, 'schema identity producer commit transport files');
    equal(p.schema, 1);
    keys(p.identity, 'repo pr workflow');
    keys(p.identity.repo, 'id full_name');
    keys(
        p.identity.pr,
        'number author head_repo head_ref head_sha base_ref base_sha'
    );
    keys(p.identity.pr.author, 'id login type');
    keys(p.identity.pr.head_repo, 'id full_name');
    keys(
        p.identity.workflow,
        'id path blob run_id run_attempt event execution_sha actor triggering_actor'
    );
    for (const who of ['actor', 'triggering_actor'])
        keys(p.identity.workflow[who], 'id login');
    keys(p.producer, PRODUCER_KEYS);
    keys(p.commit, 'parent_sha head_sha tree_sha');
    Object.values(p.commit).forEach(sha);
    keys(p.transport, 'bundle_bytes bundle_sha256');
    digest(p.transport.bundle_sha256);
    bytesOk(p.transport.bundle_bytes, BUNDLE_MAX);
    invariant(p.transport.bundle_bytes > 0);
    invariant(Array.isArray(p.files));
    equal(p.files.length, 4);
    for (const entry of p.files) {
        keys(entry, 'path bytes sha256');
        digest(entry.sha256);
        bytesOk(entry.bytes, 512 * 1024);
    }
    equal(
        p.files.map((f) => f.path),
        PATHS
    );
}
function workflowIdentity(client, main, run, execution) {
    const actor = ({ id, login }) => ({ id, login });
    return {
        id: run.workflow_id,
        path: run.path,
        blob: rev(client, `${main}:.github/workflows/ci.yml`),
        run_id: run.id,
        run_attempt: run.run_attempt,
        event: 'pull_request',
        execution_sha: execution,
        actor: actor(run.actor),
        triggering_actor: actor(run.triggering_actor),
    };
}
export function validate(client, p, state, main) {
    proposalShape(p);
    equal(p.identity.repo, state.identity.repo);
    equal(p.identity.pr, state.identity.pr);
    const { run, job } = state,
        w = p.identity.workflow;
    equal(w, workflowIdentity(client, main, run, state.executionSha));
    sha(w.execution_sha);
    equal(w.execution_sha, state.executionSha);
    const h = p.identity.pr.head_sha;
    equal(p.commit.parent_sha, h);
    scope(client, main, h);
    equal(tree(client, w.execution_sha), tree(client, h));
    if (w.execution_sha !== h)
        equal(
            client
                .git('show', '-s', '--format=%P', w.execution_sha)
                .split(' ')
                .sort(),
            [main, h].sort()
        );
    equal(rev(client, `${w.execution_sha}:.github/workflows/ci.yml`), w.blob);
    const logPath = `repos/${p.identity.repo.full_name}/actions/jobs/${job.id}/logs`;
    const groups = stripVTControlCharacters(client.api(logPath))
        .replace(/^(?:\uFEFF)?\d{4}-\d{2}-\d{2}T[\d:.]+Z |^\uFEFF|\r$/gm, '')
        .match(
            /^Current runner version: '[^'\n]+'\n([\s\S]*?\n)Prepare workflow directory\n/
        )?.[1]
        .split(/^##\[group]Runner Image\n/m);
    equal(groups?.length, 2);
    const image = groups[1].match(
        /^Image: (ubuntu-\d{2}\.04)\nVersion: ([0-9][a-zA-Z0-9.-]{1,60})\n(?:(?!Image:|Version:|##\[).*\n)*##\[endgroup]\n/
    );
    invariant(image);
    equal(
        PRODUCER_KEYS.map((key) => p.producer[key]),
        [job.id, ...image.slice(1), ...STEPS.slice(0, 3)]
    );
    const bundle = join(
        process.env.RUNNER_TEMP,
        'bundle-metrics-proposal/proposal.bundle'
    );
    equal(hash(readFileSync(bundle)), p.transport.bundle_sha256);
    equal(lstatSync(bundle).size, p.transport.bundle_bytes);
    const listing = p.commit.head_sha + ' refs/heads/bundle-proposal';
    equal(client.git('bundle', 'list-heads', bundle), listing);
    const header = readFileSync(bundle)
        .subarray(0, 4096)
        .toString('utf8')
        .split('\n\n')[0]
        .split('\n');
    equal(header[0], '# v2 git bundle');
    equal(header.length, 3);
    invariant(header[1].startsWith('-' + h + ' '));
    equal(header[2], listing);
    client.command('git', ['bundle', 'verify', bundle]);
    client.git(
        'fetch',
        '--no-tags',
        '--no-write-fetch-head',
        bundle,
        'refs/heads/bundle-proposal:refs/cmz/bundle-proposal'
    );
    equal(rev(client, 'refs/cmz/bundle-proposal'), p.commit.head_sha);
    equal(tree(client, p.commit.head_sha), p.commit.tree_sha);
    equal(commitData(client, h, p.commit.head_sha), p.files);
}
// ZIP metadata and byte limits are checked before any member is written.
const UNZIP = String.raw`import sys,zipfile,stat,pathlib
p=pathlib.Path(sys.argv[1]); out=pathlib.Path(sys.argv[2])
assert p.stat().st_size <= 9*1024*1024
with zipfile.ZipFile(p) as z:
 a=z.infolist(); assert len(a)==2 and {i.filename for i in a}=={'proposal.json','proposal.bundle'}
 assert sum(i.file_size for i in a)<=9*1024*1024
 for i in a:
  mode=i.external_attr>>16; cap=32768 if i.filename=='proposal.json' else 8*1024*1024
  assert i.file_size<=cap and not i.flag_bits&1 and not i.is_dir()
  assert stat.S_IFMT(mode) in (0,stat.S_IFREG) and mode&0o111==0
  assert i.file_size<=100*max(1,i.compress_size)
 out.mkdir()
 for i in a:
  b=z.read(i); assert len(b)==i.file_size
  (out/i.filename).write_bytes(b)
`;
export function extract(client, artifact, runId, attempt) {
    id(artifact.id);
    equal(artifact.name, `bundle-metrics-${runId}-${attempt}`);
    equal(artifact.expired, false);
    invariant(artifact.size_in_bytes > 0 && artifact.size_in_bytes <= MAX);
    invariant(/^sha256:[a-f0-9]{64}$/.test(artifact.digest));
    const bytes = client.api(
        `repos/${process.env.GITHUB_REPOSITORY}/actions/artifacts/${artifact.id}/zip`,
        true
    );
    invariant(bytes.length <= MAX);
    equal('sha256:' + hash(bytes), artifact.digest);
    const archive = join(process.env.RUNNER_TEMP, 'bundle-metrics.zip'),
        output = join(process.env.RUNNER_TEMP, 'bundle-metrics-proposal');
    writeFileSync(archive, bytes);
    client.command('python3', ['-I', '-c', UNZIP, archive, output]);
    return parseData(readFileSync(join(output, 'proposal.json')));
}
export function prepare(client = io()) {
    equal(process.env.GITHUB_EVENT_NAME, 'workflow_run');
    const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH));
    const source = event.workflow_run;
    invariant(
        source &&
            source.name === 'CI' &&
            source.event === 'pull_request' &&
            source.status === 'completed'
    );
    const main = process.env.GITHUB_SHA;
    const state = provider(client, source.id, main);
    equal(source.run_attempt, state.run.run_attempt);
    equal(source.head_sha, state.run.head_sha);
    const h = state.identity.pr.head_sha;
    client.git(
        'fetch',
        '--no-tags',
        'origin',
        'refs/heads/' + state.identity.pr.head_ref
    );
    equal(rev(client, 'FETCH_HEAD'), h);
    sha(state.executionSha);
    client.git('fetch', '--no-tags', 'origin', state.executionSha);
    scope(client, main, h);
    const response = client.json(
        `repos/${state.identity.repo.full_name}/actions/runs/${source.id}/artifacts?per_page=100`
    );
    equal(response.total_count, response.artifacts.length);
    const found = response.artifacts.filter(
        (a) => a.name === `bundle-metrics-${source.id}-${source.run_attempt}`
    );
    equal(found.length, 1);
    equal(found[0].workflow_run.id, source.id);
    equal(found[0].workflow_run.repository_id, state.identity.repo.id);
    equal(found[0].workflow_run.head_repository_id, state.identity.repo.id);
    equal(found[0].workflow_run.head_sha, h);
    equal(found[0].workflow_run.head_branch, state.identity.pr.head_ref);
    const p = extract(client, found[0], source.id, source.run_attempt);
    validate(client, p, state, main);
    return { p, main };
}
export function publish(
    client = io(),
    prepared = prepare(client),
    wait = () => execFileSync('sleep', ['2'])
) {
    const { p, main } = prepared,
        n = p.identity.pr.number,
        h = p.identity.pr.head_sha,
        post = p.commit.head_sha;
    const endpoint = `repos/${p.identity.repo.full_name}`;
    const state = provider(client, p.identity.workflow.run_id, main);
    validate(client, p, state, main);
    const branch = 'refs/heads/' + state.identity.pr.head_ref;
    client.command('gh', ['auth', 'setup-git']);
    const fresh = provider(client, p.identity.workflow.run_id, main);
    equal(fresh.identity, state.identity);
    equal(fresh.run.run_attempt, p.identity.workflow.run_attempt);
    equal(
        client.git('ls-remote', '--exit-code', 'origin', branch).split(/\s/)[0],
        h
    );
    console.log('B309_PUSH_INTENT from=' + h + ' to=' + post);
    client.git('push', 'origin', `${post}:${branch}`);
    console.log('B309_PUSHED_HEAD=' + post);
    for (let attempt = 1; attempt <= 5; attempt++) {
        const current = client.json(`${endpoint}/pulls/${n}`);
        const observed = current.head.sha;
        equal(
            prIdentity(
                { ...current, head: { ...current.head, sha: h } },
                p.identity.repo,
                main
            ),
            p.identity.pr
        );
        sha(observed);
        if (observed === post) break;
        equal(observed, h);
        invariant(attempt < 5);
        wait();
    }
    equal(client.json(`${endpoint}/commits/main`).sha, main);
    equal(
        client.git('ls-remote', '--exit-code', 'origin', branch).split(/\s/)[0],
        post
    );
    const latest = client.json(
        `${endpoint}/actions/runs/${p.identity.workflow.run_id}`
    );
    equal(latest.run_attempt, p.identity.workflow.run_attempt);
    client.command('gh', [
        'workflow',
        'run',
        'ci.yml',
        '--repo',
        p.identity.repo.full_name,
        '--ref',
        p.identity.pr.head_ref,
    ]);
    console.log('B309_CI_DISPATCH_ACCEPTED head=' + post);
}
const active = () =>
    writeFileSync(process.env.GITHUB_OUTPUT, 'active=true\n', { flag: 'a' });
export function produce(client = io()) {
    equal(process.env.GITHUB_EVENT_NAME, 'pull_request');
    const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH));
    const main = event.pull_request.base.sha,
        state = provider(
            client,
            Number(process.env.GITHUB_RUN_ID),
            main,
            false
        );
    const attempt = process.env.GITHUB_RUN_ATTEMPT;
    equal(String(state.run.run_attempt), attempt);
    const h = state.identity.pr.head_sha,
        x = rev(client, 'HEAD');
    scope(client, main, h);
    equal(tree(client, x), tree(client, h));
    const original = parseData(client.blob(h, PATHS[0]), 65536);
    const measured = parseData(
        readFileSync(join(client.root, PATHS[0])),
        65536
    );
    // Freshness already rewrote the worktree. Only the committed H is a baseline.
    metrics(
        original,
        measured,
        parseData(client.blob(h, 'apps/backoffice-angular/project.json'), 65536)
    );
    const before = Object.fromEntries(
        PATHS.map((path) => [path, client.blob(h, path).toString('utf8')])
    );
    const expected = documents(before, original, measured);
    const status = client
        .blob(h, 'STATUS.md')
        .toString('utf8')
        .match(/le (\d{4}-\d{2}-\d{2})\./);
    invariant(status);
    const env = {
        ...process.env,
        BUNDLE_METRICS_DATE: original.measured_at,
        STATUS_DATE: status[1],
    };
    client.command('bun', ['run', 'check:bundle-metrics-freshness'], {
        env,
        timeout: 120000,
    });
    client.command('bun', ['run', 'generate:status'], { env });
    for (const path of PATHS.slice(1))
        equal(readFileSync(join(client.root, path), 'utf8'), expected[path]);
    client.command('bun', ['run', 'check:docs-freshness'], {
        env,
        timeout: 120000,
    });
    for (const path of ['STATUS.md', 'docs/README.md', 'docs/adr/README.md'])
        equal(
            readFileSync(join(client.root, path)).toString('utf8'),
            client.blob(h, path).toString('utf8')
        );
    invariant(
        client
            .git('status', '--porcelain=v1', '--untracked-files=all')
            .split('\n')
            .every((line) => /^ M /.test(line) && PATHS.includes(line.slice(3)))
    );
    invariant(process.env.HUSKY !== '0');
    equal(client.git('config', '--get', 'core.hooksPath'), '.husky/_');
    client.git('switch', '--detach', h);
    client.git('add', '--', ...PATHS);
    client.command('git', ['commit', '-m', MESSAGE], {
        timeout: 180000,
        env: {
            ...env,
            GIT_AUTHOR_NAME: BOT[0],
            GIT_AUTHOR_EMAIL: BOT[1],
            GIT_COMMITTER_NAME: BOT[0],
            GIT_COMMITTER_EMAIL: BOT[1],
        },
    });
    const post = rev(client, 'HEAD');
    const files = commitData(client, h, post);
    equal(client.git('status', '--porcelain=v1', '--untracked-files=all'), '');
    const out = join(process.env.RUNNER_TEMP, 'bundle-metrics-proposal');
    mkdirSync(out);
    client.git('update-ref', 'refs/heads/bundle-proposal', post);
    const bundle = join(out, 'proposal.bundle');
    client.git('bundle', 'create', bundle, h + '..refs/heads/bundle-proposal');
    const bytes = readFileSync(bundle);
    invariant(bytes.length <= BUNDLE_MAX);
    const image = process.env.ImageOS?.match(/^ubuntu(\d{2})$/);
    invariant(image);
    const p = {
        schema: 1,
        identity: {
            ...state.identity,
            workflow: workflowIdentity(client, main, state.run, x),
        },
        producer: {
            job_id: state.job.id,
            runner_image: `ubuntu-${image[1]}.04`,
            runner_image_version: process.env.ImageVersion,
            build_step: STEPS[0],
            freshness_step: STEPS[1],
            projection_step: STEPS[2],
        },
        commit: {
            parent_sha: h,
            head_sha: post,
            tree_sha: tree(client, post),
        },
        transport: { bundle_bytes: bytes.length, bundle_sha256: hash(bytes) },
        files,
    };
    proposalShape(p);
    const json = JSON.stringify(p, null, 2) + '\n';
    invariant(Buffer.byteLength(json) <= 32768);
    writeFileSync(join(out, 'proposal.json'), json);
    active();
}
if (
    process.argv[1] &&
    resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
    try {
        const mode = process.argv[2];
        if (mode === 'produce') produce();
        else if (mode === 'prepare') {
            prepare();
            active();
        } else if (mode === 'publish') publish();
        else invariant(false);
    } catch {
        console.error('B309_REFUSED: no replay; inspect effects');
        process.exitCode = 1;
    }
}
