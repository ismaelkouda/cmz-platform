import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';
import test from 'node:test';

import { repositoryRoot, validateJsonSchema } from './validate-ir.mjs';

const root = 'examples/presentation/data-view-layout-examples/';
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

test('borne les exemples génériques à une autorité de mise en page', async () => {
    const manifest = JSON.parse(
        await readFile(resolve(repositoryRoot, manifestPath), 'utf8')
    );
    assert.deepEqual(validateJsonSchema(manifest, schema), []);
    assert.equal(manifest.status, 'approved-example');
    assert.equal(manifest.authority, 'layout-guidance-only');
    assert.equal(manifest.subject, 'generic-data-view');
    assert.equal('page_id' in manifest, false);
    assert.deepEqual(manifest.usage_protocol, {
        requires_page_contract: true,
        requires_capability_match: true,
        requires_runtime_proof: true,
    });
    assert.deepEqual(manifest.forbidden_inferences, [
        'backend-contract',
        'business-domain',
        'column-contract',
        'permission-contract',
        'capability-presence',
        'component-choice',
        'dependency-choice',
        'runtime-accessibility-proof',
        'pixel-perfect-copy',
    ]);

    assert.equal(manifest.render_sources.length, 3);
    for (const source of manifest.render_sources) {
        const content = await readFile(resolve(repositoryRoot, source.path));
        assert.equal(source.authority, 'reproduction-only');
        assert.equal(content.byteLength, source.bytes, `${source.path} size`);
        assert.equal(sha256(content), source.sha256, `${source.path} hash`);
    }
});

test('verrouille les six images, leurs dimensions et leurs capacités visibles', async () => {
    const manifest = JSON.parse(
        await readFile(resolve(repositoryRoot, manifestPath), 'utf8')
    );
    assert.equal(manifest.sources.length, 6);
    assert.equal(new Set(manifest.sources.map(({ id }) => id)).size, 6);

    const combinations = new Set();
    for (const source of manifest.sources) {
        assert.equal(source.path.startsWith(root), true);
        const content = await readFile(resolve(repositoryRoot, source.path));
        assert.equal(content.byteLength, source.bytes, `${source.path} size`);
        assert.equal(sha256(content), source.sha256, `${source.path} hash`);
        assert.equal(
            content.readUInt32BE(16),
            source.viewport.width,
            `${source.path} width`
        );
        assert.equal(
            content.readUInt32BE(20),
            source.viewport.height,
            `${source.path} height`
        );
        combinations.add(
            [
                source.layout_class,
                source.space,
                source.state,
                source.capabilities_shown.includes('row-actions'),
            ].join(':')
        );
    }

    assert.deepEqual(
        combinations,
        new Set([
            'expanded:comfortable:filters-open:false',
            'expanded:comfortable:filters-closed:true',
            'expanded:comfortable:filters-open:true',
            'medium:constrained:filters-open:false',
            'medium:constrained:filters-closed:true',
            'medium:constrained:filters-open:true',
        ])
    );
});

test('garde le rendu reproductible mais hors autorité d’implémentation', async () => {
    const [html, css, renderer, readme, manifest] = await Promise.all([
        readFile(resolve(repositoryRoot, `${root}mockup.html`), 'utf8'),
        readFile(resolve(repositoryRoot, `${root}mockup.css`), 'utf8'),
        readFile(resolve(repositoryRoot, `${root}render.mjs`), 'utf8'),
        readFile(resolve(repositoryRoot, `${root}README.md`), 'utf8'),
        readFile(resolve(repositoryRoot, manifestPath), 'utf8'),
    ]);
    for (const forbiddenBusinessText of [
        'Gestion des utilisateurs',
        'users/all',
        'users/store',
        '@example.',
    ]) {
        assert.equal(
            html.includes(forbiddenBusinessText),
            false,
            `the generic renderer must not contain ${forbiddenBusinessText}`
        );
    }
    assert.match(html, /<h1 id="data-title">Éléments<\/h1>/);
    assert.ok(
        html.indexOf('class="toolbar-title"') <
            html.indexOf('class="toolbar-right"'),
        'the table title must precede the right-hand controls'
    );
    assert.ok(
        html.indexOf('class="search-wrap"') <
            html.indexOf('class="toolbar-actions"'),
        'search must precede the right-hand actions'
    );
    assert.match(css, /@container \(max-width: 1040px\)/);
    assert.match(readme, /ne sont pas des exemples de code runtime/);
    assert.match(readme, /validation visuelle humaine explicite/);

    const parsed = JSON.parse(manifest);
    for (const source of parsed.sources) {
        assert.equal(
            renderer.includes(basename(source.path)),
            true,
            `${source.path} must have a deterministic render case`
        );
    }
});

test('interdit de publier les exemples génériques comme preuve de la page utilisateurs', async () => {
    const activeManifest = JSON.parse(
        await readFile(
            resolve(
                repositoryRoot,
                'designs/users-management-proof.presentation-evidence.json'
            ),
            'utf8'
        )
    );
    assert.equal(
        activeManifest.sources.some(({ snapshot_uri }) =>
            snapshot_uri.startsWith(root)
        ),
        false,
        'a layout example must not become page evidence'
    );
});
