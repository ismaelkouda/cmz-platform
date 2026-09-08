import { createHash } from 'node:crypto';
import {
    closeSync,
    constants,
    existsSync,
    fsyncSync,
    lstatSync,
    openSync,
    readFileSync,
    renameSync,
    unlinkSync,
    writeFileSync,
} from 'node:fs';
import { basename, dirname, join } from 'node:path';

import { applyEdits, modify } from 'jsonc-parser';
import semver from 'semver';

import {
    parseJsonc,
    parseWithoutDuplicateKeys,
} from '../check-library-setup-deps.mjs';
import { gitBlobOid, verifyMaterializedTree } from './git-tree.mjs';

const OVERLAY_PATHS = ['package.json', 'bun.lock'];

function fail(message) {
    throw new Error(`library dependency resolution: ${message}`);
}

function stable(value) {
    if (Array.isArray(value)) return value.map(stable);
    if (value && typeof value === 'object') {
        return Object.fromEntries(
            Object.keys(value)
                .sort()
                .map((key) => [key, stable(value[key])])
        );
    }
    return value;
}

function same(left, right) {
    return JSON.stringify(stable(left)) === JSON.stringify(stable(right));
}

function editJson(text, path, value) {
    return applyEdits(
        text,
        modify(text, path, value, {
            formattingOptions: { insertSpaces: true, tabSize: 2, eol: '\n' },
            getInsertionIndex: (properties) =>
                [...properties, path.at(-1)].sort().indexOf(path.at(-1)),
        })
    );
}

export function updateRootManifest(rawText, track) {
    const source = parseWithoutDuplicateKeys(rawText, 'package.json');
    if (!track || !['default', 'tooling'].includes(track.catalog)) {
        fail('piste de compatibilité invalide');
    }
    const section = track.dependency_section;
    if (!['dependencies', 'devDependencies'].includes(section)) {
        fail('section de dépendance invalide');
    }
    let text = rawText;
    for (const [name, version] of Object.entries(track.packages).sort()) {
        if (!semver.valid(version)) fail(`version non exacte pour ${name}`);
        const catalogPath =
            track.catalog === 'default'
                ? ['workspaces', 'catalog', name]
                : ['workspaces', 'catalogs', 'tooling', name];
        const existingCatalog =
            track.catalog === 'default'
                ? source.workspaces?.catalog?.[name]
                : source.workspaces?.catalogs?.tooling?.[name];
        if (existingCatalog !== undefined && existingCatalog !== version) {
            fail(
                `${name}: catalog existant ${existingCatalog}, mise à niveau globale implicite interdite`
            );
        }
        for (const candidate of [
            'dependencies',
            'devDependencies',
            'peerDependencies',
            'optionalDependencies',
        ]) {
            const spec = source[candidate]?.[name];
            if (
                spec !== undefined &&
                (candidate !== section || spec !== 'catalog:')
            ) {
                fail(
                    `${name}: déclaration existante incompatible dans ${candidate}`
                );
            }
        }
        if (existingCatalog === undefined)
            text = editJson(text, catalogPath, version);
        if (source[section]?.[name] === undefined) {
            text = editJson(text, [section, name], 'catalog:');
        }
    }
    parseWithoutDuplicateKeys(text, 'package.json final');
    return text;
}

export function bunInstallArgv({ frozen, registry }) {
    if (typeof registry !== 'string' || !registry.startsWith('https://')) {
        fail('registre HTTPS requis');
    }
    return [
        'install',
        ...(frozen ? ['--frozen-lockfile'] : []),
        '--ignore-scripts',
        '--backend=copyfile',
        `--registry=${registry}`,
    ];
}

function packageNameFromRecord(record) {
    if (!Array.isArray(record) || typeof record[0] !== 'string') return null;
    const match = record[0].match(/^(@[^/]+\/[^@]+|[^@]+)@(.+)$/);
    return match ? { name: match[1], version: match[2] } : null;
}

function dependencyEdges(record) {
    const metadata = Array.isArray(record) ? record[2] : null;
    if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata))
        return [];
    const optionalPeers = new Set(
        Array.isArray(metadata.optionalPeers) ? metadata.optionalPeers : []
    );
    return [
        ...Object.entries(metadata.dependencies ?? {}).map(([name, spec]) => ({
            name,
            spec,
            optional: false,
        })),
        ...Object.entries(metadata.optionalDependencies ?? {}).map(
            ([name, spec]) => ({ name, spec, optional: true })
        ),
        ...Object.entries(metadata.peerDependencies ?? {}).map(
            ([name, spec]) => ({
                name,
                spec,
                optional: optionalPeers.has(name),
            })
        ),
    ];
}

function owningContext(packages, key) {
    const identity = packageNameFromRecord(packages[key]);
    if (!identity) fail(`record de paquet invalide : ${key}`);
    if (key === identity.name) return '';
    const suffix = `/${identity.name}`;
    if (!key.endsWith(suffix)) {
        fail(`clé de paquet incohérente avec son identité : ${key}`);
    }
    return key.slice(0, -suffix.length);
}

function resolveLockKey(packages, parentKey, name, spec) {
    const range = semver.validRange(spec);
    let context = parentKey;
    const visited = new Set();
    while (true) {
        if (visited.has(context)) {
            fail(`cycle de contextes dans le lockfile depuis ${parentKey}`);
        }
        visited.add(context);
        const key = context ? `${context}/${name}` : name;
        const record = packages[key];
        if (record) {
            const identity = packageNameFromRecord(record);
            if (!identity || identity.name !== name) {
                fail(`clé de paquet incohérente avec son record : ${key}`);
            }
            if (
                range &&
                !semver.satisfies(identity.version, range, {
                    includePrerelease: true,
                })
            ) {
                fail(
                    `${key}@${identity.version} ne satisfait pas ${name}@${spec}`
                );
            }
            return key;
        }
        if (!context) return null;
        context = owningContext(packages, context);
    }
}

/**
 * État sémantique minimal d'une bibliothèque dans package.json + bun.lock.
 *
 * Contrairement à une empreinte des deux fichiers entiers, cet état reste
 * valable lorsqu'une bibliothèque indépendante est ajoutée. Il devient en
 * revanche périmé dès qu'une déclaration directe ou un record réellement
 * atteignable (dépendance, dépendance optionnelle présente ou peer requis)
 * change.
 */
export function dependencyClosureState(manifestRaw, lockRaw, track) {
    const manifest = parseWithoutDuplicateKeys(
        Buffer.from(manifestRaw).toString('utf8'),
        'package.json'
    );
    const lock = parseJsonc(Buffer.from(lockRaw).toString('utf8'), 'bun.lock');
    if (!lock.packages || typeof lock.packages !== 'object') {
        fail('table packages absente du lockfile');
    }
    if (
        !track ||
        !['default', 'tooling'].includes(track.catalog) ||
        !['dependencies', 'devDependencies'].includes(track.dependency_section)
    ) {
        fail('piste absente ou invalide pour calculer la fermeture');
    }
    const manifestCatalog =
        track.catalog === 'default'
            ? manifest.workspaces?.catalog
            : manifest.workspaces?.catalogs?.tooling;
    const lockCatalog =
        track.catalog === 'default' ? lock.catalog : lock.catalogs?.tooling;
    const lockWorkspace = lock.workspaces?.[''];
    if (!manifestCatalog || !lockCatalog || !lockWorkspace) {
        fail('catalog ou workspace racine absent');
    }

    const direct = {};
    const roots = [];
    for (const [name, version] of Object.entries(track.packages).sort()) {
        if (!semver.valid(version)) fail(`${name}: version directe non exacte`);
        for (const section of [
            'dependencies',
            'devDependencies',
            'peerDependencies',
            'optionalDependencies',
        ]) {
            const spec = manifest[section]?.[name];
            if (
                section === track.dependency_section
                    ? spec !== 'catalog:'
                    : spec !== undefined
            ) {
                fail(
                    `${name}: déclaration directe incompatible dans ${section}`
                );
            }
        }
        if (
            manifestCatalog[name] !== version ||
            lockCatalog[name] !== version ||
            lockWorkspace[track.dependency_section]?.[name] !== 'catalog:'
        ) {
            fail(`${name}: manifest/catalog/lockfile non concordants`);
        }
        const key = resolveLockKey(lock.packages, '', name, version);
        if (!key) fail(`paquet demandé absent du lockfile : ${name}`);
        direct[name] = { version, key };
        roots.push(key);
    }

    const reachable = new Set();
    const queue = [...roots];
    while (queue.length) {
        const key = queue.shift();
        if (reachable.has(key)) continue;
        const record = lock.packages[key];
        if (!record) fail(`record atteignable absent : ${key}`);
        reachable.add(key);
        for (const { name, spec, optional } of dependencyEdges(record)) {
            const child = resolveLockKey(lock.packages, key, name, spec);
            if (!child && !optional) {
                fail(`${key}: dépendance requise absente ${name}@${spec}`);
            }
            if (child) queue.push(child);
        }
    }
    const records = Object.fromEntries(
        [...reachable]
            .sort()
            .map((key) => [key, structuredClone(lock.packages[key])])
    );
    return {
        schema_version: '1.0.0',
        dependency_section: track.dependency_section,
        catalog: track.catalog,
        direct,
        records,
    };
}

export function dependencyClosureSha256(manifestRaw, lockRaw, track) {
    return createHash('sha256')
        .update(
            JSON.stringify(
                stable(dependencyClosureState(manifestRaw, lockRaw, track))
            )
        )
        .digest('hex');
}

function fieldValue(object, key) {
    return object && Object.hasOwn(object, key)
        ? { present: true, value: structuredClone(object[key]) }
        : { present: false };
}

/** Projection des seules entrées susceptibles d'influencer l'ajout demandé. */
export function dependencyProjectionSha256(manifestRaw, lockRaw, track) {
    const manifest = parseWithoutDuplicateKeys(
        Buffer.from(manifestRaw).toString('utf8'),
        'package.json'
    );
    const lock = parseJsonc(Buffer.from(lockRaw).toString('utf8'), 'bun.lock');
    if (!lock.packages || typeof lock.packages !== 'object') {
        fail('table packages absente du lockfile');
    }
    const manifestCatalog =
        track.catalog === 'default'
            ? manifest.workspaces?.catalog
            : manifest.workspaces?.catalogs?.tooling;
    const lockCatalog =
        track.catalog === 'default' ? lock.catalog : lock.catalogs?.tooling;
    const lockWorkspace = lock.workspaces?.[''];
    const names = Object.keys(track.packages).sort();
    const records = Object.fromEntries(
        Object.entries(lock.packages)
            .filter(([, record]) => {
                const identity = packageNameFromRecord(record);
                return identity && names.includes(identity.name);
            })
            .sort(([left], [right]) => left.localeCompare(right))
            .map(([key, record]) => [key, structuredClone(record)])
    );
    const projection = {
        schema_version: '1.0.0',
        dependency_section: track.dependency_section,
        catalog: track.catalog,
        packages: Object.fromEntries(
            names.map((name) => [
                name,
                {
                    manifest: Object.fromEntries(
                        [
                            'dependencies',
                            'devDependencies',
                            'peerDependencies',
                            'optionalDependencies',
                        ].map((section) => [
                            section,
                            fieldValue(manifest[section], name),
                        ])
                    ),
                    manifest_catalog: fieldValue(manifestCatalog, name),
                    lock_workspace: fieldValue(
                        lockWorkspace?.[track.dependency_section],
                        name
                    ),
                    lock_catalog: fieldValue(lockCatalog, name),
                },
            ])
        ),
        records,
    };
    return createHash('sha256')
        .update(JSON.stringify(stable(projection)))
        .digest('hex');
}

export function validateLockEvolution(initialRaw, finalRaw, track) {
    const initial = parseJsonc(initialRaw, 'bun.lock initial');
    const final = parseJsonc(finalRaw, 'bun.lock final');
    if (!initial.packages || !final.packages) fail('table packages absente');
    if (
        !track ||
        !['default', 'tooling'].includes(track.catalog) ||
        !['dependencies', 'devDependencies'].includes(track.dependency_section)
    ) {
        fail('piste absente ou invalide pour contrôler le lockfile');
    }
    const expectedMetadata = structuredClone(initial);
    delete expectedMetadata.packages;
    const observedMetadata = structuredClone(final);
    delete observedMetadata.packages;
    const rootWorkspace = expectedMetadata.workspaces?.[''];
    if (!rootWorkspace) fail('workspace racine absent du lockfile initial');
    rootWorkspace[track.dependency_section] ??= {};
    const catalog =
        track.catalog === 'default'
            ? (expectedMetadata.catalog ??= {})
            : ((expectedMetadata.catalogs ??= {}).tooling ??= {});
    for (const [name, version] of Object.entries(track.packages)) {
        const existingSpec = rootWorkspace[track.dependency_section][name];
        if (existingSpec !== undefined && existingSpec !== 'catalog:') {
            fail(`${name}: spec racine initiale incompatible`);
        }
        rootWorkspace[track.dependency_section][name] = 'catalog:';
        const existingVersion = catalog[name];
        if (existingVersion !== undefined && existingVersion !== version) {
            fail(`${name}: version catalog initiale incompatible`);
        }
        catalog[name] = version;
    }
    if (!same(expectedMetadata, observedMetadata)) {
        fail('métadonnées du lockfile différentes de l’évolution attendue');
    }
    for (const [key, record] of Object.entries(initial.packages)) {
        if (!(key in final.packages))
            fail(`paquet préexistant supprimé : ${key}`);
        if (!same(record, final.packages[key])) {
            fail(`paquet préexistant modifié : ${key}`);
        }
    }
    const added = new Set(
        Object.keys(final.packages).filter((key) => !(key in initial.packages))
    );
    const roots = Object.keys(track.packages).map((name) => {
        const key = resolveLockKey(
            final.packages,
            '',
            name,
            track.packages[name]
        );
        if (!key) fail(`paquet demandé absent du lockfile : ${name}`);
        return key;
    });
    const reachable = new Set();
    const queue = [...roots];
    while (queue.length) {
        const key = queue.shift();
        if (reachable.has(key)) continue;
        reachable.add(key);
        for (const { name, spec, optional } of dependencyEdges(
            final.packages[key]
        )) {
            const child = resolveLockKey(final.packages, key, name, spec);
            if (!child && !optional) {
                fail(`${key}: dépendance requise absente ${name}@${spec}`);
            }
            if (child) queue.push(child);
        }
    }
    const unrelated = [...added].filter((key) => !reachable.has(key)).sort();
    if (unrelated.length)
        fail(`nouveaux paquets hors fermeture : ${unrelated.join(', ')}`);
    return { added: [...added].sort(), reachable: [...reachable].sort() };
}

export function replaceRegularFile(workspace, path, content) {
    const target = join(workspace, path);
    const stats = lstatSync(target);
    if (
        stats.isSymbolicLink() ||
        !stats.isFile() ||
        (stats.mode & 0o777) !== 0o644
    ) {
        fail(
            `${path}: cible overlay non régulière ou mode différent de 100644`
        );
    }
    const temporary = join(dirname(target), `.${basename(path)}.cmz-tmp`);
    let fd;
    try {
        fd = openSync(
            temporary,
            constants.O_CREAT |
                constants.O_EXCL |
                constants.O_WRONLY |
                (constants.O_NOFOLLOW ?? 0),
            0o644
        );
        writeFileSync(fd, content);
        fsyncSync(fd);
        closeSync(fd);
        fd = undefined;
        renameSync(temporary, target);
    } catch (error) {
        if (fd !== undefined) closeSync(fd);
        if (existsSync(temporary)) unlinkSync(temporary);
        throw error;
    }
}

export function applyDependencyOverlay(tree, workspace, overlay) {
    if (
        Object.keys(overlay).length !== OVERLAY_PATHS.length ||
        !OVERLAY_PATHS.every((path) => Object.hasOwn(overlay, path))
    ) {
        fail(`overlay doit contenir exactement ${OVERLAY_PATHS.join(', ')}`);
    }
    const expected = structuredClone(tree);
    for (const path of OVERLAY_PATHS) {
        const content = Buffer.from(overlay[path]);
        const entry = expected.entries.find(
            (candidate) => candidate.path === path
        );
        if (!entry || entry.mode !== '100644')
            fail(`${path}: absent du tree ou mode invalide`);
        replaceRegularFile(workspace, path, content);
        entry.content = content;
        entry.oid = gitBlobOid(content, expected.objectFormat);
    }
    verifyMaterializedTree(expected, workspace);
    return OVERLAY_PATHS.map((path) => ({
        path,
        mode: '100644',
        oid_final: expected.entries.find((entry) => entry.path === path).oid,
        sha256: createHash('sha256').update(overlay[path]).digest('hex'),
    }));
}

export function readDependencyOverlay(workspace) {
    return Object.fromEntries(
        OVERLAY_PATHS.map((path) => [path, readFileSync(join(workspace, path))])
    );
}
