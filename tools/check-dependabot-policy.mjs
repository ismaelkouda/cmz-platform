#!/usr/bin/env node
/**
 * Vérifie les invariants que Dependabot ne sait pas déduire du graphe npm.
 *
 * React et React DOM sont publiés comme une unité de compatibilité stricte :
 * une PR qui ne met à jour qu'un des deux rend les tests React inexécutables.
 * Le groupe inclut leurs types afin de conserver une seule revue cohérente.
 * Les overrides de sécurité sont des planchers caret : le lockfile reste
 * reproductible, tandis que Dependabot peut appliquer les futurs correctifs
 * patch/minor sans qu'un pin exact vulnérable bloque silencieusement la mise à
 * jour.
 */

import { readFileSync } from 'node:fs';
import { dirname, join, matchesGlob } from 'node:path';
import { fileURLToPath } from 'node:url';

import semver from 'semver';
import { parse as parseYaml } from 'yaml';

import { parseJsonc } from './check-library-setup-deps.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const REACT_GROUP = 'react';
export const REACT_ATOMIC_DEPENDENCIES = [
    'react',
    'react-dom',
    '@types/react',
    '@types/react-dom',
];
export const ANGULAR_GROUP = 'angular';
export const ANGULAR_GROUP_PATTERNS = [
    '@angular/*',
    '@angular-devkit/*',
    '@schematics/angular',
];
export const COHERENT_UPDATE_GROUPS = {
    'code-quality': [
        'eslint*',
        '@eslint/*',
        '@eslint-community/*',
        '@typescript-eslint/*',
        'typescript-eslint',
        'angular-eslint',
        'prettier*',
        '@commitlint/*',
        'knip',
    ],
    'unit-testing': ['vitest', '@vitest/*', '@testing-library/*'],
    'browser-e2e': ['@playwright/*'],
};
export const SAFE_GROUPED_UPDATE_TYPES = ['minor', 'patch'];
export const SECURITY_OVERRIDE_MINIMUMS = Object.freeze({
    'brace-expansion': '5.0.12',
    'fast-uri': '4.1.5',
    nanoid: '3.3.19',
    'smol-toml': '1.8.1',
    'js-yaml': '4.3.2',
    undici: '8.12.2',
    browserslist: '4.28.8',
    qs: '6.16.0',
    'source-map-js': '1.2.2',
    'follow-redirects': '1.16.1',
});

/**
 * Retourne uniquement les consommateurs qui exigent réellement le paquet.
 * Les peerDependencies (dont les optionalPeers Bun) décrivent une capacité
 * offerte par l'hôte, pas un nœud nécessairement installé. Ce diagnostic ne
 * permet pas de conserver un plancher dont le paquet n'est pas installé.
 * Les dépendances optionnelles sont elles aussi autorisées à manquer.
 */
export function requiredLockConsumers(lock, dependencyName) {
    const consumers = [];
    for (const [workspaceName, workspace] of Object.entries(
        lock?.workspaces ?? {}
    )) {
        for (const field of ['dependencies', 'devDependencies']) {
            if (Object.hasOwn(workspace?.[field] ?? {}, dependencyName)) {
                consumers.push(`workspace:${workspaceName || '/'}`);
            }
        }
    }
    for (const [packageName, entry] of Object.entries(lock?.packages ?? {})) {
        const dependencies = Array.isArray(entry)
            ? entry[2]?.dependencies
            : undefined;
        if (dependencies && Object.hasOwn(dependencies, dependencyName)) {
            consumers.push(packageName);
        }
    }
    return [...new Set(consumers)].sort();
}

function dependencyVersion(pkg, name) {
    return pkg.dependencies?.[name] ?? pkg.devDependencies?.[name];
}

/**
 * Vérifie les pairs du groupe Angular déclaré, sans tableau de versions.
 * Un consommateur du groupe contraint tous ses pairs ; un consommateur
 * extérieur reste contraint lorsqu'il déclare un pair de ce groupe.
 */
function angularPeerErrors(lock, patterns) {
    if (
        !lock?.packages ||
        typeof lock.packages !== 'object' ||
        Array.isArray(lock.packages)
    ) {
        return [
            'bun.lock : packages doit être un objet pour vérifier les pairs',
        ];
    }
    if (
        patterns.some(
            (pattern) => typeof pattern !== 'string' || pattern.length === 0
        )
    ) {
        return [
            'groupe Angular : patterns doit contenir des chaînes non vides',
        ];
    }
    const packages = lock.packages;
    const errors = [];
    const belongs = (name) =>
        patterns.some((pattern) => matchesGlob(name, pattern));
    const identity = (key) => {
        const entry = packages[key];
        if (!Array.isArray(entry) || typeof entry[0] !== 'string') return null;
        const match = entry[0].match(/^(@[^/]+\/[^@]+|[^@]+)@(.+)$/);
        return match ? { name: match[1], version: match[2] } : null;
    };

    // Même remontée de contextes que le résolveur du dépôt : une copie
    // présente est choisie avant de tester sa plage, jamais contournée.
    const resolve = (consumer, name) => {
        let context = consumer;
        while (true) {
            const key = context ? `${context}/${name}` : name;
            if (Object.hasOwn(packages, key)) return { key };
            if (!context) return { key: null };
            const owner = identity(context);
            if (!owner) {
                return { error: `contexte de paquet invalide : ${context}` };
            }
            if (context === owner.name) {
                context = '';
            } else if (context.endsWith(`/${owner.name}`)) {
                context = context.slice(0, -owner.name.length - 1);
            } else {
                return {
                    error: `contexte incohérent avec son identité : ${context}`,
                };
            }
        }
    };

    for (const [key, record] of Object.entries(packages)) {
        const consumer = identity(key);
        if (!consumer) {
            errors.push(`bun.lock packages[${key}] : identité invalide`);
            continue;
        }
        const metadata = record[2];
        if (
            metadata !== undefined &&
            (!metadata ||
                typeof metadata !== 'object' ||
                Array.isArray(metadata))
        ) {
            errors.push(`bun.lock packages[${key}] : métadonnées invalides`);
            continue;
        }
        const peers = metadata?.peerDependencies;
        if (peers === undefined) continue;
        if (!peers || typeof peers !== 'object' || Array.isArray(peers)) {
            errors.push(`bun.lock packages[${key}] : pairs mal formés`);
            continue;
        }
        const optional = Object.hasOwn(metadata, 'optionalPeers')
            ? metadata.optionalPeers
            : [];
        if (
            !Array.isArray(optional) ||
            optional.some((name) => typeof name !== 'string')
        ) {
            errors.push(`bun.lock packages[${key}] : optionalPeers invalide`);
            continue;
        }
        for (const [name, range] of Object.entries(peers)) {
            if (!belongs(consumer.name) && !belongs(name)) continue;
            const prefix = `pair de ${key} : ${name}`;
            if (
                typeof range !== 'string' ||
                range.trim().length === 0 ||
                !semver.validRange(range)
            ) {
                errors.push(`${prefix} a une plage invalide`);
                continue;
            }
            const found = resolve(key, name);
            if (found.error) {
                errors.push(`${prefix} : ${found.error}`);
                continue;
            }
            if (found.key === null) {
                if (!optional.includes(name)) {
                    errors.push(`${prefix}@${range} requis mais absent`);
                }
                continue;
            }
            const resolved = identity(found.key);
            if (
                !resolved ||
                resolved.name !== name ||
                !semver.valid(resolved.version)
            ) {
                errors.push(
                    `${prefix} : résolution invalide dans packages[${found.key}]`
                );
            } else if (!semver.satisfies(resolved.version, range)) {
                errors.push(
                    `${prefix}@${resolved.version} dans packages[${found.key}] ne respecte pas ${range}`
                );
            }
        }
    }
    return errors;
}

export function dependabotPolicyErrors(config, pkg, lock) {
    const errors = [];
    const bunRoots = (config?.updates ?? []).filter(
        (update) =>
            update?.['package-ecosystem'] === 'bun' && update?.directory === '/'
    );

    if (bunRoots.length !== 1) {
        errors.push(
            `attendu exactement un update Dependabot Bun pour '/', trouvé ${bunRoots.length}`
        );
        return errors;
    }

    const groups = bunRoots[0].groups ?? {};
    const patterns = groups[REACT_GROUP]?.patterns;
    if (!Array.isArray(patterns)) {
        errors.push(
            `groupe Dependabot '${REACT_GROUP}' absent ou sans patterns`
        );
    } else {
        for (const dependency of REACT_ATOMIC_DEPENDENCIES) {
            if (!patterns.includes(dependency)) {
                errors.push(
                    `groupe '${REACT_GROUP}' incomplet : '${dependency}' manque`
                );
            }
        }
    }

    for (const dependency of REACT_ATOMIC_DEPENDENCIES) {
        const owners = Object.entries(groups)
            .filter(([, group]) => group?.patterns?.includes(dependency))
            .map(([name]) => name);
        if (owners.length !== 1 || owners[0] !== REACT_GROUP) {
            errors.push(
                `'${dependency}' doit appartenir uniquement au groupe '${REACT_GROUP}' (trouvé : ${owners.join(', ') || 'aucun'})`
            );
        }
    }

    const angularPatterns = groups[ANGULAR_GROUP]?.patterns;
    if (!Array.isArray(angularPatterns)) {
        errors.push(
            `groupe Dependabot '${ANGULAR_GROUP}' absent ou sans patterns`
        );
    } else {
        for (const pattern of ANGULAR_GROUP_PATTERNS) {
            if (!angularPatterns.includes(pattern)) {
                errors.push(
                    `groupe '${ANGULAR_GROUP}' incomplet : '${pattern}' manque`
                );
            }
        }
    }

    for (const [groupName, expectedPatterns] of Object.entries(
        COHERENT_UPDATE_GROUPS
    )) {
        const group = groups[groupName];
        const groupPatterns = group?.patterns;
        if (!Array.isArray(groupPatterns)) {
            errors.push(
                `groupe Dependabot '${groupName}' absent ou sans patterns`
            );
            continue;
        }

        for (const pattern of expectedPatterns) {
            if (!groupPatterns.includes(pattern)) {
                errors.push(
                    `groupe '${groupName}' incomplet : '${pattern}' manque`
                );
            }
        }
        for (const pattern of groupPatterns) {
            if (!expectedPatterns.includes(pattern)) {
                errors.push(
                    `groupe '${groupName}' élargi sans politique : '${pattern}' est inattendu`
                );
            }
        }

        const updateTypes = group?.['update-types'];
        if (
            !Array.isArray(updateTypes) ||
            updateTypes.length !== SAFE_GROUPED_UPDATE_TYPES.length ||
            SAFE_GROUPED_UPDATE_TYPES.some(
                (updateType) => !updateTypes.includes(updateType)
            )
        ) {
            errors.push(
                `groupe '${groupName}' doit limiter update-types à minor et patch`
            );
        }

        for (const pattern of expectedPatterns) {
            const owners = Object.entries(groups)
                .filter(([, candidate]) =>
                    candidate?.patterns?.includes(pattern)
                )
                .map(([name]) => name);
            if (owners.length !== 1 || owners[0] !== groupName) {
                errors.push(
                    `'${pattern}' doit appartenir uniquement au groupe '${groupName}' (trouvé : ${owners.join(', ') || 'aucun'})`
                );
            }
        }
    }

    if (Array.isArray(angularPatterns)) {
        errors.push(...angularPeerErrors(lock, angularPatterns));
    }

    const react = dependencyVersion(pkg, 'react');
    const reactDom = dependencyVersion(pkg, 'react-dom');
    if (typeof react !== 'string' || typeof reactDom !== 'string') {
        errors.push(
            "'react' et 'react-dom' doivent être déclarés dans package.json"
        );
    } else if (react !== reactDom) {
        errors.push(
            `versions React incompatibles : react=${react}, react-dom=${reactDom}`
        );
    }

    return errors;
}

/**
 * Une exclusion de version reste justifiée tant qu'un pair du verrou
 * refuse toute la plage exclue. Parcourir aussi les copies imbriquées :
 * le dernier consommateur bloquant peut être absent de la racine.
 */
export function ignoredVersionPolicyErrors(config, lock) {
    const errors = [];
    const roots = (config?.updates ?? []).filter(
        (update) =>
            update?.['package-ecosystem'] === 'bun' && update?.directory === '/'
    );
    if (roots.length !== 1) return errors; // Contrôlé par dependabotPolicyErrors.
    const ignores = Object.hasOwn(roots[0], 'ignore') ? roots[0].ignore : [];
    if (!Array.isArray(ignores)) {
        return ['Dependabot ignore doit être une liste explicite'];
    }
    if (ignores.length === 0) return errors;
    const packages = lock?.packages;
    if (!packages || typeof packages !== 'object' || Array.isArray(packages)) {
        return ['bun.lock : packages doit être un objet pour justifier ignore'];
    }

    for (const ignore of ignores) {
        const name = ignore?.['dependency-name'];
        if (
            !ignore ||
            typeof ignore !== 'object' ||
            Array.isArray(ignore) ||
            Object.keys(ignore).some(
                (key) => key !== 'dependency-name' && key !== 'versions'
            ) ||
            typeof name !== 'string' ||
            !/^(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/i.test(name)
        ) {
            errors.push(
                'Dependabot ignore : nom exact requis, seuls dependency-name et versions sont admis'
            );
            continue;
        }
        const versions = ignore.versions;
        if (
            !Array.isArray(versions) ||
            versions.length === 0 ||
            versions.some(
                (range) =>
                    typeof range !== 'string' ||
                    range.trim().length === 0 ||
                    !semver.validRange(range)
            )
        ) {
            errors.push(
                `Dependabot ignore ${name} : versions doit être une liste non vide de plages SemVer valides`
            );
            continue;
        }

        for (const excludedRange of versions) {
            let justified = false;
            for (const [key, entry] of Object.entries(packages)) {
                const peers = entry?.[2]?.peerDependencies;
                if (peers === undefined) continue;
                if (
                    !peers ||
                    typeof peers !== 'object' ||
                    Array.isArray(peers)
                ) {
                    errors.push(`bun.lock packages[${key}] : pairs mal formés`);
                    continue;
                }
                if (!Object.hasOwn(peers, name)) continue;
                const peerRange = peers[name];
                if (
                    typeof peerRange !== 'string' ||
                    peerRange.trim().length === 0 ||
                    !semver.validRange(peerRange)
                ) {
                    errors.push(
                        `bun.lock packages[${key}] : pair ${name} mal formé`
                    );
                    continue;
                }
                // Ne pas interrompre le parcours : un autre pair peut être invalide.
                if (!semver.intersects(peerRange, excludedRange)) {
                    justified = true;
                }
            }
            if (!justified) {
                errors.push(
                    `exclusion de ${name} ${excludedRange} sans justification par un pair installé : la lever`
                );
            }
        }
    }
    return errors;
}

/**
 * Vérifie les planchers des paquets installés et leur résolution sûre.
 * Un paquet absent sans consommateur requis impose de retirer les entrées
 * encore présentes ; avec un consommateur requis, le verrou est incohérent.
 */
export function securityResolutionPolicyErrors(pkg, lock) {
    const errors = [];
    const overrides = pkg?.overrides ?? {};

    const names = new Set([
        ...Object.keys(SECURITY_OVERRIDE_MINIMUMS),
        ...Object.keys(overrides),
    ]);
    for (const name of names) {
        const minimum = Object.hasOwn(SECURITY_OVERRIDE_MINIMUMS, name)
            ? SECURITY_OVERRIDE_MINIMUMS[name]
            : undefined;
        const hasOverride = Object.hasOwn(overrides, name);
        const requiredConsumers = requiredLockConsumers(lock, name);
        const prefix = `${name}@`;
        // Les identités font foi ; garder aussi la racine pour diagnostiquer
        // son entrée malformée, même si une copie imbriquée est conforme.
        const resolutions = Object.entries(lock?.packages ?? {}).filter(
            ([key, entry]) =>
                key === name ||
                (Array.isArray(entry) &&
                    typeof entry[0] === 'string' &&
                    entry[0].startsWith(prefix))
        );
        if (resolutions.length === 0) {
            if (requiredConsumers.length > 0) {
                errors.push(
                    `bun.lock incohérent : ${name} absent de packages, requis par: ${requiredConsumers.join(', ')}`
                );
            } else {
                const obsolete = [
                    ...(hasOverride ? [`overrides.${name}`] : []),
                    ...(minimum ? [`SECURITY_OVERRIDE_MINIMUMS.${name}`] : []),
                ];
                errors.push(
                    `${obsolete.join(' et ')} ${obsolete.length > 1 ? 'doivent être retirés' : 'doit être retiré'} : paquet absent de packages dans bun.lock`
                );
            }
            continue;
        }
        if (minimum) {
            const expectedRange = `^${minimum}`;
            if (overrides[name] !== expectedRange) {
                errors.push(
                    `overrides.${name} doit valoir '${expectedRange}' (plancher corrigé auto-actualisable), trouvé ${String(overrides[name])}`
                );
            }
            const directFields = [
                'dependencies',
                'devDependencies',
                'optionalDependencies',
            ].filter((field) => Object.hasOwn(pkg?.[field] ?? {}, name));
            if (directFields.length > 0) {
                errors.push(
                    `${name} est gouverné comme dépendance transitive et ne doit pas devenir une dépendance directe artificielle (${directFields.join(', ')})`
                );
            }
        }
        if (!hasOverride) continue;
        const range = overrides[name];
        if (
            typeof range !== 'string' ||
            !range.startsWith('^') ||
            !semver.validRange(range)
        ) {
            errors.push(
                `overrides.${name} doit être un plancher caret auto-actualisable, trouvé ${String(range)}`
            );
            continue;
        }
        if (lock?.overrides?.[name] !== range) {
            errors.push(
                `bun.lock ne matérialise pas exactement overrides.${name}`
            );
        }

        for (const [key, entry] of resolutions) {
            const lockedIdentity = entry?.[0];
            const lockedVersion =
                typeof lockedIdentity === 'string' &&
                lockedIdentity.startsWith(prefix)
                    ? lockedIdentity.slice(prefix.length)
                    : undefined;
            const location =
                key === name ? '' : ` (packages[${JSON.stringify(key)}])`;
            if (!semver.valid(lockedVersion)) {
                errors.push(
                    `résolution ${name}${location} absente ou invalide dans bun.lock (${String(lockedIdentity)}), requise par: ${requiredConsumers.join(', ') || 'entrée présente mal formée'}`
                );
            } else if (!semver.satisfies(lockedVersion, range)) {
                errors.push(
                    `${name}@${lockedVersion}${location} ne respecte pas ${range}`
                );
            }

            if (
                minimum &&
                semver.valid(lockedVersion) &&
                semver.lt(lockedVersion, minimum)
            ) {
                errors.push(
                    `${name}@${lockedVersion}${location} est sous le plancher sûr ${minimum}`
                );
            }
        }
    }

    return errors;
}

function main() {
    let config;
    try {
        config = parseYaml(
            readFileSync(join(ROOT, '.github/dependabot.yml'), 'utf8')
        );
    } catch (error) {
        console.error(`✖ .github/dependabot.yml invalide : ${error.message}`);
        process.exit(2);
    }
    const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
    let lock;
    try {
        lock = parseJsonc(
            readFileSync(join(ROOT, 'bun.lock'), 'utf8'),
            'bun.lock'
        );
    } catch (error) {
        console.error(`✖ bun.lock invalide : ${error.message}`);
        process.exit(2);
    }
    const errors = [
        ...dependabotPolicyErrors(config, pkg, lock),
        ...ignoredVersionPolicyErrors(config, lock),
        ...securityResolutionPolicyErrors(pkg, lock),
    ];

    if (errors.length > 0) {
        console.error('✖ Politique Dependabot invalide :');
        for (const error of errors) console.error(`  - ${error}`);
        process.exit(1);
    }

    console.log(
        `✔ Dependabot : groupes '${REACT_GROUP}' et '${ANGULAR_GROUP}' atomiques ; mises à jour patch/minor regroupées par surface cohérente ; ${Object.keys(pkg.overrides ?? {}).length} override(s) de sécurité auto-actualisable(s) vérifié(s).`
    );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
