import assert from 'node:assert/strict';
import {
    copyFile,
    mkdir,
    mkdtemp,
    readFile,
    rm,
    writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import {
    applyConfigAddition,
    applyConfigCleanup,
} from './retire-module-config.mjs';

const CONFIG_FILES = [
    'eslint.config.mjs',
    'tsconfig.base.json',
    'knip.json',
    'package.json',
    'bun.lock',
];

async function isolatedConfig(t) {
    const root = await mkdtemp(join(tmpdir(), 'cmz-retire-config-'));
    t.after(() => rm(root, { recursive: true, force: true }));
    await mkdir(root, { recursive: true });
    for (const file of CONFIG_FILES)
        await copyFile(
            new URL(`../${file}`, import.meta.url),
            join(root, file)
        );
    return root;
}

const PLAN = {
    roots: ['libs/proof'],
    projects: [
        { name: '@cmz/proof-domain', root: 'libs/proof/angular-domain' },
        { name: '@cmz/proof-data', root: 'libs/proof/angular-data' },
        {
            name: '@cmz/proof-application',
            root: 'libs/proof/angular-application',
        },
    ],
};

test('ajout puis retrait restaure chaque configuration octet pour octet', async (t) => {
    const root = await isolatedConfig(t);
    const before = new Map(
        await Promise.all(
            CONFIG_FILES.map(async (file) => [
                file,
                await readFile(join(root, file)),
            ])
        )
    );

    assert.deepEqual(applyConfigAddition(root, 'proof', PLAN), [
        'eslint.config.mjs',
        'tsconfig.base.json',
    ]);
    assert.deepEqual(applyConfigCleanup(root, 'proof', PLAN), [
        'eslint.config.mjs',
        'tsconfig.base.json',
    ]);

    for (const file of CONFIG_FILES)
        assert.deepEqual(
            await readFile(join(root, file)),
            before.get(file),
            `${file} n'est pas restauré octet pour octet`
        );
});

test('le nettoyage JSON retire seulement les nœuds exacts sans reformater le document', async (t) => {
    const root = await isolatedConfig(t);
    const knip =
        '{\n  "keep": [ "x", "@cmz/proof-domain", "y" ],\n' +
        '  "nested": {"libs/proof": true, "safe": 1}\n}\n';
    const packageJson =
        '{\n  "dependencies": {"@cmz/proof-domain": "workspace:*", "safe": "1"},\n' +
        '  "scripts": ["libs/proof", "safe"]\n}\n';
    await writeFile(join(root, 'knip.json'), knip);
    await writeFile(join(root, 'package.json'), packageJson);

    assert.deepEqual(applyConfigCleanup(root, 'proof', PLAN), [
        'knip.json',
        'package.json',
    ]);
    assert.equal(
        await readFile(join(root, 'knip.json'), 'utf8'),
        '{\n  "keep": [ "x", "y" ],\n  "nested": {"safe": 1}\n}\n'
    );
    assert.equal(
        await readFile(join(root, 'package.json'), 'utf8'),
        '{\n  "dependencies": {"safe": "1"},\n  "scripts": ["safe"]\n}\n'
    );
});
