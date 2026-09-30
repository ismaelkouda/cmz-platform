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
import { dirname, join } from 'node:path';
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
export const AXIOS_SECURITY_RANGE = '^1.20.0';
export const AXIOS_MINIMUM_FIXED = '1.20.0';

function dependencyVersion(pkg, name) {
    return pkg.dependencies?.[name] ?? pkg.devDependencies?.[name];
}

export function dependabotPolicyErrors(config, pkg) {
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
 * Rend l'override Axios compatible avec les mises à jour de sécurité
 * transitives : le plancher reste explicite, mais le lockfile peut avancer
 * dans la même majeure. La preuve devient volontairement périmée dès que Nx
 * accepte lui-même la résolution sûre, afin de faire retirer l'override.
 */
export function securityResolutionPolicyErrors(pkg, lock) {
    const errors = [];
    const overrides = pkg?.overrides ?? {};

    for (const [name, range] of Object.entries(overrides)) {
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

        const lockedIdentity = lock?.packages?.[name]?.[0];
        const prefix = `${name}@`;
        const lockedVersion =
            typeof lockedIdentity === 'string' &&
            lockedIdentity.startsWith(prefix)
                ? lockedIdentity.slice(prefix.length)
                : undefined;
        if (!semver.valid(lockedVersion)) {
            errors.push(
                `résolution ${name} absente ou invalide dans bun.lock (${String(lockedIdentity)})`
            );
        } else if (!semver.satisfies(lockedVersion, range)) {
            errors.push(`${name}@${lockedVersion} ne respecte pas ${range}`);
        }
    }

    const directAxios = [
        'dependencies',
        'devDependencies',
        'optionalDependencies',
    ].filter((field) => Object.hasOwn(pkg?.[field] ?? {}, 'axios'));

    if (directAxios.length > 0) {
        errors.push(
            `axios est transitif via Nx et ne doit pas devenir une dépendance directe artificielle (${directAxios.join(', ')})`
        );
    }

    const override = pkg?.overrides?.axios;
    if (override !== AXIOS_SECURITY_RANGE) {
        errors.push(
            `overrides.axios doit valoir '${AXIOS_SECURITY_RANGE}' (plancher corrigé auto-actualisable), trouvé ${String(override)}`
        );
    }

    const lockedIdentity = lock?.packages?.axios?.[0];
    const lockedVersion =
        typeof lockedIdentity === 'string' &&
        lockedIdentity.startsWith('axios@')
            ? lockedIdentity.slice('axios@'.length)
            : undefined;
    if (!semver.valid(lockedVersion)) {
        errors.push(
            `résolution axios absente ou invalide dans bun.lock (${String(lockedIdentity)})`
        );
    } else if (
        semver.lt(lockedVersion, AXIOS_MINIMUM_FIXED) ||
        !semver.satisfies(lockedVersion, AXIOS_SECURITY_RANGE)
    ) {
        errors.push(
            `axios@${lockedVersion} ne respecte pas le plancher sûr ${AXIOS_SECURITY_RANGE}`
        );
    }

    const nxAxiosRange = lock?.packages?.nx?.[2]?.dependencies?.axios;
    if (!semver.validRange(nxAxiosRange)) {
        errors.push(
            `la dépendance Axios déclarée par Nx est absente ou invalide (${String(nxAxiosRange)})`
        );
    } else if (
        semver.valid(lockedVersion) &&
        semver.satisfies(lockedVersion, nxAxiosRange)
    ) {
        errors.push(
            `Nx accepte désormais axios@${lockedVersion} (${nxAxiosRange}) : l'override est devenu inutile et doit être retiré`
        );
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
        ...dependabotPolicyErrors(config, pkg),
        ...securityResolutionPolicyErrors(pkg, lock),
    ];

    if (errors.length > 0) {
        console.error('✖ Politique Dependabot invalide :');
        for (const error of errors) console.error(`  - ${error}`);
        process.exit(1);
    }

    console.log(
        `✔ Dependabot : groupe '${REACT_GROUP}' atomique ; ${Object.keys(pkg.overrides ?? {}).length} override(s) de sécurité auto-actualisable(s), Axios ${AXIOS_SECURITY_RANGE} sûr et transitif.`
    );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
