import assert from 'node:assert/strict';
import test from 'node:test';

import {
    productDependencyClosure,
    sourcePeerDeviations,
} from './core/application-workspace-toolchain.mjs';
import { peerDeviationFixture } from './test-support/external-application-fixture.mjs';
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
