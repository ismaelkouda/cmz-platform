import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';

import {
    productDependencyClosure,
    projectProductLock,
    projectProductOverrides,
    qualifyProductInstallation,
    resolveManifestOverrides,
    sourcePeerDeviations,
} from './core/application-workspace-toolchain.mjs';
import {
    peerDeviationFixture,
    shellFixture,
} from './test-support/external-application-fixture.mjs';
import { sourceDependencyExpectations } from './test-support/workspace-dependency-assertions.mjs';

const ordered = (edges) =>
    [...edges].sort((left, right) =>
        JSON.stringify([left.parent, left.field, left.name]).localeCompare(
            JSON.stringify([right.parent, right.field, right.name])
        )
    );

function fixture(options = {}) {
    const { lock, packages } = peerDeviationFixture({
        parent: '@fixture/consumer',
        name: 'fixture-peer',
        ...options,
    });
    return { lock, packages };
}

function record(name, version, metadata = {}) {
    return [
        name + '@' + version,
        '',
        metadata,
        'sha512-' + Buffer.alloc(64, 13).toString('base64'),
    ];
}

function policyFor(source, overrides = {}) {
    return {
        overrides,
        peerDeviations: sourceDependencyExpectations(
            source.lock,
            source.packages,
            overrides
        ).edges.filter((edge) => edge.reason === 'optional-peer'),
    };
}

function assertApproved(source, overrides = {}) {
    const before = structuredClone(source);
    const entries = Object.entries(overrides);
    const prototype = Object.getPrototypeOf(overrides);
    const expected = sourceDependencyExpectations(
        source.lock,
        source.packages,
        overrides
    );
    const peers = sourcePeerDeviations(source.lock, overrides);
    const policy = {
        overrides,
        peerDeviations: expected.edges.filter(
            (edge) => edge.reason === 'optional-peer'
        ),
    };
    assert.deepEqual(ordered(peers), ordered(policy.peerDeviations));
    const closure = productDependencyClosure(
        source.lock,
        source.packages,
        source.lock,
        policy
    );
    assert.deepEqual(
        ordered(closure.known_source_edges),
        ordered(expected.edges)
    );
    assert.deepEqual(closure.records, expected.records);
    assert.deepEqual(source, before);
    assert.deepEqual(Object.entries(overrides), entries);
    assert.equal(Object.getPrototypeOf(overrides), prototype);
    return { peers, closure, expected };
}

function nestedFixture(nested = true) {
    const parent = 'anchor/@fixture/consumer';
    const name = '@fixture/peer';
    const packages = {
        anchor: record('anchor', '1.0.0', {
            dependencies: { '@fixture/consumer': '1.0.0' },
        }),
        [parent]: record('@fixture/consumer', '1.0.0', {
            peerDependencies: { [name]: '^1.0.0' },
            optionalPeers: [name],
        }),
        [name]: record(name, nested ? '1.4.0' : '2.0.0'),
    };
    if (nested) packages[parent + '/' + name] = record(name, '2.0.0');
    return {
        lock: {
            lockfileVersion: 1,
            configVersion: 1,
            workspaces: { '': {} },
            packages,
        },
        packages: { anchor: { version: '1.0.0' } },
    };
}

test('qualifie des identités arbitraires avec l’oracle indépendant', async (t) => {
    for (const [parent, name] of [
        ['fixture-consumer', 'fixture-peer'],
        ['@fixture/consumer', '@other/peer'],
        ['@other/consumer', 'constructor'],
    ]) {
        await t.test(parent + ' -> ' + name, () => {
            const { peers } = assertApproved(fixture({ parent, name }));
            assert.equal(peers.length, 1);
            assert.equal(peers[0].parent, parent);
            assert.equal(peers[0].name, name);
        });
    }
});

test('prend l’enfant imbriqué scoped plutôt que la version globale compatible', () => {
    const { peers } = assertApproved(nestedFixture());
    assert.equal(peers.length, 1);
    assert.equal(peers[0].resolved, '@fixture/peer@2.0.0');
});

test('se replie vers la racine quand le contexte ne fournit pas l’enfant', () => {
    const { peers } = assertApproved(nestedFixture(false));
    assert.equal(peers.length, 1);
    assert.equal(peers[0].resolved, '@fixture/peer@2.0.0');
});

test('sépare plusieurs pairs hors plage, satisfaits et absents', () => {
    const source = fixture();
    const metadata = source.lock.packages['@fixture/consumer'][2];
    metadata.peerDependencies.satisfied = '^3.0.0';
    metadata.peerDependencies.absent = '^4.0.0';
    metadata.peerDependencies['second-peer'] = '^3.0.0';
    metadata.optionalPeers.push('satisfied', 'absent', 'second-peer');
    source.lock.packages.satisfied = record('satisfied', '3.2.0');
    source.lock.packages['second-peer'] = record('second-peer', '4.0.0');
    const { peers } = assertApproved(source);
    assert.deepEqual(peers.map((edge) => edge.name).sort(), [
        'fixture-peer',
        'second-peer',
    ]);
});

test('ne crée aucune exception pour un pair déjà satisfait', () => {
    const source = fixture();
    source.lock.packages['fixture-peer'][0] = 'fixture-peer@1.2.0';
    assert.deepEqual(assertApproved(source).peers, []);
});

test('conserve l’absence autorisée d’un pair optionnel', () => {
    const source = fixture();
    delete source.lock.packages['fixture-peer'];
    assert.deepEqual(assertApproved(source).peers, []);
});

test('respecte includePrerelease pour une version dans la plage', () => {
    const source = fixture();
    source.lock.packages['@fixture/consumer'][2].peerDependencies[
        'fixture-peer'
    ] = '^2.0.0';
    source.lock.packages['fixture-peer'][0] = 'fixture-peer@2.1.0-beta.2';
    assert.deepEqual(assertApproved(source).peers, []);
});

test('ne normalise pas une demande non semver et garde le traitement natif', () => {
    const source = fixture();
    source.lock.packages['@fixture/consumer'][2].peerDependencies[
        'fixture-peer'
    ] = 'npm:fixture-peer@^1.0.0';
    assert.deepEqual(assertApproved(source).peers, []);
});

test('un override propre garde la priorité et sa raison dédiée', () => {
    const source = fixture();
    const overrides = { 'fixture-peer': '^2.0.0' };
    source.lock.overrides = overrides;
    const { peers, closure } = assertApproved(source, overrides);
    assert.deepEqual(peers, []);
    assert.equal(closure.known_source_edges.length, 1);
    assert.equal(closure.known_source_edges[0].reason, 'override');
    assert.equal(closure.known_source_edges[0].effective_requested, '^2.0.0');
});

test('une propriété héritée ne devient pas un override approuvé', () => {
    const source = fixture({ name: 'constructor' });
    const overrides = Object.create({ constructor: '^2.0.0' });
    const { peers } = assertApproved(source, overrides);
    assert.equal(peers.length, 1);
    assert.equal(peers[0].name, 'constructor');
});

function assertRefused(
    source,
    policy,
    message = /unqualified source dependency deviation/,
    candidate = source.lock
) {
    const before = structuredClone({ source, policy, candidate });
    assert.throws(
        () =>
            productDependencyClosure(
                candidate,
                source.packages,
                source.lock,
                policy
            ),
        message
    );
    assert.deepEqual({ source, policy, candidate }, before);
}

test('refuse un pair requis ou une dépendance ordinaire même avec empreintes cohérentes', async (t) => {
    for (const [label, change] of [
        ['pair requis', { optional: false }],
        ['dépendance ordinaire', { field: 'dependencies' }],
        ['dépendance optionnelle', { field: 'optionalDependencies' }],
    ]) {
        await t.test(label, () => {
            const source = fixture(change);
            assertRefused(source, falseOptionalPolicy(source));
            assert.deepEqual(sourcePeerDeviations(source.lock, {}), []);
        });
    }
});

test('refuse une fausse autorisation optionnelle sur une arête couverte par un override', () => {
    const source = fixture();
    const policy = policyFor(source);
    policy.overrides = { 'fixture-peer': '^2.0.0' };
    assertRefused(source, policy);
});

test('ne qualifie pas implicitement un écart absent de la politique', () => {
    const source = fixture();
    assertRefused(source, { peerDeviations: [] }, /ne satisfait pas/);
});

function falseOptionalPolicy(source) {
    // Use the independent oracle only to obtain coherent fingerprints under
    // a hypothetical override. The production call has no such override.
    const expected = sourceDependencyExpectations(
        source.lock,
        source.packages,
        { 'fixture-peer': '2.0.0' }
    );
    assert.equal(expected.edges.length, 1);
    return {
        peerDeviations: expected.edges.map((edge) => ({
            ...edge,
            reason: 'optional-peer',
        })),
    };
}

test('refuse un pair absent de la liste optionalPeers avec empreintes cohérentes', () => {
    const source = fixture();
    source.lock.packages['@fixture/consumer'][2].optionalPeers = ['other-peer'];
    assertRefused(source, falseOptionalPolicy(source));
    assert.deepEqual(sourcePeerDeviations(source.lock, {}), []);
});

test('refuse toute altération de la description approuvée', async (t) => {
    for (const [field, value] of [
        ['parent', '@fixture/unknown-consumer'],
        ['identity', '@fixture/consumer@9.0.0'],
        ['field', 'dependencies'],
        ['name', 'unknown-peer'],
        ['requested', '*'],
        ['resolved', 'fixture-peer@9.0.0'],
        ['reason', 'override'],
        ['effective_requested', '*'],
        ['parent_sha256', '0'.repeat(64)],
        ['child_sha256', '0'.repeat(64)],
    ]) {
        await t.test(field, () => {
            const source = fixture();
            const policy = policyFor(source);
            policy.peerDeviations[0][field] = value;
            assertRefused(source, policy);
        });
    }
});

test('refuse les records candidats altérés avec la source et la politique inchangées', async (t) => {
    for (const [label, mutate] of [
        [
            'parent',
            (lock) => {
                lock.packages['@fixture/consumer'][2].fixture = 'changed';
            },
        ],
        [
            'enfant',
            (lock) => {
                lock.packages['fixture-peer'][2].fixture = 'changed';
            },
        ],
        [
            'version enfant',
            (lock) => {
                lock.packages['fixture-peer'][0] = 'fixture-peer@2.0.1';
            },
        ],
    ]) {
        await t.test(label, () => {
            const source = fixture();
            const policy = policyFor(source);
            const candidate = structuredClone(source.lock);
            mutate(candidate);
            assertRefused(
                source,
                policy,
                /unqualified source dependency deviation/,
                candidate
            );
        });
    }
});

test('ne qualifie pas une version enfant non semver', () => {
    const source = fixture();
    source.lock.packages['fixture-peer'][0] = 'fixture-peer@opaque-version';
    assert.deepEqual(sourcePeerDeviations(source.lock, {}), []);
});

function workspacePeerFixture(version) {
    const owner = '@fixture/workspace';
    const parent = owner + '/fixture-consumer';
    const packages = {
        'product-root': record('product-root', '1.0.0'),
        [owner]: [owner + '@workspace:libs/unused', '', {}],
        [parent]: record('fixture-consumer', '1.0.0', {
            peerDependencies: { 'fixture-peer': '^1.0.0' },
            optionalPeers: ['fixture-peer'],
        }),
    };
    if (version) packages['fixture-peer'] = record('fixture-peer', version);
    return {
        parent,
        lock: {
            lockfileVersion: 1,
            configVersion: 1,
            workspaces: { '': {} },
            packages,
        },
        packages: { 'product-root': { version: '1.0.0' } },
    };
}

test('parcourt un workspace sans intégrité sans consommer ses descendants', async (t) => {
    for (const version of [null, '1.2.0', '2.0.0']) {
        await t.test(version ?? 'pair absent', () => {
            const source = workspacePeerFixture(version);
            const before = structuredClone(source);
            // Give the unchanged consumer record a root alias for the oracle.
            // The workspace itself has no semver version and is not reached.
            const oraclePackages = {
                'fixture-consumer': source.lock.packages[source.parent],
            };
            if (version)
                oraclePackages['fixture-peer'] =
                    source.lock.packages['fixture-peer'];
            const expectedPeers = sourceDependencyExpectations(
                { ...source.lock, packages: oraclePackages },
                { 'fixture-consumer': { version: '1.0.0' } },
                {}
            ).edges.map((edge) => ({ ...edge, parent: source.parent }));
            assert.deepEqual(
                sourcePeerDeviations(source.lock, {}),
                expectedPeers
            );
            const expected = sourceDependencyExpectations(
                source.lock,
                source.packages,
                {}
            );
            const closure = productDependencyClosure(
                source.lock,
                source.packages,
                source.lock,
                { peerDeviations: expectedPeers }
            );
            assert.deepEqual(closure.records, expected.records);
            assert.deepEqual(closure.known_source_edges, expected.edges);
            assert.deepEqual(source, before);
        });
    }
});

test('ignore en collecte la version workspace non semver d’un enfant sans intégrité', () => {
    const source = fixture();
    source.lock.packages['fixture-peer'] = [
        'fixture-peer@workspace:libs/unused',
        '',
        {},
    ];
    const before = structuredClone(source);
    assert.deepEqual(sourcePeerDeviations(source.lock, {}), []);
    assert.deepEqual(source, before);
});

test('refuse toujours un contexte de paquet incohérent', () => {
    const source = workspacePeerFixture(null);
    const record = source.lock.packages[source.parent];
    delete source.lock.packages[source.parent];
    source.lock.packages['@fixture/workspace/wrong-name'] = record;
    const before = structuredClone(source);
    assert.throws(
        () => sourcePeerDeviations(source.lock, {}),
        /invalid package context/
    );
    assert.deepEqual(source, before);
});

test('exige encore l’intégrité de l’enfant dont l’écart est consommé', () => {
    const source = fixture();
    source.lock.packages['fixture-peer'].pop();
    const policy = policyFor(source);
    assert.deepEqual(
        sourcePeerDeviations(source.lock, {}),
        policy.peerDeviations
    );
    assertRefused(source, policy, /package integrity or identity missing/);
});

test('override natif : résolution depuis le manifeste porteur sans mutation', () => {
    for (const field of [
        'dependencies',
        'devDependencies',
        'optionalDependencies',
    ]) {
        const pkg = {
            [field]: { '@fixture/engine': '^8.3.4' },
            overrides: {
                '@fixture/engine': '$@fixture/engine',
                leaf: '^2.1.0',
            },
        };
        const before = structuredClone(pkg);
        assert.deepEqual(resolveManifestOverrides(pkg), {
            '@fixture/engine': '^8.3.4',
            leaf: '^2.1.0',
        });
        assert.deepEqual(pkg, before);
    }
    assert.deepEqual(resolveManifestOverrides({}), {});
});

test('override natif : référence absente, ambiguë ou croisée refusée', () => {
    const invalid = [
        { overrides: { engine: '$engine' } },
        {
            dependencies: { engine: '^1.0.0' },
            devDependencies: { engine: '^1.0.0' },
            overrides: { engine: '$engine' },
        },
        {
            dependencies: { other: '^1.0.0' },
            overrides: { engine: '$other' },
        },
        {
            dependencies: { engine: '^1.0.0' },
            overrides: { engine: '$' },
        },
    ];
    for (const pkg of invalid)
        assert.throws(
            () => resolveManifestOverrides(pkg),
            /unresolved direct override reference/
        );
});

test('override natif : référence indirecte et spécification non semver refusées', () => {
    for (const spec of [
        '$other',
        'catalog:',
        'workspace:*',
        'file:../engine',
        8,
    ]) {
        assert.throws(
            () =>
                resolveManifestOverrides({
                    dependencies: { engine: spec },
                    overrides: { engine: '$engine' },
                }),
            /unsupported override/
        );
    }
    for (const overrides of [[], 'invalid'])
        assert.throws(
            () => resolveManifestOverrides({ overrides }),
            /flat overrides required/
        );
    for (const overrides of [
        { engine: { '.': '^1.0.0' } },
        { 'engine@1': '^1.0.0' },
        { engine: 'not-semver' },
    ])
        assert.throws(
            () => resolveManifestOverrides({ overrides }),
            /unsupported override/
        );
});

test('override natif : seules les déclarations propres font autorité', () => {
    const dependencies = Object.create({ engine: '^1.0.0' });
    assert.throws(
        () =>
            resolveManifestOverrides({
                dependencies,
                overrides: { engine: '$engine' },
            }),
        /unresolved direct override reference/
    );
    const overrides = Object.create({ inherited: '^1.0.0' });
    overrides.constructor = '$constructor';
    assert.deepEqual(
        resolveManifestOverrides({
            dependencies: { constructor: '^3.0.0' },
            overrides,
        }),
        { constructor: '^3.0.0' }
    );
});

test('override produit : plage transitive autonome et référence directe exacte', () => {
    const source = { engine: '^8.3.4', leaf: '^2.1.0' };
    const direct = { engine: { version: '8.3.4' } };
    const before = structuredClone({ source, direct });
    assert.deepEqual(projectProductOverrides(source, {}), {
        declarations: source,
        ranges: source,
    });
    assert.deepEqual(projectProductOverrides(source, direct), {
        declarations: { engine: '$engine', leaf: '^2.1.0' },
        ranges: { engine: '8.3.4', leaf: '^2.1.0' },
    });
    assert.deepEqual({ source, direct }, before);
});

test('override produit : version directe hors plage source refusée', () => {
    for (const version of ['8.3.3', '9.0.0', 'invalid'])
        assert.throws(
            () =>
                projectProductOverrides(
                    { '@fixture/engine': '^8.3.4' },
                    { '@fixture/engine': { version } }
                ),
            /product direct version outside source override/
        );
    assert.throws(
        () => projectProductOverrides({ engine: '$engine' }, {}),
        /unresolved direct override reference/
    );
});

test('override produit : le verrou porte la résolution locale et non le dollar', () => {
    const packages = { engine: record('engine', '8.3.4') };
    const pkg = {
        name: 'fixture',
        devDependencies: { engine: '8.3.4' },
        overrides: { engine: '$engine' },
    };
    const before = structuredClone(pkg);
    const lock = JSON.parse(
        projectProductLock(pkg, {
            lockfileVersion: 1,
            configVersion: 1,
            records: packages,
        })
    );
    assert.deepEqual(lock.overrides, { engine: '8.3.4' });
    assert.deepEqual(lock.workspaces[''].devDependencies, pkg.devDependencies);
    assert.deepEqual(lock.packages, packages);
    assert.deepEqual(pkg, before);
});

test('override produit : une copie transitive incompatible reste refusée', () => {
    const source = {
        lockfileVersion: 1,
        configVersion: 1,
        workspaces: { '': {} },
        packages: {
            consumer: record('consumer', '1.0.0', {
                dependencies: { engine: '^8.0.0' },
            }),
            engine: record('engine', '8.3.4'),
            'consumer/engine': record('engine', '8.4.0'),
        },
    };
    const packages = {
        consumer: { version: '1.0.0' },
        engine: { version: '8.3.4' },
    };
    const policy = projectProductOverrides({ engine: '^8.3.4' }, packages);
    assert.throws(
        () =>
            productDependencyClosure(source, packages, source, {
                overrides: policy.ranges,
            }),
        /ne satisfait pas/
    );
});

test('override produit : une déclaration équivalente altérée reste refusée', async (t) => {
    // Metadata-only unit fixture; this does not qualify a native installation.
    const fixture = await shellFixture(t, 'react-spa');
    await qualifyProductInstallation(fixture.plan);
    const path = join(fixture.root, 'package.json');
    const original = await readFile(path);
    const pkg = JSON.parse(original);
    assert.equal(pkg.overrides.vite, '$vite');
    pkg.overrides.vite = pkg.devDependencies.vite;
    assert.deepEqual(
        resolveManifestOverrides(pkg),
        fixture.plan.manifest.overrides
    );
    const altered = JSON.stringify(pkg) + '\n';
    await writeFile(path, altered);
    try {
        await assert.rejects(
            qualifyProductInstallation(fixture.plan),
            /product overrides differ/
        );
        assert.equal(await readFile(path, 'utf8'), altered);
    } finally {
        await writeFile(path, original);
    }
    await qualifyProductInstallation(fixture.plan);
});
