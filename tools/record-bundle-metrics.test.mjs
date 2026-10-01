import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';

async function write(path, content) {
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, content);
}

async function setupRoot(indexHtml) {
    const root = await mkdtemp(join(tmpdir(), 'cmz-bundle-recorder-'));
    await write(
        join(root, 'tools/record-bundle-metrics.mjs'),
        await readFile(new URL('record-bundle-metrics.mjs', import.meta.url))
    );
    await write(
        join(root, 'apps/backoffice-angular/project.json'),
        JSON.stringify({
            targets: {
                build: {
                    configurations: {
                        production: {
                            budgets: [
                                {
                                    type: 'initial',
                                    maximumWarning: '900kb',
                                    maximumError: '1mb',
                                },
                            ],
                        },
                    },
                },
            },
        })
    );
    await write(
        join(root, 'dist/apps/backoffice-angular/browser/index.html'),
        indexHtml
    );
    return root;
}

async function asset(root, name, bytes, marker = '') {
    assert.ok(marker.length <= bytes);
    await write(
        join(root, 'dist/apps/backoffice-angular/browser', name),
        marker + 'x'.repeat(bytes - marker.length)
    );
}

test('compte les modulepreload initiaux et exclut le script hôte env.js', async (t) => {
    const root = await setupRoot(`<!doctype html>
<link href="styles-AAAA.css" rel="stylesheet">
<script src="env.js"></script>
<link href="chunk-BBBB.js" rel="modulepreload">
<link rel="modulepreload" href="chunk-CCCC.js">
<script type="module" src="main-DDDD.js"></script>`);
    t.after(() => rm(root, { recursive: true, force: true }));

    await asset(root, 'env.js', 7);
    await asset(root, 'main-DDDD.js', 100);
    await asset(root, 'chunk-BBBB.js', 20);
    await asset(root, 'chunk-CCCC.js', 30);
    await asset(root, 'styles-AAAA.css', 40);
    await asset(root, 'chunk-EXCEL.js', 500_001, 'exceljs');

    const result = spawnSync(
        process.execPath,
        [join(root, 'tools/record-bundle-metrics.mjs')],
        {
            cwd: root,
            encoding: 'utf8',
            env: { ...process.env, BUNDLE_METRICS_DATE: '2026-10-01' },
        }
    );
    assert.equal(result.status, 0, result.stderr);

    const metrics = JSON.parse(
        await readFile(
            join(root, 'apps/backoffice-angular/bundle-metrics.json'),
            'utf8'
        )
    );
    assert.equal(metrics.initial_raw_bytes, 190);
    assert.deepEqual(metrics.initial_files, [
        { file: 'main-DDDD.js', bytes: 100 },
        { file: 'chunk-BBBB.js', bytes: 20 },
        { file: 'chunk-CCCC.js', bytes: 30 },
        { file: 'styles-AAAA.css', bytes: 40 },
    ]);
    assert.equal(metrics.exceljs_lazy_raw_bytes, 500_001);
    assert.equal(metrics.measured_at, '2026-10-01');
});

test('déduplique un module préchargé et refuse un asset initial absent', async (t) => {
    const root = await setupRoot(`<!doctype html>
<link rel="modulepreload" href="main-AAAA.js">
<script src="main-AAAA.js" type="module"></script>
<link rel="stylesheet" href="styles-MISSING.css">`);
    t.after(() => rm(root, { recursive: true, force: true }));

    await asset(root, 'main-AAAA.js', 100);

    const result = spawnSync(
        process.execPath,
        [join(root, 'tools/record-bundle-metrics.mjs')],
        { cwd: root, encoding: 'utf8' }
    );
    assert.equal(result.status, 1);
    assert.match(
        result.stderr,
        /fichier initial manquant : styles-MISSING\.css/
    );
});

test('refuse un index sans module JavaScript initial construit', async (t) => {
    const root = await setupRoot(`<!doctype html>
<script src="env.js"></script>
<link rel="stylesheet" href="styles-AAAA.css">`);
    t.after(() => rm(root, { recursive: true, force: true }));

    await asset(root, 'env.js', 7);
    await asset(root, 'styles-AAAA.css', 40);

    const result = spawnSync(
        process.execPath,
        [join(root, 'tools/record-bundle-metrics.mjs')],
        { cwd: root, encoding: 'utf8' }
    );
    assert.equal(result.status, 1);
    assert.match(result.stderr, /aucun script initial/);
});
