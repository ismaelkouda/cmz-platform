import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';
import { pathToFileURL } from 'node:url';

import { parseArgs } from '../create-app.mjs';
import {
    classifyLibraryCiImpact,
    createLibraryCiClassifier,
    LIBRARY_CI_ENTRYPOINTS,
} from '../library-ci-impact.mjs';
import { parseJsonc } from '../check-library-setup-deps.mjs';
import {
    planApplicationShell,
    publicApplicationShellPlan,
    publicApplicationShellResult,
    publishApplicationShell,
} from './core/application-shell-publication.mjs';
import {
    planApplicationWorkspace,
    planExternalApplicationShell,
    publishExternalApplicationShell,
    qualifyProductInstallation,
} from './core/application-workspace.mjs';
import {
    pathExists,
    stageGeneratedTree,
    verifyGeneratedTree,
} from './core/external-application-paths.mjs';
import { renderAngularPwaShell } from './renderers/angular-pwa-shell-renderer.mjs';
import { renderReactSpaShell } from './renderers/react-spa-shell-renderer.mjs';
import {
    baselineRenderer,
    fixtureParent,
    hash,
    shellFixture,
    snapshotTree,
    TOOLS_ROOT,
} from './test-support/external-application-fixture.mjs';

test('CLI extérieure : plan obligatoire, options uniques et valeurs complètes', () => {
    const args = [
        '--design',
        'descriptions/design.json',
        '--experience',
        'visitor',
        '--app',
        'native',
    ];
    assert.throws(() =>
        parseArgs([...args, '--target-root', '/fixture/product'])
    );
    assert.equal(
        parseArgs([...args, '--target-root', '/fixture/product', '--dry-run'])
            .targetRoot,
        '/fixture/product'
    );
    for (const option of [
        '--design',
        '--experience',
        '--app',
        '--profile',
        '--target-root',
        '--expect-plan',
    ]) {
        assert.throws(() => parseArgs([...args, option]));
        assert.throws(() => parseArgs([...args, option, '--dry-run']));
    }
    assert.throws(() => parseArgs([...args, '--dry-run', '--dry-run']));
    assert.throws(() =>
        parseArgs([
            ...args,
            '--profile',
            'react-spa',
            '--profile',
            'angular-pwa',
        ])
    );
    assert.throws(
        () => parseArgs([...args, '--unknown-fixture']),
        /Argument inconnu : --unknown-fixture/
    );
    assert.throws(
        () =>
            parseArgs([
                ...args,
                '--target-root',
                '/fixture/product',
                '--unknown-fixture',
            ]),
        /Argument inconnu ou option interdite/
    );
});

test('T1/T5 : plan extérieur pur, entrées et qualification liées sans copie dans l’atelier', async (t) => {
    const fixture = await shellFixture(t);
    const before = await snapshotTree(fixture.root, []);
    const plan = await planApplicationShell(fixture.shell);
    const again = await planApplicationShell(fixture.shell);
    assert.equal(plan.plan_id, again.plan_id);
    assert.equal(plan.root, fixture.root);
    assert.ok(
        plan.external_workspace.inputs.some(
            (entry) => entry.path === fixture.input.designPath
        )
    );
    assert.deepEqual(await snapshotTree(fixture.root, []), before);
    const source = join(fixture.root, 'descriptions/design/project-brief.md');
    await writeFile(source, 'source changée après le plan\n');
    await assert.rejects(
        publishApplicationShell({
            ...fixture.shell,
            expectedPlanId: plan.plan_id,
        }),
        /product application-design rejected/
    );
    assert.equal(await pathExists(plan.outputAbsolute), false);
});

test('T5/T15 : verrou, version installée ou configuration modifiés périment le plan', async (t) => {
    for (const path of [
        'bun.lock',
        'node_modules/typescript/package.json',
        'node_modules/typescript/bin/tsc',
        'tsconfig.base.json',
    ]) {
        await t.test(path, async (child) => {
            const fixture = await shellFixture(child);
            const plan = await planApplicationShell(fixture.shell);
            const absolute = join(fixture.root, path);
            const bytes = await readFile(absolute);
            if (path === 'bun.lock')
                await writeFile(absolute, `${bytes.toString('utf8')}\n`);
            else if (path.endsWith('/bin/tsc'))
                await writeFile(
                    absolute,
                    `${bytes.toString('utf8')}\n// modified executable\n`
                );
            else {
                const value = JSON.parse(bytes.toString('utf8'));
                if (path.includes('typescript')) value.version = '0.0.0';
                else value.compilerOptions.strict = false;
                await writeFile(absolute, JSON.stringify(value));
            }
            const diagnostic =
                path === 'bun.lock'
                    ? /reviewed shell plan is stale/
                    : path.endsWith('/bin/tsc')
                      ? /installed product executable differs/
                      : path.includes('typescript')
                        ? /installed product package differs/
                        : /workspace ownership drift/;
            await assert.rejects(
                publishApplicationShell({
                    ...fixture.shell,
                    expectedPlanId: plan.plan_id,
                }),
                diagnostic
            );
            assert.equal(await pathExists(plan.outputAbsolute), false);
        });
    }
});

test('T4 : un plan de shell ne se transfère pas à un autre produit', async (t) => {
    const a = await shellFixture(t);
    const b = await shellFixture(t);
    const plan = await planExternalApplicationShell(a.shell);
    const before = await snapshotTree(b.root, []);
    await assert.rejects(
        publishExternalApplicationShell({
            ...b.shell,
            expectedPlanId: plan.plan_id,
        }),
        /reviewed shell plan is stale/
    );
    assert.deepEqual(await snapshotTree(b.root, []), before);
});

test('M3 : la provenance courante est dans le plan public et dans le reçu extérieur', async (t) => {
    const fixture = await shellFixture(t);
    const plan = await planExternalApplicationShell(fixture.shell);
    assert.deepEqual(
        publicApplicationShellPlan(plan).external_workspace.provenance,
        plan.workspace.provenance
    );
    const result = await publishExternalApplicationShell(
        {
            ...fixture.shell,
            expectedPlanId: plan.plan_id,
        },
        { run: () => undefined }
    );
    const receipt = publicApplicationShellResult(result);
    assert.deepEqual(
        receipt.external_workspace.provenance,
        plan.workspace.provenance
    );
    assert.equal(
        receipt.external_workspace.workspace_plan_id,
        plan.workspace.plan_id
    );
    assert.equal(plan.workspace.manifest.provenance, undefined);
});

test('T7 : candidat partiel exact complété, puis refus du contrôle natif injecté', async (t) => {
    const fixture = await shellFixture(t);
    const plan = await planExternalApplicationShell(fixture.shell);
    const [path, content] = Object.entries(plan.files)[0];
    const parent = new URL('.', pathToFileURL(join(plan.candidate, path)));
    const { mkdir } = await import('node:fs/promises');
    await mkdir(parent, { recursive: true });
    await writeFile(join(plan.candidate, path), content, { flag: 'wx' });
    await assert.rejects(
        publishExternalApplicationShell(
            { ...fixture.shell, expectedPlanId: plan.plan_id },
            {
                run: () => {
                    throw new Error('partial candidate compilation stopped');
                },
            }
        ),
        /partial candidate compilation stopped/
    );
    await verifyGeneratedTree(plan.candidate, plan.files);
    assert.equal(await pathExists(plan.outputAbsolute), false);
});

test('M3/T5 : la reprise sur snapshot conserve la protection des entrées des autres apps', async (t) => {
    for (const kind of ['design', 'source']) {
        await t.test(kind, async (child) => {
            const fixture = await shellFixture(child);
            const plan = await planExternalApplicationShell(fixture.shell);
            await stageGeneratedTree(plan.outputAbsolute, plan.files);
            const before = await planApplicationWorkspace(fixture.options);
            assert.equal(
                before.manifest.workspace_id,
                fixture.plan.manifest.workspace_id
            );
            const path =
                kind === 'design'
                    ? fixture.input.designPath
                    : fixture.input.design.sources[0].snapshot_uri;
            const bytes = await readFile(join(fixture.root, path), 'utf8');
            await writeFile(join(fixture.root, path), bytes + '\n');
            const altered = await snapshotTree(fixture.root, []);
            await assert.rejects(
                planApplicationWorkspace(fixture.options),
                /workspace app input drift/
            );
            assert.deepEqual(await snapshotTree(fixture.root, []), altered);
        });
    }
});

test('T5 : pas de recherche du design dans l’atelier si l’entrée du produit manque', async (t) => {
    const fixture = await shellFixture(t);
    const knownInWorkshop =
        'designs/application-conception-proof.application-design.json';
    assert.equal(await pathExists(join(TOOLS_ROOT, knownInWorkshop)), true);
    await assert.rejects(
        planApplicationShell({ ...fixture.shell, designPath: knownInWorkshop }),
        { code: 'ENOENT' }
    );
    const path = join(fixture.root, fixture.input.designPath);
    await rm(path);
    await assert.rejects(planApplicationShell(fixture.shell), {
        code: 'ENOENT',
    });
});

test('T6 : sortie possédée puis fichier étranger : aucun déplacement ni contrôle natif lancé', async (t) => {
    const fixture = await shellFixture(t);
    const plan = await planExternalApplicationShell(fixture.shell);
    await stageGeneratedTree(plan.outputAbsolute, plan.files);
    await writeFile(
        join(plan.outputAbsolute, 'foreign.txt'),
        'ne pas déplacer\n'
    );
    const before = await snapshotTree(fixture.root, []);
    let calls = 0;
    await assert.rejects(
        publishExternalApplicationShell(
            { ...fixture.shell, expectedPlanId: plan.plan_id },
            {
                run: () => {
                    calls += 1;
                    assert.fail('Arbre étranger accepté');
                },
            }
        ),
        /generated inventory drift/
    );
    assert.equal(calls, 0);
    assert.deepEqual(await snapshotTree(fixture.root, []), before);
});

test('T7 : échec injecté à chaque phase ; jamais de résultat created et candidat conservé exact', async (t) => {
    for (const profile of ['angular-pwa', 'react-spa']) {
        for (const failedPhase of [
            'candidate-staged',
            'compiled',
            'published',
            'build:production',
            'lint',
            'test',
        ]) {
            await t.test(`${profile}/${failedPhase}`, async (child) => {
                const fixture = await shellFixture(child, profile);
                const plan = await planExternalApplicationShell(fixture.shell);
                await assert.rejects(
                    publishExternalApplicationShell(
                        { ...fixture.shell, expectedPlanId: plan.plan_id },
                        {
                            run: () => undefined,
                            phase: (phase) => {
                                if (phase === failedPhase)
                                    throw new Error('injected phase failure');
                            },
                        }
                    ),
                    /injected phase failure/
                );
                assert.equal(await pathExists(plan.outputAbsolute), false);
                await verifyGeneratedTree(plan.candidate, plan.files);
            });
        }
    }
});

test('m4 : refus de rollback sur arbre étranger conserve les deux causes', async (t) => {
    const fixture = await shellFixture(t);
    const plan = await planExternalApplicationShell(fixture.shell);
    const original = new Error('fixture publication interrupted');
    await assert.rejects(
        publishExternalApplicationShell(
            {
                ...fixture.shell,
                expectedPlanId: plan.plan_id,
            },
            {
                run: () => undefined,
                phase: async (phase) => {
                    if (phase !== 'published') return;
                    await writeFile(
                        join(plan.outputAbsolute, 'foreign.txt'),
                        'intouchable\n'
                    );
                    throw original;
                },
            }
        ),
        (error) => {
            assert.match(error.message, /rollback refused/);
            assert.ok(error instanceof AggregateError);
            assert.equal(error.errors[0], original);
            assert.equal(error.cause, error.errors[1]);
            assert.match(error.errors[1].message, /generated inventory drift/);
            return true;
        }
    );
    assert.equal(
        await readFile(join(plan.outputAbsolute, 'foreign.txt'), 'utf8'),
        'intouchable\n'
    );
    assert.equal(await pathExists(plan.candidate), false);
});

test('T7 : interruption réelle du processus avant/après publication et reprise du verrou mort', async (t) => {
    for (const interruptedPhase of ['compiled', 'published']) {
        await t.test(interruptedPhase, async (child) => {
            const fixture = await shellFixture(child);
            const plan = await planExternalApplicationShell(fixture.shell);
            const options = { ...fixture.shell, expectedPlanId: plan.plan_id };
            delete options.applicationDesignSchema;
            delete options.backendContractSchema;
            const moduleUrl = pathToFileURL(
                join(
                    TOOLS_ROOT,
                    'tools/generator-platform/core/application-workspace.mjs'
                )
            ).href;
            const program = `import { publishExternalApplicationShell } from ${JSON.stringify(moduleUrl)};
await publishExternalApplicationShell(JSON.parse(process.argv[1]), {
run() { return undefined; }, phase(phase) { if (phase === ${JSON.stringify(interruptedPhase)}) process.kill(process.pid, 'SIGKILL'); }
});`;
            const result = spawnSync(
                process.execPath,
                ['--input-type=module', '-e', program, JSON.stringify(options)],
                {
                    cwd: fixture.parent,
                    encoding: 'utf8',
                    timeout: 60_000,
                    env: { HOME: fixture.parent, PATH: '/usr/bin:/bin' },
                }
            );
            assert.equal(result.signal, 'SIGKILL', result.stderr);
            await assert.rejects(
                publishExternalApplicationShell(options, {
                    run: () => {
                        throw new Error('replayed native compilation');
                    },
                }),
                /replayed native compilation/
            );
            assert.equal(
                await pathExists(
                    join(
                        fixture.root,
                        'apps',
                        `.${plan.app_name}.generation-lock`
                    )
                ),
                false
            );
            const location =
                interruptedPhase === 'published'
                    ? plan.outputAbsolute
                    : plan.candidate;
            await verifyGeneratedTree(location, plan.files);
        });
    }
});

test('T8 : le publisher conserve son verrou jusqu’à la fin des contrôles', async (t) => {
    const fixture = await shellFixture(t);
    const plan = await planExternalApplicationShell(fixture.shell);
    const options = { ...fixture.shell, expectedPlanId: plan.plan_id };
    let entered;
    const started = new Promise((done) => {
        entered = done;
    });
    let release;
    const barrier = new Promise((done) => {
        release = done;
    });
    const first = publishExternalApplicationShell(options, {
        run: async () => {
            entered();
            await barrier;
            throw new Error('first stopped');
        },
    });
    await started;
    try {
        await assert.rejects(
            publishExternalApplicationShell(options, {
                run: () => assert.fail('Second runner entered'),
            }),
            /another generation owns/
        );
    } finally {
        release();
        await assert.rejects(first, /first stopped/);
    }
});

test('T13 : configurations strictes et compilation/test/lint natifs locaux des deux cibles', async (t) => {
    for (const profile of ['angular-pwa', 'react-spa']) {
        const fixture = await shellFixture(t, profile);
        const plan = await planExternalApplicationShell(fixture.shell);
        const project = JSON.parse(plan.files['project.json']);
        assert.equal(project.targets.lint.executor, '@nx/eslint:lint');
        assert.equal(project.targets.lint.options.maxWarnings, 0);
        assert.ok(project.targets.test.executor);
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

test('T16 : le rendu historique reste égal aux octets du commit de base, pour chaque cible', async (t) => {
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
        const expected = await reference[fn](options);
        assert.deepEqual((await render(options)).files, expected.files);
        assert.deepEqual(
            (await render({ ...options, externalWorkspace: false })).files,
            expected.files
        );
    }
});

test('EXT01 v4 T-3 : un record transitif modifié est refusé par le snapshot du produit', async (t) => {
    const fixture = await shellFixture(t);
    await planExternalApplicationShell(fixture.shell);
    const path = join(fixture.root, 'bun.lock');
    const original = await readFile(path, 'utf8');
    const name = '@jridgewell/sourcemap-codec';
    assert.equal(Object.hasOwn(fixture.plan.manifest.packages, name), false);
    for (const kind of ['version', 'intégrité', 'version et intégrité']) {
        await t.test(kind, async () => {
            const lock = parseJsonc(original);
            const record = lock.packages[name];
            assert.ok(record, 'Record transitif de fixture absent');
            const oldRecord = structuredClone(record);
            if (kind.includes('version')) {
                const version = record[0]
                    .slice(name.length + 1)
                    .split('.')
                    .map(Number);
                assert.equal(version.length, 3);
                version[2] += 1;
                record[0] = name + '@' + version.join('.');
            }
            if (kind.includes('intégrité')) {
                const slot = record.findIndex(
                    (value) =>
                        typeof value === 'string' && value.startsWith('sha512-')
                );
                assert.ok(slot >= 0);
                record[slot] =
                    'sha512-' + Buffer.alloc(64, 7).toString('base64');
            }
            assert.notDeepEqual(record, oldRecord);
            await writeFile(path, JSON.stringify(lock) + '\n');
            const altered = await snapshotTree(fixture.root, []);
            try {
                await assert.rejects(
                    planExternalApplicationShell(fixture.shell),
                    /product dependency snapshot differs/
                );
                assert.deepEqual(await snapshotTree(fixture.root, []), altered);
            } finally {
                await writeFile(path, original);
            }
            await qualifyProductInstallation(fixture.plan);
        });
    }
});

test('EXT01 v4 T-4 : un record inatteignable ajouté au verrou du produit est refusé', async (t) => {
    const fixture = await shellFixture(t);
    await planExternalApplicationShell(fixture.shell);
    const path = join(fixture.root, 'bun.lock');
    const original = await readFile(path, 'utf8');
    const lock = parseJsonc(original);
    const name = 'fixture-unreachable';
    assert.equal(lock.packages[name], undefined);
    lock.packages[name] = [
        name + '@1.0.0',
        '',
        {},
        'sha512-' + Buffer.alloc(64, 7).toString('base64'),
    ];
    await writeFile(path, JSON.stringify(lock) + '\n');
    const altered = await snapshotTree(fixture.root, []);
    try {
        await assert.rejects(
            planExternalApplicationShell(fixture.shell),
            /product lock contains an unreachable package/
        );
        assert.deepEqual(await snapshotTree(fixture.root, []), altered);
    } finally {
        await writeFile(path, original);
    }
    await qualifyProductInstallation(fixture.plan);
});

test('EXT01 v4 T-5 : surcharge produit retirée ou changée dans chaque fichier est refusée', async (t) => {
    const fixture = await shellFixture(t);
    await qualifyProductInstallation(fixture.plan);
    for (const file of ['package.json', 'bun.lock']) {
        for (const kind of ['retirée', 'changée']) {
            await t.test(file + '/' + kind, async () => {
                const path = join(fixture.root, file);
                const original = await readFile(path, 'utf8');
                const value = parseJsonc(original);
                const name = Object.keys(
                    fixture.plan.manifest.overrides
                ).sort()[0];
                assert.ok(name);
                assert.equal(
                    value.overrides[name],
                    fixture.plan.manifest.overrides[name]
                );
                if (kind === 'retirée') delete value.overrides[name];
                else value.overrides[name] = '*';
                assert.notEqual(
                    value.overrides[name],
                    fixture.plan.manifest.overrides[name]
                );
                await writeFile(path, JSON.stringify(value) + '\n');
                const altered = await snapshotTree(fixture.root, []);
                try {
                    // Exercise the qualifier itself: ownership must not mask
                    // the required equality of both override declarations.
                    await assert.rejects(
                        qualifyProductInstallation(fixture.plan),
                        /product overrides differ/
                    );
                    assert.deepEqual(
                        await snapshotTree(fixture.root, []),
                        altered
                    );
                } finally {
                    await writeFile(path, original);
                }
                await qualifyProductInstallation(fixture.plan);
            });
        }
    }
});

test('v10 : nouveau module importé classé sans liste, y compris réexport et cycle', async (t) => {
    const root = await fixtureParent(t);
    for (const entry of Object.values(LIBRARY_CI_ENTRYPOINTS).flat()) {
        await mkdir(join(root, entry, '..'), { recursive: true });
        await writeFile(join(root, entry), 'export {};\n');
    }
    const isolationModule = 'tools/new-isolation-fixture.mjs';
    const integrationModule = 'tools/new-integration-fixture.mjs';
    const transitiveModule = 'tools/new-transitive-fixture.mjs';
    const before = createLibraryCiClassifier(root);
    assert.equal(before.classifyPath(isolationModule).isolation, false);
    assert.equal(before.classifyPath(integrationModule).integration, false);
    await writeFile(
        join(root, LIBRARY_CI_ENTRYPOINTS.isolation[0]),
        "import '../new-isolation-fixture.mjs';\n"
    );
    await writeFile(join(root, isolationModule), 'export {};\n');
    await writeFile(
        join(root, LIBRARY_CI_ENTRYPOINTS.integration[0]),
        "import './new-integration-fixture.mjs';\n"
    );
    await writeFile(
        join(root, integrationModule),
        "export * from './new-transitive-fixture.mjs';\n"
    );
    await writeFile(
        join(root, transitiveModule),
        "import './new-integration-fixture.mjs';\n// import './comment-only.mjs';\nconst text = \"import './string-only.mjs'\";\n"
    );
    const after = createLibraryCiClassifier(root);
    assert.deepEqual(after.classifyPath(isolationModule), {
        isolation: true,
        integration: true,
    });
    for (const path of [integrationModule, transitiveModule])
        assert.deepEqual(after.classifyPath(path), {
            isolation: false,
            integration: true,
        });
    for (const path of ['tools/comment-only.mjs', 'tools/string-only.mjs'])
        assert.deepEqual(after.classifyPath(path), {
            isolation: false,
            integration: false,
        });
    await rm(join(root, transitiveModule));
    const missing = createLibraryCiClassifier(root);
    assert.deepEqual(missing.classifyPath(transitiveModule), {
        isolation: false,
        integration: false,
    });
    const dynamicModule = 'tools/new-dynamic-fixture.mjs';
    await writeFile(
        join(root, integrationModule),
        "import('./new-dynamic-fixture.mjs');\n"
    );
    await writeFile(join(root, dynamicModule), 'export {};\n');
    assert.equal(
        createLibraryCiClassifier(root).classifyPath(dynamicModule).integration,
        true
    );

    // Cette racine de fixture est hors dépôt, sans node_modules.
    const standalone = join(root, 'tools/library-ci-impact.mjs');
    await writeFile(
        standalone,
        await readFile(new URL('../library-ci-impact.mjs', import.meta.url))
    );
    const bootstrap = spawnSync(
        process.execPath,
        [
            '--input-type=module',
            '-e',
            "const m = await import(process.argv[1]); if (!m.classifyLibraryCiImpact(['tools/new-integration-fixture.mjs']).integration) process.exit(1); process.stdout.write('integration=true\\n');",
            pathToFileURL(standalone).href,
        ],
        { encoding: 'utf8', env: { HOME: root, PATH: '/usr/bin:/bin' } }
    );
    assert.equal(bootstrap.status, 0, bootstrap.stderr);
    assert.equal(bootstrap.stdout, 'integration=true\n');
});

test('v11 : préserve les quatre déclencheurs conservateurs hors imports', () => {
    for (const path of [
        'tools/check-library-compatibility.mjs',
        'tools/check-library-resolution-policy.mjs',
        'tools/scaffold-tailwind.mjs',
        'tools/generator-platform/core/action-authorization.mjs',
    ]) {
        assert.deepEqual(
            classifyLibraryCiImpact([path]),
            {
                isolation: false,
                integration: true,
                reasons: { isolation: [], integration: [path] },
            },
            path
        );
    }
});
