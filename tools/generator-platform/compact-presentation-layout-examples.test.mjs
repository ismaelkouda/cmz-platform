import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';
import test from 'node:test';

import { repositoryRoot, validateJsonSchema } from './validate-ir.mjs';

const root = 'examples/presentation/compact-data-view-layout-examples/';
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

test('garde le corpus Compact approuvé et sans autorité métier', async () => {
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
});

test('verrouille les cinq états Compact et leurs sources reproductibles', async () => {
    const manifest = JSON.parse(
        await readFile(resolve(repositoryRoot, manifestPath), 'utf8')
    );
    assert.equal(manifest.sources.length, 5);
    assert.equal(new Set(manifest.sources.map(({ id }) => id)).size, 5);

    for (const source of [...manifest.render_sources, ...manifest.sources]) {
        const content = await readFile(resolve(repositoryRoot, source.path));
        assert.equal(content.byteLength, source.bytes, `${source.path} size`);
        assert.equal(sha256(content), source.sha256, `${source.path} hash`);
        if (source.media_type === 'image/png') {
            assert.equal(source.layout_class, 'compact');
            assert.equal(source.space, 'constrained');
            assert.deepEqual(source.viewport, {
                width: 390,
                height: 844,
                pixel_ratio: 1,
            });
            assert.equal(content.readUInt32BE(16), 390, `${source.path} width`);
            assert.equal(
                content.readUInt32BE(20),
                844,
                `${source.path} height`
            );
        } else {
            assert.equal(source.authority, 'reproduction-only');
        }
    }

    assert.deepEqual(
        manifest.sources.map(({ state }) => state),
        [
            'filters-closed',
            'search-active',
            'filters-closed',
            'filter-summary',
            'filter-detail',
        ]
    );
});

test('matérialise une pile de cartes et un seul sheet sans reproduire un tableau compacté', async () => {
    const [html, css, renderer, readme, manifest] = await Promise.all([
        readFile(resolve(repositoryRoot, `${root}mockup.html`), 'utf8'),
        readFile(resolve(repositoryRoot, `${root}mockup.css`), 'utf8'),
        readFile(resolve(repositoryRoot, `${root}render.mjs`), 'utf8'),
        readFile(resolve(repositoryRoot, `${root}README.md`), 'utf8'),
        readFile(resolve(repositoryRoot, manifestPath), 'utf8'),
    ]);

    for (const forbidden of [
        '<table',
        'Précédent',
        'Suivant',
        'spinner',
        'skeleton',
        'Gestion des utilisateurs',
        'users/all',
        'users/store',
        '@example.',
    ]) {
        assert.equal(
            html.includes(forbidden),
            false,
            `forbidden: ${forbidden}`
        );
    }

    assert.match(html, /class="card-list"/);
    assert.match(html, /class="fab" aria-label="Créer un élément"/);
    assert.match(html, /class="search-wrap" role="search"/);
    assert.match(html, /class="search"\s+type="search"/);
    assert.match(html, /enterkeyhint="search"/);
    assert.match(
        html,
        /class="search-clear"[^>]+aria-label="Effacer la recherche"/
    );
    assert.match(css, /height: 56px/);
    assert.match(css, /body\[data-search='active'\] \.search-clear/);
    assert.match(css, /max-height: 80dvh/);
    assert.match(html, /role="dialog" aria-modal="true"/);
    assert.match(css, /data-sheet='summary'/);
    assert.match(css, /data-sheet='detail'/);
    assert.match(readme, /ni pagination, ni spinner/);
    assert.match(readme, /`search\.execution`/);
    assert.match(
        readme,
        /Angular Material 22\.2\.1 ne fournit pas de `MatSearchBar`/
    );
    assert.match(readme, /ne constituent pas un exemple d'implémentation/);

    for (const source of JSON.parse(manifest).sources) {
        assert.equal(
            renderer.includes(basename(source.path)),
            true,
            `${source.path} must have a deterministic render case`
        );
    }
});

test('ne publie ni le corpus Compact ni le corpus générique comme preuve utilisateurs', async () => {
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
            snapshot_uri.startsWith('examples/presentation/')
        ),
        false
    );
});
