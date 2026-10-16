import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cp, mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';

import { parseArgs } from '../prepare-application-workspace.mjs';
import { parseJsonc } from '../check-library-setup-deps.mjs';
import {
    parseArgs as parseProofArgs,
    qualifyWeights,
    qualifyNodeVersion,
    qualifyBrowser,
} from './check-external-application-shells.mjs';
import { verifyCmzJournalsIgnored } from '../check-cmz-journals-ignored.mjs';
import { EXTERNAL_WORKSPACE_CMZ } from './renderers/application-workspace-renderer.mjs';
import {
    planApplicationWorkspace,
    planExternalApplicationShell,
    productDependencyClosure,
    publishApplicationWorkspace,
} from './core/application-workspace.mjs';
import { pathExists } from './core/external-application-paths.mjs';
import { qualifyFrozenInstallation } from './core/application-workspace-toolchain.mjs';
import {
    fixtureParent,
    formatProofStop,
    peerDeviationFixture,
    prepareFixture,
    shellFixture,
    snapshotTree,
    TOOLS_ROOT,
    workspaceOptions,
} from './test-support/external-application-fixture.mjs';

test('T1 : preview pur sur source, destination et voisins', async (t) => {
    const parent = await fixtureParent(t);
    await writeFile(join(parent, 'neighbor.txt'), 'voisin intouchable\n');
    const sourceBefore = await snapshotTree(TOOLS_ROOT);
    const neighborsBefore = await snapshotTree(parent);
    const options = workspaceOptions(join(parent, 'product'));
    const first = await planApplicationWorkspace(options);
    const second = await planApplicationWorkspace(options);
    const cli = spawnSync(
        process.execPath,
        [
            join(TOOLS_ROOT, 'tools/prepare-application-workspace.mjs'),
            '--target-root',
            options.targetRoot,
            '--profiles',
            options.profiles.join(','),
            '--github-repository',
            options.githubRepository,
            '--review-owner',
            options.reviewOwner,
            '--dry-run',
        ],
        {
            cwd: parent,
            encoding: 'utf8',
            env: { HOME: parent, PATH: '/usr/bin:/bin' },
        }
    );
    assert.equal(cli.status, 0, cli.stderr);
    assert.equal(JSON.parse(cli.stdout).plan_id, first.plan_id);
    assert.equal(first.plan_id, second.plan_id);
    assert.deepEqual(await snapshotTree(parent), neighborsBefore);
    assert.deepEqual(await snapshotTree(TOOLS_ROOT), sourceBefore);
    assert.equal(await pathExists(options.targetRoot), false);
});

test('T4 : un plan approuvé pour A ne prépare pas B', async (t) => {
    const parent = await fixtureParent(t);
    const a = workspaceOptions(join(parent, 'a'));
    const b = workspaceOptions(join(parent, 'b'));
    const plan = await planApplicationWorkspace(a);
    await assert.rejects(
        publishApplicationWorkspace({ ...b, expectedPlanId: plan.plan_id }),
        /stale/
    );
    assert.deepEqual(await snapshotTree(parent), []);
});

test('T5 : profils et identités GitHub sont liés au plan', async (t) => {
    const parent = await fixtureParent(t);
    const options = workspaceOptions(join(parent, 'product'));
    const plan = await planApplicationWorkspace(options);
    for (const change of [
        { profiles: ['react-spa'] },
        { reviewOwner: 'another-reviewer' },
        { githubRepository: 'fixture-laboratory/other-product' },
    ]) {
        await assert.rejects(
            publishApplicationWorkspace({
                ...options,
                ...change,
                expectedPlanId: plan.plan_id,
            }),
            /reviewed workspace plan required or stale/
        );
    }
    assert.deepEqual(await snapshotTree(parent), []);
});

test('T6 : préparation/reprise exacte, aucun écrasement après modification', async (t) => {
    const fixture = await prepareFixture(t);
    const before = await snapshotTree(fixture.root);
    const recovered = await publishApplicationWorkspace({
        ...fixture.options,
        expectedPlanId: fixture.plan.plan_id,
    });
    assert.equal(recovered.status, 'prepared');
    assert.equal(recovered.recovered, true);
    assert.deepEqual(await snapshotTree(fixture.root), before);
    await writeFile(
        join(fixture.root, 'tsconfig.base.json'),
        '{"compilerOptions":{"strict":false}}\n'
    );
    const altered = await snapshotTree(fixture.root);
    await assert.rejects(
        publishApplicationWorkspace({
            ...fixture.options,
            expectedPlanId: fixture.plan.plan_id,
        }),
        /workspace ownership drift/
    );
    assert.deepEqual(await snapshotTree(fixture.root), altered);
});

test('T6 : dossier étranger, marqueur incomplet et candidat étranger restent intacts', async (t) => {
    const parent = await fixtureParent(t);
    const target = join(parent, 'foreign');
    await mkdir(join(target, '.cmz'), { recursive: true });
    await writeFile(join(target, 'owner.txt'), 'ne pas déplacer\n');
    await writeFile(
        join(target, '.cmz/application-workspace.json'),
        JSON.stringify({
            kind: 'application-workspace-manifest',
            target_root: target,
            tools_root: TOOLS_ROOT,
        })
    );
    const before = await snapshotTree(parent);
    await assert.rejects(
        planApplicationWorkspace(workspaceOptions(target)),
        /workspace ownership drift/
    );
    assert.deepEqual(await snapshotTree(parent), before);
    const clean = workspaceOptions(join(parent, 'product'));
    const plan = await planApplicationWorkspace(clean);
    await mkdir(plan.candidate);
    await writeFile(join(plan.candidate, 'owner.txt'), 'autre propriétaire\n');
    await assert.rejects(
        publishApplicationWorkspace({ ...clean, expectedPlanId: plan.plan_id }),
        /generated file drift/
    );
    assert.equal(
        await readFile(join(plan.candidate, 'owner.txt'), 'utf8'),
        'autre propriétaire\n'
    );
    assert.equal(await pathExists(clean.targetRoot), false);
});

test('les versions directes sont exactes et sans catalog, alias ou script d’installation', async (t) => {
    const parent = await fixtureParent(t);
    for (const profiles of [
        ['angular-pwa'],
        ['react-spa'],
        ['angular-pwa', 'react-spa'],
    ]) {
        const plan = await planApplicationWorkspace(
            workspaceOptions(join(parent, profiles.join('-')), profiles)
        );
        const pkg = JSON.parse(plan.files['package.json']);
        for (const version of Object.values({
            ...pkg.dependencies,
            ...pkg.devDependencies,
        }))
            assert.match(version, /^\d+\.\d+\.\d+(?:-[a-zA-Z0-9.-]+)?$/);
        assert.equal(pkg.private, true);
        assert.equal(pkg.scripts.postinstall, undefined);
        assert.equal(pkg.scripts.prepare, undefined);
        assert.equal(pkg.workspaces.catalog, undefined);
        assert.deepEqual(
            JSON.parse(plan.files['tsconfig.base.json']).compilerOptions.paths,
            {}
        );
    }
});

test('le tsconfig rendu active skipLibCheck pour les trois profils natifs', async (t) => {
    const parent = await fixtureParent(t);
    for (const profiles of [
        ['angular-pwa'],
        ['react-spa'],
        ['angular-pwa', 'react-spa'],
    ]) {
        const plan = await planApplicationWorkspace(
            workspaceOptions(join(parent, profiles.join('-')), profiles)
        );
        const config = JSON.parse(plan.files['tsconfig.base.json']);
        assert.equal(config.compilerOptions.skipLibCheck, true);
    }
});

test('T6 : un fichier ou dossier étranger ajouté au workspace bloque sans altération', async (t) => {
    for (const kind of ['file', 'directory']) {
        await t.test(kind, async (child) => {
            const fixture = await prepareFixture(child);
            const path = join(fixture.root, 'foreign');
            if (kind === 'file') await writeFile(path, 'propriété étrangère\n');
            else await mkdir(path);
            const before = await snapshotTree(fixture.root, []);
            await assert.rejects(
                publishApplicationWorkspace({
                    ...fixture.options,
                    expectedPlanId: fixture.plan.plan_id,
                }),
                kind === 'file'
                    ? /unowned workspace file/
                    : /unowned workspace directory/
            );
            assert.deepEqual(await snapshotTree(fixture.root, []), before);
        });
    }
});

test('M2 : identité portable, plans liés au lieu physique, reprise après déplacement', async (t) => {
    const fixture = await prepareFixture(t);
    const destination = join(fixture.parent, 'relocated');
    const options = { ...fixture.options, targetRoot: destination };
    const another = await planApplicationWorkspace(options);
    assert.deepEqual(another.files, fixture.plan.files);
    assert.notEqual(another.plan_id, fixture.plan.plan_id);
    assert.equal(
        another.manifest.workspace_id,
        fixture.plan.manifest.workspace_id
    );
    assert.equal(another.manifest.tools_root, undefined);
    assert.equal(another.manifest.target_root, undefined);
    for (const content of Object.values(another.files)) {
        for (const path of [TOOLS_ROOT, fixture.root, destination])
            assert.equal(
                content.includes(path),
                false,
                'Chemin physique publié'
            );
    }
    await rename(fixture.root, destination);
    await mkdir(join(destination, '.git'));
    const before = await snapshotTree(destination, []);
    const result = await publishApplicationWorkspace({
        ...options,
        expectedPlanId: another.plan_id,
    });
    assert.equal(result.recovered, true);
    assert.deepEqual(await snapshotTree(destination, []), before);
});

test('B1/B2 : surcharges natives, pair résiduel explicite, records source intacts pour les trois profils', async (t) => {
    const parent = await fixtureParent(t);
    const source = parseJsonc(
        await readFile(join(TOOLS_ROOT, 'bun.lock'), 'utf8')
    );
    const before = structuredClone(source);
    for (const profiles of [
        ['angular-pwa'],
        ['react-spa'],
        ['angular-pwa', 'react-spa'],
    ]) {
        const plan = await planApplicationWorkspace(
            workspaceOptions(join(parent, profiles.join('-')), profiles)
        );
        const pkg = JSON.parse(plan.files['package.json']);
        const seed = parseJsonc(plan.files['bun.lock']);
        const policy = {
            overrides: pkg.overrides,
            peerDeviations: plan.manifest.dependency_deviations.filter(
                (edge) => edge.reason === 'optional-peer'
            ),
        };
        const closure = productDependencyClosure(
            seed,
            plan.manifest.packages,
            source,
            policy
        );
        assert.deepEqual(source, before);
        assert.deepEqual(
            closure.known_source_edges,
            plan.manifest.dependency_deviations
        );
        assert.equal(
            closure.known_source_edges.filter(
                (edge) => edge.reason === 'override'
            ).length,
            6
        );
        assert.equal(policy.peerDeviations.length, 1);
        assert.equal(policy.peerDeviations[0].name, 'vitest');
        const sourceOverrides = JSON.parse(
            await readFile(join(TOOLS_ROOT, 'package.json'), 'utf8')
        ).overrides;
        const reached = new Set(
            Object.values(closure.records).map((record) =>
                record[0].slice(0, record[0].lastIndexOf('@'))
            )
        );
        assert.deepEqual(
            pkg.overrides,
            Object.fromEntries(
                Object.entries(sourceOverrides).filter(([name]) =>
                    reached.has(name)
                )
            )
        );
        assert.deepEqual(seed.overrides, pkg.overrides);
        assert.deepEqual(Object.keys(seed.workspaces), ['']);
        assert.equal(seed.catalog, undefined);
        for (const [key, record] of Object.entries(closure.records))
            assert.deepEqual(
                record,
                source.packages[key],
                'Record source réécrit'
            );
        for (const name of new Set(
            closure.known_source_edges
                .filter((edge) => edge.reason === 'override')
                .map((edge) => edge.name)
        )) {
            const withoutOverride = structuredClone(policy);
            delete withoutOverride.overrides[name];
            assert.throws(
                () =>
                    productDependencyClosure(
                        seed,
                        plan.manifest.packages,
                        source,
                        withoutOverride
                    ),
                /ne satisfait pas/
            );
        }
        assert.throws(
            () =>
                productDependencyClosure(seed, plan.manifest.packages, source, {
                    ...policy,
                    peerDeviations: [],
                }),
            /ne satisfait pas/
        );
        const widened = structuredClone(policy);
        widened.peerDeviations[0].effective_requested = '*';
        assert.throws(
            () =>
                productDependencyClosure(
                    seed,
                    plan.manifest.packages,
                    source,
                    widened
                ),
            /unqualified source dependency deviation/
        );
        const changed = structuredClone(seed);
        changed.packages.vitest[0] = 'vitest@0.0.0';
        assert.throws(
            () =>
                productDependencyClosure(
                    changed,
                    plan.manifest.packages,
                    source,
                    policy
                ),
            /unqualified source dependency deviation/
        );
        const unknown = structuredClone(seed);
        unknown.packages.typescript[2].dependencies = { tslib: '0.0.0' };
        assert.throws(
            () =>
                productDependencyClosure(
                    unknown,
                    plan.manifest.packages,
                    source,
                    policy
                ),
            /ne satisfait pas/
        );
        const unknownPeer = structuredClone(seed);
        unknownPeer.packages.typescript[2].peerDependencies = {
            tslib: '0.0.0',
        };
        unknownPeer.packages.typescript[2].optionalPeers = ['tslib'];
        assert.throws(
            () =>
                productDependencyClosure(
                    unknownPeer,
                    plan.manifest.packages,
                    unknownPeer,
                    policy
                ),
            /ne satisfait pas/
        );
        const altered = structuredClone(seed);
        altered.packages.typescript[2].fixture = 'foreign record';
        assert.throws(
            () =>
                productDependencyClosure(
                    altered,
                    plan.manifest.packages,
                    source,
                    policy
                ),
            /not qualified by source lock/
        );
        assert.throws(
            () => productDependencyClosure(seed, plan.manifest.packages),
            /approved source lock required/
        );
    }
});

test('M3 : changement de l’outil et du verrou source périme le plan, sans retirer la propriété du produit', async (t) => {
    const fixture = await shellFixture(t);
    const tools = join(fixture.parent, 'next-tools');
    await mkdir(tools);
    for (const path of [
        'package.json',
        'bun.lock',
        ...Object.keys(fixture.plan.provenance.source_files),
    ]) {
        await mkdir(join(tools, path, '..'), { recursive: true });
        await cp(join(TOOLS_ROOT, path), join(tools, path));
    }
    await cp(join(TOOLS_ROOT, '.git'), join(tools, '.git'), {
        recursive: true,
    });
    const options = { ...fixture.options, workspaceRoot: tools };
    const shell = { ...fixture.shell, workspaceRoot: tools };
    const before = await planApplicationWorkspace(options);
    const shellBefore = await planExternalApplicationShell(shell);
    const productBefore = await snapshotTree(fixture.root, []);
    for (const path of ['tools/create-app.mjs', 'bun.lock']) {
        const bytes = await readFile(join(tools, path), 'utf8');
        await writeFile(
            join(tools, path),
            bytes + '\n// commentaire sans changement de contrat\n'
        );
    }
    const after = await planApplicationWorkspace(options);
    const shellAfter = await planExternalApplicationShell(shell);
    assert.equal(after.manifest.workspace_id, before.manifest.workspace_id);
    assert.deepEqual(after.files, before.files);
    assert.equal(after.manifest.provenance, undefined);
    assert.notEqual(after.plan_id, before.plan_id);
    assert.notEqual(shellAfter.plan_id, shellBefore.plan_id);
    await assert.rejects(
        publishApplicationWorkspace({
            ...options,
            expectedPlanId: before.plan_id,
        }),
        /reviewed workspace plan required or stale/
    );
    assert.equal(
        (
            await publishApplicationWorkspace({
                ...options,
                expectedPlanId: after.plan_id,
            })
        ).recovered,
        true
    );
    assert.deepEqual(await snapshotTree(fixture.root, []), productBefore);
    // A new renderer must not silently adopt an edited technical file.
    await writeFile(join(fixture.root, 'nx.json'), '{}\n');
    await assert.rejects(
        planApplicationWorkspace(options),
        /workspace ownership drift/
    );
});

test('B2 : double vérification, changement de verrou refusé sans résolution de repli', async (t) => {
    const fixture = await shellFixture(t);
    const passes = [];
    await qualifyFrozenInstallation(fixture.plan, (pass) => {
        passes.push(pass);
    });
    assert.deepEqual(passes, [1, 2]);
    const lockPath = join(fixture.root, 'bun.lock');
    const original = await readFile(lockPath);
    let calls = 0;
    await assert.rejects(
        qualifyFrozenInstallation(fixture.plan, async () => {
            calls += 1;
            await writeFile(lockPath, original.toString('utf8') + '\n');
        }),
        /frozen installation changed candidate lock/
    );
    assert.equal(calls, 1, 'Un échec doit arrêter la seconde installation');
    assert.notDeepEqual(
        await readFile(lockPath),
        original,
        'Ne pas cacher la preuve du changement'
    );
});

test('CLI : valeurs présentes, uniques, mode exclusif, plan SHA-256', () => {
    const base = [
        '--target-root',
        '/fixture/product',
        '--profiles',
        'angular-pwa,react-spa',
        '--github-repository',
        'fixture/repository',
        '--review-owner',
        'reviewer',
    ];
    assert.equal(parseArgs([...base, '--dry-run']).dryRun, true);
    assert.equal(
        parseArgs([...base, '--apply', 'a'.repeat(64)]).expectedPlanId,
        'a'.repeat(64)
    );
    for (const bad of [
        base,
        [...base, '--dry-run', '--dry-run'],
        [...base, '--dry-run', '--apply', 'a'.repeat(64)],
        [...base, '--apply'],
        [...base, '--apply', '--dry-run'],
        [...base, '--apply', 'stale'],
        [...base, '--dry-run', '--target-root', '/other'],
        [...base, '--force'],
        ['--explain', '--dry-run'],
    ])
        assert.throws(() => parseArgs(bad));
});

test('EXT01 v4 T-2 : exception de pair limitée à son identité, champ et caractère optionnel', async (t) => {
    const valid = peerDeviationFixture();
    const before = structuredClone(valid);
    const closure = productDependencyClosure(
        valid.lock,
        valid.packages,
        valid.lock,
        valid.policy
    );
    assert.deepEqual(closure.known_source_edges, valid.policy.peerDeviations);
    assert.deepEqual(valid, before);
    for (const [label, change] of [
        ['parent', { parent: '@fixture/other-parent' }],
        ['nom', { name: 'fixture-other-peer' }],
        ['champ', { field: 'dependencies' }],
        ['pair requis', { optional: false }],
    ]) {
        await t.test(label, () => {
            const fixture = peerDeviationFixture(change);
            const original = structuredClone(fixture);
            assert.equal(
                fixture.policy.peerDeviations[0].effective_requested,
                valid.policy.peerDeviations[0].effective_requested
            );
            assert.throws(
                () =>
                    productDependencyClosure(
                        fixture.lock,
                        fixture.packages,
                        fixture.lock,
                        fixture.policy
                    ),
                /unqualified source dependency deviation/
            );
            assert.deepEqual(fixture, original);
        });
    }
});

test('EXT01 v7 : STOP conserve un message explicite du code', () => {
    assert.equal(
        formatProofStop(new Error('Arrêt fictif du code')),
        'STOP Error: Arrêt fictif du code; aucun succès global revendiqué.'
    );
});

test('EXT01 v7 : STOP écarte aussi une assertion personnalisée avec diff intégré', () => {
    const explicit = new assert.AssertionError({
        message: 'Contrat fictif refusé',
        actual: 'sortie-enfant-fictive',
        expected: 'valeur-fictive',
        operator: 'strictEqual',
    });
    assert.equal(explicit.generatedMessage, false);
    assert.match(explicit.message, /sortie-enfant-fictive/);
    assert.equal(
        formatProofStop(explicit),
        'STOP AssertionError; aucun succès global revendiqué.'
    );
});

test('EXT01 v7 : STOP écarte le message d’une assertion générée', () => {
    const generated = new assert.AssertionError({
        actual: 'sortie-enfant-fictive',
        expected: 'valeur-fictive',
        operator: 'strictEqual',
    });
    assert.equal(generated.generatedMessage, true);
    assert.match(generated.message, /sortie-enfant-fictive/);
    assert.equal(
        formatProofStop(generated),
        'STOP AssertionError; aucun succès global revendiqué.'
    );
});

test('EXT01 v7 : STOP tient sur une ligne sans contrôle ni séquence de terminal', () => {
    const error = new Error(
        'début \u001b[31mrouge\u001b[0m fin\u0000\t\u007f\u202esuite'
    );
    const line = formatProofStop(error);
    assert.equal(
        line,
        'STOP Error: début rouge fin suite; aucun succès global revendiqué.'
    );
    error.name = 'Erreur\n\u0007fictive';
    assert.doesNotMatch(formatProofStop(error), /[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/u);
});

test('EXT01 v7 : STOP borne la ligne entière à 400 caractères', () => {
    const line = formatProofStop(new Error('é'.repeat(1000)));
    assert.equal(line.length, 400);
    assert.ok(line.startsWith('STOP Error: é'));
    assert.ok(line.endsWith('; aucun succès global revendiqué.'));
});

test('EXT01 v7 : T14 contrôle produit et fixture sans parcourir les liens de l’atelier', async (t) => {
    const parent = await fixtureParent(t);
    const product = join(parent, 'product');
    await mkdir(product);
    const lines = [];
    let saves = 0;
    await qualifyWeights(
        {
            root: parent,
            lines,
            save: async () => {
                saves += 1;
            },
        },
        product
    );
    assert.equal(saves, 1);
    assert.deepEqual(lines, ['PASS T14/source-and-product-untracked-801']);
    assert.deepEqual(await snapshotTree(product, []), []);
    assert.deepEqual(
        await snapshotTree(join(parent, 'tool-weight-candidate'), []),
        []
    );
});

test('EXT01 v8 : STOP garde la première ligne sans sortie d’enfant', () => {
    for (const separator of [
        '\r',
        '\n',
        '\u0085',
        '\u2028',
        '\u2029',
        '\r\n',
    ]) {
        const error = new Error(
            'Command failed: git show X' +
                separator +
                'fatal: sortie-enfant-fictive'
        );
        assert.equal(
            formatProofStop(error),
            'STOP Error: Command failed: git show X; aucun succès global revendiqué.'
        );
    }
});

test('v10 : chemins produit déclarés acceptés, journal inconnu refusé', async (t) => {
    const root = await fixtureParent(t);
    assert.equal(spawnSync('git', ['init', '-q', root]).status, 0);
    await mkdir(join(root, 'tools'));
    const journal = ['.cmz', 'fixture-journal'].join('/');
    await writeFile(join(root, '.gitignore'), journal + '/\n');
    const paths = [...Object.values(EXTERNAL_WORKSPACE_CMZ), journal];
    const source = join(root, 'tools/fixture.mjs');
    await writeFile(source, paths.map(JSON.stringify).join(';\n'));
    const accepted = verifyCmzJournalsIgnored(root);
    assert.equal(accepted.ok, true, accepted.errors.join('\n'));
    assert.deepEqual(accepted.names, ['fixture-journal']);
    const unknown = ['.cmz', 'undeclared-product'].join('/');
    await writeFile(
        source,
        [...paths, unknown].map(JSON.stringify).join(';\n')
    );
    const refused = verifyCmzJournalsIgnored(root);
    assert.equal(refused.ok, false);
    assert.equal(refused.errors.length, 1);
    assert.ok(refused.errors[0].includes(unknown + '/'));
});

test('v10 : refus précoce canonique explicite, sans session ni rapport', async (t) => {
    const parent = await fixtureParent(t);
    const args = [
        '--proof-root',
        parent + '/missing/../proof',
        '--backend',
        'docker',
    ];
    assert.throws(() => parseProofArgs(args), /absolu canonique requis/);
    const before = await snapshotTree(parent);
    const result = spawnSync(
        process.execPath,
        [
            join(
                TOOLS_ROOT,
                'tools/generator-platform/check-external-application-shells.mjs'
            ),
            ...args,
        ],
        { encoding: 'utf8', env: { HOME: parent, PATH: '/usr/bin:/bin' } }
    );
    assert.equal(result.status, 1);
    assert.equal(result.stdout, '');
    assert.equal(
        result.stderr.trim(),
        formatProofStop(new Error('--proof-root absolu canonique requis.'))
    );
    assert.deepEqual(await snapshotTree(parent), before);
});

test('v12 : Node du rendu, hôte macOS et version qualifiée avant rapport', async () => {
    const sourcePackage = JSON.parse(
        await readFile(join(TOOLS_ROOT, 'package.json'), 'utf8')
    );
    const product = '/fixture/product';
    const browser = {
        root: '/fixture/browser',
        executable: '/fixture/browser/chrome',
    };
    const success = {
        status: 0,
        signal: null,
        stdout: 'v24.20.0\n',
        stderr: '',
    };
    for (const backend of ['docker', 'macos']) {
        const calls = [];
        const session = {
            backend,
            hostNode: '/fixture/host-node',
            cache: '/fixture/cache',
            home: '/fixture/home',
            policy: {},
            sourcePackage,
            lines: [],
            run: (invocation) => {
                calls.push(invocation);
                return success;
            },
        };
        qualifyNodeVersion(session, product);
        await qualifyBrowser(session, product, [], browser);
        assert.equal(calls[0].containerExecutable, '/usr/local/bin/node');
        assert.equal(calls[1].containerExecutable, '/usr/bin/node');
        assert.ok(
            calls.every((call) => call.hostExecutable === session.hostNode)
        );
        assert.deepEqual(
            calls.map((call) => call.renderer),
            [false, true]
        );
        assert.deepEqual(
            calls.map((call) => call.argv),
            [['--version'], ['--version']]
        );
        assert.deepEqual(session.lines, [
            'PASS execution/Node-version exit=0',
            'node=v24.20.0',
            'PASS renderer/Node-version exit=0',
            'renderer_node=v24.20.0',
        ]);
        for (const result of [
            { ...success, stdout: 'v20.0.0\n' },
            { ...success, stdout: 'v24.20.0\nPRIVATE_FIXTURE' },
            { ...success, status: 127 },
        ]) {
            const rejected = { ...session, lines: [], run: () => result };
            await assert.rejects(
                qualifyBrowser(rejected, product, [], browser)
            );
            assert.equal(
                rejected.lines.some((line) =>
                    line.startsWith('renderer_node=')
                ),
                false
            );
        }
    }
});
