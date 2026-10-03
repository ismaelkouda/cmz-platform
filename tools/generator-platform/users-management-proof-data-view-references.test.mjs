import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import test from 'node:test';

import { repositoryRoot } from './validate-ir.mjs';

const referenceRoot =
    'examples/users-management-proof/presentation/data-view-reference-candidates/';
const manifestPath =
    'designs/users-management-proof.presentation-evidence.json';
const reproductionSources = [
    {
        path: `${referenceRoot}mockup.proposed.html`,
        bytes: 28493,
        sha256: '2b35e6a51d0892a7b5129749d1706ffe4d24648eb309833b1b13e930412bdf6d',
    },
    {
        path: `${referenceRoot}render.mjs`,
        bytes: 2691,
        sha256: 'a57e2213393943611ef5e1885609c377ad65af6aac821c34f0e02e6f73e75330',
    },
];

function sha256(content) {
    return createHash('sha256').update(content).digest('hex');
}

test('borne et rend reproductibles les six références de vue de données', async () => {
    for (const source of reproductionSources) {
        const content = await readFile(resolve(repositoryRoot, source.path));
        assert.equal(
            content.byteLength,
            source.bytes,
            `${source.path} byte length drifted`
        );
        assert.equal(sha256(content), source.sha256, `${source.path} drifted`);
    }

    const manifest = JSON.parse(
        await readFile(resolve(repositoryRoot, manifestPath), 'utf8')
    );
    const visuals = manifest.sources.filter(
        ({ source_kind, snapshot_uri }) =>
            source_kind === 'wireframe' &&
            snapshot_uri.startsWith(referenceRoot)
    );
    assert.deepEqual(
        visuals.map(({ id }) => id),
        [
            'expanded-data-view-filter-workspace',
            'expanded-data-view-row-actions',
            'expanded-data-view-row-actions-with-filters',
            'medium-data-view-filter-workspace',
            'medium-data-view-row-actions',
            'medium-data-view-row-actions-with-filters',
        ]
    );

    for (const visual of visuals) {
        const content = await readFile(
            resolve(repositoryRoot, visual.snapshot_uri)
        );
        assert.ok(
            content.byteLength < 1024 * 1024,
            `${visual.snapshot_uri} must remain below 1 MiB`
        );
        assert.equal(
            content.readUInt32BE(16),
            visual.viewport.width,
            `${visual.snapshot_uri} PNG width drifted`
        );
        assert.equal(
            content.readUInt32BE(20),
            visual.viewport.height,
            `${visual.snapshot_uri} PNG height drifted`
        );
        assert.equal(
            content.byteLength,
            visual.bytes,
            `${visual.snapshot_uri} byte length drifted`
        );
        assert.equal(
            sha256(content),
            visual.sha256,
            `${visual.snapshot_uri} sha256 drifted`
        );
    }
});
