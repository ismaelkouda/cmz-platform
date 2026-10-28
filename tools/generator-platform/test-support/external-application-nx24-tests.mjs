import assert from 'node:assert/strict';
import {
    mkdir,
    readFile,
    readdir,
    rename,
    symlink,
    writeFile,
} from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { basename, dirname, join } from 'node:path';
import test from 'node:test';

import { planExternalApplicationShell } from '../core/application-workspace.mjs';
import { canonicalizeGeneratedFiles } from '../core/canonicalize-generated.mjs';
import { renderAngularPwaShell } from '../renderers/angular-pwa-shell-renderer.mjs';
import { renderReactSpaShell } from '../renderers/react-spa-shell-renderer.mjs';
import {
    renderApplicationWorkspace,
    workspacePluginConsumers,
} from '../renderers/application-workspace-renderer.mjs';
import {
    baselineRenderer,
    fixtureParent,
    writeExternalDesign,
    TOOLS_ROOT,
    hash,
    shellFixture,
} from './external-application-fixture.mjs';
import { nx24ShellDelta } from './nx24-shell-delta.mjs';

test('T13 : configurations strictes et compilation/test/lint natifs locaux des deux cibles', async (t) => {
    for (const profile of ['angular-pwa', 'react-spa']) {
        const fixture = await shellFixture(t, profile);
        const plan = await planExternalApplicationShell(fixture.shell);
        const project = JSON.parse(plan.files['project.json']);
        const nx = JSON.parse(fixture.plan.files['nx.json']);
        assert.equal(project.targets.lint.executor, undefined);
        assert.deepEqual(project.targets.lint.options, {
            config: 'eslint.config.mjs',
            'max-warnings': 0,
        });
        assert.deepEqual(nx.targetDefaults.lint, {
            cache: false,
            options: { 'max-warnings': 0 },
        });
        assert.equal(nx.targetDefaults.typecheck.cache, false);
        const plugins = Object.fromEntries(
            nx.plugins.map((p) => [p.plugin, p.options])
        );
        assert.deepEqual(plugins['@nx/eslint/plugin'], { targetName: 'lint' });
        if (profile === 'angular-pwa') {
            assert.equal(
                project.targets.test.executor,
                '@angular/build:unit-test'
            );
        } else {
            assert.deepEqual(plugins['@nx/js/typescript'], {
                typecheck: { targetName: 'typecheck' },
            });
            assert.deepEqual(plugins['@nx/vitest'], {
                testTargetName: 'test',
                testMode: 'run',
            });
            assert.ok(Object.hasOwn(plugins, '@nx/vite/plugin'));
            assert.equal(project.targets.build.executor, undefined);
            assert.equal(project.targets.build.command, 'vite build');
            assert.deepEqual(project.targets.build.dependsOn, [
                '^build',
                'typecheck',
            ]);
            assert.equal(
                project.targets.build.defaultConfiguration,
                'production'
            );
            assert.deepEqual(project.targets.build.options, {
                cwd: `apps/${plan.app_name}`,
                config: 'vite.config.mts',
            });
            assert.deepEqual(project.targets.build.configurations, {
                production: { mode: 'production' },
            });
            assert.deepEqual(project.targets.test, {
                options: { config: 'vite.config.mts', watch: false },
            });
            assert.deepEqual(project.targets['serve-static'].readyWhen, {
                signal: true,
            });
            assert.deepEqual(project.targets['serve-static'].dependsOn, [
                'build',
            ]);
        }
        assert.ok(
            !JSON.stringify(project).includes('tools/generator-platform')
        );
        assert.doesNotMatch(
            plan.files[
                profile === 'angular-pwa' ? 'src/main.ts' : 'src/main.tsx'
            ],
            /console\./
        );
    }
});

test('T13 : seuls les plugins natifs réellement déclarés sont des consommateurs', () => {
    const declared = {
        '@nx/eslint': '24.0.2',
        '@nx/js': '24.0.2',
        foreign: '1.0.0',
    };
    assert.deepEqual(
        [
            ...workspacePluginConsumers(
                ['@nx/eslint/plugin', { plugin: '@nx/js/typescript' }],
                declared
            ),
        ],
        ['@nx/eslint', '@nx/js']
    );
    assert.equal(workspacePluginConsumers([], declared).has('foreign'), false);
    for (const plugin of [
        '@nx/vite/plugin',
        '../foreign',
        '/foreign',
        '@nx/js/../../foreign',
        '',
        null,
    ]) {
        assert.throws(
            () => workspacePluginConsumers([{ plugin }], declared),
            /Plugin/
        );
    }
});

test('T16 : référence historique exhaustive et seul delta Nx24 qualifié', async (t) => {
    const fixture = await shellFixture(t);
    for (const profile of ['angular-pwa', 'react-spa']) {
        const reference = await baselineRenderer(profile);
        const fn =
            profile === 'angular-pwa'
                ? 'renderAngularPwaShell'
                : 'renderReactSpaShell';
        const render =
            profile === 'angular-pwa'
                ? renderAngularPwaShell
                : renderReactSpaShell;
        const options = {
            design: fixture.input.design,
            experienceId: fixture.input.experienceId,
            appName: 'historical-shell',
            designPath: fixture.input.designPath,
            designSha256: hash(
                await readFile(join(fixture.root, fixture.input.designPath))
            ),
        };
        const historical = (await reference[fn](options)).files;
        const actual = (await render(options)).files;
        // Red witness: unmodified historical bytes must reject the migrated renderer.
        assert.throws(() => assert.deepEqual(actual, historical), {
            code: 'ERR_ASSERTION',
        });
        const expected = await nx24ShellDelta(profile, historical);
        assert.deepEqual(actual, expected);
        assert.deepEqual(
            (await render({ ...options, externalWorkspace: false })).files,
            expected
        );
        for (const mutant of await missingNx24Elements(profile, expected)) {
            assert.throws(() => assert.deepEqual(actual, mutant), {
                code: 'ERR_ASSERTION',
            });
        }
        const main = profile === 'angular-pwa' ? 'src/main.ts' : 'src/main.tsx';
        assert.throws(
            () =>
                assert.deepEqual(
                    { ...actual, [main]: actual[main] + '\n' },
                    expected
                ),
            { code: 'ERR_ASSERTION' }
        );
    }
});

test('T16 : le même delta égale les six sorties natives Nx 24.0.2 archivées', async () => {
    const fixture = JSON.parse(
        await readFile(
            new URL('./fixtures/nx24-shell-migrations.json', import.meta.url),
            'utf8'
        )
    );
    assert.equal(fixture.nx_version, '24.0.2');
    assert.equal(
        fixture.base_commit,
        '2afa2d7792f6189f01aefa98286c6bc47ccc702f'
    );
    assert.equal(
        fixture.archive_manifest_sha256,
        'c87f922b0a825776738829592e105d4332fb576e691604be88b789868ad9167c'
    );
    assert.equal(fixture.pairs.length, 6);
    for (const pair of fixture.pairs) {
        assert.equal(hash(pair.before), pair.before_sha256);
        assert.equal(hash(pair.after), pair.after_sha256);
        const path = basename(pair.path);
        const result = await nx24ShellDelta(pair.profile, {
            [path]: pair.before,
        });
        assert.equal(result[path], pair.after, pair.path);
    }
});

async function missingNx24Elements(profile, files) {
    const mutants = [];
    if (profile === 'angular-pwa') {
        for (const key of ['serve', 'serve-static', 'dependsOn', 'tags']) {
            let project = JSON.parse(files['project.json']);
            if (key === 'dependsOn')
                delete project.targets['serve-static'].dependsOn;
            else if (key === 'tags') {
                const { i18n, tags, targets, ...rest } = project;
                project = { ...rest, tags, i18n, targets };
            } else delete project.targets[key].readyWhen;
            mutants.push({
                ...files,
                ...(await canonicalizeGeneratedFiles({
                    'project.json': JSON.stringify(project, null, 2),
                })),
            });
        }
    } else {
        for (const removed of [
            "import { nxReadySignal } from '@nx/vite/plugins/nx-ready-signal.plugin';\n",
            ', nxReadySignal()',
        ]) {
            assert.ok(files['vite.config.mts'].includes(removed));
            mutants.push({
                ...files,
                'vite.config.mts': files['vite.config.mts'].replace(
                    removed,
                    ''
                ),
            });
        }
    }
    for (const mutant of mutants)
        assert.notDeepEqual(mutant, files, 'Mutant sans effet');
    return mutants;
}

// Exercise the real installed Nx/Vite commands, not an executor stub. This is a
// disposable native test fixture, not a qualified external installation.
test(
    'T13 : le build React natif refuse sa configuration absente et repart après restauration',
    { timeout: 55_000 },
    async (t) => {
        const root = join(await fixtureParent(t), 'native');
        await mkdir(root);
        const input = await writeExternalDesign(root);
        const appName = 'native-react';
        const source = JSON.parse(
            await readFile(join(TOOLS_ROOT, 'package.json'))
        );
        const packages = Object.fromEntries(
            ['dependencies', 'devDependencies'].flatMap((group) =>
                Object.entries(source[group] ?? {}).map(([name, version]) => [
                    name,
                    { group, version },
                ])
            )
        );
        const workspace = await renderApplicationWorkspace({
            profiles: ['react-spa'],
            packages,
            packageManager: source.packageManager,
            engines: source.engines,
            githubRepository: 'fixture-laboratory/native-shells',
            reviewOwner: 'fixture-reviewer',
        });
        const shell = await renderReactSpaShell({
            design: input.design,
            experienceId: input.experienceId,
            appName,
            designPath: input.designPath,
            designSha256: hash(await readFile(join(root, input.designPath))),
            externalWorkspace: true,
        });
        const files = {
            ...workspace,
            'bun.lock': await readFile(join(TOOLS_ROOT, 'bun.lock')),
            ...Object.fromEntries(
                Object.entries(shell.files).map(([path, content]) => [
                    `apps/${appName}/${path}`,
                    content,
                ])
            ),
        };
        for (const [path, content] of Object.entries(files)) {
            await mkdir(dirname(join(root, path)), { recursive: true });
            await writeFile(join(root, path), content);
        }
        // Own the directory in which Vite writes .vite-temp. Package payloads are
        // read through links; caches never alias the installed source directory.
        await mkdir(join(root, 'node_modules'));
        for (const entry of await readdir(join(TOOLS_ROOT, 'node_modules'))) {
            if (['.cache', '.vite', '.vite-temp', '.nx'].includes(entry))
                continue;
            await symlink(
                join(TOOLS_ROOT, 'node_modules', entry),
                join(root, 'node_modules', entry)
            );
        }
        const nxPackage = JSON.parse(
            await readFile(join(root, 'node_modules/nx/package.json'))
        );
        const nx = join(root, 'node_modules/nx', nxPackage.bin.nx);
        const env = {
            PATH: [
                dirname(process.execPath),
                join(root, 'node_modules/.bin'),
                '/usr/bin',
                '/bin',
            ].join(':'),
            HOME: root,
            TMPDIR: root,
            CI: 'true',
            NX_DAEMON: 'false',
            NX_NO_CLOUD: 'true',
            NX_ISOLATE_PLUGINS: 'false',
            NX_WORKSPACE_DATA_DIRECTORY: join(root, '.nx/workspace-data'),
            NX_CACHE_DIRECTORY: join(root, '.nx/cache'),
        };
        const build = (phase) => {
            const result = spawnSync(
                process.execPath,
                [
                    nx,
                    'run',
                    `${appName}:build:production`,
                    '--skipNxCache',
                    '--outputStyle=stream',
                ],
                {
                    cwd: root,
                    env,
                    encoding: 'utf8',
                    timeout: 15_000,
                    maxBuffer: 1024 * 1024,
                }
            );
            assert.equal(
                result.error,
                undefined,
                `${phase}: native child must finish`
            );
            assert.equal(result.signal, null);
            t.diagnostic(`${phase}: exit=${result.status}`);
            return result;
        };
        const before = build('before');
        assert.equal(before.status, 0, before.stdout + before.stderr);
        const index = join(root, 'dist/apps', appName, 'index.html');
        assert.match(await readFile(index, 'utf8'), /<html/);
        const config = join(root, 'apps', appName, 'vite.config.mts');
        const original = await readFile(config);
        const displaced = join(root, 'displaced-vite-config');
        await rename(config, displaced);
        let missing;
        try {
            missing = build('missing-vite-config');
        } finally {
            await rename(displaced, config);
        }
        assert.deepEqual(await readFile(config), original);
        const restored = build('restored');
        assert.equal(restored.status, 0, restored.stdout + restored.stderr);
        assert.notEqual(
            missing.status,
            0,
            'a missing Vite config must not turn build into a successful noop'
        );
        assert.match(missing.stdout + missing.stderr, /vite\.config\.mts/);
    }
);
