import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, realpathSync } from 'node:fs';
import {
    chmod,
    mkdir,
    mkdtemp,
    readdir,
    rm,
    writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as wait } from 'node:timers/promises';
import test from 'node:test';

const FACTORY_URL = new URL('./page-realization.fixture.mjs', import.meta.url)
    .href;
const SUCCESS = 'D2_FIRST_COMMIT_OK\n';
const REJECTION = 'D2_FIRST_COMMIT_CONFIG_REQUIRED';
const HOOK = [
    '#!/bin/sh',
    "reject() { printf '%s\\n' 'D2_FIRST_COMMIT_CONFIG_REQUIRED' >&2; exit 77; }",
    '[ "$(git config --local --get gc.autoDetach)" = false ] || reject',
    '[ "$(git config --local --get maintenance.autoDetach)" = false ] || reject',
    'git config --local --get gc.auto >/dev/null 2>&1',
    '[ "$?" -eq 1 ] || reject',
    'git config --local --get maintenance.auto >/dev/null 2>&1',
    '[ "$?" -eq 1 ] || reject',
    "printf '%s\\n' 'D2_CONFIG_READY_BEFORE_FIRST_COMMIT' > .git/cmz-first-commit-contract",
    '',
].join('\n');

// Un enfant normal, pas un second runner node --test. Ses erreurs restent en RAM.
const CHILD_MODULE = [
    "import { readFileSync, realpathSync } from 'node:fs';",
    "import { tmpdir } from 'node:os';",
    "import { isAbsolute, join, relative } from 'node:path';",
    'const owned = realpathSync(process.argv[3]);',
    "if (realpathSync(tmpdir()) !== owned) throw new Error('D2_TMPDIR_NOT_OWNED');",
    'const { pageRealizationFixture } = await import(process.argv[1]);',
    'const fixture = await pageRealizationFixture(process.argv[2]);',
    'const root = realpathSync(fixture.root);',
    'const path = relative(owned, root);',
    "if (!path || path.startsWith('..') || isAbsolute(path)) throw new Error('D2_ROOT_NOT_OWNED');",
    "const marker = readFileSync(join(root, '.git/cmz-first-commit-contract'), 'utf8');",
    "if (marker !== 'D2_CONFIG_READY_BEFORE_FIRST_COMMIT\\n') throw new Error('D2_HOOK_NOT_EXECUTED');",
    "process.stdout.write('D2_FIRST_COMMIT_OK\\n');",
].join('\n');

function environmentDigest() {
    return createHash('sha256')
        .update(
            JSON.stringify(
                Object.entries(process.env).sort(([a], [b]) =>
                    a.localeCompare(b)
                )
            )
        )
        .digest('hex');
}

function fixtureEnvironment(model, runtime) {
    const env = { ...process.env };
    for (const key of Object.keys(env)) {
        if (
            key.startsWith('GIT_') ||
            ['TMPDIR', 'TMP', 'TEMP', 'NODE_TEST_CONTEXT'].includes(key)
        )
            delete env[key];
    }
    return {
        ...env,
        GIT_CONFIG_NOSYSTEM: '1',
        GIT_CONFIG_GLOBAL: '/dev/null',
        GIT_TEMPLATE_DIR: model,
        TMPDIR: runtime,
    };
}

function groupExists(pid) {
    if (!pid) return false;
    try {
        process.kill(-pid, 0);
        return true;
    } catch (error) {
        if (error.code === 'ESRCH') return false;
        throw error;
    }
}

async function awaitGroupExit(pid) {
    const deadline = performance.now() + 1_000;
    while (groupExists(pid) && performance.now() < deadline) await wait(10);
    return !groupExists(pid);
}

async function runFixtureChild(profile, runtime, env) {
    const result = await new Promise((resolve) => {
        const child = spawn(
            process.execPath,
            [
                '--input-type=module',
                '-e',
                CHILD_MODULE,
                FACTORY_URL,
                profile,
                runtime,
            ],
            { env, detached: true, stdio: ['ignore', 'pipe', 'pipe'] }
        );
        let stdout = '';
        let stderr = '';
        let bytes = 0;
        let failure = null;
        const stop = () => {
            if (!child.pid) return;
            try {
                process.kill(-child.pid, 'SIGKILL');
            } catch (error) {
                if (error.code !== 'ESRCH') failure = 'KILL_FAILED';
            }
        };
        const timer = setTimeout(() => {
            failure = 'TIMEOUT';
            stop();
        }, 10_000);
        const receive = (channel, chunk) => {
            bytes += chunk.length;
            if (bytes > 65_536) {
                failure = 'OUTPUT_LIMIT';
                stop();
                return;
            }
            if (channel === 'stdout') stdout += chunk.toString();
            else stderr += chunk.toString();
        };
        child.stdout.on('data', (chunk) => receive('stdout', chunk));
        child.stderr.on('data', (chunk) => receive('stderr', chunk));
        child.once('error', () => {
            failure = 'SPAWN_FAILED';
        });
        child.once('close', (exitCode) => {
            clearTimeout(timer);
            resolve({ exitCode, stdout, stderr, failure, pid: child.pid });
        });
    });
    const groupGone = await awaitGroupExit(result.pid);
    const outcome =
        result.exitCode === 0 && result.stdout === SUCCESS
            ? 'SUCCESS'
            : result.exitCode === 1 && result.stderr.includes(REJECTION + '\n')
              ? 'HOOK_REJECTED'
              : 'UNEXPECTED_FAILURE';
    // Aucun stdout/stderr enfant, argv, environnement ou objet Error dans le TAP.
    return {
        exitCode: result.exitCode,
        failure: result.failure,
        groupGone,
        outcome,
    };
}

for (const profile of ['angular-pwa', 'react-spa']) {
    test(
        'D2 : Git est configuré avant le premier commit réel de ' + profile,
        { timeout: 15_000 },
        async (t) => {
            assert.ok(
                process.platform === 'darwin' || process.platform === 'linux',
                'D2_REQUIRES_QUALIFIED_UNIX_PROCESS_GROUPS'
            );
            const beforeEnvironment = environmentDigest();
            const parent = await mkdtemp(
                join(realpathSync(tmpdir()), 'cmz-fixture-first-commit-')
            );
            const model = join(parent, 'model');
            const runtime = join(parent, 'runtime');
            let groupGone = true;
            t.after(async () => {
                assert.equal(groupGone, true, 'D2_OWNED_CHILD_STILL_RUNNING');
                const roots = existsSync(runtime) ? await readdir(runtime) : [];
                await rm(parent, { recursive: true, force: true });
                assert.equal(
                    existsSync(parent),
                    false,
                    'D2_OWNED_PARENT_REMAINS'
                );
                t.diagnostic('D2 owned roots removed=' + roots.length);
                assert.equal(roots.length, 1, 'D2_EXPECTED_ONE_OWNED_FIXTURE');
                assert.equal(
                    environmentDigest() === beforeEnvironment,
                    true,
                    'D2_PARENT_ENV_CHANGED'
                );
            });
            await mkdir(join(model, 'hooks'), { recursive: true });
            await mkdir(runtime);
            const hook = join(model, 'hooks/pre-commit');
            await writeFile(hook, HOOK);
            await chmod(hook, 0o755);
            groupGone = false;
            const result = await runFixtureChild(
                profile,
                runtime,
                fixtureEnvironment(model, runtime)
            );
            groupGone = result.groupGone;
            t.diagnostic(
                'D2 child outcome=' +
                    result.outcome +
                    ' exit=' +
                    result.exitCode
            );
            assert.equal(result.failure, null, 'D2_CHILD_RUNTIME_FAILURE');
            assert.equal(
                result.groupGone,
                true,
                'D2_OWNED_PROCESS_GROUP_REMAINS'
            );
            assert.equal(
                result.exitCode,
                0,
                'D2_FIRST_COMMIT_MUST_BE_PROTECTED'
            );
            assert.equal(
                result.outcome,
                'SUCCESS',
                'D2_FIRST_COMMIT_WITNESS_REQUIRED'
            );
        }
    );
}
