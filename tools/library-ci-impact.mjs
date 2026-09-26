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
import { dirname, resolve } from 'node:path';
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

export const ISOLATION_EXACT_INPUTS = Object.freeze([
    'conventions/libraries/resolution-policy.json',
    'conventions/libraries/resolution-policy.schema.json',
    'tools/check-library-setup-deps.mjs',
    'tools/generator-platform/validate-ir.mjs',
    'tools/library-setup/resolution-policy.mjs',
    'tools/library-setup/sandbox.integration.test.mjs',
    'tools/library-setup/sandbox.mjs',
]);

export const INTEGRATION_EXACT_INPUTS = Object.freeze([
    '.gitattributes',
    '.gitignore',
    '.prettierignore',
    '.prettierrc.json',
    'designs/application-conception-proof.application-design.json',
    'eslint.config.mjs',
    'examples/application-conception-proof/reference-api.backend-contract.json',
    'examples/application-conception-proof/target-api.backend-contract.json',
    'nx.json',
    'tools/add-library.mjs',
    'tools/check-library-compatibility.mjs',
    'tools/check-library-resolution-policy.mjs',
    'tools/check-library-setup-deps.mjs',
    'tools/check-library-setup.mjs',
    'tools/create-app.mjs',
    'tools/generator-platform/core/action-authorization.mjs',
    'tools/generator-platform/core/application-design.mjs',
    'tools/generator-platform/core/application-shell-publication.mjs',
    'tools/generator-platform/core/backend-contract.mjs',
    'tools/generator-platform/core/canonicalize-generated.mjs',
    'tools/generator-platform/core/data-binding-projection.mjs',
    'tools/generator-platform/core/generation-change-set.mjs',
    'tools/generator-platform/core/generation-manifest.mjs',
    'tools/generator-platform/core/generation-transaction.mjs',
    'tools/generator-platform/renderers/angular-pwa-shell-renderer.mjs',
    'tools/generator-platform/schemas/application-design.schema.json',
    'tools/generator-platform/schemas/backend-contract.schema.json',
    'tools/generator-platform/validate-ir.mjs',
    'tools/scaffold-tailwind.mjs',
    'tsconfig.base.json',
]);

const COMMON = new Set(COMMON_EXACT_INPUTS);
const ISOLATION = new Set(ISOLATION_EXACT_INPUTS);
const INTEGRATION = new Set(INTEGRATION_EXACT_INPUTS);
const INTEGRATION_PREFIXES = Object.freeze([
    'conventions/libraries/',
    'designs/',
    'examples/application-conception-proof/',
    'tools/library-setup/',
]);

function classifyPath(path) {
    if (COMMON.has(path)) return { isolation: true, integration: true };
    return {
        isolation: ISOLATION.has(path),
        integration:
            INTEGRATION.has(path) ||
            INTEGRATION_PREFIXES.some((prefix) => path.startsWith(prefix)),
    };
}

export function classifyLibraryCiImpact(changedPaths) {
    const reasons = { isolation: [], integration: [] };
    for (const path of [...new Set(changedPaths)].sort()) {
        const impact = classifyPath(path);
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
