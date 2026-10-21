// D1 provisoire : branche de diagnostic uniquement, jamais fusionnée.
import assert from 'node:assert/strict';
import { execFileSync, fork, spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { once } from 'node:events';
import {
    existsSync,
    lstatSync,
    readFileSync,
    readdirSync,
    readlinkSync,
    realpathSync,
    watch,
} from 'node:fs';
import {
    mkdir,
    mkdtemp,
    readFile,
    rm,
    symlink,
    unlink,
    writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join, sep } from 'node:path';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';

import { initFixtureRepo } from './fixture-git.mjs';

const SELF = fileURLToPath(import.meta.url);
const PREFIX = 'cmz-flake-git-';
const PHASES = ['before-return', 'after-return-marker', 'teardown'];
const TASKS = new Set([
    'add',
    'commit',
    'maintenance',
    'gc',
    'repack',
    'pack-objects',
    'pack-refs',
    'reflog',
    'prune',
    'hash-object',
]);

function safeCode(error) {
    return /^[A-Z0-9_]+$/.test(error?.code ?? '') ? error.code : 'UNCLASSIFIED';
}

export function redactDiagnosticCause(error) {
    const seen = new WeakSet();
    function redact(cause, depth) {
        assert.ok(cause instanceof Error, 'D1_CAUSE_NOT_ERROR');
        const code = safeCode(cause);
        const status = Number.isInteger(cause.status) ? cause.status : null;
        const nested = cause.cause;
        seen.add(cause);
        for (const key of Reflect.ownKeys(cause)) {
            assert.ok(
                Reflect.deleteProperty(cause, key),
                'D1_UNREDACTABLE_CAUSE'
            );
        }
        Object.defineProperties(cause, {
            name: { value: 'Error', configurable: true },
            message: { value: 'D1_REDACTED_CAUSE:' + code, configurable: true },
            stack: {
                value: 'Error: D1_REDACTED_CAUSE:' + code,
                configurable: true,
            },
            code: { value: code, configurable: true },
        });
        if (status !== null)
            Object.defineProperty(cause, 'status', {
                value: status,
                configurable: true,
            });
        if (nested instanceof Error && depth < 8 && !seen.has(nested)) {
            Object.defineProperty(cause, 'cause', {
                value: redact(nested, depth + 1),
                configurable: true,
            });
        }
        return cause;
    }
    // Même objet Error, chaîne native bornée, codes conservés ; aucun texte/output brut.
    return redact(error, 0);
}

function ownedRoot(root) {
    assert.equal(realpathSync(dirname(root)), realpathSync(tmpdir()));
    assert.ok(
        basename(root).startsWith(PREFIX) ||
            basename(root).startsWith('page-realization-')
    );
    assert.ok(
        lstatSync(root).isDirectory() && !lstatSync(root).isSymbolicLink()
    );
    assert.equal(realpathSync(root), root);
    for (const part of ['.git', '.git/objects', '.git/objects/pack']) {
        assert.ok(lstatSync(join(root, part)).isDirectory());
        assert.ok(!lstatSync(join(root, part)).isSymbolicLink());
    }
}

function git(root, args, { input, allowMissing = false } = {}) {
    try {
        return execFileSync('git', ['-C', root, ...args], {
            encoding: 'utf8',
            input,
            timeout: 10_000,
            stdio: ['pipe', 'pipe', 'pipe'],
        }).trim();
    } catch (error) {
        if (allowMissing && error.status === 1) return null;
        // Ne jamais propager stderr/stdout ni le message composé de Node.
        redactDiagnosticCause(error);
        throw new Error('D1_GIT_FAILED:' + safeCode(error), { cause: error });
    }
}

function processRecord(pid, root) {
    try {
        const executable = basename(readlinkSync('/proc/' + pid + '/exe'));
        if (executable !== 'git' && !executable.startsWith('git-')) return null;
        const cwd = readlinkSync('/proc/' + pid + '/cwd');
        if (cwd !== root && !cwd.startsWith(root + sep)) return null;
        const stat = readFileSync('/proc/' + pid + '/stat', 'utf8');
        const fields = stat.slice(stat.lastIndexOf(')') + 2).split(' ');
        const args = readFileSync('/proc/' + pid + '/cmdline', 'utf8').split(
            '\0'
        );
        // argv reste en mémoire ; seul le nom d'une tâche autorisée sort.
        const task = args.slice(1).find((arg) => TASKS.has(arg)) ?? 'other-git';
        return {
            pid: Number(pid),
            ppid: Number(fields[1]),
            birth: fields[19],
            task: task + (args.includes('--auto') ? ':auto' : ''),
        };
    } catch {
        return null; // Processus bref, disparu ou inaccessible : absence non démontrée.
    }
}

function processBirth(pid) {
    try {
        const stat = readFileSync('/proc/' + pid + '/stat', 'utf8');
        const fields = stat.slice(stat.lastIndexOf(')') + 2).split(' ');
        return { birth: fields[19], zombie: fields[0] === 'Z' };
    } catch {
        return null;
    }
}

function packState(root) {
    try {
        return new Map(
            readdirSync(join(root, '.git/objects/pack')).map((name) => {
                const stat = lstatSync(join(root, '.git/objects/pack', name), {
                    bigint: true,
                });
                return [name, stat.ino + ':' + stat.size + ':' + stat.mtimeNs];
            })
        );
    } catch (error) {
        if (error.code === 'ENOENT') return new Map();
        throw error;
    }
}

async function observerWorker(root) {
    ownedRoot(root);
    let phase = PHASES[0];
    let previous = packState(root);
    const records = new Map();
    const result = {
        notifications: Object.fromEntries(PHASES.map((p) => [p, 0])),
        changedStates: Object.fromEntries(PHASES.map((p) => [p, 0])),
        gitPids: Object.fromEntries(PHASES.map((p) => [p, []])),
        tasks: [],
        gitObservations: [],
        samplingLimit: true,
        killedOwnedProcesses: 0,
        remainingOwnedProcesses: 0,
        signalFailures: 0,
    };
    function sample() {
        const current = packState(root);
        // Une suppression seule n'est pas classée comme une écriture.
        if (
            [...current].some(
                ([name, signature]) => previous.get(name) !== signature
            )
        ) {
            result.changedStates[phase]++;
        }
        previous = current;
        if (process.platform !== 'linux') return;
        for (const pid of readdirSync('/proc').filter((name) =>
            /^[0-9]+$/.test(name)
        )) {
            const record = processRecord(pid, root);
            if (!record) continue;
            if (records.size >= 128 && !records.has(record.pid)) {
                result.processLimitExceeded = true;
                break;
            }
            records.set(record.pid, record);
            const list = result.gitPids[phase];
            if (!list.includes(record.pid)) {
                list.push(record.pid);
                result.gitObservations.push({
                    phase,
                    pid: record.pid,
                    ppid: record.ppid,
                    task: record.task,
                });
            }
            if (!result.tasks.includes(record.task))
                result.tasks.push(record.task);
        }
    }
    const watcher = watch(join(root, '.git/objects/pack'), () => {
        result.notifications[phase]++;
        sample();
    });
    const interval = setInterval(sample, 25);
    const deadline = setTimeout(() => {
        result.timedOut = true;
        void stop();
    }, 60_000);
    let stopping = false;
    async function stop() {
        if (stopping) return;
        stopping = true;
        clearTimeout(deadline);
        clearInterval(interval);
        watcher.close();
        // Seulement les PID Git déjà attribués à cette racine, avec anti-réutilisation.
        const alive = [...records.values()].filter((r) => {
            const current = processBirth(r.pid);
            return current?.birth === r.birth && !current.zombie;
        });
        for (const r of alive) {
            try {
                process.kill(r.pid, 'SIGTERM');
                result.killedOwnedProcesses++;
            } catch (error) {
                if (error.code !== 'ESRCH') result.signalFailures++;
            }
        }
        await delay(100);
        for (const r of alive) {
            const current = processBirth(r.pid);
            if (current?.birth === r.birth && !current.zombie) {
                try {
                    process.kill(r.pid, 'SIGKILL');
                } catch (error) {
                    if (error.code !== 'ESRCH') result.signalFailures++;
                }
            }
        }
        for (let i = 0; i < 10; i++) {
            result.remainingOwnedProcesses = alive.filter((r) => {
                const current = processBirth(r.pid);
                return current?.birth === r.birth && !current.zombie;
            }).length;
            if (result.remainingOwnedProcesses === 0) break;
            await delay(25);
        }
        if (process.connected)
            process.send({ type: 'stopped', result }, () =>
                process.disconnect()
            );
    }
    watcher.on('error', () => {
        result.watchError = true;
    });
    process.on('message', (message) => {
        if (message.type === 'phase' && PHASES.includes(message.phase)) {
            sample();
            phase = message.phase;
            process.send({ type: 'phase', phase });
        } else if (message.type === 'snapshot') {
            sample();
            process.send({ type: 'snapshot', result });
        } else if (message.type === 'stop') {
            void stop();
        }
    });
    process.on('disconnect', () => {
        clearInterval(interval);
        clearTimeout(deadline);
        watcher.close();
    });
    sample();
    process.send({ type: 'ready' });
}

export async function startPackObserver(root) {
    ownedRoot(root);
    const child = fork(SELF, ['--observe-pack', root], {
        execArgv: [],
        stdio: ['ignore', 'ignore', 'ignore', 'ipc'],
    });
    const pending = new Set();
    let stopped = false;
    const exit = once(child, 'exit');
    function request(type, message = {}) {
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                pending.delete(onMessage);
                child.off('message', onMessage);
                reject(new Error('D1_OBSERVER_TIMEOUT'));
            }, 5_000);
            function onMessage(value) {
                if (value.type !== type) return;
                clearTimeout(timer);
                child.off('message', onMessage);
                pending.delete(onMessage);
                resolve(value);
            }
            pending.add(onMessage);
            child.on('message', onMessage);
            if (type !== 'ready') child.send(message);
        });
    }
    try {
        await request('ready');
    } catch (error) {
        child.kill();
        await exit;
        throw error;
    }
    return {
        // Sans attente : le teardown réel n'est pas retardé pour recevoir un ACK.
        returned() {
            child.send({ type: 'phase', phase: PHASES[1] });
        },
        teardown() {
            child.send({ type: 'phase', phase: PHASES[2] });
        },
        async markReturnedAndWait() {
            await request('phase', { type: 'phase', phase: PHASES[1] });
        },
        async snapshot() {
            return (await request('snapshot', { type: 'snapshot' })).result;
        },
        async stop() {
            assert.equal(stopped, false);
            stopped = true;
            try {
                const { result } = await request('stopped', { type: 'stop' });
                await exit;
                assert.notEqual(result.watchError, true, 'D1_WATCH_ERROR');
                assert.notEqual(result.timedOut, true, 'D1_OBSERVER_DEADLINE');
                assert.notEqual(
                    result.processLimitExceeded,
                    true,
                    'D1_PROCESS_LIMIT'
                );
                assert.equal(
                    result.remainingOwnedProcesses,
                    0,
                    'D1_CHILD_STILL_ALIVE'
                );
                assert.equal(result.signalFailures, 0, 'D1_SIGNAL_FAILED');
                return result;
            } finally {
                if (child.exitCode === null && child.signalCode === null) {
                    child.kill();
                    await exit;
                }
                for (const listener of pending) child.off('message', listener);
            }
        },
    };
}

export async function controlledObserverWitness() {
    const root = realpathSync(await mkdtemp(join(tmpdir(), PREFIX)));
    let observer;
    let witness;
    let witnessExit;
    let stdinFailure = null;
    try {
        initFixtureRepo(root);
        observer = await startPackObserver(root);
        await observer.markReturnedAndWait();
        // Écrivain connu APRÈS l'ACK : prouve la sensibilité fs sans ambiguïté temporelle.
        await writeFile(
            join(root, '.git/objects/pack/witness-1'),
            'D1 controlled witness\n'
        );
        if (process.platform === 'linux') {
            // Vrai Git possédé, tenu sur stdin pour calibrer le relevé /proc.
            witness = spawn('git', ['hash-object', '--stdin'], {
                cwd: root,
                stdio: ['pipe', 'ignore', 'ignore'],
            });
            witness.stdin.on('error', (error) => {
                if (error.code !== 'EPIPE') stdinFailure = safeCode(error);
            });
            witnessExit = once(witness, 'exit').catch(() => null);
            await once(witness, 'spawn').catch((error) => {
                redactDiagnosticCause(error);
                throw new Error('D1_WITNESS_GIT_START_FAILED', {
                    cause: error,
                });
            });
        }
        let evidence;
        for (let i = 0; i < 40; i++) {
            await delay(25);
            evidence = await observer.snapshot();
            if (
                evidence.changedStates[PHASES[1]] > 0 &&
                (!witness || evidence.gitPids[PHASES[1]].includes(witness.pid))
            )
                break;
        }
        assert.ok(
            evidence.changedStates[PHASES[1]] > 0,
            'D1_CONTROLLED_WRITE_NOT_SEEN'
        );
        if (witness) {
            assert.ok(
                evidence.gitPids[PHASES[1]].includes(witness.pid),
                'D1_CONTROLLED_GIT_NOT_SEEN'
            );
            witness.kill();
            await witnessExit;
            witness = null;
            assert.equal(stdinFailure, null, 'D1_WITNESS_STDIN_FAILED');
        }
        const current = observer;
        observer = null;
        return await current.stop();
    } finally {
        try {
            if (witness) {
                witness.kill();
                await witnessExit;
            }
        } finally {
            try {
                if (observer) await observer.stop();
            } finally {
                await rm(root, { recursive: true, force: true });
            }
        }
    }
}

export async function controlledProcCounterproof() {
    assert.equal(process.platform, 'linux', 'D1_LINUX_REQUIRED');
    const root = realpathSync(await mkdtemp(join(tmpdir(), PREFIX)));
    try {
        const directory = join(root, 'tools/test-support');
        await mkdir(directory, { recursive: true });
        for (const name of [
            'fixture-git.mjs',
            'fixture-git.test.mjs',
            'fixture-git-maintenance-probe.mjs',
        ]) {
            let content = await readFile(
                new URL('./' + name, import.meta.url),
                'utf8'
            );
            if (name === 'fixture-git-maintenance-probe.mjs') {
                const target = ['if (!record)', ' continue;'].join('');
                assert.equal(
                    content.split(target).length,
                    2,
                    'D1_MUTATION_TARGET'
                );
                // Défaut plausible : filtrer le processus Git employé comme témoin.
                content = content.replace(
                    target,
                    "if (!record || record.task === 'hash-object') continue;"
                );
            }
            await writeFile(join(directory, name), content);
        }
        const childEnvironment = { ...process.env };
        delete childEnvironment.NODE_TEST_CONTEXT;
        let status = 0;
        let output = '';
        try {
            output = execFileSync(
                process.execPath,
                [
                    '--test',
                    '--test-name-pattern=^D1 : le témoin réel',
                    join(directory, 'fixture-git.test.mjs'),
                ],
                {
                    env: childEnvironment,
                    encoding: 'utf8',
                    timeout: 10_000,
                    stdio: ['ignore', 'pipe', 'pipe'],
                }
            );
        } catch (error) {
            status = error.status;
            // TAP du témoin possédé uniquement, jamais publié ni ajouté comme cause brute.
            output = String(error.stdout ?? '');
        }
        assert.equal(status, 1, 'D1_PROC_MUTANT_NOT_RED');
        assert.deepEqual(
            [...output.matchAll(/^not ok [0-9]+ - (.+)$/gm)].map((m) => m[1]),
            ['D1 : le témoin réel est vu par un observateur indépendant'],
            'D1_PROC_MUTANT_WRONG_FAILURE'
        );
        assert.match(
            output,
            /D1_CONTROLLED_GIT_NOT_SEEN/,
            'D1_PROC_MUTANT_WRONG_REASON'
        );
    } finally {
        await rm(root, { recursive: true, force: true });
    }
}

function effectiveConfig(root) {
    const names = [
        'gc.auto',
        'gc.autoDetach',
        'gc.autoPackLimit',
        'maintenance.auto',
        'maintenance.autoDetach',
        'maintenance.strategy',
    ];
    return names
        .map((name) => {
            const value = git(root, ['config', '--get', name], {
                allowMissing: true,
            });
            return (
                name +
                '=' +
                (value === null
                    ? 'absent'
                    : /^(?:[0-9]+|true|false|none|incremental)$/.test(value)
                      ? value
                      : 'not-recorded')
            );
        })
        .join(' ');
}

function objectCounts(root) {
    const values = git(root, ['count-objects', '-v']);
    return values
        .split('\n')
        .filter((line) => /^(?:count|in-pack|packs): [0-9]+$/.test(line))
        .join(' ');
}

function calibrateLooseObjects(root) {
    git(root, ['config', '--local', 'gc.auto', '1']);
    const format = git(root, ['rev-parse', '--show-object-format']);
    assert.ok(format === 'sha1' || format === 'sha256');
    let written = 0;
    for (let i = 0; i < 8_192 && written < 4; i++) {
        const value = 'D1-calibration-' + i + '\n';
        const hash = createHash(format)
            .update('blob ' + Buffer.byteLength(value) + '\0' + value)
            .digest('hex');
        if (!hash.startsWith('17')) continue;
        assert.equal(
            git(root, ['hash-object', '-w', '--stdin'], { input: value }),
            hash
        );
        written++;
    }
    assert.equal(written, 4, 'D1_CALIBRATION_OBJECT_BUDGET');
}

export async function runGitMaintenanceDiagnostic(t) {
    assert.equal(process.platform, 'linux', 'D1_LINUX_REQUIRED');
    const fixture =
        await import('../generator-platform/page-realization.fixture.mjs');
    const { planPageRealization } =
        await import('../generator-platform/core/page-realization.mjs');
    const started = performance.now();
    const instrumentFailures = [];
    // Quatre observations distinctes, une par condition ; jamais de relance.
    for (const calibrated of [false, true]) {
        for (const foreground of [false, true]) {
            assert.ok(
                performance.now() - started < 300_000,
                'D1_GLOBAL_BUDGET'
            );
            const label =
                (calibrated ? 'calibration' : 'real') +
                '/' +
                (foreground ? 'helper' : 'raw');
            const observationStart = performance.now();
            let data;
            let observer;
            let report;
            let removed = false;
            try {
                data = await fixture.pageRealizationFixture('angular-pwa');
                const root = realpathSync(data.root);
                const version = git(root, ['--version']);
                assert.match(version, /^git version [A-Za-z0-9(). +_-]{1,80}$/);
                t.diagnostic(
                    'D1 versions node=' + process.versions.node + ' ' + version
                );
                ownedRoot(root);
                assert.ok(
                    performance.now() - observationStart < 60_000,
                    'D1_OBSERVATION_BUDGET'
                );
                const initial = objectCounts(root);
                if (foreground) initFixtureRepo(root);
                const layout = await fixture.writeLayoutBindingAndCommit(data);
                const absolute = join(root, layout.bindingPath);
                await writeFile(
                    join(root, 'designs/binding-target.json'),
                    await readFile(absolute)
                );
                await unlink(absolute);
                await symlink('binding-target.json', absolute);
                if (calibrated) calibrateLooseObjects(root);
                const before = objectCounts(root);
                const config = effectiveConfig(root);
                observer = await startPackObserver(root);
                git(root, ['add', '.']);
                const commitStart = performance.now();
                git(root, ['commit', '-qm', 'replace binding with symlink']);
                const commitMs = Math.round(performance.now() - commitStart);
                observer.returned();
                const head = git(root, ['rev-parse', 'HEAD']);
                assert.throws(
                    () =>
                        planPageRealization({
                            workspaceRoot: root,
                            appName: 'clean-street',
                            pageId: data.pageId,
                            layoutBindingPath: layout.bindingPath,
                            layoutBindingSchema: fixture.layoutBindingSchema,
                            layoutExampleSetSchema:
                                fixture.layoutExampleSetSchema,
                            authorityCommitSha: head,
                            baseCommitSha: head,
                        }),
                    /layout binding must not be a symbolic link/,
                    'D1_BINDING_CONTRACT_CHANGED'
                );
                const after = objectCounts(root);
                observer.teardown();
                let cleanup = 'success';
                try {
                    await rm(root, { recursive: true, force: true });
                    removed = true;
                } catch (error) {
                    cleanup = safeCode(error);
                }
                report = await observer.stop();
                observer = null;
                // Texte filtré seulement ; aucun message d'erreur enfant ni environnement.
                t.diagnostic(
                    'D1 ' +
                        label +
                        ' initial=' +
                        initial +
                        ' before=' +
                        before +
                        ' after=' +
                        after +
                        ' commitMs=' +
                        commitMs +
                        ' cleanup=' +
                        cleanup
                );
                t.diagnostic('D1 config ' + label + ' ' + config);
                t.diagnostic(
                    'D1 observer ' +
                        label +
                        ' receivedAfterMarker=' +
                        report.notifications[PHASES[1]] +
                        ' changedStatesAfterMarker=' +
                        report.changedStates[PHASES[1]] +
                        ' gitPidsAfterMarker=' +
                        report.gitPids[PHASES[1]].join(',') +
                        ' tasks=' +
                        report.tasks.join(',') +
                        ' killedOwned=' +
                        report.killedOwnedProcesses +
                        ' shortProcessesMayBeMissed=true historicalCause=unknown'
                );
                for (const item of report.gitObservations) {
                    t.diagnostic(
                        'D1 process ' +
                            label +
                            ' phase=' +
                            item.phase +
                            ' pid=' +
                            item.pid +
                            ' ppid=' +
                            item.ppid +
                            ' task=' +
                            item.task
                    );
                }
                if (performance.now() - observationStart >= 60_000)
                    instrumentFailures.push(label + ':observation-budget');
                if (commitMs >= 15_000)
                    instrumentFailures.push(label + ':commit-budget');
                // ENOTEMPTY est une donnée du diagnostic, pas un motif de supprimer la variante suivante.
            } catch (error) {
                // Le TAP ne peut pas recopier le stderr d'un git de la fixture.
                const first = String(error?.message ?? '').split(/\r?\n/, 1)[0];
                redactDiagnosticCause(error);
                if (/^D1_[A-Z0-9_:]+$/.test(first))
                    throw new Error(first + ':' + label, { cause: error });
                throw new Error(
                    'D1_EXPERIMENT_FAILED:' + label + ':' + safeCode(error),
                    { cause: error }
                );
            } finally {
                if (observer) {
                    try {
                        await observer.stop();
                    } catch (error) {
                        instrumentFailures.push(label + ':observer-stop');
                        t.diagnostic(
                            'D1 secondary observer-stop ' +
                                label +
                                ' code=' +
                                safeCode(error)
                        );
                    }
                }
                if (data && !removed && existsSync(data.root)) {
                    // Nettoyage de ressource après collecte, pas relance de l'expérience.
                    try {
                        await rm(data.root, { recursive: true, force: true });
                    } catch (error) {
                        instrumentFailures.push(label + ':residual-root');
                        t.diagnostic(
                            'D1 secondary cleanup ' +
                                label +
                                ' code=' +
                                safeCode(error) +
                                ' owned-basename=' +
                                basename(data.root)
                        );
                    }
                }
            }
        }
    }
    assert.deepEqual(instrumentFailures, [], 'D1_INSTRUMENT_FAILED');
    assert.ok(performance.now() - started < 360_000, 'D1_GLOBAL_BUDGET');
    t.diagnostic(
        'D1 observations complete; absence in samples does not prove absence of maintenance'
    );
}

if (process.argv[1] === SELF && process.argv[2] === '--observe-pack') {
    observerWorker(process.argv[3]).catch(() => {
        process.exitCode = 1;
        process.disconnect();
    });
}
