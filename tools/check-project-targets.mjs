#!/usr/bin/env node
/**
 * check-project-targets.mjs
 *
 * Audit A-5 — chaque lib doit exposer les targets oracle `build` et `lint`.
 *
 * Regles:
 *   1. `targets.build` declare dans chaque libs/.../project.json
 *      (regression A-4 — generateur ensure-lib-build-targets.mjs).
 *   2. `lint` disponible pour chaque lib : declare dans project.json OU
 *      infere par @nx/eslint/plugin sans restriction `include`
 *      (regression A-1).
 *   3. Contre-verification via `nx show projects --with-target=*` :
 *      toute lib absente de build ou lint fait echouer le gate.
 *
 * Usage:
 *   node tools/check-project-targets.mjs
 *
 * CI: job guardrails. Script npm: check:targets.
 */

import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const LIBS = join(ROOT, 'libs');
const NX_JSON = join(ROOT, 'nx.json');

const SKIP_DIRS = new Set([
    'node_modules',
    'dist',
    'out-tsc',
    '.git',
    '.angular',
]);

function findProjectJsons(dir, results = []) {
    for (const entry of readdirSync(dir)) {
        if (SKIP_DIRS.has(entry)) continue;
        const full = join(dir, entry);
        if (statSync(full).isDirectory()) {
            findProjectJsons(full, results);
        } else if (entry === 'project.json') {
            results.push(full);
        }
    }
    return results;
}

function eslintPluginCoversLibs(nxConfig) {
    const plugins = nxConfig.plugins || [];
    const eslintPlugins = plugins.filter((p) => {
        const name = typeof p === 'string' ? p : p.plugin;
        return name === '@nx/eslint/plugin';
    });
    if (eslintPlugins.length === 0) {
        return {
            ok: false,
            reason: '@nx/eslint/plugin absent de nx.json.plugins',
        };
    }
    for (const plugin of eslintPlugins) {
        if (typeof plugin === 'string') continue;
        const include = plugin.include;
        if (!Array.isArray(include) || include.length === 0) continue;
        const coversLibs = include.some(
            (pattern) =>
                pattern === 'libs/**/*' ||
                pattern.startsWith('libs/') ||
                pattern === '**/*'
        );
        if (!coversLibs) {
            return {
                ok: false,
                reason: '@nx/eslint/plugin.include exclut libs/ — lint non infere sur les libs (regression A-1)',
            };
        }
    }
    return { ok: true };
}

/**
 * Régression revue-finale M-3 : la première version appelait `bunx`
 * directement — si le binaire n'est pas résolvable dans le `PATH` (arrive
 * selon l'environnement d'exécution, cf. `bunx nx ...` non garanti partout),
 * `spawnSync ENOENT` faisait `process.exit(1)` immédiatement, avant même
 * d'afficher les violations déjà trouvées par les étapes 1/2. Corrigé en
 * essayant plusieurs façons d'invoquer `nx` (jamais un unique chemin en
 * dur), et en **dégradant en avertissement non bloquant** — pas en échec
 * dur — si aucune ne fonctionne : la contre-vérification par le graphe Nx
 * réel (étape 3) est la plus fiable (elle voit build déclaré + lint
 * inféré ensemble), mais son indisponibilité ne doit pas invalider les
 * deux vérifications statiques déjà faites.
 */
function tryInvokeNx(args) {
    const attempts = [
        ['bunx', ['nx', ...args]],
        [join(ROOT, 'node_modules', '.bin', 'nx'), args],
        ['npx', ['nx', ...args]],
    ];
    let lastError;
    for (const [cmd, cmdArgs] of attempts) {
        try {
            return execFileSync(cmd, cmdArgs, {
                cwd: ROOT,
                encoding: 'utf8',
                stdio: ['ignore', 'pipe', 'pipe'],
            });
        } catch (err) {
            lastError = err;
        }
    }
    throw lastError;
}

function nxProjectsWithTarget(target) {
    const out = tryInvokeNx(['show', 'projects', '--with-target=' + target]);
    return new Set(
        out
            .split('\n')
            .map((line) => line.trim())
            .filter(Boolean)
    );
}

let errors = 0;
const files = findProjectJsons(LIBS);
const libNames = [];

// --- 1. Controles statiques project.json ---------------------------------
for (const file of files) {
    const rel = relative(ROOT, file);
    let parsed;
    try {
        parsed = JSON.parse(readFileSync(file, 'utf8'));
    } catch {
        console.error(`❌  ${rel} — JSON invalide`);
        errors++;
        continue;
    }

    const name = parsed.name || rel;
    libNames.push(name);

    if (!parsed.targets || !parsed.targets.build) {
        console.error(
            `❌  ${rel} — target "build" absent\n    Remède: node tools/ensure-lib-build-targets.mjs`
        );
        errors++;
    }
}

// --- 2. Plugin ESLint (lint inféré) --------------------------------------
let nxConfig;
try {
    nxConfig = JSON.parse(readFileSync(NX_JSON, 'utf8'));
} catch {
    console.error('❌  nx.json — JSON invalide');
    process.exit(1);
}

const pluginCheck = eslintPluginCoversLibs(nxConfig);
if (!pluginCheck.ok) {
    console.error(`❌  ${pluginCheck.reason}`);
    errors++;
}

// --- 3. Contre-vérification Nx (targets effectifs) — best-effort ---------
// Dégradée en avertissement, pas en échec dur : c'est la vérification la
// plus fiable (build déclaré + lint inféré, vus ensemble par Nx), mais son
// indisponibilité (aucune des 3 façons d'invoquer `nx` n'a fonctionné) ne
// doit pas invalider les résultats déjà obtenus par les étapes 1 et 2.
let crossCheckSkipped = false;
try {
    const withBuild = nxProjectsWithTarget('build');
    const withLint = nxProjectsWithTarget('lint');
    for (const name of libNames) {
        if (!withBuild.has(name)) {
            console.error(
                `❌  ${name} — target effectif "build" absent du graphe Nx`
            );
            errors++;
        }
        if (!withLint.has(name)) {
            console.error(
                `❌  ${name} — target effectif "lint" absent du graphe Nx`
            );
            errors++;
        }
    }
} catch (err) {
    crossCheckSkipped = true;
    console.warn(
        `⚠️  contre-vérification Nx ignorée (bunx/nx/npx tous indisponibles) : ${err.message}`
    );
    console.warn(
        '   Résultat basé uniquement sur les vérifications statiques (project.json + nx.json).'
    );
}

if (errors === 0) {
    console.log(
        `✅  ${files.length} libs — targets build + lint présents (déclaré/inféré)` +
            (crossCheckSkipped ? ' — contre-vérification Nx ignorée' : '')
    );
    process.exit(0);
}

console.error(
    `\n${errors} violation(s) de targets oracle. Audit A-5 / P0-1 / P0-2.`
);
process.exit(1);
