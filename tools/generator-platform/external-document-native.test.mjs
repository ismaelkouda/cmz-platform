import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';

import {
    hash,
    prepareFixture,
    TOOLS_ROOT,
} from './test-support/external-application-fixture.mjs';
import { NATIVE_CELLS } from './test-support/external-document-fixture.mjs';
import {
    nativeCellContext,
    nativeCellEnvironment,
    nativeDocumentFixture,
    runNativeDocumentCell,
    SHARED_DOCUMENT_SOURCE,
} from './proof-support/external-document-native.mjs';

for (const cell of NATIVE_CELLS) {
    test(`EXT03a/CI closed cell binding ${cell}`, () => {
        const root = '/proof/product';
        const path = '/proof/context.json';
        const context = {
            schema_version: 1,
            cell,
            fixture: { root, kind: cell.split('/')[0] },
            session: {
                root: '/proof',
                backend: 'docker',
                hostNode: process.execPath,
            },
        };
        assert.equal(
            nativeCellContext(context, root, cell, path).receiptPath,
            '/proof/context.json.receipt.json'
        );
        assert.throws(() => nativeCellContext(context, '/other', cell, path));
        assert.throws(() =>
            nativeCellContext(context, root, cell, '/other/context.json')
        );
        assert.throws(() =>
            nativeCellContext({ ...context, cell: 'other' }, root, cell, path)
        );
        const env = nativeCellEnvironment(process.execPath, root, cell, path);
        assert.equal(env.CMZ_EXT03A_NATIVE_CELL, cell);
        assert.equal(env.CMZ_EXT03A_NATIVE_ROOT, root);
        assert.equal(env.CMZ_EXT03A_NATIVE_CONTEXT, path);
        assert.deepEqual(
            Object.keys(env).sort(),
            [
                'CI',
                'CMZ_EXT03A_NATIVE_CELL',
                'CMZ_EXT03A_NATIVE_CONTEXT',
                'CMZ_EXT03A_NATIVE_ROOT',
                'LANG',
                'NO_COLOR',
                'NX_DAEMON',
                'NX_NO_CLOUD',
                'PATH',
            ].sort()
        );
    });
}

test('EXT03a/CI A preserves the real shared source bytes; B stays independent', async (t) => {
    const a = await prepareFixture(t, ['angular-pwa', 'react-spa']);
    const b = await prepareFixture(t, ['angular-pwa', 'react-spa']);
    const fixtureA = await nativeDocumentFixture(a.root, 'A');
    const fixtureB = await nativeDocumentFixture(b.root, 'B');
    const sourceA = fixtureA.design.sources.find(
        (item) => item.snapshot_uri === SHARED_DOCUMENT_SOURCE
    );
    assert.ok(sourceA);
    const bytes = await readFile(join(a.root, SHARED_DOCUMENT_SOURCE));
    assert.deepEqual(
        bytes,
        await readFile(join(TOOLS_ROOT, SHARED_DOCUMENT_SOURCE))
    );
    assert.equal(hash(bytes), sourceA.sha256);
    assert.equal(
        hash(await readFile(join(a.root, fixtureA.sourcePath))),
        fixtureA.variant.compiled_source_sha256
    );
    assert.equal(fixtureA.design.pages.length, 1);
    assert.equal(fixtureB.design.pages.length, 2);
    assert.deepEqual(
        fixtureB.design.pages.map((page) => page.access.mode),
        ['public', 'authenticated']
    );
    assert.equal(
        fixtureB.design.sources[0].snapshot_uri,
        'descriptions/ext03a-b/design/project-brief.md'
    );
    for (const fixture of [fixtureA, fixtureB]) {
        assert.equal(fixture.design.experiences[0].offline_policy, 'none');
        await assert.rejects(readFile(join(fixture.root, fixture.designPath)), {
            code: 'ENOENT',
        });
        for (const backend of fixture.backendRequests)
            await assert.rejects(
                readFile(join(fixture.root, backend.outputPath)),
                { code: 'ENOENT' }
            );
    }
});

test('EXT03a/CI failed child keeps a private diagnostic and stops', async (t) => {
    const { root } = await prepareFixture(t, ['angular-pwa']);
    const session = {
        root,
        backend: 'macos',
        hostNode: process.execPath,
        policy: {},
        cache: join(root, 'unused-cache'),
        home: join(root, 'unused-home'),
        lines: [],
    };
    await assert.rejects(
        runNativeDocumentCell(
            session,
            { root: join(root, 'unprepared-product'), kind: 'A' },
            'angular-pwa'
        ),
        /Échec de la preuve EXT03a\/A\/angular-pwa\/native-cell/
    );
    const diagnostic = join(root, 'cell-A-angular-pwa.json.failure.txt');
    const text = await readFile(diagnostic, 'utf8');
    assert.match(text, /backendRequests/);
    assert.equal((await stat(diagnostic)).mode & 0o777, 0o600);
    assert.deepEqual(session.lines, [
        'FAIL EXT03a/A/angular-pwa/native-cell exit=1',
        `diagnostic_sha256=${hash(text)}`,
    ]);
    await assert.rejects(
        readFile(join(root, 'cell-A-angular-pwa.json.receipt.json')),
        { code: 'ENOENT' }
    );
});
