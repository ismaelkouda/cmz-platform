import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { resolvePresentationEvidence } from './core/presentation-evidence.mjs';

const schema = JSON.parse(
    await readFile(
        new URL('./schemas/presentation-evidence.schema.json', import.meta.url),
        'utf8'
    )
);
const pageContract = {
    page: {
        id: 'page_2222222222222222',
        states: [{ id: 'ready' }, { id: 'failed' }],
    },
};

function sha256(content) {
    return createHash('sha256').update(content).digest('hex');
}

async function fixture(sourceOverrides = {}, manifestOverrides = {}) {
    const root = await mkdtemp(join(tmpdir(), 'presentation-evidence-'));
    await mkdir(join(root, 'designs'));
    const sourceContent = Buffer.from('{"layout":"users"}\n');
    await writeFile(join(root, 'designs/layout.json'), sourceContent);
    const source = {
        id: 'users-layout',
        source_kind: 'structured-design',
        purpose: 'primary-layout',
        snapshot_uri: 'designs/layout.json',
        media_type: 'application/json',
        bytes: sourceContent.byteLength,
        sha256: sha256(sourceContent),
        trust: 'untrusted-content',
        state_ids: ['ready'],
        viewport: null,
        ...sourceOverrides,
    };
    const manifest = {
        schema_version: '1.0.0',
        kind: 'presentation-evidence',
        presentation_id: 'presentation_aaaaaaaaaaaaaaaa',
        page_id: pageContract.page.id,
        status: 'approved',
        authority: 'presentation-only',
        sources: [source],
        ...manifestOverrides,
    };
    await writeFile(
        join(root, 'designs/users.presentation.json'),
        `${JSON.stringify(manifest, null, 2)}\n`
    );
    return root;
}

function resolveFixture(root) {
    return resolvePresentationEvidence({
        workspaceRoot: root,
        presentationEvidencePath: 'designs/users.presentation.json',
        presentationEvidenceSchema: schema,
        pageContract,
    });
}

test('normalise une source générique sans exposer un fournisseur', async () => {
    const root = await fixture();
    const evidence = resolveFixture(root);
    assert.equal(evidence.authority, 'presentation-only');
    assert.equal(evidence.sources[0].path, 'designs/layout.json');
    assert.equal(evidence.sources[0].trust, 'untrusted-content');
    assert.equal(Object.hasOwn(evidence, 'provider'), false);
});

test('refuse états inconnus, tailles et hashes divergents', async () => {
    for (const [overrides, expected] of [
        [{ state_ids: ['unknown'] }, /references unknown state unknown/],
        [{ bytes: 1 }, /byte length drifted/],
        [{ sha256: 'a'.repeat(64) }, /sha256 drifted/],
    ]) {
        const root = await fixture(overrides);
        assert.throws(() => resolveFixture(root), expected);
    }
});

test('refuse les chemins sortants et les sources symboliques', async () => {
    const escapingRoot = await fixture({ snapshot_uri: '../outside.json' });
    assert.throws(
        () => resolveFixture(escapingRoot),
        /must use a normalized workspace-relative path/
    );

    const linkedRoot = await fixture({ snapshot_uri: 'designs/link.json' });
    await symlink('layout.json', join(linkedRoot, 'designs/link.json'));
    assert.throws(
        () => resolveFixture(linkedRoot),
        /must not traverse a symbolic link/
    );
});

test('refuse les médias actifs ou dont la signature contredit le manifeste', async () => {
    const activeRoot = await fixture({ media_type: 'image/svg+xml' });
    assert.throws(() => resolveFixture(activeRoot), /manifest violates schema/);

    const mislabeledRoot = await fixture({ source_kind: 'screenshot' });
    assert.throws(
        () => resolveFixture(mislabeledRoot),
        /media application\/json is invalid for screenshot/
    );

    const fakePngRoot = await fixture({
        source_kind: 'screenshot',
        media_type: 'image/png',
        viewport: { width: 1440, height: 900, pixel_ratio: 1 },
    });
    assert.throws(() => resolveFixture(fakePngRoot), /is not a PNG payload/);
});
