import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import test from 'node:test';

import { repositoryRoot, validateJsonSchema } from './validate-ir.mjs';

const activeManifestPath =
    'designs/users-management-proof.presentation-evidence.json';
const historicalRoot =
    'examples/users-management-proof/presentation/historical/';
const archivePath = `${historicalRoot}data-view-reference-candidates/archive.json`;
const archiveSchema = JSON.parse(
    await readFile(
        new URL(
            './schemas/historical-presentation-reference-set.schema.json',
            import.meta.url
        ),
        'utf8'
    )
);

function sha256(content) {
    return createHash('sha256').update(content).digest('hex');
}

test('conserve les anciennes vues de données comme archive sans autorité', async () => {
    const archive = JSON.parse(
        await readFile(resolve(repositoryRoot, archivePath), 'utf8')
    );
    assert.deepEqual(validateJsonSchema(archive, archiveSchema), []);
    assert.equal(archive.status, 'historical');
    assert.equal(archive.authority, 'none');
    assert.deepEqual(
        archive.forbidden_uses,
        [
            'active-presentation-evidence',
            'code-generation-authority',
            'visual-regression-baseline',
            'capability-inference',
            'runtime-source-copy',
        ],
        'les usages dangereux doivent rester explicitement interdits'
    );

    const sourceIds = new Set();
    for (const source of archive.sources) {
        assert.equal(
            source.path.startsWith(historicalRoot),
            true,
            `${source.path} must stay under the historical root`
        );
        assert.equal(
            sourceIds.has(source.id),
            false,
            `duplicate historical source id ${source.id}`
        );
        sourceIds.add(source.id);

        const content = await readFile(resolve(repositoryRoot, source.path));
        assert.equal(
            content.byteLength,
            source.bytes,
            `${source.path} byte length drifted`
        );
        assert.equal(sha256(content), source.sha256, `${source.path} drifted`);
        if (source.media_type === 'image/png') {
            assert.ok(
                source.viewport,
                `${source.path} must retain its historical viewport`
            );
            assert.equal(
                content.readUInt32BE(16),
                source.viewport.width,
                `${source.path} PNG width drifted`
            );
            assert.equal(
                content.readUInt32BE(20),
                source.viewport.height,
                `${source.path} PNG height drifted`
            );
        } else {
            assert.equal(source.viewport, null);
        }
    }
});

test('interdit toute republication active des références historiques', async () => {
    const activeManifest = JSON.parse(
        await readFile(resolve(repositoryRoot, activeManifestPath), 'utf8')
    );
    const retiredIds = new Set([
        'data-view-capabilities-brief',
        'expanded-data-view-filter-workspace',
        'expanded-data-view-row-actions',
        'expanded-data-view-row-actions-with-filters',
        'medium-data-view-filter-workspace',
        'medium-data-view-row-actions',
        'medium-data-view-row-actions-with-filters',
    ]);

    assert.equal(
        activeManifest.sources.some(
            ({ id, snapshot_uri }) =>
                retiredIds.has(id) ||
                snapshot_uri.startsWith(historicalRoot) ||
                snapshot_uri.includes('/data-view-reference-candidates/')
        ),
        false,
        'une source retirée ne doit jamais être consommée par la réalisation active'
    );
});
