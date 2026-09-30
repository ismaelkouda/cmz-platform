#!/usr/bin/env node
/**
 * Vérifie les invariants que Dependabot ne sait pas déduire du graphe npm.
 *
 * React et React DOM sont publiés comme une unité de compatibilité stricte :
 * une PR qui ne met à jour qu'un des deux rend les tests React inexécutables.
 * Le groupe inclut leurs types afin de conserver une seule revue cohérente.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { parse as parseYaml } from 'yaml';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const REACT_GROUP = 'react';
export const REACT_ATOMIC_DEPENDENCIES = [
    'react',
    'react-dom',
    '@types/react',
    '@types/react-dom',
];

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
    const errors = dependabotPolicyErrors(config, pkg);

    if (errors.length > 0) {
        console.error('✖ Politique Dependabot invalide :');
        for (const error of errors) console.error(`  - ${error}`);
        process.exit(1);
    }

    console.log(
        `✔ Groupe Dependabot '${REACT_GROUP}' atomique : ${REACT_ATOMIC_DEPENDENCIES.join(', ')} ; react et react-dom ont la même version.`
    );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
