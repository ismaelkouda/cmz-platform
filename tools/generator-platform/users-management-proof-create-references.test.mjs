import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { access, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import test from 'node:test';

import { repositoryRoot, validateJsonSchema } from './validate-ir.mjs';

const archivePath =
    'examples/users-management-proof/presentation/historical/adaptive-create-candidates/archive.json';
const archiveRoot =
    'examples/users-management-proof/presentation/historical/adaptive-create-candidates/';
const retiredRoot =
    'examples/users-management-proof/presentation/adaptive-create-candidates/';
const activeManifestPath =
    'designs/users-management-proof.presentation-evidence.json';
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

test('archive les anciennes créations et leur pilote visuel sans autorité', async () => {
    const archive = JSON.parse(
        await readFile(resolve(repositoryRoot, archivePath), 'utf8')
    );

    assert.deepEqual(validateJsonSchema(archive, archiveSchema), []);
    assert.equal(archive.status, 'historical');
    assert.equal(archive.authority, 'none');
    assert.equal(archive.sources.length, 11);

    for (const source of archive.sources) {
        assert.equal(source.path.startsWith(archiveRoot), true);
        const content = await readFile(resolve(repositoryRoot, source.path));
        assert.equal(content.byteLength, source.bytes, `${source.path} size`);
        assert.equal(sha256(content), source.sha256, `${source.path} hash`);
        if (source.media_type === 'image/png') {
            assert.equal(content.readUInt32BE(16), source.viewport.width);
            assert.equal(content.readUInt32BE(20), source.viewport.height);
        } else {
            assert.equal(source.viewport, null);
        }
    }
});

test('retire les créations trompeuses et suspend leur évaluation active', async () => {
    const manifest = JSON.parse(
        await readFile(resolve(repositoryRoot, activeManifestPath), 'utf8')
    );
    const retiredIds = new Set([
        'compact-create-pristine',
        'compact-create-keyboard',
        'medium-create-pristine',
        'medium-create-invalid',
        'expanded-create-pristine',
        'expanded-create-email-conflict',
        'expanded-create-submitting',
    ]);

    assert.equal(
        manifest.sources.some(
            ({ id, snapshot_uri }) =>
                retiredIds.has(id) ||
                snapshot_uri.startsWith(retiredRoot) ||
                snapshot_uri.startsWith(archiveRoot)
        ),
        false
    );

    for (const retiredDesign of [
        'designs/users-management-proof.visual-evaluation.json',
        'designs/users-management-proof.visual-review.json',
    ]) {
        await assert.rejects(
            () => access(resolve(repositoryRoot, retiredDesign)),
            /ENOENT/
        );
    }
});
