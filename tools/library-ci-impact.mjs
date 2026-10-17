#!/usr/bin/env node
/**
 * Décide quelles preuves bibliothèque coûteuses sont nécessaires pour un diff.
 *
 * Le classifieur est volontairement pur et conservateur : les entrées communes
 * activent les deux preuves, toute modification du moteur add-library active
 * l'E2E, et la petite fermeture de dépendances du confinement active en plus la
 * matrice d'isolation. Une erreur Git fait échouer le job au lieu de dégrader
 * silencieusement la validation.
 */

import { execFileSync } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';
import { dirname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export const COMMON_EXACT_INPUTS = Object.freeze([
    '.github/workflows/ci.yml',
    '.github/workflows/nightly-integration.yml',
    'bun.lock',
    'package.json',
    'tools/library-ci-impact.mjs',
    'tools/library-ci-impact.test.mjs',
    'tools/library-ci-policy.test.mjs',
]);

// Points d'entrée exécutables des preuves ; les dépendances ne sont pas énumérées.
export const LIBRARY_CI_ENTRYPOINTS = Object.freeze({
    isolation: Object.freeze([
        'tools/library-setup/sandbox.integration.test.mjs',
    ]),
    integration: Object.freeze([
        'tools/create-app.mjs',
        'tools/add-library.mjs',
        'tools/check-library-setup.mjs',
        'tools/library-setup/check-create-app-add-library-integration.mjs',
    ]),
});

function localModuleClosure(entrypoints, root) {
    const pending = [...entrypoints],
        visited = new Set();
    while (pending.length > 0) {
        const path = pending.pop();
        if (visited.has(path)) continue;
        visited.add(path);
        const source = readFileSync(resolve(root, path), 'utf8');
        // Sur-approximation volontaire : les gabarits/commentaires peuvent
        // ajouter une cible réelle. L'oracle AST obligatoire interdit les oublis.
        const imports =
            /(?:\bfrom\s*|\bimport\s*(?:\(\s*)?)(['"])(\.[^'"\r\n]+)\1/g;
        for (const [, , specifier] of source.matchAll(imports)) {
            const absolute = resolve(root, dirname(path), specifier);
            if (statSync(absolute, { throwIfNoEntry: false })?.isFile()) {
                pending.push(relative(root, absolute).split(sep).join('/'));
            }
        }
    }
    return [...visited].sort();
}

// Données lues par fs dans resolution-policy.mjs, hors graphe des imports.
const ISOLATION_DATA = [
    'conventions/libraries/resolution-policy.json',
    'conventions/libraries/resolution-policy.schema.json',
];
const INTEGRATION_DATA = [
    // Configuration copiée/lue par les outils de publication et leur oracle natif.
    '.gitattributes',
    '.gitignore',
    '.prettierignore',
    '.prettierrc.json',
    'eslint.config.mjs',
    'nx.json',
    'tsconfig.base.json',
    // Conception et contrats lus par fs par la preuve d'intégration.
    'designs/application-conception-proof.application-design.json',
    'examples/application-conception-proof/reference-api.backend-contract.json',
    'examples/application-conception-proof/target-api.backend-contract.json',
    // Schémas lus par fs par create-app et application-workspace.
    'tools/generator-platform/schemas/application-design.schema.json',
    'tools/generator-platform/schemas/backend-contract.schema.json',
    'tools/generator-platform/schemas/application-workspace-manifest.schema.json',
];
// Politique conservatrice de l'atelier, distincte des dépendances importées.
// Ces déclencheurs préexistent à EXT-01 et ne sont propres à aucun produit.
const INTEGRATION_POLICY_INPUTS = [
    // #71, 30e9457253a08f472207f88b2fc98d93eb540359 :
    // CLI de check:library-setup, exécutée sans import depuis la preuve.
    'tools/check-library-compatibility.mjs',
    // #71, 30e9457253a08f472207f88b2fc98d93eb540359 :
    // CLI de contrôle de politique exécutée par check:library-setup.
    'tools/check-library-resolution-policy.mjs',
    // #71, 30e9457253a08f472207f88b2fc98d93eb540359 :
    // Commande publique qui enveloppe scaffold-tailwind-core.mjs.
    'tools/scaffold-tailwind.mjs',
    // #113, ccef2855f09be50722cfde5f0b75adeb06792f71 :
    // Frontière d'autorisation importée par page-execution-plan.mjs ;
    // son suivi conservateur dépasse les points d'entrée des preuves.
    'tools/generator-platform/core/action-authorization.mjs',
];
const INTEGRATION_PREFIXES = Object.freeze([
    'conventions/libraries/',
    'designs/',
    'examples/application-conception-proof/',
    'tools/library-setup/',
]);

export function createLibraryCiClassifier(root = ROOT) {
    const isolation = new Set([
        ...ISOLATION_DATA,
        ...localModuleClosure(LIBRARY_CI_ENTRYPOINTS.isolation, root),
    ]);
    const integration = new Set([
        ...isolation,
        ...INTEGRATION_DATA,
        ...INTEGRATION_POLICY_INPUTS,
        ...localModuleClosure(LIBRARY_CI_ENTRYPOINTS.integration, root),
    ]);
    const common = new Set(COMMON_EXACT_INPUTS);
    return {
        isolation,
        integration,
        classifyPath(path) {
            if (common.has(path)) return { isolation: true, integration: true };
            return {
                isolation: isolation.has(path),
                integration:
                    integration.has(path) ||
                    INTEGRATION_PREFIXES.some((prefix) =>
                        path.startsWith(prefix)
                    ),
            };
        },
    };
}

const classifier = createLibraryCiClassifier();
export const ISOLATION_EXACT_INPUTS = Object.freeze(
    [...classifier.isolation].sort()
);
export const INTEGRATION_EXACT_INPUTS = Object.freeze(
    [...classifier.integration].sort()
);

export function classifyLibraryCiImpact(changedPaths) {
    const reasons = { isolation: [], integration: [] };
    for (const path of [...new Set(changedPaths)].sort()) {
        const impact = classifier.classifyPath(path);
        if (impact.isolation) reasons.isolation.push(path);
        if (impact.integration) reasons.integration.push(path);
    }
    return {
        isolation: reasons.isolation.length > 0,
        integration: reasons.integration.length > 0,
        reasons,
    };
}

function main() {
    const args = process.argv.slice(2);
    const baseIndex = args.indexOf('--base');
    const base = baseIndex >= 0 ? args[baseIndex + 1] : undefined;
    if (!base) {
        console.error(
            'Usage: node tools/library-ci-impact.mjs --base <git-ref>'
        );
        process.exit(2);
    }

    const changedPaths = execFileSync(
        'git',
        ['diff', '--name-only', '--no-renames', '-z', `${base}...HEAD`],
        { cwd: ROOT, encoding: 'utf8' }
    )
        .split('\0')
        .filter(Boolean);
    const result = classifyLibraryCiImpact(changedPaths);

    for (const proof of ['isolation', 'integration']) {
        console.error(
            result[proof]
                ? `[library:impact] ${proof} profonde requise : ${JSON.stringify(result.reasons[proof])}`
                : `[library:impact] ${proof} profonde non requise (${changedPaths.length} chemin(s) modifié(s))`
        );
        console.log(`${proof}=${result[proof]}`);
    }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
