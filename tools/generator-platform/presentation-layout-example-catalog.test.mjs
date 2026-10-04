import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import test from 'node:test';

import { repositoryRoot, validateJsonSchema } from './validate-ir.mjs';

const catalogRoot = 'examples/presentation';
const schema = JSON.parse(
    await readFile(
        new URL(
            './schemas/presentation-layout-example-set.schema.json',
            import.meta.url
        ),
        'utf8'
    )
);

test('catalogue chaque ensemble générique sans manifeste orphelin', async () => {
    const entries = await readdir(resolve(repositoryRoot, catalogRoot), {
        withFileTypes: true,
    });
    const directories = entries
        .filter(
            (entry) =>
                entry.isDirectory() && entry.name.endsWith('-layout-examples')
        )
        .map(({ name }) => name)
        .sort();
    const catalog = await readFile(
        resolve(repositoryRoot, catalogRoot, 'README.md'),
        'utf8'
    );

    assert.deepEqual(directories, [
        'compact-data-view-layout-examples',
        'data-view-layout-examples',
        'workspace-shell-layout-examples',
    ]);

    const setIds = new Set();
    const approvedLayoutClasses = new Set();
    for (const directory of directories) {
        const manifestRelativePath = `${directory}/example-set.json`;
        const guideRelativePath = `${directory}/README.md`;
        const manifest = JSON.parse(
            await readFile(
                resolve(repositoryRoot, catalogRoot, manifestRelativePath),
                'utf8'
            )
        );

        assert.match(catalog, new RegExp(`\\(\\./${guideRelativePath}\\)`));
        assert.match(catalog, new RegExp(`\\(\\./${manifestRelativePath}\\)`));
        assert.deepEqual(validateJsonSchema(manifest, schema), []);
        assert.equal(setIds.has(manifest.set_id), false);
        setIds.add(manifest.set_id);

        if (manifest.status === 'approved-example') {
            for (const source of manifest.sources) {
                approvedLayoutClasses.add(source.layout_class);
            }
        }
    }

    assert.deepEqual(
        [...approvedLayoutClasses].sort(),
        ['compact', 'expanded', 'medium'],
        'the approved catalog must cover the three reviewed layout classes'
    );
});

test('rappelle que le catalogue ne constitue pas une preuve de page', async () => {
    const catalog = await readFile(
        resolve(repositoryRoot, catalogRoot, 'README.md'),
        'utf8'
    );

    assert.match(catalog, /sans devenir une preuve de page/);
    assert.match(catalog, /preuve runtime/);
    assert.match(catalog, /capacités qu'elle montre/);
});
