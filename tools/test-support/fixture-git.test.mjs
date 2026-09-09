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
