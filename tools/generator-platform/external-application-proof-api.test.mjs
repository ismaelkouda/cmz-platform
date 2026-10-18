import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { ESLint } from 'eslint';

import * as proof from './check-external-application-shells.mjs';
import {
    fixtureParent,
    snapshotTree,
    TOOLS_ROOT,
} from './test-support/external-application-fixture.mjs';

test('le point d’entrée conserve ses cinq exports publics appelables', () => {
    const names = [
        'main',
        'parseArgs',
        'qualifyBrowser',
        'qualifyNodeVersion',
        'qualifyWeights',
    ];
    assert.deepEqual(Object.keys(proof).sort(), names);
    for (const name of names) assert.equal(typeof proof[name], 'function');
});

test('importer hors checkout ne lance aucune session et ne crée aucun fichier', async (t) => {
    const parent = await fixtureParent(t);
    const before = await snapshotTree(parent, []);
    const entry = new URL(
        './check-external-application-shells.mjs',
        import.meta.url
    ).href;
    const script =
        'await import(' +
        JSON.stringify(entry) +
        ');' +
        "process.stdout.write('import-only\\n');";
    const result = spawnSync(
        process.execPath,
        ['--input-type=module', '--eval', script],
        {
            cwd: parent,
            encoding: 'utf8',
            env: { HOME: parent, PATH: '/usr/bin:/bin' },
            timeout: 30_000,
        }
    );
    assert.deepEqual(await snapshotTree(parent, []), before);
    t.diagnostic('Import hors checkout : aucun fichier créé.');
    assert.equal(result.error, undefined);
    assert.equal(result.signal, null);
    assert.equal(result.status, 0);
    assert.equal(result.stdout, 'import-only\n');
    assert.equal(result.stderr, '');
});

test('les trois modules lient leurs identifiants avec la règle native no-undef', async () => {
    const files = [
        './check-external-application-shells.mjs',
        './proof-support/external-application-runtime.mjs',
        './proof-support/external-application-checks.mjs',
    ].map((path) => fileURLToPath(new URL(path, import.meta.url)));
    const eslint = new ESLint({
        cwd: TOOLS_ROOT,
        overrideConfigFile: join(TOOLS_ROOT, 'eslint.config.mjs'),
        overrideConfig: { rules: { 'no-undef': ['error', { typeof: true }] } },
        allowInlineConfig: false,
        fix: false,
        cache: false,
    });
    const results = await eslint.lintFiles(files);
    assert.equal(results.length, files.length);
    for (const result of results) {
        assert.deepEqual(result.messages, [], result.filePath);
    }
});
