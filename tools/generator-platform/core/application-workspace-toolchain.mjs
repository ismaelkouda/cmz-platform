import { realpath } from 'node:fs/promises';
import { resolve } from 'node:path';
import semver from 'semver';

import { parseJsonc } from '../../check-library-setup-deps.mjs';
import { dependencyClosureState } from '../../library-setup/dependency-resolution.mjs';
import { SHELL_PACKAGES } from '../renderers/application-workspace-renderer.mjs';
import {
    assertPhysicalPath,
    externalFailure,
    isWithin,
    pathExists,
    readProductFile,
    safeRelativePath,
} from './external-application-paths.mjs';
import { sha256, stableStringify } from './generation-manifest.mjs';

const SOURCE_FILES = [
    '.prettierrc.json',
    'tools/create-app.mjs',
    'tools/prepare-application-workspace.mjs',
    'tools/generator-platform/core/application-shell-publication.mjs',
    'tools/generator-platform/core/application-workspace.mjs',
    'tools/generator-platform/core/application-workspace-toolchain.mjs',
    'tools/generator-platform/core/external-application-paths.mjs',
    'tools/generator-platform/core/application-design.mjs',
    'tools/generator-platform/core/backend-contract.mjs',
    'tools/generator-platform/core/generation-manifest.mjs',
    'tools/generator-platform/core/generation-transaction.mjs',
    'tools/generator-platform/core/canonicalize-generated.mjs',
    'tools/generator-platform/renderers/application-workspace-renderer.mjs',
    'tools/generator-platform/renderers/angular-pwa-shell-renderer.mjs',
    'tools/generator-platform/renderers/react-spa-shell-renderer.mjs',
    'tools/generator-platform/schemas/application-workspace-manifest.schema.json',
    'tools/generator-platform/schemas/application-design.schema.json',
    'tools/generator-platform/schemas/backend-contract.schema.json',
    'tools/generator-platform/validate-ir.mjs',
    'tools/library-setup/sandbox.mjs',
    'tools/library-setup/dependency-resolution.mjs',
    'tools/check-library-setup-deps.mjs',
];

export function lockDocument(content) {
    const value = parseJsonc(content.toString('utf8'), 'product lock');
    if (!value?.packages || !value.workspaces?.[''])
        externalFailure('invalid Bun lock');
    return value;
}

function packageIdentityFields(record) {
    if (!Array.isArray(record)) externalFailure('invalid locked package');
    const identity = record[0]?.match(/^(@[^/]+\/[^@]+|[^@]+)@(.+)$/);
    if (!identity) externalFailure('package integrity or identity missing');
    return { name: identity[1], version: identity[2] };
}

function packageIdentity(record) {
    const identity = packageIdentityFields(record);
    const integrity = record.find(
        (part) => typeof part === 'string' && part.startsWith('sha512-')
    );
    if (!integrity) externalFailure('package integrity or identity missing');
    return { ...identity, integrity };
}

// Mirror only the context lookup needed to describe an edge. Range checking
// and the actual reachability traversal remain in dependencyClosureState.
function childKey(packages, parent, name) {
    let context = parent;
    const seen = new Set();
    while (!seen.has(context)) {
        seen.add(context);
        const key = context ? `${context}/${name}` : name;
        if (Object.hasOwn(packages, key)) return key;
        if (!context) return undefined;
        const owner = packageIdentityFields(packages[context]).name;
        if (context === owner) context = '';
        else {
            if (!context.endsWith('/' + owner))
                externalFailure('invalid package context');
            context = context.slice(0, -(owner.length + 1));
        }
    }
    externalFailure('dependency context cycle');
}

function flatOverrides(overrides) {
    if (!overrides || typeof overrides !== 'object' || Array.isArray(overrides))
        externalFailure('flat overrides required');
    for (const [name, range] of Object.entries(overrides)) {
        if (
            !/^(@[^/]+\/[^@]+|[^/@]+)$/.test(name) ||
            typeof range !== 'string' ||
            !semver.validRange(range)
        )
            externalFailure('unsupported override');
    }
    return overrides;
}

function edgeDescription(
    lock,
    parent,
    field,
    name,
    requested,
    reason,
    effective
) {
    const key = childKey(lock.packages, parent, name);
    if (!key) externalFailure('dependency deviation child missing');
    const record = lock.packages[parent];
    return {
        parent,
        identity: record[0],
        field,
        name,
        requested,
        resolved: lock.packages[key][0],
        reason,
        effective_requested: effective,
        parent_sha256: sha256(stableStringify(record)),
        child_sha256: sha256(stableStringify(lock.packages[key])),
    };
}

function isOptionalPeer(record, field, name) {
    return (
        field === 'peerDependencies' &&
        Array.isArray(record[2]?.optionalPeers) &&
        record[2].optionalPeers.includes(name)
    );
}

function sameDependencyEdge(left, right) {
    return stableStringify(left) === stableStringify(right);
}

export function sourcePeerDeviations(lock, overrides) {
    const deviations = [];
    for (const [parent, record] of Object.entries(lock.packages)) {
        for (const [name, requested] of Object.entries(
            record[2]?.peerDependencies ?? {}
        )) {
            if (
                Object.hasOwn(overrides, name) ||
                !isOptionalPeer(record, 'peerDependencies', name) ||
                typeof requested !== 'string' ||
                !semver.validRange(requested)
            )
                continue;
            const key = childKey(lock.packages, parent, name);
            if (!key) continue;
            const version = packageIdentityFields(lock.packages[key]).version;
            if (
                !semver.valid(version) ||
                semver.satisfies(version, requested, {
                    includePrerelease: true,
                })
            )
                continue;
            deviations.push(
                edgeDescription(
                    lock,
                    parent,
                    'peerDependencies',
                    name,
                    requested,
                    'optional-peer',
                    version
                )
            );
        }
    }
    return deviations;
}

export function productDependencyClosure(
    lock,
    packages,
    sourceLock,
    { overrides = {}, peerDeviations = [] } = {}
) {
    if (!sourceLock?.packages) externalFailure('approved source lock required');
    flatOverrides(overrides);
    const approvedPeerDeviations = sourcePeerDeviations(sourceLock, overrides);
    if (
        !Array.isArray(peerDeviations) ||
        peerDeviations.some(
            (edge) =>
                !approvedPeerDeviations.some((approved) =>
                    sameDependencyEdge(approved, edge)
                )
        )
    )
        externalFailure('unqualified source dependency deviation');
    const versions = Object.fromEntries(
        Object.entries(packages).map(([name, entry]) => [name, entry.version])
    );
    const declarations = Object.fromEntries(
        Object.keys(versions).map((name) => [name, 'catalog:'])
    );
    const projected = structuredClone(lock);
    for (const [parent, record] of Object.entries(projected.packages)) {
        for (const field of [
            'dependencies',
            'optionalDependencies',
            'peerDependencies',
        ]) {
            for (const name of Object.keys(record[2]?.[field] ?? {})) {
                if (Object.hasOwn(overrides, name))
                    record[2][field][name] = overrides[name];
                else {
                    const edge = peerDeviations.find(
                        (entry) =>
                            entry.parent === parent &&
                            entry.field === field &&
                            entry.name === name
                    );
                    if (!edge) continue;
                    const child = childKey(lock.packages, parent, name);
                    const description = edgeDescription(
                        lock,
                        parent,
                        field,
                        name,
                        record[2][field][name],
                        'optional-peer',
                        edge.effective_requested
                    );
                    if (
                        !isOptionalPeer(record, field, name) ||
                        !sameDependencyEdge(description, edge) ||
                        stableStringify(lock.packages[parent]) !==
                            stableStringify(sourceLock.packages[parent]) ||
                        stableStringify(lock.packages[child]) !==
                            stableStringify(sourceLock.packages[child])
                    )
                        externalFailure(
                            'unqualified source dependency deviation'
                        );
                    const version = packageIdentity(
                        lock.packages[child]
                    ).version;
                    if (edge.effective_requested !== version)
                        externalFailure(
                            'unqualified source dependency deviation: invalid peer range'
                        );
                    record[2][field][name] = version;
                }
            }
        }
    }
    const closure = dependencyClosureState(
        JSON.stringify({
            dependencies: declarations,
            workspaces: { catalog: versions },
        }),
        JSON.stringify({
            ...projected,
            catalog: versions,
            workspaces: { '': { dependencies: declarations } },
        }),
        {
            catalog: 'default',
            dependency_section: 'dependencies',
            packages: versions,
        }
    );
    const records = {};
    const deviations = [];
    for (const parent of Object.keys(closure.records)) {
        const record = lock.packages[parent];
        if (
            stableStringify(record) !==
            stableStringify(sourceLock.packages[parent])
        )
            externalFailure(
                'product transitive package not qualified by source lock'
            );
        records[parent] = structuredClone(record);
        for (const field of [
            'dependencies',
            'optionalDependencies',
            'peerDependencies',
        ]) {
            for (const [name, requested] of Object.entries(
                record[2]?.[field] ?? {}
            )) {
                const key = childKey(lock.packages, parent, name);
                if (!key || !semver.validRange(requested)) continue;
                const version = packageIdentity(lock.packages[key]).version;
                if (
                    semver.satisfies(version, requested, {
                        includePrerelease: true,
                    })
                )
                    continue;
                const reason = Object.hasOwn(overrides, name)
                    ? 'override'
                    : 'optional-peer';
                const effective =
                    reason === 'override' ? overrides[name] : version;
                deviations.push(
                    edgeDescription(
                        lock,
                        parent,
                        field,
                        name,
                        requested,
                        reason,
                        effective
                    )
                );
            }
        }
    }
    return { ...closure, records, known_source_edges: deviations };
}

async function installedPackage(root, name, { sourceLookup = false } = {}) {
    const modules = resolve(root, 'node_modules');
    await assertPhysicalPath(modules);
    let entry = resolve(modules, name);
    // Qualification may read a transitive package already materialized by
    // the source Bun lock. Product lookup never uses this alternate index.
    if (sourceLookup && !(await pathExists(entry)))
        entry = resolve(modules, '.bun/node_modules', name);
    const packageRoot = await realpath(entry);
    if (!isWithin(modules, packageRoot))
        externalFailure('dependency outside product');
    const bytes = await readProductFile(packageRoot, 'package.json');
    const metadata = JSON.parse(bytes.toString('utf8'));
    if (
        metadata.name !== name ||
        !/^\d+\.\d+\.\d+(?:-[a-zA-Z0-9.-]+)?$/.test(metadata.version ?? '')
    )
        externalFailure('installed package identity');
    const rawBins =
        typeof metadata.bin === 'string'
            ? { [name.split('/').at(-1)]: metadata.bin }
            : (metadata.bin ?? {});
    const bins = {};
    for (const [command, bin] of Object.entries(rawBins)) {
        const path = safeRelativePath(bin.replace(/^\.\//, ''));
        const content = await readProductFile(packageRoot, path);
        bins[command] = { path, sha256: sha256(content) };
    }
    return {
        version: metadata.version,
        package_json_sha256: sha256(bytes),
        bin: bins,
        packageRoot,
    };
}

export async function sourceProvenance(toolsRoot) {
    const sourceHashes = {};
    for (const path of SOURCE_FILES)
        sourceHashes[path] = sha256(await readProductFile(toolsRoot, path));
    return {
        package_json_sha256: sha256(
            await readProductFile(toolsRoot, 'package.json')
        ),
        bun_lock_sha256: sha256(await readProductFile(toolsRoot, 'bun.lock')),
        source_files: sourceHashes,
    };
}

export async function sourceToolchain(toolsRoot, profiles) {
    const pkg = JSON.parse(
        (await readProductFile(toolsRoot, 'package.json')).toString('utf8')
    );
    const lock = lockDocument(await readProductFile(toolsRoot, 'bun.lock'));
    const overrides = flatOverrides(pkg.overrides ?? {});
    if (stableStringify(overrides) !== stableStringify(lock.overrides ?? {}))
        externalFailure('source manifest and lock overrides differ');
    const packages = {};
    for (const key of ['common', ...profiles]) {
        for (const group of ['dependencies', 'devDependencies']) {
            for (const name of SHELL_PACKAGES[key][group]) {
                if (packages[name]) continue;
                if (!lock.packages[name])
                    externalFailure('unqualified direct package');
                const installed = await installedPackage(toolsRoot, name, {
                    sourceLookup: true,
                });
                const identity = packageIdentity(lock.packages[name]);
                if (
                    identity.name !== name ||
                    identity.version !== installed.version
                )
                    externalFailure('installed tool differs from source lock');
                const { packageRoot, ...description } = installed;
                if (!isWithin(toolsRoot, packageRoot))
                    externalFailure('source tool outside workshop');
                packages[name] = {
                    ...description,
                    group,
                    integrity: identity.integrity,
                };
            }
        }
    }
    const closure = productDependencyClosure(lock, packages, lock, {
        overrides,
        peerDeviations: sourcePeerDeviations(lock, overrides),
    });
    const reached = new Set(
        Object.values(closure.records).map(
            (record) => packageIdentity(record).name
        )
    );
    return {
        packages,
        packageManager: pkg.packageManager,
        engines: pkg.engines,
        overrides: Object.fromEntries(
            Object.entries(overrides).filter(([name]) => reached.has(name))
        ),
        dependencyDeviations: closure.known_source_edges,
        records: closure.records,
        dependencyClosureSha256: sha256(stableStringify(closure.records)),
        lockfileVersion: lock.lockfileVersion,
        configVersion: lock.configVersion,
    };
}

export function projectProductLock(pkg, toolchain) {
    return (
        JSON.stringify(
            {
                lockfileVersion: toolchain.lockfileVersion,
                configVersion: toolchain.configVersion,
                workspaces: {
                    '': {
                        name: pkg.name,
                        dependencies: pkg.dependencies,
                        devDependencies: pkg.devDependencies,
                    },
                },
                overrides: pkg.overrides,
                packages: toolchain.records,
            },
            null,
            2
        ) + '\n'
    );
}

export async function qualifyProductInstallation(workspace) {
    const root = workspace.productRoot;
    const lockBytes = await readProductFile(root, 'bun.lock');
    const lock = lockDocument(lockBytes);
    const pkg = JSON.parse(
        (await readProductFile(root, 'package.json')).toString('utf8')
    );
    const overrides = workspace.manifest.overrides;
    if (
        stableStringify(pkg.overrides) !== stableStringify(overrides) ||
        stableStringify(lock.overrides) !== stableStringify(overrides)
    )
        externalFailure('product overrides differ');
    const direct = {
        ...lock.workspaces[''].dependencies,
        ...lock.workspaces[''].devDependencies,
    };
    const expected = workspace.manifest.packages;
    if (
        Object.keys(direct).sort().join('\0') !==
        Object.keys(expected).sort().join('\0')
    )
        externalFailure('product lock direct closure differs');
    const closure = productDependencyClosure(lock, expected, lock, {
        overrides,
        peerDeviations: workspace.manifest.dependency_deviations.filter(
            (edge) => edge.reason === 'optional-peer'
        ),
    });
    if (
        Object.keys(closure.records).sort().join('\0') !==
        Object.keys(lock.packages).sort().join('\0')
    )
        externalFailure('product lock contains an unreachable package');
    if (
        sha256(stableStringify(closure.records)) !==
            workspace.manifest.dependency_closure_sha256 ||
        stableStringify(closure.known_source_edges) !==
            stableStringify(workspace.manifest.dependency_deviations)
    )
        externalFailure('product dependency snapshot differs');
    const installed = {};
    const metadata = {};
    for (const [name, qualifiedPackage] of Object.entries(expected)) {
        if (direct[name] !== qualifiedPackage.version)
            externalFailure('product lock direct version differs');
        const info = await installedPackage(root, name);
        if (
            info.version !== qualifiedPackage.version ||
            info.package_json_sha256 !== qualifiedPackage.package_json_sha256
        )
            externalFailure('installed product package differs');
        if (stableStringify(info.bin) !== stableStringify(qualifiedPackage.bin))
            externalFailure('installed product executable differs');
        const identity = packageIdentity(lock.packages[name]);
        if (
            identity.name !== name ||
            identity.version !== info.version ||
            identity.integrity !== qualifiedPackage.integrity
        )
            externalFailure('product package integrity differs');
        installed[name] = info;
        metadata[name] = {
            version: info.version,
            package_json_sha256: info.package_json_sha256,
            bin: info.bin,
        };
    }
    return { installed, metadata, lock_sha256: sha256(lockBytes) };
}

/** Called only by the explicit native proof, never by prepare/create-app. */
export async function qualifyFrozenInstallation(workspace, install) {
    const path = 'bun.lock';
    const initial = sha256(await readProductFile(workspace.productRoot, path));
    for (const pass of [1, 2]) {
        await install(pass);
        if (
            sha256(await readProductFile(workspace.productRoot, path)) !==
            initial
        )
            externalFailure('frozen installation changed candidate lock');
        await qualifyProductInstallation(workspace);
    }
    return initial;
}
