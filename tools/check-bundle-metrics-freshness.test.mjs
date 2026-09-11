import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';

const TARGET = 'apps/backoffice-angular/bundle-metrics.json';

async function write(path, content) {
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, content);
}

async function setupRoot() {
    const root = await mkdtemp(join(tmpdir(), 'cmz-bundle-freshness-'));
    await mkdir(join(root, 'tools'), { recursive: true });
    await write(
        join(root, 'tools/check-bundle-metrics-freshness.mjs'),
        await readFile(
            new URL('check-bundle-metrics-freshness.mjs', import.meta.url)
        )
    );
    return root;
}

test('mesure inchangée (date figée) : pas de faux rouge quotidien', async (t) => {
    const root = await setupRoot();
    t.after(() => rm(root, { recursive: true, force: true }));

    await write(
        join(root, TARGET),
        JSON.stringify({ measured_at: '2026-08-30', initial_raw_bytes: 100 }) +
            '\n'
    );
    // Le "recorder" réel resterait bloqué sur un vrai build ; celui-ci
    // rejoue exactement les octets déjà commités si BUNDLE_METRICS_DATE
    // correspond — reproduit l'absence de drift réel.
    await write(
        join(root, 'tools/record-bundle-metrics.mjs'),
        `import { writeFileSync } from 'node:fs';
writeFileSync(new URL('../${TARGET}', import.meta.url),
  JSON.stringify({ measured_at: process.env.BUNDLE_METRICS_DATE, initial_raw_bytes: 100 }) + '\\n');
`
    );

    const result = spawnSync(
        process.execPath,
        [join(root, 'tools/check-bundle-metrics-freshness.mjs')],
        { cwd: root, encoding: 'utf8' }
    );
    assert.equal(result.status, 0, result.stderr);
    assert.match(
        result.stdout,
        /BUNDLE_METRICS_DATE figée \(commit\) : 2026-08-30/
    );
    assert.match(result.stdout, /OK {2}check:bundle-metrics-freshness/);
});

test('drift réel (octets différents malgré la date figée) : rouge', async (t) => {
    const root = await setupRoot();
    t.after(() => rm(root, { recursive: true, force: true }));

    await write(
        join(root, TARGET),
        JSON.stringify({ measured_at: '2026-08-30', initial_raw_bytes: 100 }) +
            '\n'
    );
    await write(
        join(root, 'tools/record-bundle-metrics.mjs'),
        `import { writeFileSync } from 'node:fs';
writeFileSync(new URL('../${TARGET}', import.meta.url),
  JSON.stringify({ measured_at: process.env.BUNDLE_METRICS_DATE, initial_raw_bytes: 999 }) + '\\n');
`
    );

    const result = spawnSync(
        process.execPath,
        [join(root, 'tools/check-bundle-metrics-freshness.mjs')],
        { cwd: root, encoding: 'utf8' }
    );
    assert.equal(result.status, 1);
    assert.match(result.stderr, /bundle-metrics\.json périmé/);
});

test('fichier cible absent : échec explicite, pas de crash', async (t) => {
    const root = await setupRoot();
    t.after(() => rm(root, { recursive: true, force: true }));

    const result = spawnSync(
        process.execPath,
        [join(root, 'tools/check-bundle-metrics-freshness.mjs')],
        { cwd: root, encoding: 'utf8' }
    );
    assert.equal(result.status, 1);
    assert.match(result.stderr, /bundle-metrics\.json absent/);
});
