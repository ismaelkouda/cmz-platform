import { createHash } from 'node:crypto';
import { globSync, lstatSync, readFileSync } from 'node:fs';
import { isAbsolute, relative, resolve, sep } from 'node:path';

import semver from 'semver';

import {
    parseJsonc,
    parseWithoutDuplicateKeys,
} from '../check-library-setup-deps.mjs';
import { validateJsonSchema } from '../generator-platform/validate-ir.mjs';

export const POLICY_PATH = 'conventions/libraries/resolution-policy.json';
export const POLICY_SCHEMA_PATH =
    'conventions/libraries/resolution-policy.schema.json';
const DEPENDENCY_FIELDS = [
    'dependencies',
    'devDependencies',
    'peerDependencies',
    'optionalDependencies',
];
const LIFECYCLE_NAMES = ['preinstall', 'install', 'postinstall', 'prepare'];

function safeRegularFile(rootAbs, relativePath) {
    const root = resolve(rootAbs);
    const target = resolve(root, relativePath);
    const within = relative(root, target);
    if (
        within === '' ||
        within === '..' ||
        within.startsWith(`..${sep}`) ||
        isAbsolute(within)
    ) {
        throw new Error(`${relativePath} échappe la racine`);
    }
    let cursor = root;
    for (const segment of within.split(sep)) {
        cursor = resolve(cursor, segment);
        const stats = lstatSync(cursor);
        if (stats.isSymbolicLink()) {
            throw new Error(`${relativePath} traverse un lien symbolique`);
        }
    }
    if (!lstatSync(target).isFile()) {
        throw new Error(`${relativePath} n'est pas un fichier régulier`);
    }
    return target;
}

function readStrictJson(rootAbs, relativePath, { jsonc = false } = {}) {
    const raw = readFileSync(safeRegularFile(rootAbs, relativePath), 'utf8');
    return jsonc
        ? parseJsonc(raw, relativePath)
        : parseWithoutDuplicateKeys(raw, relativePath);
}

function isPlainRecord(value) {
    return (
        value !== null &&
        typeof value === 'object' &&
        !Array.isArray(value) &&
        Object.getPrototypeOf(value) === Object.prototype
    );
}

function validatePolicySemantics(policy) {
    const errors = [];
    const names = new Set();
    for (const entry of policy.lifecycle_scripts ?? []) {
        if (names.has(entry.name)) {
            errors.push(`lifecycle_scripts: nom dupliqué "${entry.name}"`);
        }
        names.add(entry.name);
    }
    for (const registry of policy.allowed_registries ?? []) {
        try {
            const parsed = new URL(registry);
            if (
                parsed.protocol !== 'https:' ||
                parsed.origin !== registry ||
                parsed.username ||
                parsed.password
            ) {
                errors.push(
                    `registre non canonique ou non HTTPS : ${registry}`
                );
            }
        } catch {
            errors.push(`registre invalide : ${registry}`);
        }
    }
    if (
        JSON.stringify(
            [...(policy.allowed_manifest_protocols ?? [])].sort()
        ) !== JSON.stringify(['catalog:', 'workspace:'])
    ) {
        errors.push(
            'allowed_manifest_protocols doit être exactement ["catalog:", "workspace:"]'
        );
    }
    return errors;
}

export function loadResolutionPolicy(rootAbs) {
    const policy = readStrictJson(rootAbs, POLICY_PATH);
    const schema = readStrictJson(rootAbs, POLICY_SCHEMA_PATH);
    const errors = [
        ...validateJsonSchema(policy, schema).map(
            (error) => `${POLICY_PATH} ${error}`
        ),
        ...validatePolicySemantics(policy).map(
            (error) => `${POLICY_PATH}: ${error}`
        ),
    ];
    return { policy, errors };
}

export function resolutionPolicySha256(rootAbs) {
    const raw = readFileSync(safeRegularFile(rootAbs, POLICY_PATH));
    return createHash('sha256').update(raw).digest('hex');
}

export function verifyLifecyclePolicy(packageJson, policy) {
    const errors = [];
    const declared = new Map(
        (policy.lifecycle_scripts ?? []).map((entry) => [entry.name, entry])
    );
    for (const name of LIFECYCLE_NAMES) {
        const actual = packageJson.scripts?.[name];
        const expected = declared.get(name);
        if (actual === undefined && expected === undefined) continue;
        if (actual === undefined) {
            if (expected.classification !== 'reject') {
                errors.push(
                    `${name}: script attendu par la politique mais absent`
                );
            }
            continue;
        }
        if (typeof actual !== 'string' || actual.length === 0) {
            errors.push(`${name}: commande absente ou non textuelle`);
            continue;
        }
        if (!expected) {
            errors.push(`${name}: script non classifié par la politique`);
            continue;
        }
        if (actual !== expected.command) {
            errors.push(
                `${name}: commande "${actual}" différente de la politique "${expected.command}"`
            );
        }
        if (expected.classification === 'reject') {
            errors.push(
                `${name}: script explicitement rejeté par la politique`
            );
        }
    }
    return errors;
}

function dependencyEntries(manifest) {
    const entries = [];
    for (const field of DEPENDENCY_FIELDS) {
        const dependencies = manifest[field];
        if (dependencies === undefined) continue;
        if (!isPlainRecord(dependencies)) {
            entries.push({ field, packageName: '*', spec: dependencies });
            continue;
        }
        for (const [packageName, spec] of Object.entries(dependencies)) {
            entries.push({ field, packageName, spec });
        }
    }
    return entries;
}

function allowedManifestSpec(spec, policy) {
    if (typeof spec !== 'string' || spec.length === 0) return false;
    for (const protocol of policy.allowed_manifest_protocols ?? []) {
        if (spec.startsWith(protocol)) {
            const suffix = spec.slice(protocol.length);
            if (protocol === 'catalog:') {
                return suffix === '' || /^[a-z][a-z0-9-]*$/.test(suffix);
            }
            return suffix === '*' || /^\.?\.?\/[A-Za-z0-9._/-]+$/.test(suffix);
        }
    }
    return semver.validRange(spec, { includePrerelease: false }) !== null;
}

export function verifyManifestSources(manifests, policy) {
    const errors = [];
    for (const { path, document } of manifests) {
        for (const { field, packageName, spec } of dependencyEntries(
            document
        )) {
            if (!allowedManifestSpec(spec, policy)) {
                errors.push(
                    `${path} ${field}.${packageName}: source interdite ${JSON.stringify(spec)}`
                );
            }
        }
    }
    return errors;
}

function lockIdentity(record) {
    if (!Array.isArray(record) || typeof record[0] !== 'string') return null;
    const at = record[0].lastIndexOf('@');
    if (at <= 0) return null;
    return {
        name: record[0].slice(0, at),
        resolution: record[0].slice(at + 1),
    };
}

export function verifyLockSources(lockfile, policy) {
    const errors = [];
    if (!isPlainRecord(lockfile.packages)) {
        return ['bun.lock packages absent ou non objet'];
    }
    const integrityPrefix = `${policy.integrity?.algorithm}-`;
    for (const [key, record] of Object.entries(lockfile.packages)) {
        const identity = lockIdentity(record);
        if (
            !identity ||
            (identity.name !== key && !key.endsWith(`/${identity.name}`))
        ) {
            errors.push(`${key}: identité bun.lock invalide`);
            continue;
        }
        if (identity.resolution.startsWith('workspace:')) {
            if (record.length !== 1) {
                errors.push(
                    `${key}: entrée workspace contient des métadonnées inattendues`
                );
            }
            continue;
        }
        if (!semver.valid(identity.resolution)) {
            errors.push(
                `${key}: résolution externe non SemVer ${identity.resolution}`
            );
        }
        if (record[1] !== '') {
            errors.push(`${key}: source externe hors registre approuvé`);
        }
        const integrity = record.at(-1);
        if (
            typeof integrity !== 'string' ||
            !integrity.startsWith(integrityPrefix) ||
            !new RegExp(`^${integrityPrefix}[A-Za-z0-9+/]+={0,2}$`).test(
                integrity
            )
        ) {
            errors.push(
                `${key}: intégrité ${policy.integrity?.algorithm} absente ou invalide`
            );
        }
    }
    return errors;
}

export function verifyRepositoryResolution(rootAbs) {
    const root = resolve(rootAbs);
    let loaded;
    try {
        loaded = loadResolutionPolicy(root);
    } catch (error) {
        return { ok: false, checkedManifests: 0, errors: [error.message] };
    }
    const errors = [...loaded.errors];
    const manifestPaths = [
        'package.json',
        ...globSync('apps/**/package.json', { cwd: root }),
        ...globSync('libs/**/package.json', { cwd: root }),
    ];
    const uniquePaths = [...new Set(manifestPaths)].sort();
    const manifests = [];
    for (const path of uniquePaths) {
        try {
            manifests.push({ path, document: readStrictJson(root, path) });
        } catch (error) {
            errors.push(error.message);
        }
    }
    const rootManifest = manifests.find(({ path }) => path === 'package.json');
    if (rootManifest) {
        errors.push(
            ...verifyLifecyclePolicy(rootManifest.document, loaded.policy)
        );
    } else {
        errors.push('package.json racine absent de l’inventaire');
    }
    errors.push(...verifyManifestSources(manifests, loaded.policy));
    try {
        errors.push(
            ...verifyLockSources(
                readStrictJson(root, 'bun.lock', { jsonc: true }),
                loaded.policy
            )
        );
    } catch (error) {
        errors.push(error.message);
    }
    return {
        ok: errors.length === 0,
        checkedManifests: manifests.length,
        errors,
    };
}
