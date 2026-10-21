import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { fixtureGit, initFixtureRepo } from './fixture-git.mjs';

/** Reproduit l'environnement hermétique des helpers git de production. */
function hermeticGitConfig(root, key) {
    return execFileSync(
        'git',
        ['-C', root, 'config', '--local', '--get', key],
        {
            encoding: 'utf8',
            env: {
                PATH: process.env.PATH,
                LANG: 'C',
                LC_ALL: 'C',
                GIT_CONFIG_NOSYSTEM: '1',
                GIT_CONFIG_GLOBAL: '/dev/null',
                GIT_CONFIG_SYSTEM: '/dev/null',
            },
        }
    ).trim();
}

test('initFixtureRepo force l’auto-gc en avant-plan, persisté pour la production', () => {
    const root = mkdtempSync(join(tmpdir(), 'cmz-fixture-git-test-'));
    try {
        initFixtureRepo(root);

        // Persisté dans .git/config local → lu même sous l'env hermétique
        // (system/global neutralisés) du code de production sous test.
        assert.equal(hermeticGitConfig(root, 'gc.autoDetach'), 'false');
        assert.equal(
            hermeticGitConfig(root, 'maintenance.autoDetach'),
            'false'
        );

        // L'auto-gc n'est PAS désactivé : gc.auto n'est jamais écrit, git garde
        // son seuil par défaut, donc le comportement reste couvert par le test.
        assert.throws(
            () => fixtureGit(root, ['config', '--local', '--get', 'gc.auto']),
            'gc.auto ne doit jamais être défini'
        );
    } finally {
        rmSync(root, {
            recursive: true,
            force: true,
            maxRetries: 20,
            retryDelay: 100,
        });
    }
});

import { inspect } from 'node:util';
import {
    controlledObserverWitness,
    controlledProcCounterproof,
    redactDiagnosticCause,
    runGitMaintenanceDiagnostic,
} from './fixture-git-maintenance-probe.mjs';

test('D1 : une cause native ne recopie jamais les sorties enfant', () => {
    let childError;
    try {
        execFileSync(
            process.execPath,
            [
                '-e',
                'process.stdout.write("D1_OUTPUT_CANARY");process.stderr.write("D1_ERROR_CANARY");process.exit(23)',
            ],
            { stdio: ['ignore', 'pipe', 'pipe'] }
        );
    } catch (error) {
        childError = error;
    }
    assert.ok(childError instanceof Error);
    assert.match(inspect(childError), /D1_OUTPUT_CANARY/);
    const original = childError;
    const local = new Error('D1_LOCAL_CANARY', { cause: childError });
    const cause = redactDiagnosticCause(local);
    const outer = new Error('D1_CHILD_FAILED', { cause });
    assert.equal(outer.cause, local);
    assert.equal(cause.cause, original);
    assert.equal(cause.cause.status, 23);
    assert.doesNotMatch(
        inspect(outer, { depth: 8 }),
        /D1_OUTPUT_CANARY|D1_ERROR_CANARY|D1_LOCAL_CANARY|Command failed|stdout|stderr/
    );
});

test(
    'D1 : le témoin réel est vu par un observateur indépendant',
    { timeout: 15_000 },
    async () => {
        try {
            await controlledObserverWitness();
        } catch (error) {
            const first = String(error?.message ?? '').split(/\r?\n/, 1)[0];
            redactDiagnosticCause(error);
            throw new Error(
                /^D1_[A-Z0-9_:]+$/.test(first) ? first : 'D1_WITNESS_FAILED',
                { cause: error }
            );
        }
    }
);

test(
    'D1 : la contre-preuve Linux détecte un filtre Git incorrect',
    {
        timeout: 15_000,
        skip:
            process.platform !== 'linux'
                ? 'D1 contre-preuve /proc réservée à Linux'
                : false,
    },
    async () => {
        try {
            await controlledProcCounterproof();
        } catch (error) {
            const first = String(error?.message ?? '').split(/\r?\n/, 1)[0];
            redactDiagnosticCause(error);
            throw new Error(
                /^D1_[A-Za-z0-9_:/-]+$/.test(first)
                    ? first
                    : 'D1_PROC_COUNTERPROOF_FAILED',
                { cause: error }
            );
        }
    }
);

test(
    'D1 : observations Linux réelles puis calibration, sans relance',
    {
        timeout: 360_000,
        skip:
            process.platform !== 'linux'
                ? 'D1 nécessite /proc et inotify Linux'
                : false,
    },
    async (t) => {
        try {
            await runGitMaintenanceDiagnostic(t);
        } catch (error) {
            const first = String(error?.message ?? '').split(/\r?\n/, 1)[0];
            redactDiagnosticCause(error);
            throw new Error(
                /^D1_[A-Za-z0-9_:/-]+$/.test(first)
                    ? first
                    : 'D1_DIAGNOSTIC_FAILED',
                { cause: error }
            );
        }
    }
);
