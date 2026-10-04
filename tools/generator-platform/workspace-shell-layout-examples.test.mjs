import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';
import test from 'node:test';

import { repositoryRoot, validateJsonSchema } from './validate-ir.mjs';

const root = 'examples/presentation/workspace-shell-layout-examples/';
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
const historicalSchema = JSON.parse(
    await readFile(
        new URL(
            './schemas/historical-presentation-reference-set.schema.json',
            import.meta.url
        ),
        'utf8'
    )
);
const historicalManifestPath = `${root}historical/recent-route-navigation/archive.json`;

function sha256(content) {
    return createHash('sha256').update(content).digest('hex');
}

test('publie le workspace à vues vivantes comme exemple de shell approuvé', async () => {
    const manifest = JSON.parse(
        await readFile(resolve(repositoryRoot, manifestPath), 'utf8')
    );

    assert.deepEqual(validateJsonSchema(manifest, schema), []);
    assert.equal(manifest.status, 'approved-example');
    assert.equal(manifest.authority, 'layout-guidance-only');
    assert.equal(manifest.subject, 'generic-workspace-shell');
    assert.equal(manifest.set_id, 'generic-live-workspace-tabs-2026-10-04');
    assert.deepEqual(manifest.authority_scope, [
        'region-order',
        'visual-hierarchy',
        'responsive-priority',
        'workspace-navigation-placement',
    ]);
    assert.equal('page_id' in manifest, false);
});

test('borne les candidats à Medium et Expanded sans toucher Compact', async () => {
    const manifest = JSON.parse(
        await readFile(resolve(repositoryRoot, manifestPath), 'utf8')
    );

    assert.deepEqual(
        manifest.sources.map(({ layout_class }) => layout_class).sort(),
        ['expanded', 'medium']
    );
    assert.equal(
        manifest.sources.some(({ layout_class }) => layout_class === 'compact'),
        false
    );
    for (const source of manifest.sources) {
        assert.deepEqual(source.capabilities_shown, [
            'workspace-tabs',
            'individual-tab-close',
            'close-all-except-pinned',
            'horizontal-tab-overflow',
        ]);
        assert.equal(source.state, 'active-workspace-tab-visible');
        assert.deepEqual(source.authoritative_regions, [
            'workspace-navigation-strip',
        ]);
    }
});

test('verrouille les sources et images approuvées reproductibles', async () => {
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

test('verrouille la sémantique Tabs et la promesse de même instance', async () => {
    const [html, guide, contract] = await Promise.all([
        readFile(resolve(repositoryRoot, `${root}mockup.html`), 'utf8'),
        readFile(resolve(repositoryRoot, `${root}README.md`), 'utf8'),
        readFile(
            resolve(
                repositoryRoot,
                'docs/architecture/workspace-vues-vivantes-accessibilite-2026-10-04.md'
            ),
            'utf8'
        ),
    ]);

    assert.match(html, /role="tablist"/);
    assert.match(html, /role="tab"/);
    assert.match(html, /role="tabpanel"/);
    assert.match(html, /aria-label="Fermer Utilisateurs"/);
    assert.match(html, /aria-label="Actions des onglets"/);
    assert.match(html, /aria-label="Voir les onglets précédents"/);
    assert.match(html, /aria-label="Voir les onglets suivants"/);
    assert.equal(html.includes('Plus (2)'), false);
    assert.equal(html.includes('recent-nav'), false);
    assert.equal(html.includes('Exemple de disposition'), false);
    assert.match(guide, /exemple de disposition approuvé/);
    assert.match(contract, /même instance de vue/);
    assert.match(contract, /RouteReuseStrategy/);
    assert.match(contract, /destroyDetachedRouteHandle/);
    assert.match(contract, /100 cycles ouverture\/switch\/fermeture/);
    assert.match(contract, /absente en Compact/);
});

test('conserve les anciens candidats hors autorité active', async () => {
    const archive = JSON.parse(
        await readFile(resolve(repositoryRoot, historicalManifestPath), 'utf8')
    );

    assert.deepEqual(validateJsonSchema(archive, historicalSchema), []);
    assert.equal(archive.subject, 'generic-workspace-shell');
    assert.equal(archive.status, 'historical');
    assert.equal(archive.authority, 'none');
    assert.equal('page_id' in archive, false);

    for (const source of archive.sources) {
        const content = await readFile(resolve(repositoryRoot, source.path));
        assert.equal(content.byteLength, source.bytes, `${source.path} size`);
        assert.equal(sha256(content), source.sha256, `${source.path} hash`);
        assert.equal(content.readUInt32BE(16), source.viewport.width);
        assert.equal(content.readUInt32BE(20), source.viewport.height);
    }

    const activeManifest = JSON.parse(
        await readFile(resolve(repositoryRoot, manifestPath), 'utf8')
    );
    assert.equal(
        activeManifest.sources.some(({ path }) =>
            path.includes('/historical/')
        ),
        false
    );
});
