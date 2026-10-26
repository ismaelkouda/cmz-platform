import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import semver from 'semver';

import { parseJsonc } from '../../check-library-setup-deps.mjs';
import { resolveManifestOverrides } from '../core/application-workspace-toolchain.mjs';
import {
    planApplicationWorkspace,
    productDependencyClosure,
} from '../core/application-workspace.mjs';
import {
    fixtureParent,
    TOOLS_ROOT,
    workspaceOptions,
} from './external-application-fixture.mjs';

function canonical(value) {
    if (Array.isArray(value)) return value.map(canonical);
    if (value && typeof value === 'object')
        return Object.fromEntries(
            Object.keys(value)
                .sort((a, b) => a.localeCompare(b))
                .map((key) => [key, canonical(value[key])])
        );
    return value;
}

const fingerprint = (record) =>
    createHash('sha256')
        .update(JSON.stringify(canonical(record)))
        .digest('hex');
const ordered = (edges) =>
    [...edges].sort((a, b) =>
        JSON.stringify(canonical(a)).localeCompare(JSON.stringify(canonical(b)))
    );

function identity(record) {
    assert.ok(Array.isArray(record) && typeof record[0] === 'string');
    const separator = record[0].lastIndexOf('@');
    assert.ok(separator > 0);
    const version = record[0].slice(separator + 1);
    assert.ok(semver.valid(version), record[0]);
    return { name: record[0].slice(0, separator), version };
}

// Independent lookup: enumerate existing ancestor keys, longest first.
// No production resolver, closure or deviation collector supplies this oracle.
function resolveSourceKey(packages, parent, name) {
    const owners = [''];
    const parts = parent.split('/');
    for (let length = 1; length <= parts.length; length++) {
        const owner = parts.slice(0, length).join('/');
        if (Object.hasOwn(packages, owner)) owners.push(owner);
    }
    for (const owner of owners.reverse()) {
        const key = owner ? owner + '/' + name : name;
        if (Object.hasOwn(packages, key)) return key;
    }
    return undefined;
}

export function sourceDependencyExpectations(lock, roots, overrides) {
    const pending = Object.keys(roots);
    const reached = new Set();
    const edges = [];
    for (const name of pending) {
        const found = identity(lock.packages[name]);
        assert.equal(found.name, name);
        assert.equal(found.version, roots[name].version);
    }
    for (let index = 0; index < pending.length; index++) {
        const parent = pending[index];
        if (reached.has(parent)) continue;
        reached.add(parent);
        const record = lock.packages[parent];
        for (const field of [
            'dependencies',
            'optionalDependencies',
            'peerDependencies',
        ]) {
            for (const [name, requested] of Object.entries(
                record[2]?.[field] ?? {}
            )) {
                const child = resolveSourceKey(lock.packages, parent, name);
                if (!child) {
                    assert.ok(
                        field === 'optionalDependencies' ||
                            (field === 'peerDependencies' &&
                                record[2].optionalPeers?.includes(name)),
                        parent + ': required source package missing ' + name
                    );
                    continue;
                }
                pending.push(child);
                const { version } = identity(lock.packages[child]);
                if (
                    !semver.validRange(requested) ||
                    semver.satisfies(version, requested, {
                        includePrerelease: true,
                    })
                )
                    continue;
                const overridden = Object.hasOwn(overrides, name);
                assert.ok(
                    overridden ||
                        (field === 'peerDependencies' &&
                            record[2].optionalPeers?.includes(name)),
                    parent + ': unqualified source mismatch ' + name
                );
                if (overridden)
                    assert.ok(
                        semver.satisfies(version, overrides[name], {
                            includePrerelease: true,
                        })
                    );
                edges.push({
                    parent,
                    identity: record[0],
                    field,
                    name,
                    requested,
                    resolved: lock.packages[child][0],
                    reason: overridden ? 'override' : 'optional-peer',
                    effective_requested: overridden ? overrides[name] : version,
                    parent_sha256: fingerprint(record),
                    child_sha256: fingerprint(lock.packages[child]),
                });
            }
        }
    }
    return {
        records: Object.fromEntries(
            [...reached].sort().map((key) => [key, lock.packages[key]])
        ),
        edges: ordered(edges),
    };
}

export async function verifyWorkspaceDependencyProfiles(t) {
    const parent = await fixtureParent(t);
    const source = parseJsonc(
        await readFile(join(TOOLS_ROOT, 'bun.lock'), 'utf8')
    );
    const sourceOverrides = resolveManifestOverrides(
        JSON.parse(await readFile(join(TOOLS_ROOT, 'package.json'), 'utf8'))
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
        const productOverrides = resolveManifestOverrides(pkg);
        const expected = sourceDependencyExpectations(
            source,
            plan.manifest.packages,
            productOverrides
        );
        assert.deepEqual(
            ordered(plan.manifest.dependency_deviations),
            expected.edges,
            'Source deviations must be complete, independently of the producer'
        );
        const policy = {
            overrides: productOverrides,
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
        assert.deepEqual(ordered(closure.known_source_edges), expected.edges);
        assert.deepEqual(closure.records, expected.records);
        const reachedNames = new Set(
            Object.values(expected.records).map(
                (record) => identity(record).name
            )
        );
        assert.deepEqual(
            pkg.overrides,
            Object.fromEntries(
                Object.entries(sourceOverrides)
                    .filter(([name]) => reachedNames.has(name))
                    .map(([name, range]) => [
                        name,
                        Object.hasOwn(plan.manifest.packages, name)
                            ? '$' + name
                            : range,
                    ])
            )
        );
        for (const [name, entry] of Object.entries(plan.manifest.packages)) {
            if (!Object.hasOwn(sourceOverrides, name)) continue;
            assert.ok(
                semver.satisfies(entry.version, sourceOverrides[name], {
                    includePrerelease: true,
                }),
                'Product pin outside approved source override: ' + name
            );
            assert.equal(productOverrides[name], entry.version);
        }
        // Regression #329: Angular has only transitive Vite; React owns a pin.
        if (profiles.includes('react-spa')) {
            assert.equal(pkg.overrides.vite, '$vite');
            assert.equal(
                productOverrides.vite,
                plan.manifest.packages.vite.version
            );
        } else {
            assert.equal(pkg.devDependencies.vite, undefined);
            assert.equal(pkg.dependencies.vite, undefined);
            assert.equal(pkg.overrides.vite, sourceOverrides.vite);
        }
        assert.deepEqual(plan.manifest.overrides, productOverrides);
        assert.deepEqual(seed.overrides, productOverrides);
        assert.deepEqual(Object.keys(seed.workspaces), ['']);
        assert.equal(seed.catalog, undefined);
        for (const [key, record] of Object.entries(closure.records))
            assert.deepEqual(
                record,
                source.packages[key],
                'Record source rewritten'
            );
        for (const name of new Set(
            expected.edges
                .filter((edge) => edge.reason === 'override')
                .map((edge) => edge.name)
        )) {
            const removed = structuredClone(policy);
            delete removed.overrides[name];
            assert.throws(
                () =>
                    productDependencyClosure(
                        seed,
                        plan.manifest.packages,
                        source,
                        removed
                    ),
                /ne satisfait pas/
            );
        }
        for (const edge of expected.edges.filter(
            (item) => item.reason === 'optional-peer'
        )) {
            const removed = structuredClone(policy);
            removed.peerDeviations = removed.peerDeviations.filter(
                (item) =>
                    item.parent !== edge.parent ||
                    item.field !== edge.field ||
                    item.name !== edge.name
            );
            assert.throws(
                () =>
                    productDependencyClosure(
                        seed,
                        plan.manifest.packages,
                        source,
                        removed
                    ),
                /ne satisfait pas/
            );
            const widened = structuredClone(policy);
            widened.peerDeviations.find(
                (item) =>
                    item.parent === edge.parent &&
                    item.field === edge.field &&
                    item.name === edge.name
            ).effective_requested = '*';
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
            const child = resolveSourceKey(
                source.packages,
                edge.parent,
                edge.name
            );
            changed.packages[child][0] = edge.name + '@0.0.0';
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
        }
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
}
