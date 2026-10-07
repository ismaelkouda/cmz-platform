import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';
import test from 'node:test';

import { repositoryRoot, validateJsonSchema } from './validate-ir.mjs';

const root =
    'examples/presentation/composed-workspace-data-view-layout-examples/';
const manifestPath = `${root}example-set.json`;
const schema = JSON.parse(
    await readFile(
        new URL(
            './schemas/presentation-layout-example-set.schema.json',
            import.meta.url
        ),
        'utf8'
    )
);

function sha256(content) {
    return createHash('sha256').update(content).digest('hex');
}

test('publie la composition holistique approuvée sans la convertir en preuve de page', async () => {
    const manifest = JSON.parse(
        await readFile(resolve(repositoryRoot, manifestPath), 'utf8')
    );

    assert.deepEqual(validateJsonSchema(manifest, schema), []);
    assert.equal(manifest.status, 'approved-example');
    assert.equal(manifest.authority, 'layout-guidance-only');
    assert.equal(manifest.subject, 'generic-composed-workspace-data-view');
    assert.equal('page_id' in manifest, false);
    assert.deepEqual(
        manifest.sources.map(({ layout_class }) => layout_class).sort(),
        ['compact', 'expanded', 'medium']
    );
});

test('verrouille les sources et les trois exemples reproductibles', async () => {
    const manifest = JSON.parse(
        await readFile(resolve(repositoryRoot, manifestPath), 'utf8')
    );

    for (const source of [...manifest.render_sources, ...manifest.sources]) {
        const content = await readFile(resolve(repositoryRoot, source.path));
        assert.equal(content.byteLength, source.bytes, `${source.path} size`);
        assert.equal(sha256(content), source.sha256, `${source.path} hash`);
        if (source.media_type === 'image/png') {
            assert.equal(content.readUInt32BE(16), source.viewport.width);
            assert.equal(content.readUInt32BE(20), source.viewport.height);
        }
    }

    const renderer = await readFile(
        resolve(repositoryRoot, `${root}render.mjs`),
        'utf8'
    );
    for (const source of manifest.sources) {
        assert.equal(renderer.includes(basename(source.path)), true);
    }
});

test('compose les trois autorités atomiques sans inventer de preuve de page', async () => {
    const [html, guide] = await Promise.all([
        readFile(resolve(repositoryRoot, `${root}mockup.html`), 'utf8'),
        readFile(resolve(repositoryRoot, `${root}README.md`), 'utf8'),
    ]);

    assert.match(html, /workspace-shell-layout-examples/);
    assert.match(html, /data-view-layout-examples/);
    assert.match(html, /compact-data-view-layout-examples/);
    assert.match(guide, /n'autorise aucun nom de route ou domaine/);
    assert.match(guide, /absents, conformément aux décisions/);
    assert.match(guide, /n'a pas valu\s+auto-approbation/);
    assert.match(guide, /2026-10-07/);

    const activePresentation = JSON.parse(
        await readFile(
            resolve(
                repositoryRoot,
                'designs/users-management-proof.presentation-evidence.json'
            ),
            'utf8'
        )
    );
    assert.equal(
        activePresentation.sources.some(({ snapshot_uri }) =>
            snapshot_uri.startsWith(root)
        ),
        false
    );
});
