import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import {
    access,
    mkdir,
    mkdtemp,
    readFile,
    realpath,
    rm,
    writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { pathToFileURL } from 'node:url';

import { buildLibraryChangeSet } from './library-plan.mjs';
import {
    assertPublishableRepository,
    createCandidateCommit,
    publishCandidateCommit,
    recoverLibraryPublication,
} from './publication-transaction.mjs';

const START = 'Fri Sep  4 00:00:00 2026';

function git(root, ...args) {
    return execFileSync('git', ['-C', root, ...args], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
}

function entry(path, content) {
    return {
        path,
        mode: '100644',
        bytes: Buffer.byteLength(content),
        sha256: createHash('sha256').update(content).digest('hex'),
    };
}

async function fixture(t) {
    const root = await realpath(await mkdtemp(join(tmpdir(), 'cmz-publish-')));
    t.after(() => rm(root, { recursive: true, force: true }));
    const repository = join(root, 'repo');
    const candidate = join(root, 'candidate');
    await mkdir(join(repository, 'app'), { recursive: true });
    await mkdir(join(candidate, 'app'), { recursive: true });
    git(repository, 'init', '-q');
    git(repository, 'config', 'user.email', 'test@example.test');
    git(repository, 'config', 'user.name', 'Test');
    await writeFile(join(repository, 'app/existing'), 'before\n');
    git(repository, 'add', '.');
    git(repository, 'commit', '-qm', 'base');
    await writeFile(join(candidate, 'app/existing'), 'after\n');
    await writeFile(join(candidate, 'app/created'), 'created\n');
    const changeSet = buildLibraryChangeSet(
        [entry('app/existing', 'before\n')],
        [entry('app/existing', 'after\n'), entry('app/created', 'created\n')]
    );
    return {
        repository,
        candidate,
        changeSet,
        base: git(repository, 'rev-parse', 'HEAD'),
    };
}

function crashPublication(
    value,
    created,
    planId,
    { phase = 'worktree-published', postPublish = null } = {}
) {
    const moduleUrl = pathToFileURL(
        join(import.meta.dirname, 'publication-transaction.mjs')
    ).href;
    const source = `
import { publishCandidateCommit } from ${JSON.stringify(moduleUrl)};
const payload = JSON.parse(process.argv[1]);
publishCandidateCommit({
  ...payload,
  processProbe: () => ${JSON.stringify(START)},
  afterPhase(phase) {
    if (phase === ${JSON.stringify(phase)}) process.kill(process.pid, 'SIGKILL');
  },
  finalizePublishedState: () => ({ synchronized: true })
});
`;
    return spawnSync(
        process.execPath,
        [
            '--input-type=module',
            '-e',
            source,
            JSON.stringify({
                repository: value.repository,
                candidate: value.candidate,
                baseCommit: value.base,
                candidateCommit: created.commit,
                changeSet: value.changeSet,
                planId,
                postPublish,
            }),
        ],
        { encoding: 'utf8' }
    );
}

test('construit un commit candidat puis synchronise worktree, index et branche', async (t) => {
    const value = await fixture(t);
    assertPublishableRepository(value.repository, value.base);
    const created = createCandidateCommit({
        ...value,
        baseCommit: value.base,
        message: 'chore: add library',
    });
    const result = publishCandidateCommit({
        ...value,
        baseCommit: value.base,
        candidateCommit: created.commit,
        planId: `library-plan:${'a'.repeat(64)}`,
        processProbe: () => START,
    });
    assert.equal(result.commit, created.commit);
    assert.equal(git(value.repository, 'rev-parse', 'HEAD'), created.commit);
    assert.equal(git(value.repository, 'status', '--porcelain'), '');
    assert.equal(
        await readFile(join(value.repository, 'app/existing'), 'utf8'),
        'after\n'
    );
    assert.equal(
        await readFile(join(value.repository, 'app/created'), 'utf8'),
        'created\n'
    );
});

test('une panne après publication partielle restaure le commit de base octet pour octet', async (t) => {
    const value = await fixture(t);
    const created = createCandidateCommit({
        ...value,
        baseCommit: value.base,
        message: 'chore: add library',
    });
    assert.throws(
        () =>
            publishCandidateCommit({
                ...value,
                baseCommit: value.base,
                candidateCommit: created.commit,
                planId: `library-plan:${'b'.repeat(64)}`,
                processProbe: () => START,
                afterPhase: (phase) => {
                    if (phase === 'worktree-published')
                        throw new Error('crash');
                },
            }),
        /crash/
    );
    assert.equal(git(value.repository, 'rev-parse', 'HEAD'), value.base);
    assert.equal(git(value.repository, 'status', '--porcelain'), '');
    assert.equal(
        await readFile(join(value.repository, 'app/existing'), 'utf8'),
        'before\n'
    );
    await assert.rejects(
        readFile(join(value.repository, 'app/created')),
        /ENOENT/
    );
});

test('un vrai SIGKILL laisse une transaction que le prochain run restaure', async (t) => {
    const value = await fixture(t);
    const created = createCandidateCommit({
        ...value,
        baseCommit: value.base,
        message: 'chore: crash proof',
    });
    const result = crashPublication(
        value,
        created,
        `library-plan:${'c'.repeat(64)}`
    );
    assert.equal(result.signal, 'SIGKILL', result.stderr || result.stdout);
    assert.equal(
        await readFile(join(value.repository, 'app/existing'), 'utf8'),
        'after\n'
    );
    assert.deepEqual(
        recoverLibraryPublication(value.repository, { processProbe: () => '' }),
        {
            action: 'rolled-back',
        }
    );
    assert.equal(git(value.repository, 'rev-parse', 'HEAD'), value.base);
    assert.equal(git(value.repository, 'status', '--porcelain'), '');
    assert.equal(
        await readFile(join(value.repository, 'app/existing'), 'utf8'),
        'before\n'
    );
});

test('la récupération refuse d’écraser une édition humaine après SIGKILL', async (t) => {
    const value = await fixture(t);
    const created = createCandidateCommit({
        ...value,
        baseCommit: value.base,
        message: 'chore: divergence proof',
    });
    const result = crashPublication(
        value,
        created,
        `library-plan:${'d'.repeat(64)}`
    );
    assert.equal(result.signal, 'SIGKILL', result.stderr || result.stdout);
    await writeFile(
        join(value.repository, 'app/existing'),
        'édition humaine\n'
    );
    assert.throws(
        () =>
            recoverLibraryPublication(value.repository, {
                processProbe: () => '',
            }),
        /modification divergente/
    );
    assert.equal(
        await readFile(join(value.repository, 'app/existing'), 'utf8'),
        'édition humaine\n'
    );
    assert.equal(git(value.repository, 'rev-parse', 'HEAD'), value.base);
});

test('un journal sans verrou est ambigu et n’est jamais repris', async (t) => {
    const value = await fixture(t);
    await writeFile(
        join(value.repository, '.git/cmz-library-transaction.json'),
        '{}\n',
        { mode: 0o600 }
    );
    assert.throws(
        () => recoverLibraryPublication(value.repository),
        /journal de publication présent sans verrou/
    );
});

test('conserve la transaction si la finalisation post-publication échoue puis la reprend', async (t) => {
    const value = await fixture(t);
    const created = createCandidateCommit({
        ...value,
        baseCommit: value.base,
        message: 'chore: durable post publish',
    });
    const postPublish = {
        kind: 'dependency-synchronization',
        app: 'demo',
        library: 'angular-material',
        platform: 'angular',
        track_id: 'angular-22',
        track_sha256: 'e'.repeat(64),
    };
    assert.throws(
        () =>
            publishCandidateCommit({
                ...value,
                baseCommit: value.base,
                candidateCommit: created.commit,
                planId: `library-plan:${'e'.repeat(64)}`,
                postPublish,
                processProbe: () => START,
                finalizePublishedState: () => {
                    throw new Error('synchronisation indisponible');
                },
            }),
        /synchronisation indisponible/
    );
    assert.equal(git(value.repository, 'rev-parse', 'HEAD'), created.commit);
    assert.equal(git(value.repository, 'status', '--porcelain'), '');
    await assert.doesNotReject(
        access(join(value.repository, '.git/cmz-library.lock'))
    );
    await assert.doesNotReject(
        access(join(value.repository, '.git/cmz-library-transaction.json'))
    );
    // Le verrou et le journal doivent réellement survivre. Le premier appel
    // sans finaliseur est donc refusé, jamais blanchi comme "completed".
    assert.throws(
        () =>
            recoverLibraryPublication(value.repository, {
                processProbe: () => '',
            }),
        /synchronisation locale en attente/
    );
    let calls = 0;
    const recovered = recoverLibraryPublication(value.repository, {
        processProbe: () => '',
        finalizePublishedState: (descriptor) => {
            calls += 1;
            assert.deepEqual(descriptor, postPublish);
            return { synchronized: true };
        },
    });
    assert.equal(calls, 1);
    assert.equal(recovered.action, 'completed-post-publish');
    assert.deepEqual(recovered.postPublishResult, { synchronized: true });
    await assert.rejects(
        readFile(join(value.repository, '.git/cmz-library.lock')),
        /ENOENT/
    );
    await assert.rejects(
        readFile(join(value.repository, '.git/cmz-library-transaction.json')),
        /ENOENT/
    );
});

test('refuse une finalisation non gouvernée avant toute publication', async (t) => {
    const value = await fixture(t);
    const created = createCandidateCommit({
        ...value,
        baseCommit: value.base,
        message: 'chore: invalid post publish',
    });
    assert.throws(
        () =>
            publishCandidateCommit({
                ...value,
                baseCommit: value.base,
                candidateCommit: created.commit,
                planId: `library-plan:${'f'.repeat(64)}`,
                postPublish: { kind: 'arbitrary-command' },
                processProbe: () => START,
            }),
        /finalisation post-publication invalide/
    );
    assert.equal(git(value.repository, 'rev-parse', 'HEAD'), value.base);
    assert.equal(git(value.repository, 'status', '--porcelain'), '');
    await assert.rejects(
        access(join(value.repository, '.git/cmz-library.lock')),
        /ENOENT/
    );
});

test('un SIGKILL après le CAS de branche reprend la synchronisation avant de nettoyer', async (t) => {
    const value = await fixture(t);
    const created = createCandidateCommit({
        ...value,
        baseCommit: value.base,
        message: 'chore: crash after ref',
    });
    const postPublish = {
        kind: 'dependency-synchronization',
        app: 'demo',
        library: 'tailwind',
        platform: 'angular',
        track_id: 'angular-22-tailwind-4',
        track_sha256: 'a'.repeat(64),
    };
    const result = crashPublication(
        value,
        created,
        `library-plan:${'1'.repeat(64)}`,
        { phase: 'ref-published', postPublish }
    );
    assert.equal(result.signal, 'SIGKILL', result.stderr || result.stdout);
    assert.equal(git(value.repository, 'rev-parse', 'HEAD'), created.commit);
    let synchronized = false;
    const recovered = recoverLibraryPublication(value.repository, {
        processProbe: () => '',
        finalizePublishedState: (descriptor) => {
            assert.deepEqual(descriptor, postPublish);
            synchronized = true;
            return { synchronized: true };
        },
    });
    assert.equal(synchronized, true);
    assert.equal(recovered.action, 'completed-post-publish');
    assert.equal(git(value.repository, 'status', '--porcelain'), '');
});
